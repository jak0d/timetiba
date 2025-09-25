import { scheduleRepository } from '../repositories/scheduleRepository';
import { 
  Schedule, 
  ScheduledSession, 
  ScheduleStatus, 
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleFilter
} from '../models/schedule';
import { DayOfWeek } from '../models/common';
import { setupTestDatabase, teardownTestDatabase, cleanTestData } from '../utils/testDatabase';
import { getDatabase } from '../utils/database';

describe('ScheduleRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  describe('Schedule Management', () => {
    describe('create', () => {
      it('should create a new schedule with default status', async () => {
        const scheduleData: CreateScheduleRequest = {
          name: 'Fall 2024 Schedule',
          academicPeriod: '2024-fall',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-15'),
          description: 'Fall semester schedule'
        };

        const schedule = await scheduleRepository.createSchedule(scheduleData);

        expect(schedule).toBeDefined();
        expect(schedule.id).toBeDefined();
        expect(schedule.name).toBe(scheduleData.name);
        expect(schedule.academicPeriod).toBe(scheduleData.academicPeriod);
        expect(schedule.status).toBe(ScheduleStatus.DRAFT);
        expect(schedule.version).toBe(1);
        expect(schedule.timeSlots).toEqual([]);
        expect(schedule.publishedAt).toBeUndefined();
        expect(schedule.publishedBy).toBeUndefined();
      });

      it('should create schedule without optional description', async () => {
        const scheduleData: CreateScheduleRequest = {
          name: 'Spring 2025 Schedule',
          academicPeriod: '2025-spring',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-05-15')
        };

        const schedule = await scheduleRepository.createSchedule(scheduleData);

        expect(schedule).toBeDefined();
        expect(schedule.description).toBeUndefined();
      });
    });

    describe('findById', () => {
      it('should find schedule by id with empty time slots', async () => {
        const scheduleData: CreateScheduleRequest = {
          name: 'Test Schedule',
          academicPeriod: '2024-test',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-01')
        };

        const created = await scheduleRepository.createSchedule(scheduleData);
        const found = await scheduleRepository.findById(created.id);

        expect(found).toBeDefined();
        expect(found!.id).toBe(created.id);
        expect(found!.timeSlots).toEqual([]);
      });

      it('should return null for non-existent schedule', async () => {
        const found = await scheduleRepository.findById('non-existent-id');
        expect(found).toBeNull();
      });
    });

    describe('findAll', () => {
      beforeEach(async () => {
        // Create test schedules
        await scheduleRepository.createSchedule({
          name: 'Fall 2024',
          academicPeriod: '2024-fall',
          startDate: new Date('2024-09-01'),
          endDate: new Date('2024-12-15')
        });

        await scheduleRepository.createSchedule({
          name: 'Spring 2025',
          academicPeriod: '2025-spring',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-05-15')
        });
      });

      it('should find all schedules without filters', async () => {
        const schedules = await scheduleRepository.findAll();
        expect(schedules).toHaveLength(2);
      });

      it('should filter by academic period', async () => {
        const filters: ScheduleFilter = {
          academicPeriod: '2024-fall'
        };

        const schedules = await scheduleRepository.findAll(filters);
        expect(schedules).toHaveLength(1);
        expect(schedules[0]!.academicPeriod).toBe('2024-fall');
      });

      it('should filter by status', async () => {
        const filters: ScheduleFilter = {
          status: ScheduleStatus.DRAFT
        };

        const schedules = await scheduleRepository.findAll(filters);
        expect(schedules).toHaveLength(2);
        schedules.forEach(schedule => {
          expect(schedule.status).toBe(ScheduleStatus.DRAFT);
        });
      });

      it('should filter by date range', async () => {
        const filters: ScheduleFilter = {
          startDate: new Date('2024-08-01'),
          endDate: new Date('2024-12-31')
        };

        const schedules = await scheduleRepository.findAll(filters);
        expect(schedules).toHaveLength(1);
        expect(schedules[0]!.academicPeriod).toBe('2024-fall');
      });
    });

    describe('update', () => {
      it('should update schedule fields', async () => {
        const created = await scheduleRepository.createSchedule({
          name: 'Original Name',
          academicPeriod: '2024-test',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-01')
        });

        const updateData: UpdateScheduleRequest = {
          id: created.id,
          name: 'Updated Name',
          description: 'Updated description'
        };

        const updated = await scheduleRepository.update(created.id, updateData);

        expect(updated).toBeDefined();
        expect(updated!.name).toBe('Updated Name');
        expect(updated!.description).toBe('Updated description');
        expect(updated!.academicPeriod).toBe(created.academicPeriod);
      });

      it('should return null for non-existent schedule', async () => {
        const updateData: UpdateScheduleRequest = {
          id: 'non-existent',
          name: 'Updated Name'
        };

        const updated = await scheduleRepository.update('non-existent', updateData);
        expect(updated).toBeNull();
      });
    });

    describe('delete', () => {
      it('should delete schedule', async () => {
        const created = await scheduleRepository.createSchedule({
          name: 'To Delete',
          academicPeriod: '2024-test',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-01')
        });

        const deleted = await scheduleRepository.delete(created.id);
        expect(deleted).toBe(true);

        const found = await scheduleRepository.findById(created.id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent schedule', async () => {
        const deleted = await scheduleRepository.delete('non-existent');
        expect(deleted).toBe(false);
      });
    });
  });

  describe('Schedule Status Management', () => {
    let testSchedule: Schedule;

    beforeEach(async () => {
      testSchedule = await scheduleRepository.createSchedule({
        name: 'Status Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });
    });

    describe('publish', () => {
      it('should publish schedule and increment version', async () => {
        const publishedBy = 'test-user-id';
        const result = await scheduleRepository.publish(testSchedule.id, publishedBy);

        expect(result).toBe(true);

        const updated = await scheduleRepository.findById(testSchedule.id);
        expect(updated!.status).toBe(ScheduleStatus.PUBLISHED);
        expect(updated!.version).toBe(2);
        expect(updated!.publishedBy).toBe(publishedBy);
        expect(updated!.publishedAt).toBeDefined();
      });

      it('should return false for non-existent schedule', async () => {
        const result = await scheduleRepository.publish('non-existent', 'user-id');
        expect(result).toBe(false);
      });
    });

    describe('archive', () => {
      it('should archive schedule', async () => {
        const result = await scheduleRepository.archive(testSchedule.id);

        expect(result).toBe(true);

        const updated = await scheduleRepository.findById(testSchedule.id);
        expect(updated!.status).toBe(ScheduleStatus.ARCHIVED);
      });

      it('should return false for non-existent schedule', async () => {
        const result = await scheduleRepository.archive('non-existent');
        expect(result).toBe(false);
      });
    });
  });

  describe('Scheduled Session Management', () => {
    let testSchedule: Schedule;
    let testVenueId: string;
    let testLecturerId: string;
    let testCourseId: string;
    let testStudentGroupIds: string[];

    beforeEach(async () => {
      // Create test schedule
      testSchedule = await scheduleRepository.createSchedule({
        name: 'Session Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      // Create test entities (simplified for testing)
      const db = getDatabase();
      
      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Test Venue', 50, 'Building A', 'Building A', 1, 'A101']
      );
      testVenueId = venueResult.rows[0]!['id'];

      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Test', 'test@example.com', 'Computer Science', ['Programming'], 8, 40, 'EMP001']
      );
      testLecturerId = lecturerResult.rows[0]!['id'];

      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Test Course', 'CS101', 90, 'weekly', testLecturerId, 'Computer Science', 3]
      );
      testCourseId = courseResult.rows[0]!['id'];

      const group1Result = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Group A', 25, 1, 'Computer Science', 'Bachelor of CS', 1, '2024-2025']
      );
      const group2Result = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Group B', 20, 1, 'Computer Science', 'Bachelor of CS', 1, '2024-2025']
      );
      testStudentGroupIds = [group1Result.rows[0]!['id'], group2Result.rows[0]!['id']];
    });

    describe('addSession', () => {
      it('should add session to schedule', async () => {
        const sessionData: Omit<ScheduledSession, 'id'> = {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: testStudentGroupIds,
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY,
          weekNumber: 5,
          notes: 'Test session'
        };

        const session = await scheduleRepository.addSession(testSchedule.id, sessionData);

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.courseId).toBe(testCourseId);
        expect(session.lecturerId).toBe(testLecturerId);
        expect(session.venueId).toBe(testVenueId);
        expect(session.studentGroups).toEqual(testStudentGroupIds);
        expect(session.dayOfWeek).toBe(DayOfWeek.MONDAY);
        expect(session.weekNumber).toBe(5);
        expect(session.notes).toBe('Test session');
      });

      it('should add session without student groups', async () => {
        const sessionData: Omit<ScheduledSession, 'id'> = {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: [],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.TUESDAY
        };

        const session = await scheduleRepository.addSession(testSchedule.id, sessionData);

        expect(session).toBeDefined();
        expect(session.studentGroups).toEqual([]);
      });
    });

    describe('updateSession', () => {
      let testSession: ScheduledSession;

      beforeEach(async () => {
        testSession = await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: [testStudentGroupIds[0]!],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });
      });

      it('should update session fields', async () => {
        const updates: Partial<ScheduledSession> = {
          startTime: new Date('2024-02-01T10:00:00Z'),
          endTime: new Date('2024-02-01T11:30:00Z'),
          dayOfWeek: DayOfWeek.WEDNESDAY,
          notes: 'Updated notes',
          studentGroups: testStudentGroupIds
        };

        const updated = await scheduleRepository.updateSession(testSession.id, updates);

        expect(updated).toBeDefined();
        expect(updated!.startTime).toEqual(updates.startTime);
        expect(updated!.endTime).toEqual(updates.endTime);
        expect(updated!.dayOfWeek).toBe(DayOfWeek.WEDNESDAY);
        expect(updated!.notes).toBe('Updated notes');
        expect(updated!.studentGroups).toEqual(testStudentGroupIds);
      });

      it('should return null for non-existent session', async () => {
        const updated = await scheduleRepository.updateSession('non-existent', {
          notes: 'Updated'
        });
        expect(updated).toBeNull();
      });

      it('should handle empty updates', async () => {
        const updated = await scheduleRepository.updateSession(testSession.id, {});
        expect(updated).toBeDefined();
        expect(updated!.id).toBe(testSession.id);
      });
    });

    describe('removeSession', () => {
      let testSession: ScheduledSession;

      beforeEach(async () => {
        testSession = await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: testStudentGroupIds,
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });
      });

      it('should remove session and its relationships', async () => {
        const result = await scheduleRepository.removeSession(testSession.id);
        expect(result).toBe(true);

        const found = await scheduleRepository.getSessionById(testSession.id);
        expect(found).toBeNull();
      });

      it('should return false for non-existent session', async () => {
        const result = await scheduleRepository.removeSession('non-existent');
        expect(result).toBe(false);
      });
    });

    describe('getSessionById', () => {
      let testSession: ScheduledSession;

      beforeEach(async () => {
        testSession = await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: testStudentGroupIds,
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });
      });

      it('should find session by id', async () => {
        const found = await scheduleRepository.getSessionById(testSession.id);

        expect(found).toBeDefined();
        expect(found!.id).toBe(testSession.id);
        expect(found!.studentGroups).toEqual(testStudentGroupIds);
      });

      it('should return null for non-existent session', async () => {
        const found = await scheduleRepository.getSessionById('non-existent');
        expect(found).toBeNull();
      });
    });

    describe('findSessionsByDateRange', () => {
      beforeEach(async () => {
        // Add multiple sessions
        await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: [testStudentGroupIds[0]!],
          startTime: new Date('2024-02-01T09:00:00Z'),
          endTime: new Date('2024-02-01T10:30:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        });

        await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: [testStudentGroupIds[1]!],
          startTime: new Date('2024-02-15T14:00:00Z'),
          endTime: new Date('2024-02-15T15:30:00Z'),
          dayOfWeek: DayOfWeek.THURSDAY
        });

        await scheduleRepository.addSession(testSchedule.id, {
          courseId: testCourseId,
          lecturerId: testLecturerId,
          venueId: testVenueId,
          studentGroups: testStudentGroupIds,
          startTime: new Date('2024-03-01T11:00:00Z'),
          endTime: new Date('2024-03-01T12:30:00Z'),
          dayOfWeek: DayOfWeek.FRIDAY
        });
      });

      it('should find sessions within date range', async () => {
        const sessions = await scheduleRepository.findSessionsByDateRange(
          testSchedule.id,
          new Date('2024-02-01T00:00:00Z'),
          new Date('2024-02-28T23:59:59Z')
        );

        expect(sessions).toHaveLength(2);
        sessions.forEach(session => {
          expect(session.startTime.getMonth()).toBe(1); // February (0-indexed)
        });
      });

      it('should return empty array for no matches', async () => {
        const sessions = await scheduleRepository.findSessionsByDateRange(
          testSchedule.id,
          new Date('2024-04-01T00:00:00Z'),
          new Date('2024-04-30T23:59:59Z')
        );

        expect(sessions).toHaveLength(0);
      });
    });
  });

  describe('Schedule with Sessions Integration', () => {
    let testSchedule: Schedule;
    let testVenueId: string;
    let testLecturerId: string;
    let testCourseId: string;
    let testStudentGroupId: string;

    beforeEach(async () => {
      // Create test entities
      testSchedule = await scheduleRepository.createSchedule({
        name: 'Integration Test Schedule',
        academicPeriod: '2024-test',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01')
      });

      const db = getDatabase();

      const venueResult = await db.query(
        `INSERT INTO venues (name, capacity, location, building, floor, room_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Integration Venue', 30, 'Building B', 'Building B', 2, 'B201']
      );
      testVenueId = venueResult.rows[0]!['id'];

      const lecturerResult = await db.query(
        `INSERT INTO lecturers (name, email, department, subjects, max_hours_per_day, max_hours_per_week, employee_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Dr. Integration', 'integration@example.com', 'Mathematics', ['Calculus'], 6, 30, 'EMP002']
      );
      testLecturerId = lecturerResult.rows[0]!['id'];

      const courseResult = await db.query(
        `INSERT INTO courses (name, code, duration, frequency, lecturer_id, department, credits) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Integration Course', 'MATH101', 120, 'weekly', testLecturerId, 'Mathematics', 4]
      );
      testCourseId = courseResult.rows[0]!['id'];

      const groupResult = await db.query(
        `INSERT INTO student_groups (name, size, year_level, department, program, semester, academic_year) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Integration Group', 30, 2, 'Mathematics', 'Bachelor of Math', 1, '2024-2025']
      );
      testStudentGroupId = groupResult.rows[0]!['id'];

      // Add sessions to schedule
      await scheduleRepository.addSession(testSchedule.id, {
        courseId: testCourseId,
        lecturerId: testLecturerId,
        venueId: testVenueId,
        studentGroups: [testStudentGroupId],
        startTime: new Date('2024-02-01T09:00:00Z'),
        endTime: new Date('2024-02-01T11:00:00Z'),
        dayOfWeek: DayOfWeek.MONDAY
      });
    });

    it('should load schedule with sessions', async () => {
      const schedule = await scheduleRepository.findById(testSchedule.id);

      expect(schedule).toBeDefined();
      expect(schedule!.timeSlots).toHaveLength(1);
      expect(schedule!.timeSlots[0]!.courseId).toBe(testCourseId);
      expect(schedule!.timeSlots[0]!.studentGroups).toEqual([testStudentGroupId]);
    });

    it('should filter schedules by entity relationships', async () => {
      const filters: ScheduleFilter = {
        lecturerId: testLecturerId
      };

      const schedules = await scheduleRepository.findAll(filters);
      expect(schedules).toHaveLength(1);
      expect(schedules[0]!.id).toBe(testSchedule.id);
    });

    it('should filter schedules by venue', async () => {
      const filters: ScheduleFilter = {
        venueId: testVenueId
      };

      const schedules = await scheduleRepository.findAll(filters);
      expect(schedules).toHaveLength(1);
    });

    it('should filter schedules by student group', async () => {
      const filters: ScheduleFilter = {
        studentGroupId: testStudentGroupId
      };

      const schedules = await scheduleRepository.findAll(filters);
      expect(schedules).toHaveLength(1);
    });

    it('should return empty array when no matches found', async () => {
      const filters: ScheduleFilter = {
        lecturerId: 'non-existent-lecturer'
      };

      const schedules = await scheduleRepository.findAll(filters);
      expect(schedules).toHaveLength(0);
    });
  });
});