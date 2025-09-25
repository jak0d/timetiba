import Fuse from 'fuse.js';
import { MatchResult, SuggestedMatch } from '../../types/import';
import { Venue } from '../../models/venue';
import { Lecturer } from '../../models/lecturer';
import { Course } from '../../models/course';
import { StudentGroup } from '../../models/studentGroup';
import { venueRepository } from '../../repositories/venueRepository';
import { lecturerRepository } from '../../repositories/lecturerRepository';
import { courseRepository } from '../../repositories/courseRepository';
import { studentGroupRepository } from '../../repositories/studentGroupRepository';

export interface VenueMatchData {
  name: string;
  location?: string;
  building?: string;
  capacity?: number;
}

export interface LecturerMatchData {
  name: string;
  email?: string;
  department?: string;
  employeeId?: string;
}

export interface CourseMatchData {
  name: string;
  code: string;
  department?: string;
}

export interface StudentGroupMatchData {
  name: string;
  department?: string;
  yearLevel?: number;
  program?: string;
}

export class EntityMatchingService {
  private readonly EXACT_MATCH_THRESHOLD = 1.0;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;

  /**
   * Match venue using name and location fields with fuzzy search
   */
  async matchVenue(venueData: VenueMatchData): Promise<MatchResult> {
    const existingVenues = await venueRepository.findAll();
    
    if (existingVenues.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    // Try exact match first
    const exactMatch = this.findExactVenueMatch(venueData, existingVenues);
    if (exactMatch) {
      return {
        entityId: exactMatch.id,
        confidence: this.EXACT_MATCH_THRESHOLD,
        matchType: 'exact',
        suggestedMatches: [{
          entityId: exactMatch.id,
          entity: exactMatch,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchingFields: this.getVenueMatchingFields(venueData, exactMatch)
        }]
      };
    }

    // Perform fuzzy matching
    const fuzzyMatches = this.performVenueFuzzyMatch(venueData, existingVenues);
    
    if (fuzzyMatches.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const bestMatch = fuzzyMatches[0];
    if (!bestMatch) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const result: MatchResult = {
      confidence: bestMatch.confidence,
      matchType: 'fuzzy',
      suggestedMatches: fuzzyMatches.slice(0, 5) // Return top 5 matches
    };

    if (bestMatch.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      result.entityId = bestMatch.entityId;
    }

    return result;
  }

  /**
   * Match lecturer using name and email combination
   */
  async matchLecturer(lecturerData: LecturerMatchData): Promise<MatchResult> {
    const existingLecturers = await lecturerRepository.findAll();
    
    if (existingLecturers.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    // Try exact match first (email is unique)
    if (lecturerData.email) {
      const exactMatch = existingLecturers.find(lecturer => 
        lecturer.email.toLowerCase() === lecturerData.email!.toLowerCase()
      );
      
      if (exactMatch) {
        return {
          entityId: exactMatch.id,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchType: 'exact',
          suggestedMatches: [{
            entityId: exactMatch.id,
            entity: exactMatch,
            confidence: this.EXACT_MATCH_THRESHOLD,
            matchingFields: ['email']
          }]
        };
      }
    }

    // Try exact name match with same department
    if (lecturerData.department) {
      const exactNameMatch = existingLecturers.find(lecturer => 
        lecturer.name.toLowerCase() === lecturerData.name.toLowerCase() &&
        lecturer.department.toLowerCase() === lecturerData.department!.toLowerCase()
      );
      
      if (exactNameMatch) {
        return {
          entityId: exactNameMatch.id,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchType: 'exact',
          suggestedMatches: [{
            entityId: exactNameMatch.id,
            entity: exactNameMatch,
            confidence: this.EXACT_MATCH_THRESHOLD,
            matchingFields: ['name', 'department']
          }]
        };
      }
    }

    // Perform fuzzy matching
    const fuzzyMatches = this.performLecturerFuzzyMatch(lecturerData, existingLecturers);
    
    if (fuzzyMatches.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const bestMatch = fuzzyMatches[0];
    if (!bestMatch) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const result: MatchResult = {
      confidence: bestMatch.confidence,
      matchType: 'fuzzy',
      suggestedMatches: fuzzyMatches.slice(0, 5)
    };

    if (bestMatch.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      result.entityId = bestMatch.entityId;
    }

    return result;
  }

  /**
   * Match course using course code and name
   */
  async matchCourse(courseData: CourseMatchData): Promise<MatchResult> {
    const existingCourses = await courseRepository.findAll();
    
    if (existingCourses.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    // Try exact match by course code (should be unique)
    const exactCodeMatch = existingCourses.find(course => 
      course.code.toLowerCase() === courseData.code.toLowerCase()
    );
    
    if (exactCodeMatch) {
      return {
        entityId: exactCodeMatch.id,
        confidence: this.EXACT_MATCH_THRESHOLD,
        matchType: 'exact',
        suggestedMatches: [{
          entityId: exactCodeMatch.id,
          entity: exactCodeMatch,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchingFields: ['code']
        }]
      };
    }

    // Try exact name match with same department
    if (courseData.department) {
      const exactNameMatch = existingCourses.find(course => 
        course.name.toLowerCase() === courseData.name.toLowerCase() &&
        course.department.toLowerCase() === courseData.department!.toLowerCase()
      );
      
      if (exactNameMatch) {
        return {
          entityId: exactNameMatch.id,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchType: 'exact',
          suggestedMatches: [{
            entityId: exactNameMatch.id,
            entity: exactNameMatch,
            confidence: this.EXACT_MATCH_THRESHOLD,
            matchingFields: ['name', 'department']
          }]
        };
      }
    }

    // Perform fuzzy matching
    const fuzzyMatches = this.performCourseFuzzyMatch(courseData, existingCourses);
    
    if (fuzzyMatches.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const bestMatch = fuzzyMatches[0];
    if (!bestMatch) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const result: MatchResult = {
      confidence: bestMatch.confidence,
      matchType: 'fuzzy',
      suggestedMatches: fuzzyMatches.slice(0, 5)
    };

    if (bestMatch.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      result.entityId = bestMatch.entityId;
    }

    return result;
  }

  /**
   * Match student group by name and department
   */
  async matchStudentGroup(groupData: StudentGroupMatchData): Promise<MatchResult> {
    const existingGroups = await studentGroupRepository.findAll();
    
    if (existingGroups.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    // Try exact match by name and department
    if (groupData.department) {
      const exactMatch = existingGroups.find(group => 
        group.name.toLowerCase() === groupData.name.toLowerCase() &&
        group.department.toLowerCase() === groupData.department!.toLowerCase()
      );
      
      if (exactMatch) {
        return {
          entityId: exactMatch.id,
          confidence: this.EXACT_MATCH_THRESHOLD,
          matchType: 'exact',
          suggestedMatches: [{
            entityId: exactMatch.id,
            entity: exactMatch,
            confidence: this.EXACT_MATCH_THRESHOLD,
            matchingFields: this.getStudentGroupMatchingFields(groupData, exactMatch)
          }]
        };
      }
    }

    // Perform fuzzy matching
    const fuzzyMatches = this.performStudentGroupFuzzyMatch(groupData, existingGroups);
    
    if (fuzzyMatches.length === 0) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const bestMatch = fuzzyMatches[0];
    if (!bestMatch) {
      return {
        confidence: 0,
        matchType: 'none',
        suggestedMatches: []
      };
    }

    const result: MatchResult = {
      confidence: bestMatch.confidence,
      matchType: 'fuzzy',
      suggestedMatches: fuzzyMatches.slice(0, 5)
    };

    if (bestMatch.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      result.entityId = bestMatch.entityId;
    }

    return result;
  }

  private findExactVenueMatch(venueData: VenueMatchData, existingVenues: Venue[]): Venue | null {
    return existingVenues.find(venue => {
      const nameMatch = venue.name.toLowerCase() === venueData.name.toLowerCase();
      const locationMatch = !venueData.location || 
        venue.location.toLowerCase() === venueData.location.toLowerCase();
      const buildingMatch = !venueData.building || 
        venue.building?.toLowerCase() === venueData.building.toLowerCase();
      
      return nameMatch && locationMatch && buildingMatch;
    }) || null;
  }

  private performVenueFuzzyMatch(venueData: VenueMatchData, existingVenues: Venue[]): SuggestedMatch[] {
    // Create search strings for fuzzy matching
    const searchableVenues = existingVenues.map(venue => ({
      id: venue.id,
      entity: venue,
      searchText: this.createVenueSearchText(venue),
      name: venue.name,
      location: venue.location,
      building: venue.building || ''
    }));

    const queryText = this.createVenueSearchText(venueData);

    // Configure Fuse.js for venue matching
    const fuse = new Fuse(searchableVenues, {
      keys: [
        { name: 'searchText', weight: 0.4 },
        { name: 'name', weight: 0.3 },
        { name: 'location', weight: 0.2 },
        { name: 'building', weight: 0.1 }
      ],
      threshold: 0.8,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(queryText);
    
    return results
      .map(result => {
        const confidence = 1 - (result.score || 1);
        return {
          entityId: result.item.id,
          entity: result.item.entity,
          confidence,
          matchingFields: this.getVenueMatchingFields(venueData, result.item.entity)
        };
      })
      // .filter(match => match.confidence >= this.LOW_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private performLecturerFuzzyMatch(lecturerData: LecturerMatchData, existingLecturers: Lecturer[]): SuggestedMatch[] {
    // Create search strings for fuzzy matching
    const searchableLecturers = existingLecturers.map(lecturer => ({
      id: lecturer.id,
      entity: lecturer,
      searchText: this.createLecturerSearchText(lecturer),
      name: lecturer.name,
      email: lecturer.email,
      department: lecturer.department,
      employeeId: lecturer.employeeId || ''
    }));

    const queryText = this.createLecturerSearchText(lecturerData);

    // Configure Fuse.js for lecturer matching
    const fuse = new Fuse(searchableLecturers, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'email', weight: 0.3 },
        { name: 'department', weight: 0.2 },
        { name: 'employeeId', weight: 0.1 }
      ],
      threshold: 0.8,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(queryText);
    
    return results
      .map(result => {
        const confidence = 1 - (result.score || 1);
        return {
          entityId: result.item.id,
          entity: result.item.entity,
          confidence,
          matchingFields: this.getLecturerMatchingFields(lecturerData, result.item.entity)
        };
      })
      // .filter(match => match.confidence >= this.LOW_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private performCourseFuzzyMatch(courseData: CourseMatchData, existingCourses: Course[]): SuggestedMatch[] {
    // Create search strings for fuzzy matching
    const searchableCourses = existingCourses.map(course => ({
      id: course.id,
      entity: course,
      searchText: this.createCourseSearchText(course),
      name: course.name,
      code: course.code,
      department: course.department
    }));

    const queryText = this.createCourseSearchText(courseData);

    // Configure Fuse.js for course matching
    const fuse = new Fuse(searchableCourses, {
      keys: [
        { name: 'code', weight: 0.4 },
        { name: 'name', weight: 0.3 },
        { name: 'department', weight: 0.2 },
        { name: 'searchText', weight: 0.1 }
      ],
      threshold: 0.8,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(queryText);
    
    return results
      .map(result => {
        const confidence = 1 - (result.score || 1);
        return {
          entityId: result.item.id,
          entity: result.item.entity,
          confidence,
          matchingFields: this.getCourseMatchingFields(courseData, result.item.entity)
        };
      })
      // .filter(match => match.confidence >= this.LOW_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private performStudentGroupFuzzyMatch(groupData: StudentGroupMatchData, existingGroups: StudentGroup[]): SuggestedMatch[] {
    // Create search strings for fuzzy matching
    const searchableGroups = existingGroups.map(group => ({
      id: group.id,
      entity: group,
      searchText: this.createStudentGroupSearchText(group),
      name: group.name,
      department: group.department,
      program: group.program || '',
      yearLevel: group.yearLevel.toString()
    }));

    const queryText = this.createStudentGroupSearchText(groupData);

    // Configure Fuse.js for student group matching
    const fuse = new Fuse(searchableGroups, {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'department', weight: 0.3 },
        { name: 'program', weight: 0.2 },
        { name: 'yearLevel', weight: 0.1 }
      ],
      threshold: 0.8,
      includeScore: true,
      minMatchCharLength: 1
    });

    const results = fuse.search(queryText);
    
    return results
      .map(result => {
        const confidence = 1 - (result.score || 1);
        return {
          entityId: result.item.id,
          entity: result.item.entity,
          confidence,
          matchingFields: this.getStudentGroupMatchingFields(groupData, result.item.entity)
        };
      })
      // .filter(match => match.confidence >= this.LOW_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private createVenueSearchText(venue: VenueMatchData | Venue): string {
    const parts = [venue.name];
    
    if ('location' in venue && venue.location) {
      parts.push(venue.location);
    }
    
    if ('building' in venue && venue.building) {
      parts.push(venue.building);
    }
    
    return parts.join(' ').toLowerCase();
  }

  private createLecturerSearchText(lecturer: LecturerMatchData | Lecturer): string {
    const parts = [lecturer.name];
    
    if ('email' in lecturer && lecturer.email) {
      parts.push(lecturer.email);
    }
    
    if ('department' in lecturer && lecturer.department) {
      parts.push(lecturer.department);
    }
    
    if ('employeeId' in lecturer && lecturer.employeeId) {
      parts.push(lecturer.employeeId);
    }
    
    return parts.join(' ').toLowerCase();
  }

  private createCourseSearchText(course: CourseMatchData | Course): string {
    const parts = [course.name, course.code];
    
    if ('department' in course && course.department) {
      parts.push(course.department);
    }
    
    return parts.join(' ').toLowerCase();
  }

  private createStudentGroupSearchText(group: StudentGroupMatchData | StudentGroup): string {
    const parts = [group.name];
    
    if ('department' in group && group.department) {
      parts.push(group.department);
    }
    
    if ('program' in group && group.program) {
      parts.push(group.program);
    }
    
    if ('yearLevel' in group && group.yearLevel) {
      parts.push(group.yearLevel.toString());
    }
    
    return parts.join(' ').toLowerCase();
  }

  private getVenueMatchingFields(venueData: VenueMatchData, venue: Venue): string[] {
    const matchingFields: string[] = [];
    
    if (venue.name.toLowerCase() === venueData.name.toLowerCase()) {
      matchingFields.push('name');
    }
    
    if (venueData.location && venue.location.toLowerCase() === venueData.location.toLowerCase()) {
      matchingFields.push('location');
    }
    
    if (venueData.building && venue.building?.toLowerCase() === venueData.building.toLowerCase()) {
      matchingFields.push('building');
    }
    
    if (venueData.capacity && venue.capacity === venueData.capacity) {
      matchingFields.push('capacity');
    }
    
    return matchingFields;
  }

  private getLecturerMatchingFields(lecturerData: LecturerMatchData, lecturer: Lecturer): string[] {
    const matchingFields: string[] = [];
    
    if (lecturer.name.toLowerCase() === lecturerData.name.toLowerCase()) {
      matchingFields.push('name');
    }
    
    if (lecturerData.email && lecturer.email.toLowerCase() === lecturerData.email.toLowerCase()) {
      matchingFields.push('email');
    }
    
    if (lecturerData.department && lecturer.department.toLowerCase() === lecturerData.department.toLowerCase()) {
      matchingFields.push('department');
    }
    
    if (lecturerData.employeeId && lecturer.employeeId?.toLowerCase() === lecturerData.employeeId.toLowerCase()) {
      matchingFields.push('employeeId');
    }
    
    return matchingFields;
  }

  private getCourseMatchingFields(courseData: CourseMatchData, course: Course): string[] {
    const matchingFields: string[] = [];
    
    if (course.name.toLowerCase() === courseData.name.toLowerCase()) {
      matchingFields.push('name');
    }
    
    if (course.code.toLowerCase() === courseData.code.toLowerCase()) {
      matchingFields.push('code');
    }
    
    if (courseData.department && course.department.toLowerCase() === courseData.department.toLowerCase()) {
      matchingFields.push('department');
    }
    
    return matchingFields;
  }

  private getStudentGroupMatchingFields(groupData: StudentGroupMatchData, group: StudentGroup): string[] {
    const matchingFields: string[] = [];
    
    if (group.name.toLowerCase() === groupData.name.toLowerCase()) {
      matchingFields.push('name');
    }
    
    if (groupData.department && group.department.toLowerCase() === groupData.department.toLowerCase()) {
      matchingFields.push('department');
    }
    
    if (groupData.program && group.program?.toLowerCase() === groupData.program.toLowerCase()) {
      matchingFields.push('program');
    }
    
    if (groupData.yearLevel && group.yearLevel === groupData.yearLevel) {
      matchingFields.push('yearLevel');
    }
    
    return matchingFields;
  }
}

// Export singleton instance
export const entityMatchingService = new EntityMatchingService();