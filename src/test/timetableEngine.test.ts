import { timetableEngine } from '../services/timetableEngine';
import { 
  Schedule, 
  ScheduledSession, 
  ScheduleStatus, 
  CreateScheduleRequest 
} from '../models/schedule';
import { DayOfWeek } from '../models/common';
// Removed unused imports
import { setupTestDatabase, teardownTestDatabase, cleanTestData } from '../utils/testDatabase';
import { getDatabase } from '../utils/database';

describe('TimetableEngine', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Schedule Creation', () => {
    it('should create a new schedule', async () => {
      const scheduleRequest: CreateScheduleRequest = {
        name: 'Test Schedule',
        academicPeriod: '2024-spring',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-05-15'),
        description: 'Test schedule for engine'
      };

      const schedule = await timetableEngine.createSchedule(scheduleRequest);

      expect(schedule).toBeDefined();
      expect(schedule.id).toBeDefined();
      expect(schedule.name).toBe(scheduleRequest.name);
      expect(schedule.status).toBe(ScheduleStatus.DRAFT);
      expect(schedule.timeSlots).toEqual([]);
    });
  });

  describe('Schedule Validation', () => {
    let testSchedule: Schedule;
    let testEntities: {
      venueId: string;
      lecturerId: string;
      courseId: string;
      studentGroupId: string;
    };

    beforeEach(async () => {
      // Create test schedule
      testSchedule = await timetableEngine.createSchedule({
        name: 'Validation Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      // Create test entities
      const db = getDatabase();
      
      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Test Venue', 50, 'Building A', 'Building A', 1, 'A101']
      );
      
      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Test', 'test@example.com', 'Computer Science', ['Programming'], 8, 40, 'EMP001']
      );
      
      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Test Course', 'CS101', 90, 'weekly', lecturerResult.rows[0]!['id'], 'Computer Science', 3]
      );
      
      const groupResult = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Test Group', 25, 1, 'Computer Science', 'Bachelor of CS', 1, '2024-2025']
      );

      testEntities = {
        venueId: venueResult.rows[0]!['id'],
        lecturerId: lecturerResult.rows[0]!['id'],
        courseId: courseResult.rows[0]!['id'],
        studentGroupId: groupResult.rows[0]!['id']
      };
    });

    it('should validate empty schedule as valid', async () => {
      const result = await timetableEngine.validateSchedule(testSchedule.id);

      expect(result.isValid).toBe(true);
      expect(result.clashes).toHaveLength(0);
    });

    it('should validate schedule with non-conflicting sessions', async () => {
      // Add non-conflicting sessions
      await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T14:00:00Z'),
        endTime: new Date('2024-02-01T15:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      const result = await timetableEngine.validateSchedule(testSchedule.id);

      expect(result.isValid).toBe(true);
      expect(result.clashes).toHaveLength(0);
    });

    it('should detect venue double booking', async () => {
      // Add overlapping sessions in same venue
      await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      // This should fail due to venue conflict
      await expect(timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T10:00:00Z'),
        endTime: new Date('2024-02-01T11:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      })).rejects.toThrow('Session would create conflicts');
    });

    it('should throw error for non-existent schedule', async () => {
      await expect(timetableEngine.validateSchedule('non-existent-id'))
        .rejects.toThrow('Schedule with ID non-existent-id not found');
    });
  });

  describe('Session Management', () => {
    let testSchedule: Schedule;
    let testEntities: {
      venueId: string;
      lecturerId: string;
      courseId: string;
      studentGroupId: string;
    };

    beforeEach(async () => {
      // Create test schedule and entities
      testSchedule = await timetableEngine.createSchedule({
        name: 'Session Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      const db = getDatabase();
      
      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Session Venue', 40, 'Building B', 'Building B', 2, 'B201']
      );
      
      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Session', 'session@example.com', 'Mathematics', ['Algebra'], 6, 30, 'EMP002']
      );
      
      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Session Course', 'MATH101', 120, 'weekly', lecturerResult.rows[0]!['id'], 'Mathematics', 4]
      );
      
      const groupResult = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Session Group', 30, 2, 'Mathematics', 'Bachelor of Math', 1, '2024-2025']
      );

      testEntities = {
        venueId: venueResult.rows[0]!['id'],
        lecturerId: lecturerResult.rows[0]!['id'],
        courseId: courseResult.rows[0]!['id'],
        studentGroupId: groupResult.rows[0]!['id']
      };
    });

    describe('addSession', () => {
      it('should add session to schedule', async () => {
        const sessionData: Omit<ScheduledSession, 'id'> = {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T11:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          notes: 'Test session'
        };

        const session = await timetableEngine.addSession(testSchedule.id, sessionData);

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.courseId).toBe(testEntities.courseId);
        expect(session.notes).toBe('Test session');
      });

      it('should reject conflicting session', async () => {
        // Add first session
        await timetableEngine.addSession(testSchedule.id, {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });

        // Try to add conflicting session
        await expect(timetableEngine.addSession(testSchedule.id, {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T10:00:00Z'),
          endTime: new Date('2024-02-01T11:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        })).rejects.toThrow('Session would create conflicts');
      });

      it('should throw error for non-existent schedule', async () => {
        await expect(timetableEngine.addSession('non-existent', {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        })).rejects.toThrow('Schedule with ID non-existent not found');
      });
    });

    describe('updateSession', () => {
      let testSession: ScheduledSession;

      beforeEach(async () => {
        testSession = await timetableEngine.addSession(testSchedule.id, {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });
      });

      it('should update session successfully', async () => {
        const updates = {
          startTime: new Date('2024-02-01T14:00:00Z'),
          endTime: new Date('2024-02-01T15:30:00Z'),
          notes: 'Updated session'
        };

        const updated = await timetableEngine.updateSession(testSession.id, updates);

        expect(updated).toBeDefined();
        expect(updated!.startTime).toEqual(updates.startTime);
        expect(updated!.endTime).toEqual(updates.endTime);
        expect(updated!.notes).toBe('Updated session');
      });

      it('should reject conflicting update', async () => {
        // Add another session
        await timetableEngine.addSession(testSchedule.id, {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T14:00:00Z'),
          endTime: new Date('2024-02-01T15:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });

        // Try to update first session to conflict with second
        await expect(timetableEngine.updateSession(testSession.id, {
          startTime: new Date('2024-02-01T14:30:00Z'),
          endTime: new Date('2024-02-01T16:00:00Z')
        })).rejects.toThrow('Session update would create conflicts');
      });

      it('should throw error for non-existent session', async () => {
        await expect(timetableEngine.updateSession('non-existent', {
          notes: 'Updated'
        })).rejects.toThrow('Session with ID non-existent not found');
      });
    });

    describe('removeSession', () => {
      it('should remove session successfully', async () => {
        const session = await timetableEngine.addSession(testSchedule.id, {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });

        const result = await timetableEngine.removeSession(session.id);
        expect(result).toBe(true);

        // Verify session is removed
        const schedule = await timetableEngine.getSchedule(testSchedule.id);
        expect(schedule!.timeSlots).toHaveLength(0);
      });

      it('should return false for non-existent session', async () => {
        const result = await timetableEngine.removeSession('non-existent');
        expect(result).toBe(false);
      });
    });
  });

  describe('Schedule Modification', () => {
    let testSchedule: Schedule;
    let testEntities: {
      venueId: string;
      lecturerId: string;
      courseId: string;
      studentGroupId: string;
    };

    beforeEach(async () => {
      testSchedule = await timetableEngine.createSchedule({
        name: 'Modification Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      const db = getDatabase();
      
      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Mod Venue', 35, 'Building C', 'Building C', 3, 'C301']
      );
      
      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Mod', 'mod@example.com', 'Physics', ['Mechanics'], 7, 35, 'EMP003']
      );
      
      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Mod Course', 'PHYS101', 90, 'weekly', lecturerResult.rows[0]!['id'], 'Physics', 3]
      );
      
      const groupResult = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Mod Group', 28, 1, 'Physics', 'Bachelor of Physics', 1, '2024-2025']
      );

      testEntities = {
        venueId: venueResult.rows[0]!['id'],
        lecturerId: lecturerResult.rows[0]!['id'],
        courseId: courseResult.rows[0]!['id'],
        studentGroupId: groupResult.rows[0]!['id']
      };
    });

    it('should handle add modification', async () => {
      const request = {
        scheduleId: testSchedule.id,
        action: 'add' as const,
        sessionData: {
          courseId: testEntities.courseId,
          lecturerId: testEntities.lecturerId,
          venueId: testEntities.venueId,
          studentGroups: [testEntities.studentGroupId],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      };

      const result = await timetableEngine.modifySchedule(request);

      expect(result).toBeDefined();
      expect(result!.timeSlots).toHaveLength(1);
    });

    it('should handle update modification', async () => {
      // First add a session
      const session = await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      const request = {
        scheduleId: testSchedule.id,
        action: 'update' as const,
        sessionId: session.id,
        sessionData: {
          notes: 'Updated via modification'
        }
      };

      const result = await timetableEngine.modifySchedule(request);

      expect(result).toBeDefined();
      expect(result!.timeSlots[0]!.notes).toBe('Updated via modification');
    });

    it('should handle remove modification', async () => {
      // First add a session
      const session = await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T10:30:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      const request = {
        scheduleId: testSchedule.id,
        action: 'remove' as const,
        sessionId: session.id
      };

      const result = await timetableEngine.modifySchedule(request);

      expect(result).toBeDefined();
      expect(result!.timeSlots).toHaveLength(0);
    });

    it('should throw error for invalid action', async () => {
      const request = {
        scheduleId: testSchedule.id,
        action: 'invalid' as any
      };

      await expect(timetableEngine.modifySchedule(request))
        .rejects.toThrow('Unknown action: invalid');
    });
  });

  describe('Schedule Publishing', () => {
    let testSchedule: Schedule;
    let testEntities: {
      venueId: string;
      lecturerId: string;
      courseId: string;
      studentGroupId: string;
    };

    beforeEach(async () => {
      testSchedule = await timetableEngine.createSchedule({
        name: 'Publishing Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      const db = getDatabase();
      
      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Pub Venue', 45, 'Building D', 'Building D', 1, 'D101']
      );
      
      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Pub', 'pub@example.com', 'Chemistry', ['Organic'], 8, 40, 'EMP004']
      );
      
      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Pub Course', 'CHEM101', 120, 'weekly', lecturerResult.rows[0]!['id'], 'Chemistry', 4]
      );
      
      const groupResult = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Pub Group', 32, 2, 'Chemistry', 'Bachelor of Chemistry', 1, '2024-2025']
      );

      testEntities = {
        venueId: venueResult.rows[0]!['id'],
        lecturerId: lecturerResult.rows[0]!['id'],
        courseId: courseResult.rows[0]!['id'],
        studentGroupId: groupResult.rows[0]!['id']
      };
    });

    it('should publish valid schedule', async () => {
      // Add a valid session
      await timetableEngine.addSession(testSchedule.id, {
        courseId: testEntities.courseId,
        lecturerId: testEntities.lecturerId,
        venueId: testEntities.venueId,
        studentGroups: [testEntities.studentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T11:00:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });

      const result = await timetableEngine.publishSchedule(testSchedule.id, 'test-user');

      expect(result).toBe(true);

      // Verify schedule is published
      const schedule = await timetableEngine.getSchedule(testSchedule.id);
      expect(schedule!.status).toBe(ScheduleStatus.PUBLISHED);
    });

    it('should reject publishing schedule with conflicts', async () => {
      // Add conflicting sessions directly to database to bypass validation
      const db = getDatabase();
      
      await db.query(
        `INSERT INTO scheduled_sessions (schedule_id, course_id, lecturer_id, venue_id, start_time, end_time, day_of_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          testSchedule.id,
          testEntities.courseId,
          testEntities.lecturerId,
          testEntities.venueId,
          new Date('2024-02-01T09:00:00Z'),
          new Date('2024-02-01T10:30:00Z'),
          DayOfWeek.MONDAY
        ]
      );

      await db.query(
        `INSERT INTO scheduled_sessions (schedule_id, course_id, lecturer_id, venue_id, start_time, end_time, day_of_week)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          testSchedule.id,
          testEntities.courseId,
          testEntities.lecturerId,
          testEntities.venueId,
          new Date('2024-02-01T10:00:00Z'),
          new Date('2024-02-01T11:30:00Z'),
          DayOfWeek.MONDAY
        ]
      );

      await expect(timetableEngine.publishSchedule(testSchedule.id, 'test-user'))
        .rejects.toThrow('Cannot publish schedule with conflicts');
    });
  });

  describe('Utility Functions', () => {
    let testSchedule: Schedule;

    beforeEach(async () => {
      testSchedule = await timetableEngine.createSchedule({
        name: 'Utility Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });
    });

    it('should archive schedule', async () => {
      const result = await timetableEngine.archiveSchedule(testSchedule.id);
      expect(result).toBe(true);

      const schedule = await timetableEngine.getSchedule(testSchedule.id);
      expect(schedule!.status).toBe(ScheduleStatus.ARCHIVED);
    });

    it('should get schedule by ID', async () => {
      const schedule = await timetableEngine.getSchedule(testSchedule.id);
      expect(schedule).toBeDefined();
      expect(schedule!.id).toBe(testSchedule.id);
    });

    it('should return null for non-existent schedule', async () => {
      const schedule = await timetableEngine.getSchedule('non-existent');
      expect(schedule).toBeNull();
    });

    it('should find schedules with filters', async () => {
      const schedules = await timetableEngine.findSchedules({
        academicPeriod: '2024-test'
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0]!.id).toBe(testSchedule.id);
    });

    it('should get sessions by date range', async () => {
      const sessions = await timetableEngine.getSessionsByDateRange(
        testSchedule.id,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(sessions).toEqual([]);
    });
  });
});