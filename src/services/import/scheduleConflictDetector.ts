import { 
  ValidationError, 
  ValidationWarning, 
  MappedImportData 
} from '../../types/import';

export interface ConflictDetectionResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  conflictCount: number;
}

export interface ScheduleConflict {
  type: 'venue_double_booking' | 'lecturer_conflict' | 'student_group_overlap';
  affectedSessions: number[]; // Row indices
  description: string;
  severity: 'error' | 'warning';
}

export class ScheduleConflictDetector {
  /**
   * Detects all types of schedule conflicts in imported data
   */
  async detectConflicts(mappedData: MappedImportData): Promise<ConflictDetectionResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const conflicts: ScheduleConflict[] = [];

    // Detect venue double-booking conflicts
    const venueConflicts = this.detectVenueConflicts(mappedData.schedules);
    conflicts.push(...venueConflicts);

    // Detect lecturer conflicts
    const lecturerConflicts = this.detectLecturerConflicts(mappedData.schedules);
    conflicts.push(...lecturerConflicts);

    // Detect student group overlaps
    const studentGroupConflicts = this.detectStudentGroupConflicts(mappedData.schedules);
    conflicts.push(...studentGroupConflicts);

    // Convert conflicts to validation errors/warnings
    conflicts.forEach(conflict => {
      conflict.affectedSessions.forEach(sessionIndex => {
        const rowNumber = sessionIndex + 2; // Account for header row
        
        const validationItem = {
          row: rowNumber,
          field: 'schedule',
          message: conflict.description,
          severity: conflict.severity as 'error' | 'warning',
          suggestedFix: this.getSuggestedFix(conflict.type)
        };

        if (conflict.severity === 'error') {
          errors.push(validationItem as ValidationError);
        } else {
          warnings.push(validationItem as ValidationWarning);
        }
      });
    });

    return {
      errors,
      warnings,
      conflictCount: conflicts.length
    };
  }

  /**
   * Detects venue double-booking conflicts
   */
  private detectVenueConflicts(schedules: any[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const processedConflicts = new Set<string>();

    for (let i = 0; i < schedules.length; i++) {
      const schedule1 = schedules[i];
      if (!schedule1.venueId || !schedule1.startTime || !schedule1.endTime || !schedule1.dayOfWeek) {
        continue; // Skip incomplete schedules
      }

      for (let j = i + 1; j < schedules.length; j++) {
        const schedule2 = schedules[j];
        if (!schedule2.venueId || !schedule2.startTime || !schedule2.endTime || !schedule2.dayOfWeek) {
          continue; // Skip incomplete schedules
        }

        // Check if same venue and same day
        if (schedule1.venueId === schedule2.venueId && schedule1.dayOfWeek === schedule2.dayOfWeek) {
          // Check for time overlap
          const startTime1 = new Date(schedule1.startTime);
          const endTime1 = new Date(schedule1.endTime);
          const startTime2 = new Date(schedule2.startTime);
          const endTime2 = new Date(schedule2.endTime);

          if (this.hasTimeOverlap(startTime1, endTime1, startTime2, endTime2)) {
            // Create a unique key for this conflict to avoid duplicates
            const conflictKey = `venue-${schedule1.venueId}-${Math.min(i, j)}-${Math.max(i, j)}`;
            
            if (!processedConflicts.has(conflictKey)) {
              conflicts.push({
                type: 'venue_double_booking',
                affectedSessions: [i, j],
                description: `Venue double-booking detected: ${schedule1.venueId} is booked for overlapping time slots on ${schedule1.dayOfWeek}`,
                severity: 'error'
              });
              processedConflicts.add(conflictKey);
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detects lecturer conflicts
   */
  private detectLecturerConflicts(schedules: any[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const processedConflicts = new Set<string>();

    for (let i = 0; i < schedules.length; i++) {
      const schedule1 = schedules[i];
      if (!schedule1.lecturerId || !schedule1.startTime || !schedule1.endTime || !schedule1.dayOfWeek) {
        continue; // Skip incomplete schedules
      }

      for (let j = i + 1; j < schedules.length; j++) {
        const schedule2 = schedules[j];
        if (!schedule2.lecturerId || !schedule2.startTime || !schedule2.endTime || !schedule2.dayOfWeek) {
          continue; // Skip incomplete schedules
        }

        // Check if same lecturer and same day
        if (schedule1.lecturerId === schedule2.lecturerId && schedule1.dayOfWeek === schedule2.dayOfWeek) {
          // Check for time overlap
          const startTime1 = new Date(schedule1.startTime);
          const endTime1 = new Date(schedule1.endTime);
          const startTime2 = new Date(schedule2.startTime);
          const endTime2 = new Date(schedule2.endTime);

          if (this.hasTimeOverlap(startTime1, endTime1, startTime2, endTime2)) {
            // Create a unique key for this conflict to avoid duplicates
            const conflictKey = `lecturer-${schedule1.lecturerId}-${Math.min(i, j)}-${Math.max(i, j)}`;
            
            if (!processedConflicts.has(conflictKey)) {
              conflicts.push({
                type: 'lecturer_conflict',
                affectedSessions: [i, j],
                description: `Lecturer conflict detected: Lecturer ${schedule1.lecturerId} has overlapping sessions on ${schedule1.dayOfWeek}`,
                severity: 'error'
              });
              processedConflicts.add(conflictKey);
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detects student group overlaps
   */
  private detectStudentGroupConflicts(schedules: any[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const processedConflicts = new Set<string>();

    for (let i = 0; i < schedules.length; i++) {
      const schedule1 = schedules[i];
      if (!schedule1.studentGroups || !Array.isArray(schedule1.studentGroups) || 
          !schedule1.startTime || !schedule1.endTime || !schedule1.dayOfWeek) {
        continue; // Skip incomplete schedules
      }

      for (let j = i + 1; j < schedules.length; j++) {
        const schedule2 = schedules[j];
        if (!schedule2.studentGroups || !Array.isArray(schedule2.studentGroups) || 
            !schedule2.startTime || !schedule2.endTime || !schedule2.dayOfWeek) {
          continue; // Skip incomplete schedules
        }

        // Check if same day
        if (schedule1.dayOfWeek === schedule2.dayOfWeek) {
          // Check for overlapping student groups
          const overlappingGroups = schedule1.studentGroups.filter((group: string) => 
            schedule2.studentGroups.includes(group)
          );

          if (overlappingGroups.length > 0) {
            // Check for time overlap
            const startTime1 = new Date(schedule1.startTime);
            const endTime1 = new Date(schedule1.endTime);
            const startTime2 = new Date(schedule2.startTime);
            const endTime2 = new Date(schedule2.endTime);

            if (this.hasTimeOverlap(startTime1, endTime1, startTime2, endTime2)) {
              // Create a unique key for this conflict to avoid duplicates
              const conflictKey = `group-${overlappingGroups.join(',')}-${Math.min(i, j)}-${Math.max(i, j)}`;
              
              if (!processedConflicts.has(conflictKey)) {
                conflicts.push({
                  type: 'student_group_overlap',
                  affectedSessions: [i, j],
                  description: `Student group overlap detected: Group(s) ${overlappingGroups.join(', ')} have overlapping sessions on ${schedule1.dayOfWeek}`,
                  severity: 'error'
                });
                processedConflicts.add(conflictKey);
              }
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Checks if two time periods overlap
   */
  private hasTimeOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): boolean {
    // Two time periods overlap if one starts before the other ends
    return start1 < end2 && start2 < end1;
  }



  /**
   * Provides suggested fixes for different types of conflicts
   */
  private getSuggestedFix(conflictType: ScheduleConflict['type']): string {
    switch (conflictType) {
      case 'venue_double_booking':
        return 'Assign a different venue or change the time slot to avoid double-booking';
      case 'lecturer_conflict':
        return 'Assign a different lecturer or reschedule one of the conflicting sessions';
      case 'student_group_overlap':
        return 'Reschedule one of the sessions or split the student group to avoid overlap';
      default:
        return 'Review and resolve the scheduling conflict';
    }
  }

  /**
   * Groups conflicts by type for reporting
   */
  groupConflictsByType(conflicts: ScheduleConflict[]): Record<string, ScheduleConflict[]> {
    return conflicts.reduce((groups, conflict) => {
      if (!groups[conflict.type]) {
        groups[conflict.type] = [];
      }
      groups[conflict.type]!.push(conflict);
      return groups;
    }, {} as Record<string, ScheduleConflict[]>);
  }

  /**
   * Calculates conflict statistics
   */
  calculateConflictStats(conflicts: ScheduleConflict[]): {
    totalConflicts: number;
    venueConflicts: number;
    lecturerConflicts: number;
    studentGroupConflicts: number;
    affectedSessions: number;
  } {
    const grouped = this.groupConflictsByType(conflicts);
    const affectedSessionsSet = new Set<number>();
    
    conflicts.forEach(conflict => {
      conflict.affectedSessions.forEach(sessionIndex => {
        affectedSessionsSet.add(sessionIndex);
      });
    });

    return {
      totalConflicts: conflicts.length,
      venueConflicts: (grouped['venue_double_booking'] || []).length,
      lecturerConflicts: (grouped['lecturer_conflict'] || []).length,
      studentGroupConflicts: (grouped['student_group_overlap'] || []).length,
      affectedSessions: affectedSessionsSet.size
    };
  }
}