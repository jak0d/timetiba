import { timetableEngine, AutomatedGenerationRequest, GenerationStage } from '../services/timetableEngine';
import { aiServiceClient } from '../services/aiServiceClient';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testDatabase';
import { venueRepository } from '../repositories/venueRepository';
import { lecturerRepository } from '../repositories/lecturerRepository';
import { courseRepository } from '../repositories/courseRepository';
import { studentGroupRepository } from '../repositories/studentGroupRepository';
import { scheduleRepository } from '../repositories/scheduleRepository';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { Course } from '../models/course';
import { StudentGroup } from '../models/studentGroup';
import { Equipment } from '../models/common';
import { ConstraintType, Priority } from '../models/constraint';

describe('Automated Timetable Generation - Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await scheduleRepository.deleteAll();
    await courseRepository.deleteAll();
    await studentGroupRepository.deleteAll();
    await lecturerRepository.deleteAll();
    await venueRepository.deleteAll();
  });

  describe('End-to-End Automated Generation', () => {
    it('should generate a complete timetable with real data flow', async () => {
      // Setup test data
      const venue1 = await venueRepository.create({
        name: 'Main Lecture Hall',
        capacity: 150,
        equipment: [Equipment.PROJECTOR, Equipment.MICROPHONE, Equipment.WHITEBOARD],
        availability: [],
        location: 'Building A, Floor 1',
        accessibility: []
      });

      const venue2 = await venueRepository.create({
        name: 'Computer Lab 1',
        capacity: 30,
        equipment: [Equipment.COMPUTERS, Equipment.PROJECTOR],
        availability: [],
        location: 'Building B, Floor 2',
        accessibility: []
      });

      const lecturer1 = await lecturerRepository.create({
        name: 'Dr. Alice Smith',
        email: 'alice.smith@university.edu',
        department: 'Computer Science',
        subjects: ['CS101', 'CS201', 'CS301'],
        availability: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '15:00' }]
        },
        preferences: {
          preferredTimeSlots: [
            { day: 'monday', start: '10:00', end: '12:00' },
            { day: 'wednesday', start: '14:00', end: '16:00' }
          ],
          maxConsecutiveHours: 4,
          preferredVenues: [venue1.id],
          avoidBackToBack: true
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 35
      });

      const lecturer2 = await lecturerRepository.create({
        name: 'Prof. Bob Johnson',
        email: 'bob.johnson@university.edu',
        department: 'Mathematics',
        subjects: ['MATH101', 'MATH201', 'STAT101'],
        availability: {
          monday: [{ start: '08:00', end: '16:00' }],
          tuesday: [{ start: '08:00', end: '16:00' }],
          wednesday: [{ start: '08:00', end: '16:00' }],
          thursday: [{ start: '08:00', end: '16:00' }],
          friday: [{ start: '08:00', end: '14:00' }]
        },
        preferences: {
          preferredTimeSlots: [
            { day: 'tuesday', start: '09:00', end: '11:00' },
            { day: 'thursday', start: '13:00', end: '15:00' }
          ],
          maxConsecutiveHours: 3,
          preferredVenues: [venue1.id],
          avoidBackToBack: false
        },
        maxHoursPerDay: 6,
        maxHoursPerWeek: 30
      });

      const group1 = await studentGroupRepository.create({
        name: 'CS Year 1 Group A',
        size: 45,
        courses: [],
        yearLevel: 1,
        department: 'Computer Science'
      });

      const group2 = await studentGroupRepository.create({
        name: 'CS Year 2 Group B',
        size: 35,
        courses: [],
        yearLevel: 2,
        department: 'Computer Science'
      });

      const group3 = await studentGroupRepository.create({
        name: 'Math Year 1 Group A',
        size: 60,
        courses: [],
        yearLevel: 1,
        department: 'Mathematics'
      });

      const course1 = await courseRepository.create({
        name: 'Introduction to Programming',
        code: 'CS101',
        duration: 90, // 1.5 hours
        frequency: { sessionsPerWeek: 2, totalWeeks: 14 },
        requiredEquipment: [Equipment.COMPUTERS, Equipment.PROJECTOR],
        studentGroups: [group1.id],
        lecturerId: lecturer1.id,
        constraints: []
      });

      const course2 = await courseRepository.create({
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        duration: 120, // 2 hours
        frequency: { sessionsPerWeek: 2, totalWeeks: 14 },
        requiredEquipment: [Equipment.PROJECTOR, Equipment.WHITEBOARD],
        studentGroups: [group2.id],
        lecturerId: lecturer1.id,
        constraints: []
      });

      const course3 = await courseRepository.create({
        name: 'Calculus I',
        code: 'MATH101',
        duration: 60, // 1 hour
        frequency: { sessionsPerWeek: 3, totalWeeks: 14 },
        requiredEquipment: [Equipment.WHITEBOARD],
        studentGroups: [group3.id],
        lecturerId: lecturer2.id,
        constraints: []
      });

      // Update student groups with course references
      await studentGroupRepository.update(group1.id, { courses: [course1.id, course3.id] });
      await studentGroupRepository.update(group2.id, { courses: [course2.id] });
      await studentGroupRepository.update(group3.id, { courses: [course3.id] });

      // Mock AI service response for successful optimization
      const mockAiOptimization = jest.spyOn(aiServiceClient, 'optimizeTimetable').mockResolvedValue({
        success: true,
        solution: {
          sessions: [
            {
              id: 'session-1',
              course_id: course1.id,
              lecturer_id: lecturer1.id,
              venue_id: venue2.id,
              student_groups: [group1.id],
              start_time: '2024-09-02T10:00:00Z',
              end_time: '2024-09-02T11:30:00Z',
              day_of_week: 0 // Monday
            },
            {
              id: 'session-2',
              course_id: course1.id,
              lecturer_id: lecturer1.id,
              venue_id: venue2.id,
              student_groups: [group1.id],
              start_time: '2024-09-04T14:00:00Z',
              end_time: '2024-09-04T15:30:00Z',
              day_of_week: 2 // Wednesday
            },
            {
              id: 'session-3',
              course_id: course2.id,
              lecturer_id: lecturer1.id,
              venue_id: venue1.id,
              student_groups: [group2.id],
              start_time: '2024-09-03T09:00:00Z',
              end_time: '2024-09-03T11:00:00Z',
              day_of_week: 1 // Tuesday
            },
            {
              id: 'session-4',
              course_id: course2.id,
              lecturer_id: lecturer1.id,
              venue_id: venue1.id,
              student_groups: [group2.id],
              start_time: '2024-09-05T13:00:00Z',
              end_time: '2024-09-05T15:00:00Z',
              day_of_week: 3 // Thursday
            },
            {
              id: 'session-5',
              course_id: course3.id,
              lecturer_id: lecturer2.id,
              venue_id: venue1.id,
              student_groups: [group3.id],
              start_time: '2024-09-02T09:00:00Z',
              end_time: '2024-09-02T10:00:00Z',
              day_of_week: 0 // Monday
            },
            {
              id: 'session-6',
              course_id: course3.id,
              lecturer_id: lecturer2.id,
              venue_id: venue1.id,
              student_groups: [group3.id],
              start_time: '2024-09-04T11:00:00Z',
              end_time: '2024-09-04T12:00:00Z',
              day_of_week: 2 // Wednesday
            },
            {
              id: 'session-7',
              course_id: course3.id,
              lecturer_id: lecturer2.id,
              venue_id: venue1.id,
              student_groups: [group3.id],
              start_time: '2024-09-06T10:00:00Z',
              end_time: '2024-09-06T11:00:00Z',
              day_of_week: 4 // Friday
            }
          ],
          score: 0.87,
          is_feasible: true,
          conflicts: [],
          metadata: {
            optimization_time: 45.2,
            iterations: 1250,
            constraints_satisfied: 15,
            preferences_satisfied: 8
          }
        },
        message: 'Optimization completed successfully',
        processing_time_seconds: 45.2
      });

      // Mock service status as available
      jest.spyOn(aiServiceClient, 'getServiceStatus').mockReturnValue({
        isAvailable: true,
        circuitBreakerOpen: false,
        failureCount: 0,
        lastHealthCheck: new Date()
      });

      // Mock conversion methods
      jest.spyOn(aiServiceClient, 'convertEntitiesToAIFormat').mockReturnValue({
        venues: [
          { id: venue1.id, name: venue1.name, type: 'venue', capacity: venue1.capacity, equipment: venue1.equipment },
          { id: venue2.id, name: venue2.name, type: 'venue', capacity: venue2.capacity, equipment: venue2.equipment }
        ],
        lecturers: [
          { id: lecturer1.id, name: lecturer1.name, type: 'lecturer', subjects: lecturer1.subjects },
          { id: lecturer2.id, name: lecturer2.name, type: 'lecturer', subjects: lecturer2.subjects }
        ],
        courses: [
          { id: course1.id, name: course1.name, type: 'course', duration: course1.duration },
          { id: course2.id, name: course2.name, type: 'course', duration: course2.duration },
          { id: course3.id, name: course3.name, type: 'course', duration: course3.duration }
        ],
        student_groups: [
          { id: group1.id, name: group1.name, type: 'student_group', size: group1.size },
          { id: group2.id, name: group2.name, type: 'student_group', size: group2.size },
          { id: group3.id, name: group3.name, type: 'student_group', size: group3.size }
        ]
      });

      jest.spyOn(aiServiceClient, 'convertConstraintsToAIFormat').mockReturnValue([]);

      // Prepare generation request
      const request: AutomatedGenerationRequest = {
        name: 'Fall 2024 Complete Schedule',
        academicPeriod: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-15'),
        description: 'Complete automated schedule for Fall 2024 semester',
        optimizationParameters: {
          max_solve_time_seconds: 300,
          preference_weight: 0.4,
          efficiency_weight: 0.3,
          balance_weight: 0.3,
          allow_partial_solutions: false
        }
      };

      // Track progress updates
      const progressUpdates: any[] = [];
      const result = await timetableEngine.generateAutomatedTimetable({
        ...request,
        progressCallback: (progress) => {
          progressUpdates.push({
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
            timestamp: new Date()
          });
        }
      });

      // Verify successful generation
      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(result.schedule!.name).toBe('Fall 2024 Complete Schedule');
      expect(result.schedule!.academicPeriod).toBe('Fall 2024');
      expect(result.optimizationScore).toBe(0.87);
      expect(result.fallbackUsed).toBe(false);
      expect(result.aiServiceAvailable).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(5);
      expect(progressUpdates[0]?.stage).toBe(GenerationStage.INITIALIZING);
      expect(progressUpdates[progressUpdates.length - 1]?.stage).toBe(GenerationStage.COMPLETED);
      expect(progressUpdates[progressUpdates.length - 1]?.progress).toBe(100);

      // Verify AI service was called correctly
      expect(mockAiOptimization).toHaveBeenCalledTimes(1);
      const optimizationCall = mockAiOptimization.mock.calls[0]![0];
      expect(optimizationCall.entities.venues).toHaveLength(2);
      expect(optimizationCall.entities.lecturers).toHaveLength(2);
      expect(optimizationCall.entities.courses).toHaveLength(3);
      expect(optimizationCall.entities.student_groups).toHaveLength(3);
      expect(optimizationCall.optimization_parameters.max_solve_time_seconds).toBe(300);

      // Verify schedule was persisted
      const savedSchedule = await scheduleRepository.findById(result.schedule!.id);
      expect(savedSchedule).toBeDefined();
      expect(savedSchedule!.timeSlots.length).toBeGreaterThan(0);

      // Clean up mocks
      mockAiOptimization.mockRestore();
    }, 30000); // 30 second timeout for integration test

    it('should handle complex constraint validation scenarios', async () => {
      // Setup data with constraint violations
      const smallVenue = await venueRepository.create({
        name: 'Small Room',
        capacity: 10, // Too small for large groups
        equipment: [],
        availability: [],
        location: 'Building C',
        accessibility: []
      });

      const overloadedLecturer = await lecturerRepository.create({
        name: 'Dr. Overworked',
        email: 'overworked@university.edu',
        department: 'Computer Science',
        subjects: ['CS101'],
        availability: {
          monday: [{ start: '09:00', end: '10:00' }] // Very limited availability
        },
        preferences: {
          preferredTimeSlots: [],
          maxConsecutiveHours: 2,
          preferredVenues: [],
          avoidBackToBack: true
        },
        maxHoursPerDay: 2, // Very low limit
        maxHoursPerWeek: 10
      });

      const largeGroup = await studentGroupRepository.create({
        name: 'Large Group',
        size: 100, // Too large for small venue
        courses: [],
        yearLevel: 1,
        department: 'Computer Science'
      });

      const demandingCourse1 = await courseRepository.create({
        name: 'Course 1',
        code: 'CS101',
        duration: 120, // 2 hours
        frequency: { sessionsPerWeek: 3, totalWeeks: 14 }, // 6 hours per week
        requiredEquipment: [Equipment.COMPUTERS], // Not available in small venue
        studentGroups: [largeGroup.id],
        lecturerId: overloadedLecturer.id,
        constraints: []
      });

      const demandingCourse2 = await courseRepository.create({
        name: 'Course 2',
        code: 'CS101',
        duration: 120, // 2 hours
        frequency: { sessionsPerWeek: 3, totalWeeks: 14 }, // 6 hours per week
        requiredEquipment: [],
        studentGroups: [largeGroup.id],
        lecturerId: overloadedLecturer.id, // Same overloaded lecturer
        constraints: []
      });

      await studentGroupRepository.update(largeGroup.id, { 
        courses: [demandingCourse1.id, demandingCourse2.id] 
      });

      const request: AutomatedGenerationRequest = {
        name: 'Problematic Schedule',
        academicPeriod: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-15'),
        description: 'Schedule with constraint violations'
      };

      const result = await timetableEngine.generateAutomatedTimetable(request);

      // Should fail due to constraint violations
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain(expect.stringContaining('No venues with sufficient capacity'));
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum'));
      expect(result.progress.stage).toBe(GenerationStage.FAILED);
    });

    it('should successfully use fallback when AI service fails', async () => {
      // Setup minimal valid data
      const venue = await venueRepository.create({
        name: 'Test Venue',
        capacity: 50,
        equipment: [Equipment.PROJECTOR],
        availability: [],
        location: 'Test Building',
        accessibility: []
      });

      const lecturer = await lecturerRepository.create({
        name: 'Test Lecturer',
        email: 'test@university.edu',
        department: 'Test Department',
        subjects: ['TEST101'],
        availability: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }]
        },
        preferences: {
          preferredTimeSlots: [],
          maxConsecutiveHours: 8,
          preferredVenues: [],
          avoidBackToBack: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40
      });

      const group = await studentGroupRepository.create({
        name: 'Test Group',
        size: 25,
        courses: [],
        yearLevel: 1,
        department: 'Test Department'
      });

      const course = await courseRepository.create({
        name: 'Test Course',
        code: 'TEST101',
        duration: 60,
        frequency: { sessionsPerWeek: 2, totalWeeks: 14 },
        requiredEquipment: [Equipment.PROJECTOR],
        studentGroups: [group.id],
        lecturerId: lecturer.id,
        constraints: []
      });

      await studentGroupRepository.update(group.id, { courses: [course.id] });

      // Mock AI service as unavailable
      jest.spyOn(aiServiceClient, 'getServiceStatus').mockReturnValue({
        isAvailable: false,
        circuitBreakerOpen: true,
        failureCount: 5,
        lastHealthCheck: null
      });

      const request: AutomatedGenerationRequest = {
        name: 'Fallback Test Schedule',
        academicPeriod: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-15'),
        description: 'Testing fallback mechanism'
      };

      const result = await timetableEngine.generateAutomatedTimetable(request);

      // Should succeed with fallback
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.aiServiceAvailable).toBe(false);
      expect(result.schedule).toBeDefined();
      expect(result.warnings).toContain('AI service unavailable, using fallback scheduling');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      // Create larger dataset
      const venues = [];
      const lecturers = [];
      const groups = [];
      const courses = [];

      // Create 20 venues
      for (let i = 1; i <= 20; i++) {
        const venue = await venueRepository.create({
          name: `Venue ${i}`,
          capacity: 30 + (i * 5),
          equipment: i % 2 === 0 ? [Equipment.PROJECTOR] : [Equipment.COMPUTERS],
          availability: [],
          location: `Building ${Math.ceil(i / 5)}`,
          accessibility: []
        });
        venues.push(venue);
      }

      // Create 10 lecturers
      for (let i = 1; i <= 10; i++) {
        const lecturer = await lecturerRepository.create({
          name: `Lecturer ${i}`,
          email: `lecturer${i}@university.edu`,
          department: i <= 5 ? 'Computer Science' : 'Mathematics',
          subjects: [`SUBJ${i}01`, `SUBJ${i}02`],
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
          maxHoursPerWeek: 40
        });
        lecturers.push(lecturer);
      }

      // Create 15 student groups
      for (let i = 1; i <= 15; i++) {
        const group = await studentGroupRepository.create({
          name: `Group ${i}`,
          size: 20 + (i * 2),
          courses: [],
          yearLevel: Math.ceil(i / 5),
          department: i <= 8 ? 'Computer Science' : 'Mathematics'
        });
        groups.push(group);
      }

      // Create 25 courses
      for (let i = 1; i <= 25; i++) {
        const lecturerIndex = (i - 1) % lecturers.length;
        const groupIndex = (i - 1) % groups.length;
        
        const course = await courseRepository.create({
          name: `Course ${i}`,
          code: `SUBJ${lecturerIndex + 1}0${i}`,
          duration: 60 + (i % 3) * 30, // 60, 90, or 120 minutes
          frequency: { sessionsPerWeek: 2 + (i % 2), totalWeeks: 14 },
          requiredEquipment: i % 2 === 0 ? [Equipment.PROJECTOR] : [],
          studentGroups: [groups[groupIndex]!.id],
          lecturerId: lecturers[lecturerIndex]!.id,
          constraints: []
        });
        courses.push(course);
      }

      // Update groups with course references
      for (let i = 0; i < groups.length; i++) {
        const groupCourses = courses.filter((_, courseIndex) => courseIndex % groups.length === i);
        await studentGroupRepository.update(groups[i]!.id, { 
          courses: groupCourses.map(c => c.id) 
        });
      }

      // Mock AI service for large dataset
      jest.spyOn(aiServiceClient, 'getServiceStatus').mockReturnValue({
        isAvailable: true,
        circuitBreakerOpen: false,
        failureCount: 0,
        lastHealthCheck: new Date()
      });

      jest.spyOn(aiServiceClient, 'optimizeTimetable').mockResolvedValue({
        success: true,
        solution: {
          sessions: courses.slice(0, 10).map((course, index) => ({
            id: `session-${index + 1}`,
            course_id: course.id,
            lecturer_id: course.lecturerId,
            venue_id: venues[index % venues.length]!.id,
            student_groups: course.studentGroups,
            start_time: `2024-09-0${2 + (index % 5)}T${9 + (index % 8)}:00:00Z`,
            end_time: `2024-09-0${2 + (index % 5)}T${10 + (index % 8)}:00:00Z`,
            day_of_week: index % 5
          })),
          score: 0.75,
          is_feasible: true,
          conflicts: [],
          metadata: { large_dataset: true }
        },
        message: 'Large dataset optimization completed',
        processing_time_seconds: 120
      });

      const request: AutomatedGenerationRequest = {
        name: 'Large Dataset Schedule',
        academicPeriod: 'Fall 2024',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-12-15'),
        description: 'Testing with large dataset',
        optimizationParameters: {
          max_solve_time_seconds: 600, // Allow more time for large dataset
          preference_weight: 0.3,
          efficiency_weight: 0.4,
          balance_weight: 0.3,
          allow_partial_solutions: true
        }
      };

      const result = await timetableEngine.generateAutomatedTimetable(request);

      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.schedule).toBeDefined();
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Large dataset test completed in ${totalTime}ms`);
      console.log(`Generated schedule with ${result.schedule?.timeSlots.length || 0} sessions`);
    }, 60000); // 60 second timeout for large dataset test
  });
});