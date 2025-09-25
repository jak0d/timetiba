import { UserRole, ViewFilter, ViewConfiguration, ViewDisplayOptions, PersonalizedTimetableRequest, TimetableView, ViewSession, ViewMetadata } from '../types/view';
import { ScheduleRepository } from '../repositories/scheduleRepository';
import { VenueRepository } from '../repositories/venueRepository';
import { LecturerRepository } from '../repositories/lecturerRepository';
import { CourseRepository } from '../repositories/courseRepository';
import { StudentGroupRepository } from '../repositories/studentGroupRepository';
import { Schedule, ScheduledSession } from '../models/schedule';
import { ClashDetector } from './clashDetector';

export class ViewService {
  private scheduleRepository: ScheduleRepository;
  private venueRepository: VenueRepository;
  private lecturerRepository: LecturerRepository;
  private courseRepository: CourseRepository;
  private studentGroupRepository: StudentGroupRepository;
  private clashDetector: ClashDetector;

  constructor(
    scheduleRepository: ScheduleRepository,
    venueRepository: VenueRepository,
    lecturerRepository: LecturerRepository,
    courseRepository: CourseRepository,
    studentGroupRepository: StudentGroupRepository,
    clashDetector: ClashDetector
  ) {
    this.scheduleRepository = scheduleRepository;
    this.venueRepository = venueRepository;
    this.lecturerRepository = lecturerRepository;
    this.courseRepository = courseRepository;
    this.studentGroupRepository = studentGroupRepository;
    this.clashDetector = clashDetector;
  }

  async generatePersonalizedTimetable(scheduleId: string, request: PersonalizedTimetableRequest): Promise<TimetableView> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Apply role-based filtering
    let filteredSessions = await this.applyRoleBasedFilter(schedule.timeSlots, request.userRole, request.userId);

    // Apply additional filters
    if (request.filters) {
      filteredSessions = await this.applyViewFilters(filteredSessions, request.filters);
    }

    // Convert to view sessions with enriched data
    const viewSessions = await Promise.all(
      filteredSessions.map(session => this.enrichSessionForView(session, request.displayOptions?.showConflicts || false))
    );

    // Apply display options
    const displayOptions = this.mergeDisplayOptions(request.displayOptions);

    // Generate metadata
    const metadata: ViewMetadata = {
      userRole: request.userRole,
      userId: request.userId,
      generatedAt: new Date(),
      totalSessions: viewSessions.length,
      dateRange: this.calculateDateRange(viewSessions),
      appliedFilters: request.filters || {}
    };

    return {
      id: `view-${Date.now()}`,
      name: this.generateViewName(request.userRole, request.userId),
      sessions: viewSessions,
      metadata,
      displayOptions
    };
  }

  private async applyRoleBasedFilter(sessions: ScheduledSession[], userRole: UserRole, userId: string): Promise<ScheduledSession[]> {
    switch (userRole) {
      case UserRole.LECTURER:
        // Show only sessions where the user is the lecturer
        return sessions.filter(session => session.lecturerId === userId);

      case UserRole.STUDENT:
        // Show only sessions where the user's student group is involved
        const studentGroups = await this.getStudentGroupsForUser(userId);
        return sessions.filter(session => 
          session.studentGroups.some(groupId => studentGroups.includes(groupId))
        );

      case UserRole.ADMIN:
        // Admins can see all sessions
        return sessions;

      default:
        throw new Error(`Unsupported user role: ${userRole}`);
    }
  }

  private async applyViewFilters(sessions: ScheduledSession[], filters: ViewFilter): Promise<ScheduledSession[]> {
    let filteredSessions = [...sessions];

    // Date range filter
    if (filters.dateRange) {
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= filters.dateRange!.startDate && 
               sessionDate <= filters.dateRange!.endDate;
      });
    }

    // Entity filter (can be venues, lecturers, courses, or student groups depending on context)
    if (filters.entityIds && filters.entityIds.length > 0) {
      filteredSessions = filteredSessions.filter(session => {
        return filters.entityIds!.includes(session.venueId) ||
               filters.entityIds!.includes(session.lecturerId) ||
               filters.entityIds!.includes(session.courseId) ||
               session.studentGroups.some(groupId => filters.entityIds!.includes(groupId));
      });
    }

    // Day of week filter
    if (filters.dayOfWeek && filters.dayOfWeek.length > 0) {
      filteredSessions = filteredSessions.filter(session => {
        const dayName = this.getDayOfWeek(new Date(session.startTime));
        return filters.dayOfWeek!.includes(dayName);
      });
    }

    // Time range filter
    if (filters.timeRange) {
      filteredSessions = filteredSessions.filter(session => {
        const sessionStartTime = this.formatTime(new Date(session.startTime));
        const sessionEndTime = this.formatTime(new Date(session.endTime));
        
        return sessionStartTime >= filters.timeRange!.startTime &&
               sessionEndTime <= filters.timeRange!.endTime;
      });
    }

    return filteredSessions;
  }

  private async enrichSessionForView(session: ScheduledSession, showConflicts: boolean): Promise<ViewSession> {
    // Get related entity data
    const [course, lecturer, venue, studentGroups] = await Promise.all([
      this.courseRepository.findById(session.courseId),
      this.lecturerRepository.findById(session.lecturerId),
      this.venueRepository.findById(session.venueId),
      Promise.all(session.studentGroups.map(sgId => this.studentGroupRepository.findById(sgId)))
    ]);

    // Check for conflicts if requested
    let hasConflict = false;
    let conflictType: string | undefined;

    if (showConflicts) {
      const conflicts = await this.clashDetector.detectSessionClashes([session]);
      if (conflicts.length > 0) {
        hasConflict = true;
        conflictType = conflicts[0].type;
      }
    }

    return {
      id: session.id,
      courseName: course?.name || 'Unknown Course',
      courseCode: course?.code || 'N/A',
      lecturerName: lecturer?.name || 'Unknown Lecturer',
      venueName: venue?.name || 'Unknown Venue',
      studentGroups: studentGroups.filter(sg => sg !== null).map(sg => sg!.name),
      startTime: new Date(session.startTime),
      endTime: new Date(session.endTime),
      dayOfWeek: this.getDayOfWeek(new Date(session.startTime)),
      duration: session.endTime.getTime() - session.startTime.getTime(),
      hasConflict,
      conflictType
    };
  }

  private mergeDisplayOptions(options?: Partial<ViewDisplayOptions>): ViewDisplayOptions {
    const defaults: ViewDisplayOptions = {
      showDetails: true,
      showConflicts: false,
      groupBy: 'day',
      timeFormat: '24h',
      showWeekends: false,
      compactView: false
    };

    return { ...defaults, ...options };
  }

  private generateViewName(userRole: UserRole, userId: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${userRole}-${userId}-${timestamp}`;
  }

  private calculateDateRange(sessions: ViewSession[]): { startDate: Date; endDate: Date } {
    if (sessions.length === 0) {
      const now = new Date();
      return { startDate: now, endDate: now };
    }

    const dates = sessions.map(s => s.startTime);
    return {
      startDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      endDate: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }

  private getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()] || 'Unknown';
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5); // HH:MM format
  }

  private async getStudentGroupsForUser(userId: string): Promise<string[]> {
    // This would typically query a user-student group mapping table
    // For now, we'll assume the userId corresponds to a student group ID
    // In a real implementation, you'd have a separate user management system
    const studentGroup = await this.studentGroupRepository.findById(userId);
    return studentGroup ? [studentGroup.id] : [];
  }

  // View configuration management
  async saveViewConfiguration(config: Omit<ViewConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<ViewConfiguration> {
    const viewConfig: ViewConfiguration = {
      ...config,
      id: `config-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would be saved to a database
    // For now, we'll just return the configuration
    return viewConfig;
  }

  async getViewConfiguration(configId: string): Promise<ViewConfiguration | null> {
    // In a real implementation, this would query the database
    // For now, return null as we don't have persistence
    return null;
  }

  async getUserViewConfigurations(userId: string, userRole: UserRole): Promise<ViewConfiguration[]> {
    // In a real implementation, this would query the database for user's saved views
    // For now, return empty array
    return [];
  }

  async deleteViewConfiguration(configId: string): Promise<boolean> {
    // In a real implementation, this would delete from database
    // For now, return true
    return true;
  }

  // Utility methods for different view types
  async generateLecturerView(scheduleId: string, lecturerId: string, filters?: ViewFilter): Promise<TimetableView> {
    return this.generatePersonalizedTimetable(scheduleId, {
      userRole: UserRole.LECTURER,
      userId: lecturerId,
      filters,
      displayOptions: {
        showDetails: true,
        showConflicts: true,
        groupBy: 'day',
        timeFormat: '24h'
      }
    });
  }

  async generateStudentView(scheduleId: string, studentId: string, filters?: ViewFilter): Promise<TimetableView> {
    return this.generatePersonalizedTimetable(scheduleId, {
      userRole: UserRole.STUDENT,
      userId: studentId,
      filters,
      displayOptions: {
        showDetails: false,
        showConflicts: false,
        groupBy: 'day',
        timeFormat: '12h',
        compactView: true
      }
    });
  }

  async generateVenueView(scheduleId: string, venueId: string, filters?: ViewFilter): Promise<TimetableView> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with ID ${scheduleId} not found`);
    }

    // Filter sessions for specific venue
    const venueSessions = schedule.timeSlots.filter(session => session.venueId === venueId);

    // Apply additional filters
    let filteredSessions = venueSessions;
    if (filters) {
      filteredSessions = await this.applyViewFilters(venueSessions, filters);
    }

    const viewSessions = await Promise.all(
      filteredSessions.map(session => this.enrichSessionForView(session, true))
    );

    const venue = await this.venueRepository.findById(venueId);

    return {
      id: `venue-view-${venueId}-${Date.now()}`,
      name: `${venue?.name || 'Unknown Venue'} Schedule`,
      sessions: viewSessions,
      metadata: {
        userRole: UserRole.ADMIN,
        generatedAt: new Date(),
        totalSessions: viewSessions.length,
        dateRange: this.calculateDateRange(viewSessions),
        appliedFilters: filters || {}
      },
      displayOptions: {
        showDetails: true,
        showConflicts: true,
        groupBy: 'day',
        timeFormat: '24h',
        showWeekends: false,
        compactView: false
      }
    };
  }
}