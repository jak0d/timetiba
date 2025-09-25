import { QueryResultRow } from 'pg';
import { AbstractBaseRepository } from './baseRepository';
import { 
  Schedule, 
  ScheduledSession, 
  ScheduleStatus,
  CreateScheduleRequest, 
  UpdateScheduleRequest, 
  ScheduleFilter 
} from '../models/schedule';
import { DayOfWeek } from '../models/common';

interface ScheduleRow extends QueryResultRow {
  id: string;
  name: string;
  academic_period: string;
  start_date: string;
  end_date: string;
  description?: string;
  status: string;
  version: number;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
}

interface ScheduledSessionRow extends QueryResultRow {
  id: string;
  schedule_id: string;
  course_id: string;
  lecturer_id: string;
  venue_id: string;
  start_time: string;
  end_time: string;
  day_of_week: string;
  week_number?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SessionStudentGroupRow extends QueryResultRow {
  student_group_id: string;
}

export class ScheduleRepository extends AbstractBaseRepository<Schedule> {
  protected tableName = 'schedules';

  protected mapRowToEntity(row: ScheduleRow): Schedule {
    return {
      id: row.id,
      name: row.name,
      academicPeriod: row.academic_period,
      timeSlots: [], // Will be loaded separately
      status: row.status as ScheduleStatus,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      description: row.description || undefined,
      version: row.version,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      publishedBy: row.published_by || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  protected getInsertFields(): string[] {
    return [
      'name', 'academic_period', 'start_date', 'end_date', 'description'
    ];
  }

  protected getUpdateFields(): string[] {
    return [
      'name', 'academic_period', 'start_date', 'end_date', 'description', 'status'
    ];
  }

  override async findById(id: string): Promise<Schedule | null> {
    const schedule = await super.findById(id);
    if (!schedule) {
      return null;
    }

    // Load scheduled sessions
    schedule.timeSlots = await this.getScheduledSessions(id);
    
    return schedule;
  }

  override async findAll(filters: ScheduleFilter = {}): Promise<Schedule[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Handle academic period filter
    if (filters.academicPeriod) {
      query += ` AND academic_period = $${paramIndex}`;
      params.push(filters.academicPeriod);
      paramIndex++;
    }

    // Handle status filter
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    // Handle date range filters
    if (filters.startDate) {
      query += ` AND start_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND end_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.db.query<ScheduleRow>(query, params);
    const schedules = result.rows.map(row => this.mapRowToEntity(row));

    // Load scheduled sessions for all schedules
    for (const schedule of schedules) {
      schedule.timeSlots = await this.getScheduledSessions(schedule.id);
    }

    // Filter by lecturer, venue, or student group if specified
    if (filters.lecturerId || filters.venueId || filters.studentGroupId) {
      return schedules.filter(schedule => 
        this.scheduleMatchesEntityFilter(schedule, filters)
      );
    }

    return schedules;
  }

  override async create(data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    const scheduleResult = await this.db.query<ScheduleRow>(
      `INSERT INTO schedules (name, academic_period, start_date, end_date, description, status, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.academicPeriod,
        data.startDate,
        data.endDate,
        data.description || null,
        data.status || ScheduleStatus.DRAFT,
        data.version || 1
      ]
    );

    const schedule = this.mapRowToEntity(scheduleResult.rows[0]!);
    schedule.timeSlots = data.timeSlots || [];
    return schedule;
  }

  async createSchedule(data: CreateScheduleRequest): Promise<Schedule> {
    const scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      academicPeriod: data.academicPeriod,
      startDate: data.startDate,
      endDate: data.endDate,
      description: data.description,
      status: ScheduleStatus.DRAFT,
      version: 1,
      timeSlots: [],
      publishedAt: undefined,
      publishedBy: undefined
    };

    return this.create(scheduleData);
  }

  override async update(id: string, data: UpdateScheduleRequest): Promise<Schedule | null> {
    const schedule = await super.update(id, data);
    if (!schedule) {
      return null;
    }

    // Load scheduled sessions
    schedule.timeSlots = await this.getScheduledSessions(id);
    
    return schedule;
  }

  async publish(id: string, publishedBy: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE schedules 
       SET status = 'published', published_at = NOW(), published_by = $2, version = version + 1
       WHERE id = $1`,
      [id, publishedBy]
    );
    return result.rowCount > 0;
  }

  async archive(id: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE schedules SET status = 'archived' WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  }

  async addSession(scheduleId: string, session: Omit<ScheduledSession, 'id'>): Promise<ScheduledSession> {
    return await this.db.transaction(async (trx) => {
      // Create scheduled session
      const sessionResult = await trx.query<ScheduledSessionRow>(
        `INSERT INTO scheduled_sessions 
         (schedule_id, course_id, lecturer_id, venue_id, start_time, end_time, day_of_week, week_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          scheduleId,
          session.courseId,
          session.lecturerId,
          session.venueId,
          session.startTime,
          session.endTime,
          session.dayOfWeek,
          session.weekNumber,
          session.notes
        ]
      );

      const scheduledSession = this.mapSessionRowToEntity(sessionResult.rows[0]!);

      // Link student groups
      if (session.studentGroups && session.studentGroups.length > 0) {
        await this.setSessionStudentGroups(scheduledSession.id, session.studentGroups, trx);
        scheduledSession.studentGroups = session.studentGroups;
      }

      return scheduledSession;
    });
  }

  async updateSession(sessionId: string, updates: Partial<ScheduledSession>): Promise<ScheduledSession | null> {
    return await this.db.transaction(async (trx) => {
      const updateFields: string[] = [];
      const params: unknown[] = [sessionId];
      let paramIndex = 2;

      // Build update query dynamically
      if (updates.courseId !== undefined) {
        updateFields.push(`course_id = $${paramIndex++}`);
        params.push(updates.courseId);
      }
      if (updates.lecturerId !== undefined) {
        updateFields.push(`lecturer_id = $${paramIndex++}`);
        params.push(updates.lecturerId);
      }
      if (updates.venueId !== undefined) {
        updateFields.push(`venue_id = $${paramIndex++}`);
        params.push(updates.venueId);
      }
      if (updates.startTime !== undefined) {
        updateFields.push(`start_time = $${paramIndex++}`);
        params.push(updates.startTime);
      }
      if (updates.endTime !== undefined) {
        updateFields.push(`end_time = $${paramIndex++}`);
        params.push(updates.endTime);
      }
      if (updates.dayOfWeek !== undefined) {
        updateFields.push(`day_of_week = $${paramIndex++}`);
        params.push(updates.dayOfWeek);
      }
      if (updates.weekNumber !== undefined) {
        updateFields.push(`week_number = $${paramIndex++}`);
        params.push(updates.weekNumber);
      }
      if (updates.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        params.push(updates.notes);
      }

      if (updateFields.length === 0) {
        // No updates, just return current session
        return this.getSessionById(sessionId);
      }

      const result = await trx.query<ScheduledSessionRow>(
        `UPDATE scheduled_sessions 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        return null;
      }

      const session = this.mapSessionRowToEntity(result.rows[0]!);

      // Update student groups if provided
      if (updates.studentGroups !== undefined) {
        await this.setSessionStudentGroups(sessionId, updates.studentGroups, trx);
        session.studentGroups = updates.studentGroups;
      } else {
        session.studentGroups = await this.getSessionStudentGroups(sessionId);
      }

      return session;
    });
  }

  async removeSession(sessionId: string): Promise<boolean> {
    return await this.db.transaction(async (trx) => {
      // Remove student group associations
      await trx.query('DELETE FROM session_student_groups WHERE session_id = $1', [sessionId]);
      
      // Remove session
      const result = await trx.query('DELETE FROM scheduled_sessions WHERE id = $1', [sessionId]);
      return result.rowCount > 0;
    });
  }

  async getSessionById(sessionId: string): Promise<ScheduledSession | null> {
    const result = await this.db.query<ScheduledSessionRow>(
      'SELECT * FROM scheduled_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = this.mapSessionRowToEntity(result.rows[0]!);
    session.studentGroups = await this.getSessionStudentGroups(sessionId);
    
    return session;
  }

  async findSessionsByDateRange(scheduleId: string, startDate: Date, endDate: Date): Promise<ScheduledSession[]> {
    const result = await this.db.query<ScheduledSessionRow>(
      `SELECT * FROM scheduled_sessions 
       WHERE schedule_id = $1 AND start_time >= $2 AND end_time <= $3
       ORDER BY start_time`,
      [scheduleId, startDate, endDate]
    );

    const sessions = result.rows.map(row => this.mapSessionRowToEntity(row));

    // Load student groups for all sessions
    for (const session of sessions) {
      session.studentGroups = await this.getSessionStudentGroups(session.id);
    }

    return sessions;
  }

  private async getScheduledSessions(scheduleId: string): Promise<ScheduledSession[]> {
    const result = await this.db.query<ScheduledSessionRow>(
      'SELECT * FROM scheduled_sessions WHERE schedule_id = $1 ORDER BY start_time',
      [scheduleId]
    );

    const sessions = result.rows.map(row => this.mapSessionRowToEntity(row));

    // Load student groups for all sessions
    for (const session of sessions) {
      session.studentGroups = await this.getSessionStudentGroups(session.id);
    }

    return sessions;
  }

  private mapSessionRowToEntity(row: ScheduledSessionRow): ScheduledSession {
    return {
      id: row.id,
      courseId: row.course_id,
      lecturerId: row.lecturer_id,
      venueId: row.venue_id,
      studentGroups: [], // Will be loaded separately
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      dayOfWeek: row.day_of_week as DayOfWeek,
      weekNumber: row.week_number || undefined,
      notes: row.notes || undefined
    };
  }

  private async getSessionStudentGroups(sessionId: string): Promise<string[]> {
    const result = await this.db.query<SessionStudentGroupRow>(
      'SELECT student_group_id FROM session_student_groups WHERE session_id = $1',
      [sessionId]
    );
    return result.rows.map(row => row.student_group_id);
  }

  private async setSessionStudentGroups(
    sessionId: string, 
    studentGroupIds: string[], 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing relationships
    await db.query('DELETE FROM session_student_groups WHERE session_id = $1', [sessionId]);

    // Insert new relationships
    if (studentGroupIds.length > 0) {
      const values = studentGroupIds.map((_, index) => 
        `($1, $${index + 2})`
      ).join(', ');

      await db.query(
        `INSERT INTO session_student_groups (session_id, student_group_id) VALUES ${values}`,
        [sessionId, ...studentGroupIds]
      );
    }
  }

  private scheduleMatchesEntityFilter(schedule: Schedule, filters: ScheduleFilter): boolean {
    if (filters.lecturerId) {
      const hasLecturer = schedule.timeSlots.some(session => 
        session.lecturerId === filters.lecturerId
      );
      if (!hasLecturer) return false;
    }

    if (filters.venueId) {
      const hasVenue = schedule.timeSlots.some(session => 
        session.venueId === filters.venueId
      );
      if (!hasVenue) return false;
    }

    if (filters.studentGroupId) {
      const hasStudentGroup = schedule.timeSlots.some(session => 
        session.studentGroups.includes(filters.studentGroupId!)
      );
      if (!hasStudentGroup) return false;
    }

    return true;
  }
}

// Export singleton instance
export const scheduleRepository = new ScheduleRepository();