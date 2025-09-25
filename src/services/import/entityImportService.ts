import { logger } from '../../utils/logger';
import { venueRepository } from '../../repositories/venueRepository';
import { lecturerRepository } from '../../repositories/lecturerRepository';
import { courseRepository } from '../../repositories/courseRepository';
import { studentGroupRepository } from '../../repositories/studentGroupRepository';
import { 
  MappedImportData, 
  EntityMatchResults, 
  MatchResult 
} from '../../types/import';
import { 
  CreateVenueRequest, 
  UpdateVenueRequest, 
  Venue 
} from '../../models/venue';
import { 
  CreateLecturerRequest, 
  UpdateLecturerRequest, 
  Lecturer 
} from '../../models/lecturer';
import { 
  CreateCourseRequest, 
  UpdateCourseRequest, 
  Course 
} from '../../models/course';
import { 
  CreateStudentGroupRequest, 
  UpdateStudentGroupRequest, 
  StudentGroup 
} from '../../models/studentGroup';
import { Frequency } from '../../models/common';

export interface EntityImportResult {
  venues: EntityOperationResult;
  lecturers: EntityOperationResult;
  courses: EntityOperationResult;
  studentGroups: EntityOperationResult;
}

export interface EntityOperationResult {
  created: number;
  updated: number;
  failed: number;
  errors: EntityImportError[];
}

export interface EntityImportError {
  rowIndex: number;
  entityType: string;
  operation: 'create' | 'update';
  error: string;
  data: any;
}

export class EntityImportService {
  private static instance: EntityImportService;

  private constructor() {}

  public static getInstance(): EntityImportService {
    if (!EntityImportService.instance) {
      EntityImportService.instance = new EntityImportService();
    }
    return EntityImportService.instance;
  }

  public async importEntities(
    mappedData: MappedImportData,
    matchResults: EntityMatchResults
  ): Promise<EntityImportResult> {
    logger.info('Starting entity import process');

    const result: EntityImportResult = {
      venues: { created: 0, updated: 0, failed: 0, errors: [] },
      lecturers: { created: 0, updated: 0, failed: 0, errors: [] },
      courses: { created: 0, updated: 0, failed: 0, errors: [] },
      studentGroups: { created: 0, updated: 0, failed: 0, errors: [] }
    };

    try {
      // Import venues first (no dependencies)
      result.venues = await this.importVenues(mappedData.venues, matchResults.venues);
      
      // Import lecturers (no dependencies)
      result.lecturers = await this.importLecturers(mappedData.lecturers, matchResults.lecturers);
      
      // Import student groups (no dependencies)
      result.studentGroups = await this.importStudentGroups(mappedData.studentGroups, matchResults.studentGroups);
      
      // Import courses last (depends on lecturers and student groups)
      result.courses = await this.importCourses(mappedData.courses, matchResults.courses);

      logger.info('Entity import process completed', {
        venues: result.venues,
        lecturers: result.lecturers,
        courses: result.courses,
        studentGroups: result.studentGroups
      });

      return result;

    } catch (error) {
      logger.error('Entity import process failed:', error);
      throw error;
    }
  }

  private async importVenues(
    venueData: Partial<Venue>[],
    matchResults: Map<number, MatchResult>
  ): Promise<EntityOperationResult> {
    const result: EntityOperationResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    logger.info(`Importing ${venueData.length} venues`);

    for (let i = 0; i < venueData.length; i++) {
      const venue = venueData[i];
      if (!venue) continue;
      
      const matchResult = matchResults.get(i);

      try {
        if (matchResult?.entityId) {
          // Update existing venue
          const updateData = this.mapToUpdateVenueRequest(venue, matchResult.entityId);
          const updatedVenue = await venueRepository.update(matchResult.entityId, updateData);
          
          if (updatedVenue) {
            result.updated++;
            logger.debug(`Updated venue: ${updatedVenue.name}`);
          } else {
            throw new Error('Failed to update venue - entity not found');
          }
        } else {
          // Create new venue
          const createData = this.mapToCreateVenueRequest(venue);
          const createdVenue = await venueRepository.create(createData);
          
          result.created++;
          logger.debug(`Created venue: ${createdVenue.name}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          rowIndex: i,
          entityType: 'venue',
          operation: matchResult?.entityId ? 'update' : 'create',
          error: error instanceof Error ? error.message : String(error),
          data: venue
        });
        logger.error(`Failed to import venue at row ${i}:`, error);
      }
    }

    return result;
  }

  private async importLecturers(
    lecturerData: Partial<Lecturer>[],
    matchResults: Map<number, MatchResult>
  ): Promise<EntityOperationResult> {
    const result: EntityOperationResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    logger.info(`Importing ${lecturerData.length} lecturers`);

    for (let i = 0; i < lecturerData.length; i++) {
      const lecturer = lecturerData[i];
      if (!lecturer) continue;
      
      const matchResult = matchResults.get(i);

      try {
        if (matchResult?.entityId) {
          // Update existing lecturer
          const updateData = this.mapToUpdateLecturerRequest(lecturer, matchResult.entityId);
          const updatedLecturer = await lecturerRepository.update(matchResult.entityId, updateData);
          
          if (updatedLecturer) {
            result.updated++;
            logger.debug(`Updated lecturer: ${updatedLecturer.name}`);
          } else {
            throw new Error('Failed to update lecturer - entity not found');
          }
        } else {
          // Create new lecturer
          const createData = this.mapToCreateLecturerRequest(lecturer);
          const createdLecturer = await lecturerRepository.create(createData);
          
          result.created++;
          logger.debug(`Created lecturer: ${createdLecturer.name}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          rowIndex: i,
          entityType: 'lecturer',
          operation: matchResult?.entityId ? 'update' : 'create',
          error: error instanceof Error ? error.message : String(error),
          data: lecturer
        });
        logger.error(`Failed to import lecturer at row ${i}:`, error);
      }
    }

    return result;
  }

  private async importStudentGroups(
    studentGroupData: Partial<StudentGroup>[],
    matchResults: Map<number, MatchResult>
  ): Promise<EntityOperationResult> {
    const result: EntityOperationResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    logger.info(`Importing ${studentGroupData.length} student groups`);

    for (let i = 0; i < studentGroupData.length; i++) {
      const studentGroup = studentGroupData[i];
      if (!studentGroup) continue;
      
      const matchResult = matchResults.get(i);

      try {
        if (matchResult?.entityId) {
          // Update existing student group
          const updateData = this.mapToUpdateStudentGroupRequest(studentGroup, matchResult.entityId);
          const updatedStudentGroup = await studentGroupRepository.update(matchResult.entityId, updateData);
          
          if (updatedStudentGroup) {
            result.updated++;
            logger.debug(`Updated student group: ${updatedStudentGroup.name}`);
          } else {
            throw new Error('Failed to update student group - entity not found');
          }
        } else {
          // Create new student group
          const createData = this.mapToCreateStudentGroupRequest(studentGroup);
          const createdStudentGroup = await studentGroupRepository.create(createData);
          
          result.created++;
          logger.debug(`Created student group: ${createdStudentGroup.name}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          rowIndex: i,
          entityType: 'studentGroup',
          operation: matchResult?.entityId ? 'update' : 'create',
          error: error instanceof Error ? error.message : String(error),
          data: studentGroup
        });
        logger.error(`Failed to import student group at row ${i}:`, error);
      }
    }

    return result;
  }

  private async importCourses(
    courseData: Partial<Course>[],
    matchResults: Map<number, MatchResult>
  ): Promise<EntityOperationResult> {
    const result: EntityOperationResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    logger.info(`Importing ${courseData.length} courses`);

    for (let i = 0; i < courseData.length; i++) {
      const course = courseData[i];
      if (!course) continue;
      
      const matchResult = matchResults.get(i);

      try {
        if (matchResult?.entityId) {
          // Update existing course
          const updateData = this.mapToUpdateCourseRequest(course, matchResult.entityId);
          const updatedCourse = await courseRepository.update(matchResult.entityId, updateData);
          
          if (updatedCourse) {
            result.updated++;
            logger.debug(`Updated course: ${updatedCourse.name}`);
          } else {
            throw new Error('Failed to update course - entity not found');
          }
        } else {
          // Create new course
          const createData = this.mapToCreateCourseRequest(course);
          const createdCourse = await courseRepository.create(createData);
          
          result.created++;
          logger.debug(`Created course: ${createdCourse.name}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          rowIndex: i,
          entityType: 'course',
          operation: matchResult?.entityId ? 'update' : 'create',
          error: error instanceof Error ? error.message : String(error),
          data: course
        });
        logger.error(`Failed to import course at row ${i}:`, error);
      }
    }

    return result;
  }

  // Mapping functions for venues
  private mapToCreateVenueRequest(venue: Partial<Venue>): CreateVenueRequest {
    const request: CreateVenueRequest = {
      name: venue.name || '',
      capacity: venue.capacity || 0,
      equipment: venue.equipment || [],
      location: venue.location || '',
      accessibility: venue.accessibility || [],
      availability: venue.availability || []
    };

    if (venue.building !== undefined) request.building = venue.building;
    if (venue.floor !== undefined) request.floor = venue.floor;
    if (venue.roomNumber !== undefined) request.roomNumber = venue.roomNumber;
    if (venue.description !== undefined) request.description = venue.description;

    return request;
  }

  private mapToUpdateVenueRequest(venue: Partial<Venue>, entityId?: string): UpdateVenueRequest {
    const updateData: UpdateVenueRequest = {
      id: entityId || venue.id || ''
    };

    if (venue.name !== undefined) updateData.name = venue.name;
    if (venue.capacity !== undefined) updateData.capacity = venue.capacity;
    if (venue.equipment !== undefined) updateData.equipment = venue.equipment;
    if (venue.location !== undefined) updateData.location = venue.location;
    if (venue.accessibility !== undefined) updateData.accessibility = venue.accessibility;
    if (venue.availability !== undefined) updateData.availability = venue.availability;
    if (venue.building !== undefined) updateData.building = venue.building;
    if (venue.floor !== undefined) updateData.floor = venue.floor;
    if (venue.roomNumber !== undefined) updateData.roomNumber = venue.roomNumber;
    if (venue.description !== undefined) updateData.description = venue.description;

    return updateData;
  }

  // Mapping functions for lecturers
  private mapToCreateLecturerRequest(lecturer: Partial<Lecturer>): CreateLecturerRequest {
    const request: CreateLecturerRequest = {
      name: lecturer.name || '',
      email: lecturer.email || '',
      department: lecturer.department || '',
      subjects: lecturer.subjects || [],
      availability: lecturer.availability || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      },
      preferences: lecturer.preferences || {
        preferredTimeSlots: [],
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        minimumBreakBetweenClasses: 15,
        preferredDays: [],
        avoidBackToBackClasses: false,
        preferredVenues: []
      },
      maxHoursPerDay: lecturer.maxHoursPerDay || 8,
      maxHoursPerWeek: lecturer.maxHoursPerWeek || 40
    };

    if (lecturer.employeeId !== undefined) request.employeeId = lecturer.employeeId;
    if (lecturer.phone !== undefined) request.phone = lecturer.phone;
    if (lecturer.title !== undefined) request.title = lecturer.title;

    return request;
  }

  private mapToUpdateLecturerRequest(lecturer: Partial<Lecturer>, entityId?: string): UpdateLecturerRequest {
    const updateData: UpdateLecturerRequest = {
      id: entityId || lecturer.id || ''
    };

    if (lecturer.name !== undefined) updateData.name = lecturer.name;
    if (lecturer.email !== undefined) updateData.email = lecturer.email;
    if (lecturer.department !== undefined) updateData.department = lecturer.department;
    if (lecturer.subjects !== undefined) updateData.subjects = lecturer.subjects;
    if (lecturer.availability !== undefined) updateData.availability = lecturer.availability;
    if (lecturer.preferences !== undefined) updateData.preferences = lecturer.preferences;
    if (lecturer.maxHoursPerDay !== undefined) updateData.maxHoursPerDay = lecturer.maxHoursPerDay;
    if (lecturer.maxHoursPerWeek !== undefined) updateData.maxHoursPerWeek = lecturer.maxHoursPerWeek;
    if (lecturer.employeeId !== undefined) updateData.employeeId = lecturer.employeeId;
    if (lecturer.phone !== undefined) updateData.phone = lecturer.phone;
    if (lecturer.title !== undefined) updateData.title = lecturer.title;

    return updateData;
  }

  // Mapping functions for student groups
  private mapToCreateStudentGroupRequest(studentGroup: Partial<StudentGroup>): CreateStudentGroupRequest {
    const request: CreateStudentGroupRequest = {
      name: studentGroup.name || '',
      size: studentGroup.size || 0,
      yearLevel: studentGroup.yearLevel || 1,
      department: studentGroup.department || '',
      courses: studentGroup.courses || []
    };

    if (studentGroup.program !== undefined) request.program = studentGroup.program;
    if (studentGroup.semester !== undefined) request.semester = studentGroup.semester;
    if (studentGroup.academicYear !== undefined) request.academicYear = studentGroup.academicYear;

    return request;
  }

  private mapToUpdateStudentGroupRequest(studentGroup: Partial<StudentGroup>, entityId?: string): UpdateStudentGroupRequest {
    const updateData: UpdateStudentGroupRequest = {
      id: entityId || studentGroup.id || ''
    };

    if (studentGroup.name !== undefined) updateData.name = studentGroup.name;
    if (studentGroup.size !== undefined) updateData.size = studentGroup.size;
    if (studentGroup.yearLevel !== undefined) updateData.yearLevel = studentGroup.yearLevel;
    if (studentGroup.department !== undefined) updateData.department = studentGroup.department;
    if (studentGroup.courses !== undefined) updateData.courses = studentGroup.courses;
    if (studentGroup.program !== undefined) updateData.program = studentGroup.program;
    if (studentGroup.semester !== undefined) updateData.semester = studentGroup.semester;
    if (studentGroup.academicYear !== undefined) updateData.academicYear = studentGroup.academicYear;

    return updateData;
  }

  // Mapping functions for courses
  private mapToCreateCourseRequest(course: Partial<Course>): CreateCourseRequest {
    const request: CreateCourseRequest = {
      name: course.name || '',
      code: course.code || '',
      duration: course.duration || 60,
      frequency: course.frequency || Frequency.WEEKLY,
      requiredEquipment: course.requiredEquipment || [],
      lecturerId: course.lecturerId || '',
      department: course.department || '',
      credits: course.credits || 1,
      studentGroups: course.studentGroups || [],
      constraints: course.constraints || []
    };

    if (course.description !== undefined) request.description = course.description;
    if (course.prerequisites !== undefined) request.prerequisites = course.prerequisites;

    return request;
  }

  private mapToUpdateCourseRequest(course: Partial<Course>, entityId?: string): UpdateCourseRequest {
    const updateData: UpdateCourseRequest = {
      id: entityId || course.id || ''
    };

    if (course.name !== undefined) updateData.name = course.name;
    if (course.code !== undefined) updateData.code = course.code;
    if (course.duration !== undefined) updateData.duration = course.duration;
    if (course.frequency !== undefined) updateData.frequency = course.frequency;
    if (course.requiredEquipment !== undefined) updateData.requiredEquipment = course.requiredEquipment;
    if (course.lecturerId !== undefined) updateData.lecturerId = course.lecturerId;
    if (course.department !== undefined) updateData.department = course.department;
    if (course.credits !== undefined) updateData.credits = course.credits;
    if (course.studentGroups !== undefined) updateData.studentGroups = course.studentGroups;
    if (course.constraints !== undefined) updateData.constraints = course.constraints;
    if (course.description !== undefined) updateData.description = course.description;
    if (course.prerequisites !== undefined) updateData.prerequisites = course.prerequisites;

    return updateData;
  }
}

// Export singleton instance
export const entityImportService = EntityImportService.getInstance();