import { Constraint, ConstraintType, ConstraintRule } from '../models/constraint';
import { ScheduledSession } from '../models/schedule';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { StudentGroup } from '../models/studentGroup';
import { Course } from '../models/course';
import { Priority } from '../models/common';

export interface ValidationContext {
  venues: Venue[];
  lecturers: Lecturer[];
  studentGroups: StudentGroup[];
  courses: Course[];
  constraints: Constraint[];
}

export interface ConstraintViolation {
  constraintId: string;
  constraintType: ConstraintType;
  priority: Priority;
  description: string;
  affectedEntities: string[];
  sessionIds: string[];
  severity: 'hard' | 'soft';
  weight?: number;
  violationScore: number; // 0-1, where 1 is complete violation
}

export interface ValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  hardViolations: ConstraintViolation[];
  softViolations: ConstraintViolation[];
  totalScore: number; // Overall constraint satisfaction score
  summary: {
    totalConstraints: number;
    violatedConstraints: number;
    hardConstraintViolations: number;
    softConstraintViolations: number;
    constraintTypeBreakdown: Record<ConstraintType, number>;
  };
}

export class ConstraintValidator {
  /**
   * Validates all constraints against a given schedule
   */
  public validateConstraints(
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ValidationResult {
    const violations: ConstraintViolation[] = [];

    // Validate each constraint
    context.constraints.forEach(constraint => {
      if (!constraint.isActive) return;

      const constraintViolations = this.validateConstraint(constraint, sessions, context);
      violations.push(...constraintViolations);
    });

    return this.buildValidationResult(violations, context.constraints);
  }

  /**
   * Validates a single constraint against sessions
   */
  public validateConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    switch (constraint.type) {
      case ConstraintType.HARD_AVAILABILITY:
        return this.validateAvailabilityConstraint(constraint, sessions, context);
      case ConstraintType.VENUE_CAPACITY:
        return this.validateCapacityConstraint(constraint, sessions, context);
      case ConstraintType.EQUIPMENT_REQUIREMENT:
        return this.validateEquipmentConstraint(constraint, sessions, context);
      case ConstraintType.LECTURER_PREFERENCE:
        return this.validateLecturerPreferenceConstraint(constraint, sessions, context);
      case ConstraintType.STUDENT_BREAK:
        return this.validateStudentBreakConstraint(constraint, sessions, context);
      case ConstraintType.DEPARTMENT_POLICY:
        return this.validateDepartmentPolicyConstraint(constraint, sessions, context);
      case ConstraintType.TIME_WINDOW:
        return this.validateTimeWindowConstraint(constraint, sessions, context);
      case ConstraintType.CONSECUTIVE_SESSIONS:
        return this.validateConsecutiveSessionsConstraint(constraint, sessions, context);
      default:
        return [];
    }
  }

  /**
   * Validates hard availability constraints (lecturer/venue availability)
   */
  private validateAvailabilityConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    sessions.forEach(session => {
      // Check if session involves any entities in the constraint
      const affectedEntities = constraint.entities.filter(entityId =>
        session.lecturerId === entityId || session.venueId === entityId
      );

      if (affectedEntities.length === 0) return;

      // Validate lecturer availability
      if (session.lecturerId && constraint.entities.includes(session.lecturerId)) {
        const lecturer = context.lecturers.find(l => l.id === session.lecturerId);
        if (lecturer && !this.isLecturerAvailable(lecturer, session)) {
          violations.push({
            constraintId: constraint.id,
            constraintType: constraint.type,
            priority: constraint.priority,
            description: `Lecturer ${lecturer.name} is not available during ${this.formatSessionTime(session)}`,
            affectedEntities: [session.lecturerId],
            sessionIds: [session.id],
            severity: 'hard',
            violationScore: 1.0
          });
        }
      }

      // Validate venue availability
      if (session.venueId && constraint.entities.includes(session.venueId)) {
        const venue = context.venues.find(v => v.id === session.venueId);
        if (venue && !this.isVenueAvailable(venue, session)) {
          violations.push({
            constraintId: constraint.id,
            constraintType: constraint.type,
            priority: constraint.priority,
            description: `Venue ${venue.name} is not available during ${this.formatSessionTime(session)}`,
            affectedEntities: [session.venueId],
            sessionIds: [session.id],
            severity: 'hard',
            violationScore: 1.0
          });
        }
      }
    });

    return violations;
  }

  /**
   * Validates venue capacity constraints
   */
  private validateCapacityConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    sessions.forEach(session => {
      if (!constraint.entities.includes(session.venueId)) return;

      const venue = context.venues.find(v => v.id === session.venueId);
      if (!venue) return;

      const totalStudents = this.calculateSessionCapacity(session, context.studentGroups);
      
      if (totalStudents > venue.capacity) {
        const overCapacity = totalStudents - venue.capacity;
        const violationScore = Math.min(overCapacity / venue.capacity, 1.0);

        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Venue ${venue.name} capacity exceeded: ${totalStudents}/${venue.capacity} students`,
          affectedEntities: [session.venueId, ...session.studentGroups],
          sessionIds: [session.id],
          severity: 'hard',
          violationScore
        });
      }
    });

    return violations;
  }

  /**
   * Validates equipment requirement constraints
   */
  private validateEquipmentConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    sessions.forEach(session => {
      const course = context.courses.find(c => c.id === session.courseId);
      const venue = context.venues.find(v => v.id === session.venueId);

      if (!course || !venue) return;
      if (!constraint.entities.includes(session.courseId) && !constraint.entities.includes(session.venueId)) return;

      const missingEquipment = course.requiredEquipment.filter(
        equipment => !venue.equipment.includes(equipment)
      );

      if (missingEquipment.length > 0) {
        const violationScore = missingEquipment.length / course.requiredEquipment.length;

        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Missing equipment in ${venue.name} for ${course.name}: ${missingEquipment.join(', ')}`,
          affectedEntities: [session.venueId, session.courseId],
          sessionIds: [session.id],
          severity: constraint.priority === Priority.CRITICAL ? 'hard' : 'soft',
          violationScore
        });
      }
    });

    return violations;
  }

  /**
   * Validates lecturer preference constraints (soft constraints)
   */
  private validateLecturerPreferenceConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    sessions.forEach(session => {
      if (!constraint.entities.includes(session.lecturerId)) return;

      const lecturer = context.lecturers.find(l => l.id === session.lecturerId);
      if (!lecturer) return;

      // Check preferred time slots
      const isPreferredTime = this.isPreferredTimeSlot(lecturer, session);
      if (!isPreferredTime) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Session not in lecturer ${lecturer.name}'s preferred time slots`,
          affectedEntities: [session.lecturerId],
          sessionIds: [session.id],
          severity: 'soft',
          weight: constraint.weight || 1.0,
          violationScore: 0.5
        });
      }

      // Check back-to-back classes preference
      if (lecturer.preferences.avoidBackToBackClasses) {
        const hasBackToBack = this.hasBackToBackSessions(session, sessions, lecturer.id);
        if (hasBackToBack) {
          violations.push({
            constraintId: constraint.id,
            constraintType: constraint.type,
            priority: constraint.priority,
            description: `Lecturer ${lecturer.name} has back-to-back classes (preference violation)`,
            affectedEntities: [session.lecturerId],
            sessionIds: [session.id],
            severity: 'soft',
            weight: constraint.weight || 1.0,
            violationScore: 0.7
          });
        }
      }

      // Check daily hours limit
      const dailyHours = this.calculateDailyHours(session, sessions, lecturer.id);
      if (dailyHours > lecturer.preferences.maxHoursPerDay) {
        const excessHours = dailyHours - lecturer.preferences.maxHoursPerDay;
        const violationScore = Math.min(excessHours / lecturer.preferences.maxHoursPerDay, 1.0);

        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Lecturer ${lecturer.name} exceeds daily hours limit: ${dailyHours}/${lecturer.preferences.maxHoursPerDay}`,
          affectedEntities: [session.lecturerId],
          sessionIds: [session.id],
          severity: 'soft',
          weight: constraint.weight || 1.0,
          violationScore
        });
      }
    });

    return violations;
  }

  /**
   * Validates student break constraints
   */
  private validateStudentBreakConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    _context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const minBreakMinutes = this.extractRuleValue(constraint.rule, 'minBreakMinutes', 15);

    // Group sessions by student groups
    const groupSessions = new Map<string, ScheduledSession[]>();
    sessions.forEach(session => {
      session.studentGroups.forEach(groupId => {
        if (constraint.entities.includes(groupId)) {
          if (!groupSessions.has(groupId)) {
            groupSessions.set(groupId, []);
          }
          groupSessions.get(groupId)!.push(session);
        }
      });
    });

    groupSessions.forEach((groupSessionList, groupId) => {
      // Sort sessions by time
      const sortedSessions = groupSessionList.sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      );

      for (let i = 0; i < sortedSessions.length - 1; i++) {
        const currentSession = sortedSessions[i];
        const nextSession = sortedSessions[i + 1];

        if (!currentSession || !nextSession) continue;

        // Check if sessions are on the same day
        if (currentSession.dayOfWeek === nextSession.dayOfWeek) {
          const breakTime = nextSession.startTime.getTime() - currentSession.endTime.getTime();
          const breakMinutes = breakTime / (1000 * 60);

          if (breakMinutes < minBreakMinutes && breakMinutes >= 0) {
            const violationScore = 1 - (breakMinutes / minBreakMinutes);

            violations.push({
              constraintId: constraint.id,
              constraintType: constraint.type,
              priority: constraint.priority,
              description: `Insufficient break time for student group ${groupId}: ${Math.round(breakMinutes)} minutes (minimum: ${minBreakMinutes})`,
              affectedEntities: [groupId],
              sessionIds: [currentSession.id, nextSession.id],
              severity: constraint.priority === Priority.CRITICAL ? 'hard' : 'soft',
              weight: constraint.weight || 1.0,
              violationScore
            });
          }
        }
      }
    });

    return violations;
  }

  /**
   * Validates department policy constraints
   */
  private validateDepartmentPolicyConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Example: No classes after 6 PM for certain departments
    const maxEndTime = this.extractRuleValue(constraint.rule, 'maxEndTime', '18:00');
    const maxEndHour = parseInt(maxEndTime.split(':')[0]);

    sessions.forEach(session => {
      const course = context.courses.find(c => c.id === session.courseId);
      if (!course || !constraint.entities.includes(course.department)) return;

      const sessionEndHour = session.endTime.getHours();
      if (sessionEndHour > maxEndHour) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Department policy violation: ${course.name} ends after ${maxEndTime}`,
          affectedEntities: [session.courseId],
          sessionIds: [session.id],
          severity: constraint.priority === Priority.CRITICAL ? 'hard' : 'soft',
          weight: constraint.weight || 1.0,
          violationScore: 0.8
        });
      }
    });

    return violations;
  }

  /**
   * Validates time window constraints
   */
  private validateTimeWindowConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    _context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const allowedStartTime = this.extractRuleValue(constraint.rule, 'startTime', '08:00');
    const allowedEndTime = this.extractRuleValue(constraint.rule, 'endTime', '18:00');

    const startHour = parseInt(allowedStartTime.split(':')[0]);
    const endHour = parseInt(allowedEndTime.split(':')[0]);

    sessions.forEach(session => {
      const sessionStartHour = session.startTime.getHours();
      const sessionEndHour = session.endTime.getHours();

      if (sessionStartHour < startHour || sessionEndHour > endHour) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Session outside allowed time window (${allowedStartTime}-${allowedEndTime})`,
          affectedEntities: constraint.entities,
          sessionIds: [session.id],
          severity: constraint.priority === Priority.CRITICAL ? 'hard' : 'soft',
          weight: constraint.weight || 1.0,
          violationScore: 0.9
        });
      }
    });

    return violations;
  }

  /**
   * Validates consecutive sessions constraints
   */
  private validateConsecutiveSessionsConstraint(
    constraint: Constraint,
    sessions: ScheduledSession[],
    _context: ValidationContext
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const maxConsecutive = this.extractRuleValue(constraint.rule, 'maxConsecutive', 3);

    // Group sessions by lecturer
    const lecturerSessions = new Map<string, ScheduledSession[]>();
    sessions.forEach(session => {
      if (constraint.entities.includes(session.lecturerId)) {
        if (!lecturerSessions.has(session.lecturerId)) {
          lecturerSessions.set(session.lecturerId, []);
        }
        lecturerSessions.get(session.lecturerId)!.push(session);
      }
    });

    lecturerSessions.forEach((lecturerSessionList, lecturerId) => {
      const consecutiveCount = this.countConsecutiveSessions(lecturerSessionList);
      if (consecutiveCount > maxConsecutive) {
        violations.push({
          constraintId: constraint.id,
          constraintType: constraint.type,
          priority: constraint.priority,
          description: `Lecturer has ${consecutiveCount} consecutive sessions (max: ${maxConsecutive})`,
          affectedEntities: [lecturerId],
          sessionIds: lecturerSessionList.map(s => s.id),
          severity: constraint.priority === Priority.CRITICAL ? 'hard' : 'soft',
          weight: constraint.weight || 1.0,
          violationScore: Math.min((consecutiveCount - maxConsecutive) / maxConsecutive, 1.0)
        });
      }
    });

    return violations;
  }

  /**
   * Helper methods
   */
  private isLecturerAvailable(lecturer: Lecturer, session: ScheduledSession): boolean {
    const dayAvailability = lecturer.availability[session.dayOfWeek];
    const sessionStart = this.extractTimeFromDate(session.startTime);
    const sessionEnd = this.extractTimeFromDate(session.endTime);

    return dayAvailability.some(slot => {
      return sessionStart >= slot.startTime && sessionEnd <= slot.endTime;
    });
  }

  private isVenueAvailable(venue: Venue, session: ScheduledSession): boolean {
    if (venue.availability.length === 0) return true; // No restrictions

    return venue.availability.some(slot => {
      if (slot.dayOfWeek !== session.dayOfWeek) return false;
      
      const sessionStart = this.extractTimeFromDate(session.startTime);
      const sessionEnd = this.extractTimeFromDate(session.endTime);
      
      return sessionStart >= slot.startTime && sessionEnd <= slot.endTime;
    });
  }

  private calculateSessionCapacity(session: ScheduledSession, studentGroups: StudentGroup[]): number {
    return session.studentGroups.reduce((total, groupId) => {
      const group = studentGroups.find(g => g.id === groupId);
      return total + (group?.size || 0);
    }, 0);
  }

  private isPreferredTimeSlot(lecturer: Lecturer, session: ScheduledSession): boolean {
    if (lecturer.preferences.preferredTimeSlots.length === 0) return true;

    const sessionStart = this.extractTimeFromDate(session.startTime);
    const sessionEnd = this.extractTimeFromDate(session.endTime);

    return lecturer.preferences.preferredTimeSlots.some(slot => {
      return slot.dayOfWeek === session.dayOfWeek &&
             sessionStart >= slot.startTime &&
             sessionEnd <= slot.endTime;
    });
  }

  private hasBackToBackSessions(session: ScheduledSession, allSessions: ScheduledSession[], lecturerId: string): boolean {
    const lecturerSessions = allSessions.filter(s => 
      s.lecturerId === lecturerId && 
      s.dayOfWeek === session.dayOfWeek &&
      s.id !== session.id
    );

    return lecturerSessions.some(otherSession => {
      const timeDiff = Math.abs(session.endTime.getTime() - otherSession.startTime.getTime());
      const timeDiffMinutes = timeDiff / (1000 * 60);
      return timeDiffMinutes < 15; // Less than 15 minutes between sessions
    });
  }

  private calculateDailyHours(session: ScheduledSession, allSessions: ScheduledSession[], lecturerId: string): number {
    const dailySessions = allSessions.filter(s => 
      s.lecturerId === lecturerId && 
      s.dayOfWeek === session.dayOfWeek
    );

    return dailySessions.reduce((total, s) => {
      const duration = (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);
  }

  private countConsecutiveSessions(sessions: ScheduledSession[]): number {
    if (sessions.length <= 1) return sessions.length;

    const sortedSessions = sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < sortedSessions.length; i++) {
      const prevSession = sortedSessions[i - 1];
      const currentSession = sortedSessions[i];

      if (!prevSession || !currentSession) continue;

      // Check if sessions are consecutive (same day and end time matches start time)
      if (prevSession.dayOfWeek === currentSession.dayOfWeek &&
          prevSession.endTime.getTime() === currentSession.startTime.getTime()) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive;
  }

  private extractRuleValue(rule: ConstraintRule, key: string, defaultValue: any): any {
    if (typeof rule.value === 'object' && rule.value !== null) {
      return (rule.value as any)[key] || defaultValue;
    }
    return rule.value || defaultValue;
  }

  private extractTimeFromDate(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }

  private formatSessionTime(session: ScheduledSession): string {
    const start = session.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const end = session.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${session.dayOfWeek} ${start}-${end}`;
  }

  private buildValidationResult(violations: ConstraintViolation[], constraints: Constraint[]): ValidationResult {
    const hardViolations = violations.filter(v => v.severity === 'hard');
    const softViolations = violations.filter(v => v.severity === 'soft');

    // Calculate constraint type breakdown
    const constraintTypeBreakdown: Record<ConstraintType, number> = {
      [ConstraintType.HARD_AVAILABILITY]: 0,
      [ConstraintType.VENUE_CAPACITY]: 0,
      [ConstraintType.EQUIPMENT_REQUIREMENT]: 0,
      [ConstraintType.LECTURER_PREFERENCE]: 0,
      [ConstraintType.STUDENT_BREAK]: 0,
      [ConstraintType.DEPARTMENT_POLICY]: 0,
      [ConstraintType.TIME_WINDOW]: 0,
      [ConstraintType.CONSECUTIVE_SESSIONS]: 0
    };

    violations.forEach(violation => {
      constraintTypeBreakdown[violation.constraintType]++;
    });

    // Calculate total satisfaction score (0-1, where 1 is perfect satisfaction)
    const totalPossibleScore = constraints.length;
    const violatedConstraints = new Set(violations.map(v => v.constraintId)).size;
    const totalScore = totalPossibleScore > 0 ? 
      (totalPossibleScore - violatedConstraints) / totalPossibleScore : 1.0;

    return {
      isValid: hardViolations.length === 0,
      violations,
      hardViolations,
      softViolations,
      totalScore,
      summary: {
        totalConstraints: constraints.length,
        violatedConstraints,
        hardConstraintViolations: hardViolations.length,
        softConstraintViolations: softViolations.length,
        constraintTypeBreakdown
      }
    };
  }
}