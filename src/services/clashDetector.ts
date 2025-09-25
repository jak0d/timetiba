import { Clash, ClashType, Resolution } from '../models/clash';
import { ScheduledSession } from '../models/schedule';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { StudentGroup } from '../models/studentGroup';
import { Course } from '../models/course';
import { Severity, Equipment } from '../models/common';

export interface ClashDetectionContext {
  venues: Venue[];
  lecturers: Lecturer[];
  studentGroups: StudentGroup[];
  courses: Course[];
}

export interface ClashDetectionResult {
  clashes: Clash[];
  isValid: boolean;
  summary: {
    totalClashes: number;
    criticalClashes: number;
    warningClashes: number;
    clashTypes: Record<ClashType, number>;
  };
}

export class ClashDetector {
  /**
   * Detects all types of clashes in a given schedule
   */
  public detectClashes(
    sessions: ScheduledSession[],
    context: ClashDetectionContext,
    scheduleId: string
  ): ClashDetectionResult {
    const clashes: Clash[] = [];

    // Detect venue double-bookings
    clashes.push(...this.detectVenueDoubleBookings(sessions, scheduleId));

    // Detect lecturer conflicts
    clashes.push(...this.detectLecturerConflicts(sessions, context.lecturers, scheduleId));

    // Detect student group overlaps
    clashes.push(...this.detectStudentGroupOverlaps(sessions, scheduleId));

    // Detect equipment conflicts
    clashes.push(...this.detectEquipmentConflicts(sessions, context.venues, context.courses, scheduleId));

    // Detect capacity violations
    clashes.push(...this.detectCapacityViolations(sessions, context.venues, context.studentGroups, scheduleId));

    return this.buildDetectionResult(clashes);
  }

  /**
   * Detects clashes for a single session against existing sessions
   */
  public detectSessionClashes(
    newSession: ScheduledSession | Omit<ScheduledSession, 'id'>,
    existingSessions: ScheduledSession[]
  ): Clash[] {
    const clashes: Clash[] = [];
    const tempScheduleId = 'temp_validation';

    // Check venue conflicts
    const venueConflicts = existingSessions.filter(session => 
      session.venueId === newSession.venueId && this.doSessionsOverlap(newSession as ScheduledSession, session)
    );

    venueConflicts.forEach(conflictSession => {
      clashes.push({
        id: this.generateClashId(),
        type: ClashType.VENUE_DOUBLE_BOOKING,
        severity: Severity.ERROR,
        affectedEntities: [newSession.venueId, newSession.courseId, conflictSession.courseId],
        description: `Venue conflict: ${this.formatSessionTime(newSession as ScheduledSession)} overlaps with existing session ${this.formatSessionTime(conflictSession)}`,
        suggestedResolutions: [],
        scheduleId: tempScheduleId,
        sessionIds: [conflictSession.id],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Check lecturer conflicts
    const lecturerConflicts = existingSessions.filter(session => 
      session.lecturerId === newSession.lecturerId && this.doSessionsOverlap(newSession as ScheduledSession, session)
    );

    lecturerConflicts.forEach(conflictSession => {
      clashes.push({
        id: this.generateClashId(),
        type: ClashType.LECTURER_CONFLICT,
        severity: Severity.ERROR,
        affectedEntities: [newSession.lecturerId, newSession.courseId, conflictSession.courseId],
        description: `Lecturer conflict: ${this.formatSessionTime(newSession as ScheduledSession)} overlaps with existing session ${this.formatSessionTime(conflictSession)}`,
        suggestedResolutions: [],
        scheduleId: tempScheduleId,
        sessionIds: [conflictSession.id],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Check student group conflicts
    const studentGroupConflicts = existingSessions.filter(session => {
      const hasCommonGroups = session.studentGroups.some(groupId => 
        newSession.studentGroups.includes(groupId)
      );
      return hasCommonGroups && this.doSessionsOverlap(newSession as ScheduledSession, session);
    });

    studentGroupConflicts.forEach(conflictSession => {
      const commonGroups = conflictSession.studentGroups.filter(groupId => 
        newSession.studentGroups.includes(groupId)
      );
      
      clashes.push({
        id: this.generateClashId(),
        type: ClashType.STUDENT_GROUP_OVERLAP,
        severity: Severity.ERROR,
        affectedEntities: [...commonGroups, newSession.courseId, conflictSession.courseId],
        description: `Student group conflict: Groups ${commonGroups.join(', ')} have overlapping sessions`,
        suggestedResolutions: [],
        scheduleId: tempScheduleId,
        sessionIds: [conflictSession.id],
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    return clashes;
  }

  /**
   * Detects venue double-booking conflicts
   */
  public detectVenueDoubleBookings(sessions: ScheduledSession[], scheduleId: string): Clash[] {
    const clashes: Clash[] = [];
    const venueTimeSlots = new Map<string, ScheduledSession[]>();

    // Group sessions by venue
    sessions.forEach(session => {
      const venueId = session.venueId;
      if (!venueTimeSlots.has(venueId)) {
        venueTimeSlots.set(venueId, []);
      }
      venueTimeSlots.get(venueId)!.push(session);
    });

    // Check for overlapping sessions in each venue
    venueTimeSlots.forEach((venueSessions, venueId) => {
      for (let i = 0; i < venueSessions.length; i++) {
        for (let j = i + 1; j < venueSessions.length; j++) {
          const session1 = venueSessions[i];
          const session2 = venueSessions[j];

          if (session1 && session2 && this.doSessionsOverlap(session1, session2)) {
            const clash: Clash = {
              id: this.generateClashId(),
              type: ClashType.VENUE_DOUBLE_BOOKING,
              severity: Severity.ERROR,
              affectedEntities: [venueId, session1.courseId, session2.courseId],
              description: `Venue ${venueId} is double-booked between ${this.formatSessionTime(session1)} and ${this.formatSessionTime(session2)}`,
              suggestedResolutions: this.generateVenueConflictResolutions(session1, session2),
              scheduleId,
              sessionIds: [session1.id, session2.id],
              isResolved: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            clashes.push(clash);
          }
        }
      }
    });

    return clashes;
  }

  /**
   * Detects lecturer scheduling conflicts
   */
  public detectLecturerConflicts(
    sessions: ScheduledSession[],
    lecturers: Lecturer[],
    scheduleId: string
  ): Clash[] {
    const clashes: Clash[] = [];
    const lecturerTimeSlots = new Map<string, ScheduledSession[]>();

    // Group sessions by lecturer
    sessions.forEach(session => {
      const lecturerId = session.lecturerId;
      if (!lecturerTimeSlots.has(lecturerId)) {
        lecturerTimeSlots.set(lecturerId, []);
      }
      lecturerTimeSlots.get(lecturerId)!.push(session);
    });

    // Check for overlapping sessions for each lecturer
    lecturerTimeSlots.forEach((lecturerSessions, lecturerId) => {
      const lecturer = lecturers.find(l => l.id === lecturerId);
      
      for (let i = 0; i < lecturerSessions.length; i++) {
        for (let j = i + 1; j < lecturerSessions.length; j++) {
          const session1 = lecturerSessions[i];
          const session2 = lecturerSessions[j];

          if (session1 && session2 && this.doSessionsOverlap(session1, session2)) {
            const clash: Clash = {
              id: this.generateClashId(),
              type: ClashType.LECTURER_CONFLICT,
              severity: Severity.ERROR,
              affectedEntities: [lecturerId, session1.courseId, session2.courseId],
              description: `Lecturer ${lecturer?.name || lecturerId} has conflicting sessions: ${this.formatSessionTime(session1)} and ${this.formatSessionTime(session2)}`,
              suggestedResolutions: this.generateLecturerConflictResolutions(session1, session2),
              scheduleId,
              sessionIds: [session1.id, session2.id],
              isResolved: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            clashes.push(clash);
          }
        }
      }

      // Check availability violations
      if (lecturer) {
        clashes.push(...this.checkLecturerAvailability(lecturerSessions, lecturer, scheduleId));
      }
    });

    return clashes;
  }

  /**
   * Detects student group overlap conflicts
   */
  public detectStudentGroupOverlaps(sessions: ScheduledSession[], scheduleId: string): Clash[] {
    const clashes: Clash[] = [];
    const groupTimeSlots = new Map<string, ScheduledSession[]>();

    // Group sessions by student group
    sessions.forEach(session => {
      session.studentGroups.forEach(groupId => {
        if (!groupTimeSlots.has(groupId)) {
          groupTimeSlots.set(groupId, []);
        }
        groupTimeSlots.get(groupId)!.push(session);
      });
    });

    // Check for overlapping sessions for each student group
    groupTimeSlots.forEach((groupSessions, groupId) => {
      for (let i = 0; i < groupSessions.length; i++) {
        for (let j = i + 1; j < groupSessions.length; j++) {
          const session1 = groupSessions[i];
          const session2 = groupSessions[j];

          if (session1 && session2 && this.doSessionsOverlap(session1, session2)) {
            const clash: Clash = {
              id: this.generateClashId(),
              type: ClashType.STUDENT_GROUP_OVERLAP,
              severity: Severity.ERROR,
              affectedEntities: [groupId, session1.courseId, session2.courseId],
              description: `Student group ${groupId} has overlapping sessions: ${this.formatSessionTime(session1)} and ${this.formatSessionTime(session2)}`,
              suggestedResolutions: this.generateStudentGroupConflictResolutions(session1, session2),
              scheduleId,
              sessionIds: [session1.id, session2.id],
              isResolved: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            clashes.push(clash);
          }
        }
      }
    });

    return clashes;
  }

  /**
   * Detects equipment conflicts
   */
  public detectEquipmentConflicts(
    sessions: ScheduledSession[],
    venues: Venue[],
    courses: Course[],
    scheduleId: string
  ): Clash[] {
    const clashes: Clash[] = [];

    sessions.forEach(session => {
      const venue = venues.find(v => v.id === session.venueId);
      const course = courses.find(c => c.id === session.courseId);

      if (!venue || !course) return;

      // Check if venue has required equipment
      const missingEquipment = course.requiredEquipment.filter(
        equipment => !venue.equipment.includes(equipment)
      );

      if (missingEquipment.length > 0) {
        const clash: Clash = {
          id: this.generateClashId(),
          type: ClashType.EQUIPMENT_CONFLICT,
          severity: Severity.WARNING,
          affectedEntities: [session.venueId, session.courseId],
          description: `Venue ${venue.name} lacks required equipment for course ${course.name}: ${missingEquipment.join(', ')}`,
          suggestedResolutions: this.generateEquipmentConflictResolutions(session, missingEquipment),
          scheduleId,
          sessionIds: [session.id],
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        clashes.push(clash);
      }
    });

    return clashes;
  }

  /**
   * Detects capacity violations
   */
  public detectCapacityViolations(
    sessions: ScheduledSession[],
    venues: Venue[],
    studentGroups: StudentGroup[],
    scheduleId: string
  ): Clash[] {
    const clashes: Clash[] = [];

    sessions.forEach(session => {
      const venue = venues.find(v => v.id === session.venueId);
      if (!venue) return;

      // Calculate total students for this session
      const totalStudents = session.studentGroups.reduce((total, groupId) => {
        const group = studentGroups.find(g => g.id === groupId);
        return total + (group?.size || 0);
      }, 0);

      if (totalStudents > venue.capacity) {
        const clash: Clash = {
          id: this.generateClashId(),
          type: ClashType.CAPACITY_EXCEEDED,
          severity: Severity.ERROR,
          affectedEntities: [session.venueId, ...session.studentGroups],
          description: `Venue ${venue.name} capacity (${venue.capacity}) exceeded by ${totalStudents - venue.capacity} students`,
          suggestedResolutions: this.generateCapacityConflictResolutions(session, totalStudents, venue.capacity),
          scheduleId,
          sessionIds: [session.id],
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        clashes.push(clash);
      }
    });

    return clashes;
  }

  /**
   * Checks if two sessions overlap in time
   */
  private doSessionsOverlap(session1: ScheduledSession, session2: ScheduledSession): boolean {
    // Sessions must be on the same day to overlap
    if (session1.dayOfWeek !== session2.dayOfWeek) {
      return false;
    }

    // Check if the same week (if week numbers are specified)
    if (session1.weekNumber && session2.weekNumber && session1.weekNumber !== session2.weekNumber) {
      return false;
    }

    // Check time overlap
    const start1 = session1.startTime.getTime();
    const end1 = session1.endTime.getTime();
    const start2 = session2.startTime.getTime();
    const end2 = session2.endTime.getTime();

    return start1 < end2 && start2 < end1;
  }

  /**
   * Checks lecturer availability violations
   */
  private checkLecturerAvailability(
    sessions: ScheduledSession[],
    lecturer: Lecturer,
    scheduleId: string
  ): Clash[] {
    const clashes: Clash[] = [];

    sessions.forEach(session => {
      const dayAvailability = lecturer.availability[session.dayOfWeek];
      const sessionStart = this.extractTimeFromDate(session.startTime);
      const sessionEnd = this.extractTimeFromDate(session.endTime);

      const isAvailable = dayAvailability.some(slot => {
        return sessionStart >= slot.startTime && sessionEnd <= slot.endTime;
      });

      if (!isAvailable) {
        const clash: Clash = {
          id: this.generateClashId(),
          type: ClashType.AVAILABILITY_VIOLATION,
          severity: Severity.ERROR,
          affectedEntities: [lecturer.id, session.courseId],
          description: `Lecturer ${lecturer.name} is not available during ${this.formatSessionTime(session)}`,
          suggestedResolutions: this.generateAvailabilityConflictResolutions(session),
          scheduleId,
          sessionIds: [session.id],
          isResolved: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        clashes.push(clash);
      }
    });

    return clashes;
  }

  /**
   * Generates resolution suggestions for venue conflicts
   */
  private generateVenueConflictResolutions(session1: ScheduledSession, _session2: ScheduledSession): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Reschedule ${session1.courseId} to a different time slot`,
        type: 'reschedule',
        parameters: { sessionId: session1.id, suggestedTimes: [] },
        impact: 'Affects one course schedule',
        score: 0.8,
        estimatedEffort: 'medium'
      },
      {
        id: this.generateResolutionId(),
        description: `Move ${session1.courseId} to a different venue`,
        type: 'reassign_venue',
        parameters: { sessionId: session1.id, alternativeVenues: [] },
        impact: 'Requires venue change',
        score: 0.7,
        estimatedEffort: 'low'
      }
    ];
  }

  /**
   * Generates resolution suggestions for lecturer conflicts
   */
  private generateLecturerConflictResolutions(session1: ScheduledSession, _session2: ScheduledSession): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Reschedule ${session1.courseId} to avoid conflict`,
        type: 'reschedule',
        parameters: { sessionId: session1.id },
        impact: 'Affects course timing',
        score: 0.8,
        estimatedEffort: 'medium'
      },
      {
        id: this.generateResolutionId(),
        description: `Assign different lecturer to ${session1.courseId}`,
        type: 'reassign_lecturer',
        parameters: { sessionId: session1.id, alternativeLecturers: [] },
        impact: 'Changes course instructor',
        score: 0.6,
        estimatedEffort: 'high'
      }
    ];
  }

  /**
   * Generates resolution suggestions for student group conflicts
   */
  private generateStudentGroupConflictResolutions(session1: ScheduledSession, _session2: ScheduledSession): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Reschedule ${session1.courseId} to avoid overlap`,
        type: 'reschedule',
        parameters: { sessionId: session1.id },
        impact: 'Changes course timing',
        score: 0.8,
        estimatedEffort: 'medium'
      },
      {
        id: this.generateResolutionId(),
        description: `Split student group for parallel sessions`,
        type: 'split_group',
        parameters: { sessionId: session1.id },
        impact: 'Creates multiple smaller sessions',
        score: 0.5,
        estimatedEffort: 'high'
      }
    ];
  }

  /**
   * Generates resolution suggestions for equipment conflicts
   */
  private generateEquipmentConflictResolutions(session: ScheduledSession, missingEquipment: Equipment[]): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Move to venue with required equipment: ${missingEquipment.join(', ')}`,
        type: 'reassign_venue',
        parameters: { sessionId: session.id, requiredEquipment: missingEquipment },
        impact: 'Changes venue location',
        score: 0.9,
        estimatedEffort: 'low'
      },
      {
        id: this.generateResolutionId(),
        description: `Arrange portable equipment for current venue`,
        type: 'modify_duration',
        parameters: { sessionId: session.id, equipmentNeeded: missingEquipment },
        impact: 'Requires equipment setup time',
        score: 0.6,
        estimatedEffort: 'medium'
      }
    ];
  }

  /**
   * Generates resolution suggestions for capacity conflicts
   */
  private generateCapacityConflictResolutions(session: ScheduledSession, totalStudents: number, venueCapacity: number): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Move to larger venue (capacity needed: ${totalStudents})`,
        type: 'reassign_venue',
        parameters: { sessionId: session.id, minCapacity: totalStudents },
        impact: 'Changes venue location',
        score: 0.9,
        estimatedEffort: 'low'
      },
      {
        id: this.generateResolutionId(),
        description: `Split into multiple sessions`,
        type: 'split_group',
        parameters: { sessionId: session.id, maxGroupSize: venueCapacity },
        impact: 'Creates multiple sessions',
        score: 0.7,
        estimatedEffort: 'high'
      }
    ];
  }

  /**
   * Generates resolution suggestions for availability conflicts
   */
  private generateAvailabilityConflictResolutions(session: ScheduledSession): Resolution[] {
    return [
      {
        id: this.generateResolutionId(),
        description: `Reschedule to lecturer's available time`,
        type: 'reschedule',
        parameters: { sessionId: session.id },
        impact: 'Changes session timing',
        score: 0.8,
        estimatedEffort: 'medium'
      },
      {
        id: this.generateResolutionId(),
        description: `Assign different lecturer`,
        type: 'reassign_lecturer',
        parameters: { sessionId: session.id },
        impact: 'Changes course instructor',
        score: 0.6,
        estimatedEffort: 'high'
      }
    ];
  }

  /**
   * Builds the final detection result
   */
  private buildDetectionResult(clashes: Clash[]): ClashDetectionResult {
    const clashTypeCounts: Record<ClashType, number> = {
      [ClashType.VENUE_DOUBLE_BOOKING]: 0,
      [ClashType.LECTURER_CONFLICT]: 0,
      [ClashType.STUDENT_GROUP_OVERLAP]: 0,
      [ClashType.EQUIPMENT_CONFLICT]: 0,
      [ClashType.CAPACITY_EXCEEDED]: 0,
      [ClashType.AVAILABILITY_VIOLATION]: 0,
      [ClashType.PREFERENCE_VIOLATION]: 0
    };

    let criticalClashes = 0;
    let warningClashes = 0;

    clashes.forEach(clash => {
      clashTypeCounts[clash.type]++;
      if (clash.severity === Severity.CRITICAL || clash.severity === Severity.ERROR) {
        criticalClashes++;
      } else if (clash.severity === Severity.WARNING) {
        warningClashes++;
      }
    });

    return {
      clashes,
      isValid: criticalClashes === 0,
      summary: {
        totalClashes: clashes.length,
        criticalClashes,
        warningClashes,
        clashTypes: clashTypeCounts
      }
    };
  }

  /**
   * Utility methods
   */
  private generateClashId(): string {
    return `clash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResolutionId(): string {
    return `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatSessionTime(session: ScheduledSession): string {
    const start = session.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const end = session.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${session.dayOfWeek} ${start}-${end}`;
  }

  private extractTimeFromDate(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }
}
// E
// Export singleton instance
export const clashDetector = new ClashDetector();