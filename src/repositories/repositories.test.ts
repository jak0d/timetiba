import { venueRepository } from './venueRepository';
import { lecturerRepository } from './lecturerRepository';
import { courseRepository } from './courseRepository';
import { studentGroupRepository } from './studentGroupRepository';
import { scheduleRepository } from './scheduleRepository';

// Mock the database for unit testing
jest.mock('../utils/database', () => ({
  getDatabase: jest.fn(() => ({
    query: jest.fn(),
    transaction: jest.fn()
  }))
}));

describe('Repository Unit Tests', () => {

  describe('VenueRepository', () => {
    it('should have correct table name', () => {
      expect((venueRepository as any).tableName).toBe('venues');
    });

    it('should have correct insert fields', () => {
      const fields = (venueRepository as any).getInsertFields();
      expect(fields).toContain('name');
      expect(fields).toContain('capacity');
      expect(fields).toContain('location');
    });

    it('should have correct update fields', () => {
      const fields = (venueRepository as any).getUpdateFields();
      expect(fields).toContain('name');
      expect(fields).toContain('capacity');
      expect(fields).toContain('location');
    });

    it('should map row to entity correctly', () => {
      const mockRow = {
        id: 'test-id',
        name: 'Test Venue',
        capacity: 100,
        equipment: ['projector'],
        location: 'Test Location',
        accessibility: ['wheelchair_accessible'],
        building: 'Building A',
        floor: 1,
        room_number: 'A101',
        description: 'Test description',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (venueRepository as any).mapRowToEntity(mockRow);
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Test Venue');
      expect(entity.capacity).toBe(100);
      expect(entity.roomNumber).toBe('A101');
    });
  });

  describe('LecturerRepository', () => {
    it('should have correct table name', () => {
      expect((lecturerRepository as any).tableName).toBe('lecturers');
    });

    it('should have correct insert fields', () => {
      const fields = (lecturerRepository as any).getInsertFields();
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('department');
      expect(fields).toContain('subjects');
    });

    it('should map row to entity correctly', () => {
      const mockRow = {
        id: 'test-id',
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming'],
        max_hours_per_day: 8,
        max_hours_per_week: 40,
        employee_id: 'EMP001',
        phone: '+1234567890',
        title: 'Professor',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (lecturerRepository as any).mapRowToEntity(mockRow);
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Dr. John Smith');
      expect(entity.email).toBe('john.smith@university.edu');
      expect(entity.maxHoursPerDay).toBe(8);
    });
  });

  describe('CourseRepository', () => {
    it('should have correct table name', () => {
      expect((courseRepository as any).tableName).toBe('courses');
    });

    it('should have correct insert fields', () => {
      const fields = (courseRepository as any).getInsertFields();
      expect(fields).toContain('name');
      expect(fields).toContain('code');
      expect(fields).toContain('duration');
      expect(fields).toContain('lecturer_id');
    });

    it('should map row to entity correctly', () => {
      const mockRow = {
        id: 'test-id',
        name: 'Introduction to Programming',
        code: 'CS101',
        duration: 90,
        frequency: 'weekly',
        required_equipment: ['computer'],
        lecturer_id: 'lecturer-id',
        department: 'Computer Science',
        credits: 3,
        description: 'Basic programming',
        prerequisites: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (courseRepository as any).mapRowToEntity(mockRow);
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Introduction to Programming');
      expect(entity.code).toBe('CS101');
      expect(entity.duration).toBe(90);
    });
  });

  describe('StudentGroupRepository', () => {
    it('should have correct table name', () => {
      expect((studentGroupRepository as any).tableName).toBe('student_groups');
    });

    it('should have correct insert fields', () => {
      const fields = (studentGroupRepository as any).getInsertFields();
      expect(fields).toContain('name');
      expect(fields).toContain('size');
      expect(fields).toContain('year_level');
      expect(fields).toContain('department');
    });

    it('should map row to entity correctly', () => {
      const mockRow = {
        id: 'test-id',
        name: 'CS Year 1 Group A',
        size: 30,
        year_level: 1,
        department: 'Computer Science',
        program: 'Bachelor of Computer Science',
        semester: 1,
        academic_year: '2024-2025',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (studentGroupRepository as any).mapRowToEntity(mockRow);
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('CS Year 1 Group A');
      expect(entity.size).toBe(30);
      expect(entity.yearLevel).toBe(1);
    });
  });

  describe('ScheduleRepository', () => {
    it('should have correct table name', () => {
      expect((scheduleRepository as any).tableName).toBe('schedules');
    });

    it('should have correct insert fields', () => {
      const fields = (scheduleRepository as any).getInsertFields();
      expect(fields).toContain('name');
      expect(fields).toContain('academic_period');
      expect(fields).toContain('start_date');
      expect(fields).toContain('end_date');
    });

    it('should map row to entity correctly', () => {
      const mockRow = {
        id: 'test-id',
        name: 'Fall 2024 Schedule',
        academic_period: 'Fall 2024',
        start_date: '2024-09-01',
        end_date: '2024-12-15',
        description: 'Test schedule',
        status: 'draft',
        version: 1,
        published_at: null,
        published_by: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (scheduleRepository as any).mapRowToEntity(mockRow);
      expect(entity.id).toBe('test-id');
      expect(entity.name).toBe('Fall 2024 Schedule');
      expect(entity.academicPeriod).toBe('Fall 2024');
      expect(entity.status).toBe('draft');
    });

    it('should map session row to entity correctly', () => {
      const mockRow = {
        id: 'session-id',
        schedule_id: 'schedule-id',
        course_id: 'course-id',
        lecturer_id: 'lecturer-id',
        venue_id: 'venue-id',
        start_time: '2024-09-02T09:00:00Z',
        end_time: '2024-09-02T10:30:00Z',
        day_of_week: 'monday',
        week_number: 1,
        notes: 'Test session',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const entity = (scheduleRepository as any).mapSessionRowToEntity(mockRow);
      expect(entity.id).toBe('session-id');
      expect(entity.courseId).toBe('course-id');
      expect(entity.dayOfWeek).toBe('monday');
    });
  });
});