import { QueryResultRow } from 'pg';
import { AbstractBaseRepository } from './baseRepository';
import { 
  Lecturer, 
  LecturerPreferences, 
  CreateLecturerRequest, 
  UpdateLecturerRequest, 
  LecturerFilter 
} from '../models/lecturer';
import { WeeklyAvailability, TimeSlot, DayOfWeek } from '../models/common';

interface LecturerRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
  max_hours_per_day: number;
  max_hours_per_week: number;
  employee_id?: string;
  phone?: string;
  title?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LecturerAvailabilityRow extends QueryResultRow {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface LecturerPreferencesRow extends QueryResultRow {
  max_hours_per_day: number;
  max_hours_per_week: number;
  minimum_break_between_classes: number;
  preferred_days: string[];
  avoid_back_to_back_classes: boolean;
  preferred_venues: string[];
}

export class LecturerRepository extends AbstractBaseRepository<Lecturer> {
  protected tableName = 'lecturers';

  protected mapRowToEntity(row: LecturerRow): Lecturer {
    const lecturer: Lecturer = {
      id: row.id,
      name: row.name,
      email: row.email,
      department: row.department,
      subjects: row.subjects,
      availability: {} as WeeklyAvailability, // Will be loaded separately
      preferences: {} as LecturerPreferences, // Will be loaded separately
      maxHoursPerDay: row.max_hours_per_day,
      maxHoursPerWeek: row.max_hours_per_week,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    if (row.employee_id !== null && row.employee_id !== undefined) {
      lecturer.employeeId = row.employee_id;
    }
    if (row.phone !== null && row.phone !== undefined) {
      lecturer.phone = row.phone;
    }
    if (row.title !== null && row.title !== undefined) {
      lecturer.title = row.title;
    }

    return lecturer;
  }

  protected getInsertFields(): string[] {
    return [
      'name', 'email', 'department', 'subjects', 'max_hours_per_day', 
      'max_hours_per_week', 'employee_id', 'phone', 'title'
    ];
  }

  protected getUpdateFields(): string[] {
    return [
      'name', 'email', 'department', 'subjects', 'max_hours_per_day', 
      'max_hours_per_week', 'employee_id', 'phone', 'title'
    ];
  }

  override async findById(id: string): Promise<Lecturer | null> {
    const lecturer = await super.findById(id);
    if (!lecturer) {
      return null;
    }

    // Load availability and preferences
    lecturer.availability = await this.getLecturerAvailability(id);
    lecturer.preferences = await this.getLecturerPreferences(id);
    
    return lecturer;
  }

  override async findAll(filters: LecturerFilter = {}): Promise<Lecturer[]> {
    let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Handle department filter
    if (filters.department) {
      query += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    // Handle subjects filter
    if (filters.subjects && filters.subjects.length > 0) {
      query += ` AND subjects && $${paramIndex}`;
      params.push(filters.subjects);
      paramIndex++;
    }

    // Handle isActive filter
    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    // Handle maxHoursPerDay filter
    if (filters.maxHoursPerDay !== undefined) {
      query += ` AND max_hours_per_day >= $${paramIndex}`;
      params.push(filters.maxHoursPerDay);
      paramIndex++;
    }

    query += ' ORDER BY name';

    const result = await this.db.query<LecturerRow>(query, params);
    const lecturers = result.rows.map(row => this.mapRowToEntity(row));

    // Load availability and preferences for all lecturers
    for (const lecturer of lecturers) {
      lecturer.availability = await this.getLecturerAvailability(lecturer.id);
      lecturer.preferences = await this.getLecturerPreferences(lecturer.id);
    }

    // Filter by availability if specified
    if (filters.availableAt) {
      return lecturers.filter(lecturer => 
        this.isLecturerAvailableAt(lecturer, filters.availableAt!)
      );
    }

    return lecturers;
  }

  override async create(data: CreateLecturerRequest): Promise<Lecturer> {
    return await this.db.transaction(async (trx) => {
      // Create lecturer
      const lecturerResult = await trx.query<LecturerRow>(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id, phone, title)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          data.name,
          data.email,
          data.department,
          data.subjects,
          data.maxHoursPerDay,
          data.maxHoursPerWeek,
          data.employeeId,
          data.phone,
          data.title
        ]
      );

      const lecturer = this.mapRowToEntity(lecturerResult.rows[0]!);

      // Create availability and preferences
      await this.setLecturerAvailability(lecturer.id, data.availability, trx);
      await this.setLecturerPreferences(lecturer.id, data.preferences, trx);

      lecturer.availability = data.availability;
      lecturer.preferences = data.preferences;

      return lecturer;
    });
  }

  override async update(id: string, data: UpdateLecturerRequest): Promise<Lecturer | null> {
    return await this.db.transaction(async (trx) => {
      // Update lecturer
      const updateData = { ...data };
      delete (updateData as any).availability;
      delete (updateData as any).preferences;

      const lecturer = await super.update(id, updateData);
      if (!lecturer) {
        return null;
      }

      // Update availability if provided
      if (data.availability !== undefined) {
        await this.setLecturerAvailability(id, data.availability, trx);
        lecturer.availability = data.availability;
      } else {
        lecturer.availability = await this.getLecturerAvailability(id);
      }

      // Update preferences if provided
      if (data.preferences !== undefined) {
        await this.setLecturerPreferences(id, data.preferences, trx);
        lecturer.preferences = data.preferences;
      } else {
        lecturer.preferences = await this.getLecturerPreferences(id);
      }

      return lecturer;
    });
  }

  async findByDepartment(department: string): Promise<Lecturer[]> {
    return this.findAll({ department });
  }

  async findBySubjects(subjects: string[]): Promise<Lecturer[]> {
    return this.findAll({ subjects });
  }

  async findAvailableAt(timeSlot: TimeSlot): Promise<Lecturer[]> {
    return this.findAll({ availableAt: timeSlot });
  }

  async updateAvailability(id: string, availability: WeeklyAvailability): Promise<boolean> {
    return await this.db.transaction(async (trx) => {
      await this.setLecturerAvailability(id, availability, trx);
      return true;
    });
  }

  async updatePreferences(id: string, preferences: LecturerPreferences): Promise<boolean> {
    return await this.db.transaction(async (trx) => {
      await this.setLecturerPreferences(id, preferences, trx);
      return true;
    });
  }

  private async getLecturerAvailability(lecturerId: string): Promise<WeeklyAvailability> {
    const result = await this.db.query<LecturerAvailabilityRow>(
      'SELECT day_of_week, start_time, end_time FROM lecturer_availability WHERE lecturer_id = $1',
      [lecturerId]
    );

    const availability: WeeklyAvailability = {
      [DayOfWeek.MONDAY]: [],
      [DayOfWeek.TUESDAY]: [],
      [DayOfWeek.WEDNESDAY]: [],
      [DayOfWeek.THURSDAY]: [],
      [DayOfWeek.FRIDAY]: [],
      [DayOfWeek.SATURDAY]: [],
      [DayOfWeek.SUNDAY]: []
    };

    result.rows.forEach(row => {
      const dayOfWeek = row.day_of_week as DayOfWeek;
      availability[dayOfWeek].push({
        startTime: row.start_time,
        endTime: row.end_time,
        dayOfWeek
      });
    });

    return availability;
  }

  private async setLecturerAvailability(
    lecturerId: string, 
    availability: WeeklyAvailability, 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Delete existing availability
    await db.query('DELETE FROM lecturer_availability WHERE lecturer_id = $1', [lecturerId]);

    // Insert new availability
    const allSlots: TimeSlot[] = [];
    Object.entries(availability).forEach(([_day, slots]) => {
      allSlots.push(...slots);
    });

    if (allSlots.length > 0) {
      const values = allSlots.map((_slot, index) => {
        const baseIndex = index * 4;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      }).join(', ');

      const params = allSlots.flatMap(slot => [
        lecturerId,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime
      ]);

      await db.query(
        `INSERT INTO lecturer_availability (lecturer_id, day_of_week, start_time, end_time) VALUES ${values}`,
        params
      );
    }
  }

  private async getLecturerPreferences(lecturerId: string): Promise<LecturerPreferences> {
    const result = await this.db.query<LecturerPreferencesRow>(
      'SELECT * FROM lecturer_preferences WHERE lecturer_id = $1',
      [lecturerId]
    );

    if (result.rows.length === 0) {
      // Return default preferences
      return {
        preferredTimeSlots: [],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minimumBreakBetweenClasses: 15,
        preferredDays: [],
        avoidBackToBackClasses: false,
        preferredVenues: []
      };
    }

    const row = result.rows[0];
    if (!row) {
      throw new Error('Lecturer preferences not found');
    }
    
    // Get preferred time slots
    const preferredTimeSlots = await this.getLecturerPreferredTimeSlots(lecturerId);

    return {
      preferredTimeSlots,
      maxHoursPerDay: row.max_hours_per_day,
      maxHoursPerWeek: row.max_hours_per_week,
      minimumBreakBetweenClasses: row.minimum_break_between_classes,
      preferredDays: row.preferred_days as DayOfWeek[],
      avoidBackToBackClasses: row.avoid_back_to_back_classes,
      preferredVenues: row.preferred_venues
    };
  }

  private async getLecturerPreferredTimeSlots(lecturerId: string): Promise<TimeSlot[]> {
    const result = await this.db.query<LecturerAvailabilityRow>(
      'SELECT day_of_week, start_time, end_time FROM lecturer_preferred_time_slots WHERE lecturer_id = $1',
      [lecturerId]
    );

    return result.rows.map(row => ({
      startTime: row.start_time,
      endTime: row.end_time,
      dayOfWeek: row.day_of_week as DayOfWeek
    }));
  }

  private async setLecturerPreferences(
    lecturerId: string, 
    preferences: LecturerPreferences, 
    trx?: any
  ): Promise<void> {
    const db = trx || this.db;

    // Upsert preferences
    await db.query(
      `INSERT INTO lecturer_preferences 
       (lecturer_id, max_hours_per_day, max_hours_per_week, minimum_break_between_classes, preferred_days, avoid_back_to_back_classes, preferred_venues)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (lecturer_id) 
       DO UPDATE SET 
         max_hours_per_day = EXCLUDED.max_hours_per_day,
         max_hours_per_week = EXCLUDED.max_hours_per_week,
         minimum_break_between_classes = EXCLUDED.minimum_break_between_classes,
         preferred_days = EXCLUDED.preferred_days,
         avoid_back_to_back_classes = EXCLUDED.avoid_back_to_back_classes,
         preferred_venues = EXCLUDED.preferred_venues,
         updated_at = NOW()`,
      [
        lecturerId,
        preferences.maxHoursPerDay,
        preferences.maxHoursPerWeek,
        preferences.minimumBreakBetweenClasses,
        preferences.preferredDays,
        preferences.avoidBackToBackClasses,
        preferences.preferredVenues
      ]
    );

    // Set preferred time slots
    await db.query('DELETE FROM lecturer_preferred_time_slots WHERE lecturer_id = $1', [lecturerId]);

    if (preferences.preferredTimeSlots.length > 0) {
      const values = preferences.preferredTimeSlots.map((_slot, index) => {
        const baseIndex = index * 4;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      }).join(', ');

      const params = preferences.preferredTimeSlots.flatMap(slot => [
        lecturerId,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime
      ]);

      await db.query(
        `INSERT INTO lecturer_preferred_time_slots (lecturer_id, day_of_week, start_time, end_time) VALUES ${values}`,
        params
      );
    }
  }

  private isLecturerAvailableAt(lecturer: Lecturer, timeSlot: TimeSlot): boolean {
    const daySlots = lecturer.availability[timeSlot.dayOfWeek];
    return daySlots.some(slot => 
      slot.startTime <= timeSlot.startTime &&
      slot.endTime >= timeSlot.endTime
    );
  }
}

// Export singleton instance
export const lecturerRepository = new LecturerRepository();