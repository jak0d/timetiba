import { logger } from '../../utils/logger';
import { scheduleRepository } from '../../repositories/scheduleRepository';
import { clashDetector, ClashDetectionContext } from '../clashDetector';
import { transactionManager } from './transactionManager';
import { 
  ScheduledSession, 
  ScheduleConflict 
} from '../../models/schedule';
import { 
  Clash, 
  ClashType 
} from '../../models/clash';

export interface ScheduleImportResult {
  created: number;
  updated: number;
  failed: number;
  conflicts: ScheduleConflict[];
  errors: ScheduleImportError[];
  resolutions: ConflictResolution[];
}

export interface ScheduleImportError {
  rowIndex: number;
  sessionData: Partial<ScheduledSession>;
  error: string;
  conflictType?: string;
}

export interface ConflictResolution {
  conflictId: string;
  resolutionType: 'automatic' | 'manual' | 'skipped';
  action: string;
  originalSession: Partial<ScheduledSession>;
  resolvedSession?: Partial<ScheduledSession>;
  success: boolean;
  error?: string;
}

export interface ScheduleImportOptions {
  scheduleId: string;
  conflictResolutionStrategy: ConflictResolutionStrategy;
  allowPartialImport: boolean;
  validateOnly: boolean;
  batchSize: number;
}

export enum ConflictResolutionStrategy {
  STRICT = 'strict',           // Fail on any conflict
  AUTOMATIC = 'automatic',     // Try to resolve conflicts automatically
  SKIP_CONFLICTS = 'skip',     // Skip conflicting sessions
  MANUAL_REVIEW = 'manual'     // Mark conflicts for manual review
}

export class ScheduleImportService {
  private static instance: ScheduleImportService;

  private constructor() {}

  public static getInstance(): ScheduleImportService {
    if (!ScheduleImportService.instance) {
      ScheduleImportService.instance = new ScheduleImportService();
    }
    return ScheduleImportService.instance;
  }

  public async importScheduleSessions(
    sessions: Partial<ScheduledSession>[],
    context: ClashDetectionContext,
    options: ScheduleImportOptions
  ): Promise<ScheduleImportResult> {
    logger.info('Starting schedule import process', {
      sessionCount: sessions.length,
      scheduleId: options.scheduleId,
      strategy: options.conflictResolutionStrategy
    });

    const result: ScheduleImportResult = {
      created: 0,
      updated: 0,
      failed: 0,
      conflicts: [],
      errors: [],
      resolutions: []
    };

    // Use transaction with rollback support for the entire import process
    const transactionResult = await transactionManager.executeInTransaction(async () => {
      try {
        // Get existing sessions for conflict detection
        const existingSessions = await this.getExistingSessions(options.scheduleId);
        
        // Process sessions in batches
        const batches = this.createBatches(sessions, options.batchSize);
        const createdSessionIds: string[] = [];
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          if (!batch) continue;
          
          try {
            const batchResult = await this.processBatch(
              batch,
              existingSessions,
              context,
              options,
              batchIndex * options.batchSize
            );

            // Merge batch results
            this.mergeBatchResults(result, batchResult);

            // Track created session IDs for potential rollback
            createdSessionIds.push(...batchResult.createdSessions.map((session: ScheduledSession) => session.id));

            // Add successfully created sessions to existing sessions for next batch
            batchResult.createdSessions.forEach((session: ScheduledSession) => {
              existingSessions.push(session);
            });

          } catch (batchError) {
            logger.warn(`Batch ${batchIndex} failed`, {
              error: batchError instanceof Error ? batchError.message : String(batchError)
            });
            
            // Handle batch failure based on options
            if (!options.allowPartialImport) {
              throw batchError; // This will trigger full transaction rollback
            }
            
            // For partial imports, log the batch failure and continue
            result.failed += batch.length;
            result.errors.push({
              rowIndex: batchIndex * options.batchSize,
              sessionData: {},
              error: `Batch ${batchIndex} failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`
            });
          }
        }

        // Validate final state before committing
        if (!options.validateOnly) {
          const validationResult = await this.validateImportIntegrity(
            options.scheduleId,
            createdSessionIds
          );
          
          if (!validationResult.isValid) {
            throw new Error(`Import integrity validation failed: ${validationResult.errors.join(', ')}`);
          }
        }

        logger.info('Schedule import process completed', {
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          conflicts: result.conflicts.length
        });

        return result;

      } catch (error) {
        logger.error('Schedule import process failed, rolling back transaction:', error);
        throw error;
      }
    }, {
      isolationLevel: 'READ_COMMITTED',
      timeout: 300000, // 5 minutes for large imports
      retryAttempts: 1 // Don't retry import operations
    });

    if (!transactionResult.success) {
      throw transactionResult.error || new Error('Schedule import transaction failed');
    }

    return transactionResult.result!;
  }

  private async processBatch(
    sessions: Partial<ScheduledSession>[],
    existingSessions: ScheduledSession[],
    context: ClashDetectionContext,
    options: ScheduleImportOptions,
    startIndex: number
  ): Promise<ScheduleImportResult & { createdSessions: ScheduledSession[] }> {
    const result: ScheduleImportResult & { createdSessions: ScheduledSession[] } = {
      created: 0,
      updated: 0,
      failed: 0,
      conflicts: [],
      errors: [],
      resolutions: [],
      createdSessions: []
    };

    // Validate and process each session
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (!session) continue;

      const rowIndex = startIndex + i;

      try {
        // Validate session data
        const validationResult = this.validateSessionData(session);
        if (!validationResult.isValid) {
          result.failed++;
          result.errors.push({
            rowIndex,
            sessionData: session,
            error: validationResult.error || 'Invalid session data'
          });
          continue;
        }

        // Create complete session object for conflict detection
        const completeSession = this.createCompleteSession(session, options.scheduleId);

        // Detect conflicts
        const conflicts = clashDetector.detectSessionClashes(completeSession, existingSessions);

        if (conflicts.length > 0) {
          // Handle conflicts based on strategy
          const resolutionResult = await this.handleConflicts(
            completeSession,
            conflicts,
            options.conflictResolutionStrategy,
            context
          );

          result.resolutions.push(...resolutionResult.resolutions);

          if (resolutionResult.shouldSkip) {
            result.failed++;
            result.conflicts.push(...this.convertClashesToConflicts(conflicts, completeSession.id));
            result.errors.push({
              rowIndex,
              sessionData: session,
              error: 'Session has unresolved conflicts',
              conflictType: conflicts[0]?.type.toString()
            });
            continue;
          }

          // Use resolved session if available
          if (resolutionResult.resolvedSession) {
            Object.assign(completeSession, resolutionResult.resolvedSession);
          }
        }

        // Import the session if not in validation-only mode
        if (!options.validateOnly) {
          const importedSession = await this.importSession(completeSession, options.scheduleId);
          result.created++;
          result.createdSessions.push(importedSession);
        } else {
          result.created++; // Count as would-be created for validation
        }

      } catch (error) {
        result.failed++;
        result.errors.push({
          rowIndex,
          sessionData: session,
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`Failed to process session at row ${rowIndex}:`, error);
      }
    }

    return result;
  }

  private async handleConflicts(
    session: ScheduledSession,
    conflicts: Clash[],
    strategy: ConflictResolutionStrategy,
    context: ClashDetectionContext
  ): Promise<{
    shouldSkip: boolean;
    resolvedSession?: Partial<ScheduledSession>;
    resolutions: ConflictResolution[];
  }> {
    switch (strategy) {
      case ConflictResolutionStrategy.STRICT:
        return {
          shouldSkip: true,
          resolutions: conflicts.map(conflict => ({
            conflictId: conflict.id,
            resolutionType: 'skipped',
            action: 'Rejected due to strict conflict policy',
            originalSession: session,
            success: false,
            error: conflict.description
          }))
        };

      case ConflictResolutionStrategy.SKIP_CONFLICTS:
        return {
          shouldSkip: true,
          resolutions: conflicts.map(conflict => ({
            conflictId: conflict.id,
            resolutionType: 'skipped',
            action: 'Skipped due to conflicts',
            originalSession: session,
            success: true
          }))
        };

      case ConflictResolutionStrategy.MANUAL_REVIEW:
        return {
          shouldSkip: true,
          resolutions: conflicts.map(conflict => ({
            conflictId: conflict.id,
            resolutionType: 'manual',
            action: 'Marked for manual review',
            originalSession: session,
            success: true
          }))
        };

      case ConflictResolutionStrategy.AUTOMATIC:
        return await this.attemptAutomaticResolution(session, conflicts, context);

      default:
        return { shouldSkip: true, resolutions: [] };
    }
  }

  private async attemptAutomaticResolution(
    session: ScheduledSession,
    conflicts: Clash[],
    context: ClashDetectionContext
  ): Promise<{
    shouldSkip: boolean;
    resolvedSession?: Partial<ScheduledSession>;
    resolutions: ConflictResolution[];
  }> {
    let resolvedSession: Partial<ScheduledSession> = { ...session };
    let hasUnresolvedConflicts = false;
    const resolutionResults: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflictAutomatically(resolvedSession, conflict, context);
      resolutionResults.push(resolution);

      if (resolution.success && resolution.resolvedSession) {
        resolvedSession = { ...resolvedSession, ...resolution.resolvedSession };
      } else {
        hasUnresolvedConflicts = true;
      }
    }

    return {
      shouldSkip: hasUnresolvedConflicts,
      ...(hasUnresolvedConflicts ? {} : { resolvedSession }),
      resolutions: resolutionResults
    };
  }

  private async resolveConflictAutomatically(
    session: Partial<ScheduledSession>,
    conflict: Clash,
    context: ClashDetectionContext
  ): Promise<ConflictResolution> {
    const baseResolution: ConflictResolution = {
      conflictId: conflict.id,
      resolutionType: 'automatic',
      action: '',
      originalSession: session,
      success: false
    };

    try {
      switch (conflict.type) {
        case ClashType.VENUE_DOUBLE_BOOKING:
          return await this.resolveVenueConflict(session, context, baseResolution);

        case ClashType.LECTURER_CONFLICT:
          return await this.resolveLecturerConflict(session, context, baseResolution);

        case ClashType.CAPACITY_EXCEEDED:
          return await this.resolveCapacityConflict(session, context, baseResolution);

        case ClashType.EQUIPMENT_CONFLICT:
          return await this.resolveEquipmentConflict(session, context, baseResolution);

        default:
          return {
            ...baseResolution,
            action: 'No automatic resolution available',
            error: `Cannot automatically resolve ${conflict.type} conflicts`
          };
      }
    } catch (error) {
      return {
        ...baseResolution,
        action: 'Resolution attempt failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async resolveVenueConflict(
    session: Partial<ScheduledSession>,
    context: ClashDetectionContext,
    baseResolution: ConflictResolution
  ): Promise<ConflictResolution> {
    // Find alternative venues
    const alternativeVenues = context.venues.filter(venue => {
      // Must have sufficient capacity
      const totalStudents = session.studentGroups?.reduce((total, groupId) => {
        const group = context.studentGroups.find(g => g.id === groupId);
        return total + (group?.size || 0);
      }, 0) || 0;

      if (venue.capacity < totalStudents) return false;

      // Must have required equipment
      const course = context.courses.find(c => c.id === session.courseId);
      if (course?.requiredEquipment) {
        const hasAllEquipment = course.requiredEquipment.every(equipment => 
          venue.equipment.includes(equipment)
        );
        if (!hasAllEquipment) return false;
      }

      return venue.id !== session.venueId;
    });

    if (alternativeVenues.length > 0) {
      const newVenue = alternativeVenues[0]; // Use first available alternative
      if (newVenue) {
        return {
          ...baseResolution,
          action: `Moved to alternative venue: ${newVenue.name}`,
          resolvedSession: { venueId: newVenue.id },
          success: true
        };
      }
    }

    return {
      ...baseResolution,
      action: 'No suitable alternative venue found',
      error: 'All suitable venues are unavailable or lack required capacity/equipment'
    };
  }

  private async resolveLecturerConflict(
    session: Partial<ScheduledSession>,
    context: ClashDetectionContext,
    baseResolution: ConflictResolution
  ): Promise<ConflictResolution> {
    // Find alternative lecturers who can teach this course
    const course = context.courses.find(c => c.id === session.courseId);
    if (!course) {
      return {
        ...baseResolution,
        action: 'Course not found',
        error: 'Cannot find course information for lecturer reassignment'
      };
    }

    const alternativeLecturers = context.lecturers.filter(lecturer => {
      // Must be able to teach the subject
      const canTeachSubject = course.department === lecturer.department ||
                             lecturer.subjects.some(subject => 
                               course.name.toLowerCase().includes(subject.toLowerCase())
                             );

      // Must be available at the session time
      if (session.dayOfWeek && session.startTime && session.endTime) {
        const dayAvailability = lecturer.availability[session.dayOfWeek];
        const sessionStart = this.extractTimeFromDate(session.startTime);
        const sessionEnd = this.extractTimeFromDate(session.endTime);

        const isAvailable = dayAvailability.some(slot => 
          sessionStart >= slot.startTime && sessionEnd <= slot.endTime
        );

        if (!isAvailable) return false;
      }

      return lecturer.id !== session.lecturerId && canTeachSubject;
    });

    if (alternativeLecturers.length > 0) {
      const newLecturer = alternativeLecturers[0]; // Use first available alternative
      if (newLecturer) {
        return {
          ...baseResolution,
          action: `Reassigned to lecturer: ${newLecturer.name}`,
          resolvedSession: { lecturerId: newLecturer.id },
          success: true
        };
      }
    }

    return {
      ...baseResolution,
      action: 'No suitable alternative lecturer found',
      error: 'No available lecturers can teach this course at the scheduled time'
    };
  }

  private async resolveCapacityConflict(
    session: Partial<ScheduledSession>,
    context: ClashDetectionContext,
    baseResolution: ConflictResolution
  ): Promise<ConflictResolution> {
    const totalStudents = session.studentGroups?.reduce((total, groupId) => {
      const group = context.studentGroups.find(g => g.id === groupId);
      return total + (group?.size || 0);
    }, 0) || 0;

    // Find larger venues
    const largerVenues = context.venues.filter(venue => {
      if (venue.capacity < totalStudents) return false;

      // Must have required equipment
      const course = context.courses.find(c => c.id === session.courseId);
      if (course?.requiredEquipment) {
        const hasAllEquipment = course.requiredEquipment.every(equipment => 
          venue.equipment.includes(equipment)
        );
        if (!hasAllEquipment) return false;
      }

      return venue.id !== session.venueId;
    });

    if (largerVenues.length > 0) {
      const newVenue = largerVenues[0]; // Use first suitable larger venue
      if (newVenue) {
        return {
          ...baseResolution,
          action: `Moved to larger venue: ${newVenue.name} (capacity: ${newVenue.capacity})`,
          resolvedSession: { venueId: newVenue.id },
          success: true
        };
      }
    }

    return {
      ...baseResolution,
      action: 'No larger venue available',
      error: `No venues found with capacity for ${totalStudents} students`
    };
  }

  private async resolveEquipmentConflict(
    session: Partial<ScheduledSession>,
    context: ClashDetectionContext,
    baseResolution: ConflictResolution
  ): Promise<ConflictResolution> {
    const course = context.courses.find(c => c.id === session.courseId);
    if (!course) {
      return {
        ...baseResolution,
        action: 'Course not found',
        error: 'Cannot find course information for equipment resolution'
      };
    }

    // Find venues with required equipment
    const suitableVenues = context.venues.filter(venue => {
      const hasAllEquipment = course.requiredEquipment.every(equipment => 
        venue.equipment.includes(equipment)
      );

      // Must have sufficient capacity
      const totalStudents = session.studentGroups?.reduce((total, groupId) => {
        const group = context.studentGroups.find(g => g.id === groupId);
        return total + (group?.size || 0);
      }, 0) || 0;

      return hasAllEquipment && venue.capacity >= totalStudents && venue.id !== session.venueId;
    });

    if (suitableVenues.length > 0) {
      const newVenue = suitableVenues[0]; // Use first suitable venue
      if (newVenue) {
        return {
          ...baseResolution,
          action: `Moved to venue with required equipment: ${newVenue.name}`,
          resolvedSession: { venueId: newVenue.id },
          success: true
        };
      }
    }

    return {
      ...baseResolution,
      action: 'No venue with required equipment found',
      error: `No venues found with required equipment: ${course.requiredEquipment.join(', ')}`
    };
  }

  private async importSession(session: ScheduledSession, scheduleId: string): Promise<ScheduledSession> {
    return await transactionManager.executeInTransaction(async () => {
      return await scheduleRepository.addSession(scheduleId, session);
    }).then(result => {
      if (!result.success || !result.result) {
        throw new Error(result.error?.message || 'Failed to import session');
      }
      return result.result;
    });
  }

  private async getExistingSessions(scheduleId: string): Promise<ScheduledSession[]> {
    const schedule = await scheduleRepository.findById(scheduleId);
    return schedule?.timeSlots || [];
  }

  private validateSessionData(session: Partial<ScheduledSession>): { isValid: boolean; error?: string } {
    if (!session.courseId) {
      return { isValid: false, error: 'Course ID is required' };
    }

    if (!session.lecturerId) {
      return { isValid: false, error: 'Lecturer ID is required' };
    }

    if (!session.venueId) {
      return { isValid: false, error: 'Venue ID is required' };
    }

    if (!session.startTime || !session.endTime) {
      return { isValid: false, error: 'Start time and end time are required' };
    }

    if (!session.dayOfWeek) {
      return { isValid: false, error: 'Day of week is required' };
    }

    if (!session.studentGroups || session.studentGroups.length === 0) {
      return { isValid: false, error: 'At least one student group is required' };
    }

    return { isValid: true };
  }

  private createCompleteSession(session: Partial<ScheduledSession>, _scheduleId: string): ScheduledSession {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      courseId: session.courseId!,
      lecturerId: session.lecturerId!,
      venueId: session.venueId!,
      studentGroups: session.studentGroups!,
      startTime: session.startTime!,
      endTime: session.endTime!,
      dayOfWeek: session.dayOfWeek!,
      weekNumber: session.weekNumber,
      notes: session.notes
    };
  }

  private convertClashesToConflicts(clashes: Clash[], sessionId: string): ScheduleConflict[] {
    return clashes.map(clash => ({
      sessionId,
      conflictType: this.mapClashTypeToConflictType(clash.type),
      description: clash.description,
      affectedEntities: clash.affectedEntities
    }));
  }

  private mapClashTypeToConflictType(clashType: ClashType): 'venue_double_booking' | 'lecturer_conflict' | 'student_group_overlap' {
    switch (clashType) {
      case ClashType.VENUE_DOUBLE_BOOKING:
        return 'venue_double_booking';
      case ClashType.LECTURER_CONFLICT:
        return 'lecturer_conflict';
      case ClashType.STUDENT_GROUP_OVERLAP:
        return 'student_group_overlap';
      default:
        return 'venue_double_booking'; // Default fallback
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private mergeBatchResults(target: ScheduleImportResult, source: ScheduleImportResult & { createdSessions: ScheduledSession[] }): void {
    target.created += source.created;
    target.updated += source.updated;
    target.failed += source.failed;
    target.conflicts.push(...source.conflicts);
    target.errors.push(...source.errors);
    target.resolutions.push(...source.resolutions);
  }

  private async validateImportIntegrity(
    scheduleId: string,
    createdSessionIds: string[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Verify all created sessions exist in the database
      for (const sessionId of createdSessionIds) {
        const session = await scheduleRepository.getSessionById(sessionId);
        if (!session) {
          errors.push(`Session ${sessionId} was not properly created`);
        }
      }

      // Check for any orphaned references
      const schedule = await scheduleRepository.findById(scheduleId);
      if (!schedule) {
        errors.push(`Schedule ${scheduleId} not found after import`);
      }

    } catch (error) {
      errors.push(`Integrity validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private extractTimeFromDate(dateTime: Date): string {
    return dateTime.toTimeString().substring(0, 5); // HH:MM format
  }
}

// Export singleton instance
export const scheduleImportService = ScheduleImportService.getInstance();