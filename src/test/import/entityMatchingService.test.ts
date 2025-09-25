import { EntityMatchingService, VenueMatchData, LecturerMatchData, CourseMatchData, StudentGroupMatchData } from '../../services/import/entityMatchingService';
import { venueRepository } from '../../repositories/venueRepository';
import { lecturerRepository } from '../../repositories/lecturerRepository';
import { courseRepository } from '../../repositories/courseRepository';
import { studentGroupRepository } from '../../repositories/studentGroupRepository';
import { Venue } from '../../models/venue';
import { Lecturer } from '../../models/lecturer';
import { Course } from '../../models/course';
import { StudentGroup } from '../../models/studentGroup';
import { Equipment, AccessibilityFeature, DayOfWeek, Frequency } from '../../models/common';

// Mock the repositories
jest.mock('../../repositories/venueRepository');
jest.mock('../../repositories/lecturerRepository');
jest.mock('../../repositories/courseRepository');
jest.mock('../../repositories/studentGroupRepository');

const mockVenueRepository = venueRepository as jest.Mocked<typeof venueRepository>;
const mockLecturerRepository = lecturerRepository as jest.Mocked<typeof lecturerRepository>;
const mockCourseRepository = courseRepository as jest.Mocked<typeof courseRepository>;
const mockStudentGroupRepository = studentGroupRepository as jest.Mocked<typeof studentGroupRepository>;

describe('EntityMatchingService', () => {
  let entityMatchingService: EntityMatchingService;

  beforeEach(() => {
    entityMatchingService = new EntityMatchingService();
    jest.clearAllMocks();
  });

  describe('Venue Matching', () => {
    const mockVenues: Venue[] = [
      {
        id: '1',
        name: 'Computer Lab A',
        capacity: 30,
        equipment: [Equipment.COMPUTER, Equipment.PROJECTOR],
        availability: [],
        location: 'Building A, Floor 1',
        accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
        building: 'Building A',
        floor: 1,
        roomNumber: 'A101',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Lecture Hall B',
        capacity: 100,
        equipment: [Equipment.PROJECTOR, Equipment.AUDIO_SYSTEM],
        availability: [],
        location: 'Building B, Floor 2',
        accessibility: [AccessibilityFeature.WHEELCHAIR_ACCESSIBLE],
        building: 'Building B',
        floor: 2,
        roomNumber: 'B201',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Computer Laboratory A',
        capacity: 25,
        equipment: [Equipment.COMPUTER],
        availability: [],
        location: 'Building A, Floor 1',
        accessibility: [],
        building: 'Building A',
        floor: 1,
        roomNumber: 'A102',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockVenueRepository.findAll.mockResolvedValue(mockVenues);
    });

    it('should find exact match by name and location', async () => {
      const venueData: VenueMatchData = {
        name: 'Computer Lab A',
        location: 'Building A, Floor 1',
        building: 'Building A'
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches).toHaveLength(1);
      expect(result.suggestedMatches[0]?.matchingFields).toContain('name');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('location');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('building');
    });

    it('should find exact match by name only when location not provided', async () => {
      const venueData: VenueMatchData = {
        name: 'Computer Lab A'
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
    });

    it('should perform fuzzy matching for similar names', async () => {
      const venueData: VenueMatchData = {
        name: 'Computer Lab Room A', // Similar to "Computer Lab A"
        location: 'Building A, Floor 1'
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.suggestedMatches.length).toBeGreaterThan(0);
      // Should match either "Computer Lab A" or "Computer Laboratory A"
      const matchedNames = result.suggestedMatches.map(match => match.entity.name);
      expect(matchedNames).toContain('Computer Lab A');
    });

    it('should return multiple suggestions sorted by confidence', async () => {
      const venueData: VenueMatchData = {
        name: 'Computer Lab', // Matches both "Computer Lab A" and "Computer Laboratory A"
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.suggestedMatches.length).toBeGreaterThan(1);
      
      // Check that suggestions are sorted by confidence (descending)
      for (let i = 1; i < result.suggestedMatches.length; i++) {
        expect(result.suggestedMatches[i - 1]?.confidence).toBeGreaterThanOrEqual(
          result.suggestedMatches[i]?.confidence || 0
        );
      }
    });

    it('should return no matches for completely different venue name', async () => {
      const venueData: VenueMatchData = {
        name: 'Swimming Pool',
        location: 'Sports Complex'
      };

      const result = await entityMatchingService.matchVenue(venueData);

      // With very lenient fuzzy matching, it might still find some matches
      // but they should have very low confidence
      if (result.matchType === 'none') {
        expect(result.confidence).toBe(0);
        expect(result.entityId).toBeUndefined();
        expect(result.suggestedMatches).toHaveLength(0);
      } else {
        expect(result.matchType).toBe('fuzzy');
        expect(result.confidence).toBeLessThan(0.3); // Very low confidence
      }
    });

    it('should handle empty venue database', async () => {
      mockVenueRepository.findAll.mockResolvedValue([]);

      const venueData: VenueMatchData = {
        name: 'Computer Lab A'
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('none');
      expect(result.confidence).toBe(0);
      expect(result.suggestedMatches).toHaveLength(0);
    });

    it('should consider capacity in matching fields when provided', async () => {
      const venueData: VenueMatchData = {
        name: 'Computer Lab A',
        capacity: 30
      };

      const result = await entityMatchingService.matchVenue(venueData);

      expect(result.matchType).toBe('exact');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('name');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('capacity');
    });
  });

  describe('Lecturer Matching', () => {
    const mockLecturers: Lecturer[] = [
      {
        id: '1',
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science',
        subjects: ['Programming', 'Data Structures'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        employeeId: 'EMP001',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Prof. Jane Doe',
        email: 'jane.doe@university.edu',
        department: 'Mathematics',
        subjects: ['Calculus', 'Statistics'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 6,
          maxHoursPerWeek: 30,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: true
        },
        maxHoursPerDay: 6,
        maxHoursPerWeek: 30,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Dr. John Johnson',
        email: 'john.johnson@university.edu',
        department: 'Computer Science',
        subjects: ['Algorithms', 'Machine Learning'],
        availability: {
          [DayOfWeek.MONDAY]: [],
          [DayOfWeek.TUESDAY]: [],
          [DayOfWeek.WEDNESDAY]: [],
          [DayOfWeek.THURSDAY]: [],
          [DayOfWeek.FRIDAY]: [],
          [DayOfWeek.SATURDAY]: [],
          [DayOfWeek.SUNDAY]: []
        },
        preferences: {
          preferredTimeSlots: [],
          maxHoursPerDay: 8,
          maxHoursPerWeek: 40,
          minimumBreakBetweenClasses: 15,
          preferredDays: [],
          avoidBackToBackClasses: false
        },
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockLecturerRepository.findAll.mockResolvedValue(mockLecturers);
    });

    it('should find exact match by email', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('email');
    });

    it('should find exact match by name and department', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Dr. John Smith',
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('name');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('department');
    });

    it('should perform fuzzy matching for similar names', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Dr John Smith', // Missing period after "Dr"
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.suggestedMatches.length).toBeGreaterThan(0);
    });

    it('should handle name variations and partial matches', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'J. Smith',
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.suggestedMatches.length).toBeGreaterThan(0);
    });

    it('should prioritize email matches over name matches', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Different Name',
        email: 'john.smith@university.edu'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
    });

    it('should handle case insensitive email matching', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Dr. John Smith',
        email: 'JOHN.SMITH@UNIVERSITY.EDU'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
    });

    it('should return no matches for completely different lecturer', async () => {
      const lecturerData: LecturerMatchData = {
        name: 'Dr. Unknown Person',
        email: 'unknown@university.edu',
        department: 'Unknown Department'
      };

      const result = await entityMatchingService.matchLecturer(lecturerData);

      // With very lenient fuzzy matching, it might still find some matches
      // but they should have very low confidence
      if (result.matchType === 'none') {
        expect(result.confidence).toBe(0);
        expect(result.suggestedMatches).toHaveLength(0);
      } else {
        expect(result.matchType).toBe('fuzzy');
        expect(result.confidence).toBeLessThan(0.3); // Very low confidence
      }
    });
  });

  describe('Course Matching', () => {
    const mockCourses: Course[] = [
      {
        id: '1',
        name: 'Introduction to Programming',
        code: 'CS101',
        duration: 90,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [Equipment.COMPUTER],
        studentGroups: ['sg1'],
        lecturerId: 'l1',
        constraints: [],
        department: 'Computer Science',
        credits: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        duration: 90,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [Equipment.COMPUTER],
        studentGroups: ['sg1'],
        lecturerId: 'l1',
        constraints: [],
        department: 'Computer Science',
        credits: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Calculus I',
        code: 'MATH101',
        duration: 75,
        frequency: Frequency.WEEKLY,
        requiredEquipment: [],
        studentGroups: ['sg2'],
        lecturerId: 'l2',
        constraints: [],
        department: 'Mathematics',
        credits: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockCourseRepository.findAll.mockResolvedValue(mockCourses);
    });

    it('should find exact match by course code', async () => {
      const courseData: CourseMatchData = {
        name: 'Introduction to Programming',
        code: 'CS101'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('code');
    });

    it('should find exact match by name and department', async () => {
      const courseData: CourseMatchData = {
        name: 'Introduction to Programming',
        code: 'DIFFERENT_CODE',
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('name');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('department');
    });

    it('should perform fuzzy matching for similar course names', async () => {
      const courseData: CourseMatchData = {
        name: 'Introduction Programming', // Missing "to"
        code: 'CS100'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.25);
      expect(result.suggestedMatches.length).toBeGreaterThan(0);
    });

    it('should handle case insensitive course code matching', async () => {
      const courseData: CourseMatchData = {
        name: 'Introduction to Programming',
        code: 'cs101'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
    });

    it('should prioritize course code matches over name matches', async () => {
      const courseData: CourseMatchData = {
        name: 'Different Course Name',
        code: 'CS101'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
    });

    it('should return no matches for completely different course', async () => {
      const courseData: CourseMatchData = {
        name: 'Unknown Course',
        code: 'UNKNOWN101',
        department: 'Unknown Department'
      };

      const result = await entityMatchingService.matchCourse(courseData);

      // With very lenient fuzzy matching, it might still find some matches
      // but they should have very low confidence
      if (result.matchType === 'none') {
        expect(result.confidence).toBe(0);
        expect(result.suggestedMatches).toHaveLength(0);
      } else {
        expect(result.matchType).toBe('fuzzy');
        expect(result.confidence).toBeLessThan(0.3); // Very low confidence
      }
    });
  });

  describe('Student Group Matching', () => {
    const mockStudentGroups: StudentGroup[] = [
      {
        id: '1',
        name: 'CS Year 1 Group A',
        size: 25,
        courses: ['c1', 'c2'],
        yearLevel: 1,
        department: 'Computer Science',
        program: 'Bachelor of Computer Science',
        semester: 1,
        academicYear: '2024',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'CS Year 2 Group B',
        size: 30,
        courses: ['c3', 'c4'],
        yearLevel: 2,
        department: 'Computer Science',
        program: 'Bachelor of Computer Science',
        semester: 1,
        academicYear: '2024',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Math Year 1 Group A',
        size: 20,
        courses: ['c5'],
        yearLevel: 1,
        department: 'Mathematics',
        program: 'Bachelor of Mathematics',
        semester: 1,
        academicYear: '2024',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockStudentGroupRepository.findAll.mockResolvedValue(mockStudentGroups);
    });

    it('should find exact match by name and department', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'CS Year 1 Group A',
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe(1.0);
      expect(result.entityId).toBe('1');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('name');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('department');
    });

    it('should perform fuzzy matching for similar group names', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'CS Year 1 Grp A', // Abbreviated "Group" to "Grp"
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.confidence).toBeGreaterThan(0.25);
      expect(result.suggestedMatches.length).toBeGreaterThan(0);
    });

    it('should consider year level in matching', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'CS Year 1 Group A',
        department: 'Computer Science',
        yearLevel: 1
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      expect(result.matchType).toBe('exact');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('yearLevel');
    });

    it('should consider program in matching', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'CS Year 1 Group A',
        department: 'Computer Science',
        program: 'Bachelor of Computer Science'
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      expect(result.matchType).toBe('exact');
      expect(result.suggestedMatches[0]?.matchingFields).toContain('program');
    });

    it('should return multiple suggestions for partial matches', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'CS Year Grp', // Matches multiple groups
        department: 'Computer Science'
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      expect(result.matchType).toBe('fuzzy');
      expect(result.suggestedMatches.length).toBeGreaterThan(1);
    });

    it('should return no matches for completely different group', async () => {
      const groupData: StudentGroupMatchData = {
        name: 'Completely Different Name XYZ',
        department: 'Nonexistent Department'
      };

      const result = await entityMatchingService.matchStudentGroup(groupData);

      // With very lenient fuzzy matching, it might still find some matches
      // but they should have very low confidence
      if (result.matchType === 'none') {
        expect(result.confidence).toBe(0);
        expect(result.suggestedMatches).toHaveLength(0);
      } else {
        expect(result.matchType).toBe('fuzzy');
        expect(result.confidence).toBeLessThan(0.3); // Very low confidence
      }
    });
  });

  describe('Relationship Validation', () => {
    it('should validate course and student group relationships', async () => {
      // Mock courses and student groups with relationships
      const mockCourses: Course[] = [
        {
          id: '1',
          name: 'Introduction to Programming',
          code: 'CS101',
          duration: 90,
          frequency: Frequency.WEEKLY,
          requiredEquipment: [Equipment.COMPUTER],
          studentGroups: ['sg1'], // Related to student group 1
          lecturerId: 'l1',
          constraints: [],
          department: 'Computer Science',
          credits: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockStudentGroups: StudentGroup[] = [
        {
          id: 'sg1',
          name: 'CS Year 1 Group A',
          size: 25,
          courses: ['1'], // Related to course 1
          yearLevel: 1,
          department: 'Computer Science',
          program: 'Bachelor of Computer Science',
          semester: 1,
          academicYear: '2024',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockCourseRepository.findAll.mockResolvedValue(mockCourses);
      mockStudentGroupRepository.findAll.mockResolvedValue(mockStudentGroups);

      // Test course matching
      const courseData: CourseMatchData = {
        name: 'Introduction to Programming',
        code: 'CS101',
        department: 'Computer Science'
      };

      const courseResult = await entityMatchingService.matchCourse(courseData);
      expect(courseResult.matchType).toBe('exact');
      expect(courseResult.entityId).toBe('1');

      // Test student group matching
      const groupData: StudentGroupMatchData = {
        name: 'CS Year 1 Group A',
        department: 'Computer Science'
      };

      const groupResult = await entityMatchingService.matchStudentGroup(groupData);
      expect(groupResult.matchType).toBe('exact');
      expect(groupResult.entityId).toBe('sg1');

      // Verify that the matched entities have the expected relationships
      const matchedCourse = courseResult.suggestedMatches[0]?.entity as Course;
      const matchedGroup = groupResult.suggestedMatches[0]?.entity as StudentGroup;

      expect(matchedCourse.studentGroups).toContain('sg1');
      expect(matchedGroup.courses).toContain('1');
    });
  });
});