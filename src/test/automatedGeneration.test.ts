import { timetableEngine, AutomatedGenerationRequest, GenerationStage, GenerationProgress } from '../services/timetableEngine';
import { aiServiceClient } from '../services/aiServiceClient';
import { venueRepository } from '../repositories/venueRepository';
import { lecturerRepository } from '../repositories/lecturerRepository';
import { courseRepository } from '../repositories/courseRepository';
import { studentGroupRepository } from '../repositories/studentGroupRepository';
import { scheduleRepository } from '../repositories/scheduleRepository';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { Course } from '../models/course';
import { StudentGroup } from '../models/studentGroup';
import { ScheduleStatus } from '../models/schedule';
import { DayOfWeek, Equipment } from '../models/common';
import { ConstraintType, Priority } from '../models/constraint';

// Mock dependencies
jest.mock('../services/aiServiceClient');
jest.mock('../repositories/venueRepository');
jest.mock('../repositories/lecturerRepository');
jest.mock('../repositories/courseRepository');
jest.mock('../repositories/studentGroupRepository');
jest.mock('../repositories/scheduleRepository');

const mockAiServiceClient = aiServiceClient as jest.Mocked<typeof aiServiceClient>;
const mockVenueRepository = venueRepository as jest.Mocked<typeof venueRepository>;
const mockLecturerRepository = lecturerRepository as jest.Mocked<typeof lecturerRepository>;
const mockCourseRepository = courseRepository as jest.Mocked<typeof courseRepository>;
const mockStudentGroupRepository = studentGroupRepository as jest.Mocked<typeof studentGroupRepository>;
const mockScheduleRepository = scheduleRepository as jest.Mocked<typeof scheduleRepository>;

describe('TimetableEngine - Automated Generation', () => {
  const mockVenues: Venue[] = [
    {
      id: 'venue-1',
      name: 'Lecture Hall A',
      capacity: 100,
      equipment: [Equipment.PROJECTOR, Equipment.MICROPHONE],
      availability: [],
      location: 'Building A',
      accessibility: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'venue-2',
      name: 'Lab Room B',
      capacity: 30,
      equipment: [Equipment.COMPUTERS, Equipment.PROJECTOR],
      availability: [],
      location: 'Building B',
      accessibility: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockLecturers: Lecturer[] = [
    {
      id: 'lecturer-1',
      name: 'Dr. Smith',
      email: 'smith@university.edu',
      department: 'Computer Science',
      subjects: ['CS101', 'CS201'],
      availability: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }]
      },
      preferences: {
        preferredTimeSlots: [],
        maxConsecutiveHours: 4,
        preferredVenues: [],
        avoidBackToBack: false
      },
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lecturer-2',
      name: 'Prof. Johnson',
      email: 'johnson@university.edu',
      department: 'Mathematics',
      subjects: ['MATH101', 'MATH201'],
      availability: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }]
      },
      preferences: {
        preferredTimeSlots: [],
        maxConsecutiveHours: 6,
        preferredVenues: [],
        avoidBackToBack: false
      },
      maxHoursPerDay: 8,
      maxHoursPerWeek: 40,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockStudentGroups: StudentGroup[] = [
    {
      id: 'group-1',
      name: 'CS Year 1',
      size: 25,
      courses: ['course-1', 'course-3'],
      yearLevel: 1,
      department: 'Computer Science',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'group-2',
      name: 'CS Year 2',
      size: 20,
      courses: ['course-2'],
      yearLevel: 2,
      department: 'Computer Science',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockCourses: Course[] = [
    {
      id: 'course-1',
      name: 'Introduction to Programming',
      code: 'CS101',
      duration: 60,
      frequency: { sessionsPerWeek: 2, totalWeeks: 12 },
      requiredEquipment: [Equipment.COMPUTERS],
      studentGroups: ['group-1'],
      lecturerId: 'lecturer-1',
      constraints: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'course-2',
      name: 'Data Structures',
      code: 'CS201',
      duration: 90,
      frequency: { sessionsPerWeek: 2, totalWeeks: 12 },
      requiredEquipment: [Equipment.PROJECTOR],
      studentGroups: ['group-2'],
      lecturerId: 'lecturer-1',
      constraints: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'course-3',
      name: 'Mathematics for CS',
      code: 'MATH101',
      duration: 60,
      frequency: { sessionsPerWeek: 3, totalWeeks: 12 },
      requiredEquipment: [],
      studentGroups: ['group-1'],
      lecturerId: 'lecturer-2',
      constraints: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockVenueRepository.findAll.mockResolvedValue(mockVenues);
    mockLecturerRepository.findAll.mockResolvedValue(mockLecturers);
    mockCourseRepository.findAll.mockResolvedValue(mockCourses);
    mockStudentGroupRepository.findAll.mockResolvedValue(mockStudentGroups);
    
    mockAiServiceClient.getServiceStatus.mockReturnValue({
      isAvailable: true,
      circuitBreakerOpen: false,
      failureCount: 0,
      lastHealthCheck: new Date()
    });

    mockScheduleRepository.createSchedule.mockResolvedValue({
      id: 'schedule-1',
      name: 'Test Schedule',
      academicPeriod: 'Fall 2024',
      timeSlots: [],
      status: ScheduleStatus.DRAFT,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockScheduleRepository.addSession.mockImplementation(async (scheduleId, session) => ({
      id: `session-${Date.now()}`,
      ...session
    }));

    mockScheduleRepository.findById.mockResolvedValue({
      id: 'schedule-1',
      name: 'Test Schedule',
      academicPeriod: 'Fall 2024',
      timeSlots: [],
      status: ScheduleStatus.DRAFT,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('generateAutomatedTimetable', () => {
    const validRequest: AutomatedGenerationRequest = {
      name: 'Fall 2024 Schedule',
      academicPeriod: 'Fall 2024',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      description: 'Automated schedule for Fall 2024',
      optimizationParameters: {
        max_solve_time_seconds: 300,
        preference_weight: 0.3,
        efficiency_weight: 0.4,
        balance_weight: 0.3,
        allow_partial_solutions: true
      }
    };

    it('should successfully generate a timetable with AI optimization', async () => {
      // Mock successful AI optimization
      mockAiServiceClient.optimizeTimetable.mockResolvedValue({
        success: true,
        solution: {
          sessions: [
            {
              id: 'session-1',
              course_id: 'course-1',
              lecturer_id: 'lecturer-1',
              venue_id: 'venue-2',
              student_groups: ['group-1'],
              start_time: '2024-09-02T09:00:00Z',
              end_time: '2024-09-02T10:00:00Z',
              day_of_week: 0
            }
          ],
          score: 0.85,
          is_feasible: true,
          conflicts: [],
          metadata: {}
        },
        message: 'Optimization successful',
        processing_time_seconds: 45
      });

      mockAiServiceClient.convertSolutionFromAIFormat.mockReturnValue([
        {
          id: 'session-1',
          courseId: 'course-1',
          lecturerId: 'lecturer-1',
          venueId: 'venue-2',
          studentGroups: ['group-1'],
          startTime: new Date('2024-09-02T09:00:00Z'),
          endTime: new Date('2024-09-02T10:00:00Z'),
          dayOfWeek: DayOfWeek.MONDAY
        }
      ]);

      const progressUpdates: GenerationProgress[] = [];
      const result = await timetableEngine.generateAutomatedTimetable({
        ...validRequest,
        progressCallback: (progress) => progressUpdates.push(progress)
      });

      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(result.optimizationScore).toBe(0.85);
      expect(result.fallbackUsed).toBe(false);
      expect(result.aiServiceAvailable).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]?.stage).toBe(GenerationStage.COMPLETED);
    });

    it('should use fallback when AI service is unavailable', async () => {
      mockAiServiceClient.getServiceStatus.mockReturnValue({
        isAvailable: false,
        circuitBreakerOpen: true,
        failureCount: 5,
        lastHealthCheck: null
      });

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.aiServiceAvailable).toBe(false);
      expect(result.warnings).toContain('AI service unavailable, using fallback scheduling');
    });

    it('should handle AI service errors gracefully', async () => {
      mockAiServiceClient.optimizeTimetable.mockRejectedValue(new Error('AI service timeout'));

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.warnings).toContain('AI service error: AI service timeout');
    });

    it('should validate request parameters', async () => {
      const invalidRequest: AutomatedGenerationRequest = {
        ...validRequest,
        name: '', // Invalid empty name
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-09-01') // End before start
      };

      const result = await timetableEngine.generateAutomatedTimetable(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.progress.stage).toBe(GenerationStage.FAILED);
    });

    it('should validate entity relationships', async () => {
      // Mock course with non-existent lecturer
      const invalidCourses: Course[] = [
        {
          ...mockCourses[0]!,
          lecturerId: 'non-existent-lecturer'
        }
      ];
      mockCourseRepository.findAll.mockResolvedValue(invalidCourses);

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('non-existent lecturer'));
    });

    it('should handle insufficient venue capacity', async () => {
      // Mock venues with insufficient capacity
      const smallVenues = mockVenues.map(v => ({ ...v, capacity: 5 }));
      mockVenueRepository.findAll.mockResolvedValue(smallVenues);

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('No venues with sufficient capacity'));
    });

    it('should track progress through all stages', async () => {
      mockAiServiceClient.optimizeTimetable.mockResolvedValue({
        success: true,
        solution: {
          sessions: [],
          score: 0.5,
          is_feasible: true,
          conflicts: [],
          metadata: {}
        },
        message: 'Success',
        processing_time_seconds: 10
      });

      mockAiServiceClient.convertSolutionFromAIFormat.mockReturnValue([]);

      const progressUpdates: GenerationProgress[] = [];
      await timetableEngine.generateAutomatedTimetable({
        ...validRequest,
        progressCallback: (progress) => progressUpdates.push(progress)
      });

      const stages = progressUpdates.map(p => p.stage);
      expect(stages).toContain(GenerationStage.INITIALIZING);
      expect(stages).toContain(GenerationStage.LOADING_DATA);
      expect(stages).toContain(GenerationStage.VALIDATING_CONSTRAINTS);
      expect(stages).toContain(GenerationStage.PREPARING_OPTIMIZATION);
      expect(stages).toContain(GenerationStage.AI_OPTIMIZATION);
      expect(stages).toContain(GenerationStage.VALIDATING_SOLUTION);
      expect(stages).toContain(GenerationStage.FINALIZING);
      expect(stages).toContain(GenerationStage.COMPLETED);
    });

    it('should handle partial entity selection', async () => {
      const partialRequest: AutomatedGenerationRequest = {
        ...validRequest,
        venueIds: ['venue-1'],
        lecturerIds: ['lecturer-1'],
        courseIds: ['course-1'],
        studentGroupIds: ['group-1']
      };

      mockVenueRepository.findById.mockResolvedValue(mockVenues[0]!);
      mockLecturerRepository.findById.mockResolvedValue(mockLecturers[0]!);
      mockCourseRepository.findById.mockResolvedValue(mockCourses[0]!);
      mockStudentGroupRepository.findById.mockResolvedValue(mockStudentGroups[0]!);

      mockAiServiceClient.optimizeTimetable.mockResolvedValue({
        success: true,
        solution: {
          sessions: [],
          score: 0.7,
          is_feasible: true,
          conflicts: [],
          metadata: {}
        },
        message: 'Success',
        processing_time_seconds: 15
      });

      mockAiServiceClient.convertSolutionFromAIFormat.mockReturnValue([]);

      const result = await timetableEngine.generateAutomatedTimetable(partialRequest);

      expect(result.success).toBe(true);
      expect(mockVenueRepository.findById).toHaveBeenCalledWith('venue-1');
      expect(mockLecturerRepository.findById).toHaveBeenCalledWith('lecturer-1');
      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course-1');
      expect(mockStudentGroupRepository.findById).toHaveBeenCalledWith('group-1');
    });
  });

  describe('configureOptimizationParameters', () => {
    it('should use default parameters when none provided', () => {
      const params = timetableEngine.configureOptimizationParameters({});

      expect(params.max_solve_time_seconds).toBe(300);
      expect(params.preference_weight).toBe(0.3);
      expect(params.efficiency_weight).toBe(0.4);
      expect(params.balance_weight).toBe(0.3);
      expect(params.allow_partial_solutions).toBe(true);
    });

    it('should override default parameters with provided values', () => {
      const customParams = {
        max_solve_time_seconds: 600,
        preference_weight: 0.5,
        efficiency_weight: 0.3,
        balance_weight: 0.2
      };

      const params = timetableEngine.configureOptimizationParameters(customParams);

      expect(params.max_solve_time_seconds).toBe(600);
      expect(params.preference_weight).toBe(0.5);
      expect(params.efficiency_weight).toBe(0.3);
      expect(params.balance_weight).toBe(0.2);
    });

    it('should validate solve time bounds', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({ max_solve_time_seconds: 5 });
      }).toThrow('max_solve_time_seconds must be between 10 and 3600 seconds');

      expect(() => {
        timetableEngine.configureOptimizationParameters({ max_solve_time_seconds: 4000 });
      }).toThrow('max_solve_time_seconds must be between 10 and 3600 seconds');
    });

    it('should validate weight parameters sum to 1.0', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({
          preference_weight: 0.5,
          efficiency_weight: 0.3,
          balance_weight: 0.3 // Sum = 1.1
        });
      }).toThrow('Weight parameters must sum to 1.0');
    });

    it('should validate non-negative weights', () => {
      expect(() => {
        timetableEngine.configureOptimizationParameters({
          preference_weight: -0.1,
          efficiency_weight: 0.6,
          balance_weight: 0.5
        });
      }).toThrow('Weight parameters must be non-negative');
    });
  });

  describe('fallback scheduling', () => {
    it('should generate basic schedule when AI is unavailable', async () => {
      mockAiServiceClient.getServiceStatus.mockReturnValue({
        isAvailable: false,
        circuitBreakerOpen: true,
        failureCount: 5,
        lastHealthCheck: null
      });

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.schedule).toBeDefined();
    });

    it('should handle empty entity lists gracefully', async () => {
      mockVenueRepository.findAll.mockResolvedValue([]);

      const result = await timetableEngine.generateAutomatedTimetable(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No venues available for scheduling');
    });
  });

  describe('progress tracking', () => {
    it('should provide accurate progress updates', async () => {
      mockAiServiceClient.optimizeTimetable.mockResolvedValue({
        success: true,
        solution: {
          sessions: [],
          score: 0.8,
          is_feasible: true,
          conflicts: [],
          metadata: {}
        },
        message: 'Success',
        processing_time_seconds: 20
      });

      mockAiServiceClient.convertSolutionFromAIFormat.mockReturnValue([]);

      const progressUpdates: GenerationProgress[] = [];
      await timetableEngine.generateAutomatedTimetable({
        ...validRequest,
        progressCallback: (progress) => progressUpdates.push(progress)
      });

      // Verify progress increases monotonically
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i]!.progress).toBeGreaterThanOrEqual(progressUpdates[i - 1]!.progress);
      }

      // Verify final progress is 100%
      expect(progressUpdates[progressUpdates.length - 1]?.progress).toBe(100);
    });

    it('should include warnings and errors in progress updates', async () => {
      // Mock scenario with warnings
      const coursesWithWarnings: Course[] = [
        {
          ...mockCourses[0]!,
          lecturerId: 'lecturer-2' // Lecturer not qualified for CS101
        }
      ];
      mockCourseRepository.findAll.mockResolvedValue(coursesWithWarnings);

      mockAiServiceClient.optimizeTimetable.mockResolvedValue({
        success: true,
        solution: {
          sessions: [],
          score: 0.6,
          is_feasible: true,
          conflicts: [],
          metadata: {}
        },
        message: 'Success with warnings',
        processing_time_seconds: 25
      });

      mockAiServiceClient.convertSolutionFromAIFormat.mockReturnValue([]);

      const progressUpdates: GenerationProgress[] = [];
      await timetableEngine.generateAutomatedTimetable({
        ...validRequest,
        progressCallback: (progress) => progressUpdates.push(progress)
      });

      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress?.warnings).toBeDefined();
      expect(finalProgress?.warnings?.length).toBeGreaterThan(0);
    });
  });
});