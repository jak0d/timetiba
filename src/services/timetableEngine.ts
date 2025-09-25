import { Schedule, ScheduledSession, CreateScheduleRequest } from '../models/schedule';
import { Clash } from '../models/clash';
import { Constraint } from '../models/constraint';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { Course } from '../models/course';
import { StudentGroup } from '../models/studentGroup';
import { scheduleRepository } from '../repositories/scheduleRepository';
import { venueRepository } from '../repositories/venueRepository';
import { lecturerRepository } from '../repositories/lecturerRepository';
import { courseRepository } from '../repositories/courseRepository';
import { studentGroupRepository } from '../repositories/studentGroupRepository';
import { clashDetector } from './clashDetector';
import { aiServiceClient, OptimizationParameters, OptimizationRequest } from './aiServiceClient';

export interface TimetableGenerationOptions {
  academicPeriod: string;
  startDate: Date;
  endDate: Date;
  validateConstraints?: boolean;
  autoResolveConflicts?: boolean;
  useAIOptimization?: boolean;
  optimizationParameters?: OptimizationParameters;
}

export interface AutomatedGenerationRequest {
  name: string;
  academicPeriod: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  venueIds?: string[];
  lecturerIds?: string[];
  courseIds?: string[];
  studentGroupIds?: string[];
  constraints?: Constraint[];
  optimizationParameters?: OptimizationParameters;
  progressCallback?: (progress: GenerationProgress) => void;
}

export interface GenerationProgress {
  stage: GenerationStage;
  progress: number; // 0-100
  message: string;
  currentStep?: string | undefined;
  totalSteps?: number | undefined;
  currentStepIndex?: number | undefined;
  estimatedTimeRemaining?: number | undefined;
  warnings?: string[] | undefined;
  errors?: string[] | undefined;
}

export enum GenerationStage {
  INITIALIZING = 'initializing',
  LOADING_DATA = 'loading_data',
  VALIDATING_CONSTRAINTS = 'validating_constraints',
  PREPARING_OPTIMIZATION = 'preparing_optimization',
  AI_OPTIMIZATION = 'ai_optimization',
  VALIDATING_SOLUTION = 'validating_solution',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface GenerationResult {
  success: boolean;
  schedule?: Schedule;
  progress: GenerationProgress;
  optimizationScore?: number;
  processingTimeSeconds: number;
  warnings: string[];
  errors: string[];
  fallbackUsed: boolean;
  aiServiceAvailable: boolean;
}

export interface TimetableValidationResult {
  isValid: boolean;
  clashes: Clash[];
  warnings: string[];
  suggestions: string[];
}

export interface ScheduleModificationRequest {
  scheduleId: string;
  sessionId?: string;
  action: 'add' | 'update' | 'remove';
  sessionData?: Partial<ScheduledSession>;
}

export class TimetableEngine {
  /**
   * Creates a new empty schedule with basic metadata
   */
  async createSchedule(request: CreateScheduleRequest): Promise<Schedule> {
    return await scheduleRepository.createSchedule(request);
  }

  /**
   * Validates an entire schedule for conflicts and constraint violations
   */
  async validateSchedule(scheduleId: string): Promise<TimetableValidationResult> {
    const schedule = await scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Simple clash detection for multiple sessions
    const allClashes: Clash[] = [];
    for (let i = 0; i < schedule.timeSlots.length; i++) {
      for (let j = i + 1; j < schedule.timeSlots.length; j++) {
        const sessionClashes = clashDetector.detectSessionClashes(
          schedule.timeSlots[i]!,
          [schedule.timeSlots[j]!]
        );
        allClashes.push(...sessionClashes);
      }
    }
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for potential issues
    this.analyzeScheduleQuality(schedule, warnings, suggestions);

    return {
      isValid: allClashes.length === 0,
      clashes: allClashes,
      warnings,
      suggestions
    };
  }

  /**
   * Adds a session to a schedule with validation
   */
  async addSession(scheduleId: string, sessionData: Omit<ScheduledSession, 'id'>): Promise<ScheduledSession> {
    // Validate the session doesn't create conflicts
    const schedule = await scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Check for clashes with existing sessions
    const potentialClashes = clashDetector.detectSessionClashes(sessionData, schedule.timeSlots);
    if (potentialClashes.length > 0) {
      throw new Error(`Session would create conflicts: ${potentialClashes.map(c => c.description).join(', ')}`);
    }

    return await scheduleRepository.addSession(scheduleId, sessionData);
  }

  /**
   * Updates an existing session with validation
   */
  async updateSession(sessionId: string, updates: Partial<ScheduledSession>): Promise<ScheduledSession | null> {
    const existingSession = await scheduleRepository.getSessionById(sessionId);
    if (!existingSession) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    // Create a temporary session with updates to check for conflicts
    const updatedSession = { ...existingSession, ...updates };
    
    // Get the schedule to check conflicts with other sessions
    const schedule = await this.findScheduleBySessionId(sessionId);
    if (!schedule) {
      throw new Error(`Could not find schedule for session ${sessionId}`);
    }

    // Filter out the current session and check conflicts with others
    const otherSessions = schedule.timeSlots.filter(s => s.id !== sessionId);
    const potentialClashes = clashDetector.detectSessionClashes(updatedSession, otherSessions);
    
    if (potentialClashes.length > 0) {
      throw new Error(`Session update would create conflicts: ${potentialClashes.map(c => c.description).join(', ')}`);
    }

    return await scheduleRepository.updateSession(sessionId, updates);
  }

  /**
   * Removes a session from a schedule
   */
  async removeSession(sessionId: string): Promise<boolean> {
    return await scheduleRepository.removeSession(sessionId);
  }

  /**
   * Modifies a schedule based on the provided request
   */
  async modifySchedule(request: ScheduleModificationRequest): Promise<Schedule | null> {
    const { scheduleId, action, sessionData, sessionId } = request;

    switch (action) {
      case 'add':
        if (!sessionData) {
          throw new Error('Session data is required for add action');
        }
        await this.addSession(scheduleId, sessionData as Omit<ScheduledSession, 'id'>);
        break;

      case 'update':
        if (!sessionId || !sessionData) {
          throw new Error('Session ID and data are required for update action');
        }
        await this.updateSession(sessionId, sessionData);
        break;

      case 'remove':
        if (!sessionId) {
          throw new Error('Session ID is required for remove action');
        }
        await this.removeSession(sessionId);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return await scheduleRepository.findById(scheduleId);
  }

  /**
   * Publishes a schedule after validation
   */
  async publishSchedule(scheduleId: string, publishedBy: string): Promise<boolean> {
    const validationResult = await this.validateSchedule(scheduleId);
    
    if (!validationResult.isValid) {
      throw new Error(`Cannot publish schedule with conflicts: ${validationResult.clashes.map(c => c.description).join(', ')}`);
    }

    return await scheduleRepository.publish(scheduleId, publishedBy);
  }

  /**
   * Archives a schedule
   */
  async archiveSchedule(scheduleId: string): Promise<boolean> {
    return await scheduleRepository.archive(scheduleId);
  }

  /**
   * Gets sessions within a date range for a schedule
   */
  async getSessionsByDateRange(scheduleId: string, startDate: Date, endDate: Date): Promise<ScheduledSession[]> {
    return await scheduleRepository.findSessionsByDateRange(scheduleId, startDate, endDate);
  }

  /**
   * Finds all schedules that match the given filters
   */
  async findSchedules(filters: any = {}): Promise<Schedule[]> {
    return await scheduleRepository.findAll(filters);
  }

  /**
   * Gets a schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<Schedule | null> {
    return await scheduleRepository.findById(scheduleId);
  }

  /**
   * Generates an automated timetable using AI optimization
   */
  async generateAutomatedTimetable(request: AutomatedGenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const result: GenerationResult = {
      success: false,
      progress: {
        stage: GenerationStage.INITIALIZING,
        progress: 0,
        message: 'Initializing automated timetable generation...'
      },
      processingTimeSeconds: 0,
      warnings: [],
      errors: [],
      fallbackUsed: false,
      aiServiceAvailable: true
    };

    try {
      // Stage 1: Initialize and validate request
      this.updateProgress(result, GenerationStage.INITIALIZING, 5, 'Validating generation request...', request.progressCallback);
      
      if (!request.name || !request.academicPeriod || !request.startDate || !request.endDate) {
        throw new Error('Missing required fields: name, academicPeriod, startDate, endDate');
      }

      if (request.startDate >= request.endDate) {
        throw new Error('Start date must be before end date');
      }

      // Stage 2: Load required data
      this.updateProgress(result, GenerationStage.LOADING_DATA, 15, 'Loading entities and constraints...', request.progressCallback);
      
      const entities = await this.loadEntitiesForGeneration(request);
      const constraints = await this.loadConstraintsForGeneration(request);

      // Stage 3: Validate constraints
      this.updateProgress(result, GenerationStage.VALIDATING_CONSTRAINTS, 25, 'Validating constraints and business rules...', request.progressCallback);
      
      const constraintValidation = await this.validateGenerationConstraints(entities, constraints);
      if (!constraintValidation.isValid) {
        result.errors.push(...constraintValidation.errors);
        throw new Error(`Constraint validation failed: ${constraintValidation.errors.join(', ')}`);
      }
      result.warnings.push(...constraintValidation.warnings);

      // Stage 4: Prepare optimization request
      this.updateProgress(result, GenerationStage.PREPARING_OPTIMIZATION, 35, 'Preparing AI optimization request...', request.progressCallback);
      
      const optimizationRequest = this.prepareOptimizationRequest(entities, constraints, request);

      // Stage 5: Check AI service availability and perform optimization
      this.updateProgress(result, GenerationStage.AI_OPTIMIZATION, 45, 'Running AI optimization...', request.progressCallback);
      
      const aiServiceStatus = aiServiceClient.getServiceStatus();
      result.aiServiceAvailable = aiServiceStatus.isAvailable;

      let optimizationResponse;
      if (aiServiceStatus.isAvailable) {
        try {
          optimizationResponse = await aiServiceClient.optimizeTimetable(optimizationRequest);
          
          if (!optimizationResponse.success || !optimizationResponse.solution) {
            result.warnings.push('AI optimization failed, falling back to basic scheduling');
            result.fallbackUsed = true;
            optimizationResponse = await this.fallbackScheduleGeneration(entities, constraints, request);
          }
        } catch (error) {
          result.warnings.push(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.fallbackUsed = true;
          optimizationResponse = await this.fallbackScheduleGeneration(entities, constraints, request);
        }
      } else {
        result.warnings.push('AI service unavailable, using fallback scheduling');
        result.fallbackUsed = true;
        optimizationResponse = await this.fallbackScheduleGeneration(entities, constraints, request);
      }

      // Stage 6: Validate solution
      this.updateProgress(result, GenerationStage.VALIDATING_SOLUTION, 75, 'Validating generated solution...', request.progressCallback);
      
      if (!optimizationResponse.solution) {
        throw new Error('No valid solution could be generated');
      }

      const sessions = aiServiceClient.convertSolutionFromAIFormat(optimizationResponse.solution);
      
      // Stage 7: Create and save schedule
      this.updateProgress(result, GenerationStage.FINALIZING, 90, 'Creating and saving schedule...', request.progressCallback);
      
      const schedule = await this.createScheduleFromSolution(request, sessions);
      result.schedule = schedule;
      result.optimizationScore = optimizationResponse.solution.score;

      // Final validation
      const finalValidation = await this.validateSchedule(schedule.id);
      if (!finalValidation.isValid) {
        result.warnings.push(`Generated schedule has ${finalValidation.clashes.length} conflicts`);
        result.warnings.push(...finalValidation.warnings);
      }

      // Stage 8: Complete
      this.updateProgress(result, GenerationStage.COMPLETED, 100, 'Timetable generation completed successfully!', request.progressCallback);
      
      result.success = true;
      result.processingTimeSeconds = (Date.now() - startTime) / 1000;

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(errorMessage);
      result.processingTimeSeconds = (Date.now() - startTime) / 1000;
      
      this.updateProgress(result, GenerationStage.FAILED, result.progress.progress, `Generation failed: ${errorMessage}`, request.progressCallback);
      
      return result;
    }
  }

  /**
   * Configures optimization parameters with validation
   */
  configureOptimizationParameters(params: Partial<OptimizationParameters>): OptimizationParameters {
    const defaultParams: OptimizationParameters = {
      max_solve_time_seconds: 300, // 5 minutes
      preference_weight: 0.3,
      efficiency_weight: 0.4,
      balance_weight: 0.3,
      allow_partial_solutions: true
    };

    const configured = { ...defaultParams, ...params };

    // Validate parameters
    if (configured.max_solve_time_seconds < 10 || configured.max_solve_time_seconds > 3600) {
      throw new Error('max_solve_time_seconds must be between 10 and 3600 seconds');
    }

    const totalWeight = configured.preference_weight + configured.efficiency_weight + configured.balance_weight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new Error('Weight parameters must sum to 1.0');
    }

    if (configured.preference_weight < 0 || configured.efficiency_weight < 0 || configured.balance_weight < 0) {
      throw new Error('Weight parameters must be non-negative');
    }

    return configured;
  }

  /**
   * Gets the current generation progress for a running operation
   */
  async getGenerationProgress(_operationId: string): Promise<GenerationProgress | null> {
    // This would typically be stored in Redis or a similar cache
    // For now, return null as we don't have persistent progress tracking
    return null;
  }

  /**
   * Cancels a running generation operation
   */
  async cancelGeneration(_operationId: string): Promise<boolean> {
    // This would typically interact with the AI service to cancel the operation
    // For now, return false as we don't have cancellation support
    return false;
  }

  /**
   * Analyzes schedule quality and provides warnings/suggestions
   */
  private analyzeScheduleQuality(schedule: Schedule, warnings: string[], suggestions: string[]): void {
    // Check for gaps in student schedules
    const studentGroupSessions = this.groupSessionsByStudentGroup(schedule.timeSlots);
    
    for (const [groupId, sessions] of studentGroupSessions.entries()) {
      const sortedSessions = sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
      // Check for large gaps between sessions
      for (let i = 1; i < sortedSessions.length; i++) {
        const gap = sortedSessions[i]!.startTime.getTime() - sortedSessions[i - 1]!.endTime.getTime();
        const gapHours = gap / (1000 * 60 * 60);
        
        if (gapHours > 3) {
          warnings.push(`Student group ${groupId} has a ${gapHours.toFixed(1)} hour gap between sessions`);
          suggestions.push(`Consider rescheduling sessions for group ${groupId} to reduce gaps`);
        }
      }
      
      // Check for back-to-back sessions without breaks
      for (let i = 1; i < sortedSessions.length; i++) {
        const timeBetween = sortedSessions[i]!.startTime.getTime() - sortedSessions[i - 1]!.endTime.getTime();
        const minutesBetween = timeBetween / (1000 * 60);
        
        if (minutesBetween < 15) {
          warnings.push(`Student group ${groupId} has back-to-back sessions with less than 15 minutes break`);
          suggestions.push(`Add at least 15 minutes break between sessions for group ${groupId}`);
        }
      }
    }

    // Check venue utilization
    const venueUsage = this.analyzeVenueUtilization(schedule.timeSlots);
    for (const [venueId, utilization] of venueUsage.entries()) {
      if (utilization < 0.3) {
        suggestions.push(`Venue ${venueId} is underutilized (${(utilization * 100).toFixed(1)}% usage)`);
      } else if (utilization > 0.9) {
        warnings.push(`Venue ${venueId} is heavily utilized (${(utilization * 100).toFixed(1)}% usage)`);
      }
    }
  }

  /**
   * Groups sessions by student group for analysis
   */
  private groupSessionsByStudentGroup(sessions: ScheduledSession[]): Map<string, ScheduledSession[]> {
    const grouped = new Map<string, ScheduledSession[]>();
    
    for (const session of sessions) {
      for (const groupId of session.studentGroups) {
        if (!grouped.has(groupId)) {
          grouped.set(groupId, []);
        }
        grouped.get(groupId)!.push(session);
      }
    }
    
    return grouped;
  }

  /**
   * Analyzes venue utilization across the schedule
   */
  private analyzeVenueUtilization(sessions: ScheduledSession[]): Map<string, number> {
    const venueHours = new Map<string, number>();
    const totalPossibleHours = 15; // 7 AM to 10 PM = 15 hours per day
    const workingDays = 7; // Monday to Sunday
    const totalHours = totalPossibleHours * workingDays;
    
    for (const session of sessions) {
      const duration = (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);
      const currentHours = venueHours.get(session.venueId) || 0;
      venueHours.set(session.venueId, currentHours + duration);
    }
    
    const utilization = new Map<string, number>();
    for (const [venueId, hours] of venueHours.entries()) {
      utilization.set(venueId, hours / totalHours);
    }
    
    return utilization;
  }

  /**
   * Finds the schedule that contains a specific session
   */
  private async findScheduleBySessionId(sessionId: string): Promise<Schedule | null> {
    // This is a simplified implementation - in a real system you might want to add
    // a direct query or maintain a session-to-schedule mapping
    const allSchedules = await scheduleRepository.findAll();
    
    for (const schedule of allSchedules) {
      if (schedule.timeSlots.some(session => session.id === sessionId)) {
        return schedule;
      }
    }
    
    return null;
  }

  /**
   * Updates generation progress and calls callback if provided
   */
  private updateProgress(
    result: GenerationResult,
    stage: GenerationStage,
    progress: number,
    message: string,
    callback?: (progress: GenerationProgress) => void,
    currentStep?: string,
    totalSteps?: number,
    currentStepIndex?: number
  ): void {
    result.progress = {
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      currentStep,
      totalSteps,
      currentStepIndex,
      warnings: result.warnings,
      errors: result.errors
    };

    if (callback) {
      callback(result.progress);
    }
  }

  /**
   * Loads all entities required for timetable generation
   */
  private async loadEntitiesForGeneration(request: AutomatedGenerationRequest): Promise<{
    venues: Venue[];
    lecturers: Lecturer[];
    courses: Course[];
    studentGroups: StudentGroup[];
  }> {
    const [venues, lecturers, courses, studentGroups] = await Promise.all([
      request.venueIds 
        ? Promise.all(request.venueIds.map(id => venueRepository.findById(id))).then(results => results.filter(Boolean) as Venue[])
        : venueRepository.findAll(),
      request.lecturerIds
        ? Promise.all(request.lecturerIds.map(id => lecturerRepository.findById(id))).then(results => results.filter(Boolean) as Lecturer[])
        : lecturerRepository.findAll(),
      request.courseIds
        ? Promise.all(request.courseIds.map(id => courseRepository.findById(id))).then(results => results.filter(Boolean) as Course[])
        : courseRepository.findAll(),
      request.studentGroupIds
        ? Promise.all(request.studentGroupIds.map(id => studentGroupRepository.findById(id))).then(results => results.filter(Boolean) as StudentGroup[])
        : studentGroupRepository.findAll()
    ]);

    if (venues.length === 0) throw new Error('No venues available for scheduling');
    if (lecturers.length === 0) throw new Error('No lecturers available for scheduling');
    if (courses.length === 0) throw new Error('No courses available for scheduling');
    if (studentGroups.length === 0) throw new Error('No student groups available for scheduling');

    return { venues, lecturers, courses, studentGroups };
  }

  /**
   * Loads constraints for timetable generation
   */
  private async loadConstraintsForGeneration(request: AutomatedGenerationRequest): Promise<Constraint[]> {
    // If constraints are provided in request, use those
    if (request.constraints && request.constraints.length > 0) {
      return request.constraints;
    }

    // Otherwise, load default constraints
    // This would typically come from a constraint repository
    // For now, return empty array as we don't have constraint persistence implemented
    return [];
  }

  /**
   * Validates constraints and entities for generation
   */
  private async validateGenerationConstraints(
    entities: { venues: Venue[]; lecturers: Lecturer[]; courses: Course[]; studentGroups: StudentGroup[] },
    _constraints: Constraint[]
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate entity relationships
    for (const course of entities.courses) {
      // Check if lecturer exists
      const lecturer = entities.lecturers.find(l => l.id === course.lecturerId);
      if (!lecturer) {
        errors.push(`Course ${course.name} references non-existent lecturer ${course.lecturerId}`);
        continue;
      }

      // Check if lecturer can teach the course
      if (!lecturer.subjects.includes(course.code) && lecturer.subjects.length > 0) {
        warnings.push(`Lecturer ${lecturer.name} may not be qualified to teach ${course.name}`);
      }

      // Check if student groups exist
      for (const groupId of course.studentGroups) {
        const group = entities.studentGroups.find(g => g.id === groupId);
        if (!group) {
          errors.push(`Course ${course.name} references non-existent student group ${groupId}`);
        }
      }

      // Check venue capacity requirements
      const totalStudents = course.studentGroups.reduce((total, groupId) => {
        const group = entities.studentGroups.find(g => g.id === groupId);
        return total + (group?.size || 0);
      }, 0);

      const suitableVenues = entities.venues.filter(v => v.capacity >= totalStudents);
      if (suitableVenues.length === 0) {
        errors.push(`No venues with sufficient capacity (${totalStudents}) for course ${course.name}`);
      }

      // Check equipment requirements
      if (course.requiredEquipment && course.requiredEquipment.length > 0) {
        const venuesWithEquipment = entities.venues.filter(v => 
          course.requiredEquipment.every(eq => v.equipment.includes(eq))
        );
        if (venuesWithEquipment.length === 0) {
          errors.push(`No venues with required equipment for course ${course.name}: ${course.requiredEquipment.join(', ')}`);
        }
      }
    }

    // Validate lecturer availability
    for (const lecturer of entities.lecturers) {
      if (!lecturer.availability || Object.keys(lecturer.availability).length === 0) {
        warnings.push(`Lecturer ${lecturer.name} has no availability set`);
      }

      const assignedCourses = entities.courses.filter(c => c.lecturerId === lecturer.id);
      const totalHours = assignedCourses.reduce((total, course) => total + (course.duration / 60), 0);
      
      if (totalHours > lecturer.maxHoursPerWeek) {
        errors.push(`Lecturer ${lecturer.name} assigned ${totalHours} hours, exceeds maximum ${lecturer.maxHoursPerWeek}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Prepares optimization request for AI service
   */
  private prepareOptimizationRequest(
    entities: { venues: Venue[]; lecturers: Lecturer[]; courses: Course[]; studentGroups: StudentGroup[] },
    constraints: Constraint[],
    request: AutomatedGenerationRequest
  ): OptimizationRequest {
    const optimizationParams = request.optimizationParameters 
      ? this.configureOptimizationParameters(request.optimizationParameters)
      : this.configureOptimizationParameters({});

    return {
      entities: aiServiceClient.convertEntitiesToAIFormat(
        entities.venues,
        entities.lecturers,
        entities.courses,
        entities.studentGroups
      ),
      constraints: aiServiceClient.convertConstraintsToAIFormat(constraints),
      optimization_parameters: optimizationParams,
      existing_schedule: undefined // No existing schedule for new generation
    };
  }

  /**
   * Fallback schedule generation when AI service is unavailable
   */
  private async fallbackScheduleGeneration(
    entities: { venues: Venue[]; lecturers: Lecturer[]; courses: Course[]; studentGroups: StudentGroup[] },
    _constraints: Constraint[],
    request: AutomatedGenerationRequest
  ): Promise<{ success: boolean; solution?: any; message: string }> {
    // Basic greedy scheduling algorithm as fallback
    const sessions: any[] = [];
    const timeSlots = this.generateTimeSlots(request.startDate, request.endDate);
    
    for (const course of entities.courses) {
      const lecturer = entities.lecturers.find(l => l.id === course.lecturerId);
      if (!lecturer) continue;

      // Find suitable venues
      const totalStudents = course.studentGroups.reduce((total, groupId) => {
        const group = entities.studentGroups.find(g => g.id === groupId);
        return total + (group?.size || 0);
      }, 0);

      const suitableVenues = entities.venues.filter(v => 
        v.capacity >= totalStudents &&
        (!course.requiredEquipment || course.requiredEquipment.every(eq => v.equipment.includes(eq)))
      );

      if (suitableVenues.length === 0) continue;

      // Simple scheduling: assign to first available slot
      for (const timeSlot of timeSlots) {
        const venue = suitableVenues[0];
        if (!venue) continue;

        // Check if slot is available (basic check)
        const conflictExists = sessions.some(s => 
          s.venue_id === venue.id && 
          s.start_time === timeSlot.start_time &&
          s.day_of_week === timeSlot.day_of_week
        );

        if (!conflictExists) {
          sessions.push({
            id: `session-${sessions.length + 1}`,
            course_id: course.id,
            lecturer_id: lecturer.id,
            venue_id: venue.id,
            student_groups: course.studentGroups,
            start_time: timeSlot.start_time,
            end_time: timeSlot.end_time,
            day_of_week: timeSlot.day_of_week
          });
          break;
        }
      }
    }

    return {
      success: true,
      solution: {
        sessions,
        score: 0.5, // Basic score for fallback
        is_feasible: true,
        conflicts: [],
        metadata: { fallback: true }
      },
      message: 'Fallback scheduling completed'
    };
  }

  /**
   * Generates time slots for scheduling
   */
  private generateTimeSlots(startDate: Date, endDate: Date): Array<{
    start_time: string;
    end_time: string;
    day_of_week: number;
  }> {
    const slots: Array<{ start_time: string; end_time: string; day_of_week: number }> = [];
    const workingHours = [
      { start: 7, end: 8 },
      { start: 8, end: 9 },
      { start: 9, end: 10 },
      { start: 10, end: 11 },
      { start: 11, end: 12 },
      { start: 12, end: 13 },
      { start: 13, end: 14 },
      { start: 14, end: 15 },
      { start: 15, end: 16 },
      { start: 16, end: 17 },
      { start: 17, end: 18 },
      { start: 18, end: 19 },
      { start: 19, end: 20 },
      { start: 20, end: 21 },
      { start: 21, end: 22 }
    ];

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      
      // All days of the week (Sunday = 0, Saturday = 6)
      if (dayOfWeek >= 0 && dayOfWeek <= 6) {
        for (const hour of workingHours) {
          const startTime = new Date(current);
          startTime.setHours(hour.start, 0, 0, 0);
          
          const endTime = new Date(current);
          endTime.setHours(hour.end, 0, 0, 0);

          slots.push({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            day_of_week: dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to 0-based (Monday = 0, Sunday = 6)
          });
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  /**
   * Creates a schedule from the optimization solution
   */
  private async createScheduleFromSolution(
    request: AutomatedGenerationRequest,
    sessions: ScheduledSession[]
  ): Promise<Schedule> {
    const scheduleRequest: CreateScheduleRequest = {
      name: request.name,
      academicPeriod: request.academicPeriod,
      startDate: request.startDate,
      endDate: request.endDate
    };

    if (request.description) {
      scheduleRequest.description = request.description;
    }

    const schedule = await this.createSchedule(scheduleRequest);

    // Add all sessions to the schedule
    for (const session of sessions) {
      await scheduleRepository.addSession(schedule.id, session);
    }

    // Reload the schedule with sessions
    const completeSchedule = await scheduleRepository.findById(schedule.id);
    if (!completeSchedule) {
      throw new Error('Failed to create schedule');
    }

    return completeSchedule;
  }
}

// Export singleton instance
export const timetableEngine = new TimetableEngine();