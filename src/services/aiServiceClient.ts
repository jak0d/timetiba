import axios from 'axios';
import { Venue } from '../models/venue';
import { Lecturer } from '../models/lecturer';
import { Course } from '../models/course';
import { StudentGroup } from '../models/studentGroup';
import { Constraint } from '../models/constraint';
import { Schedule, ScheduledSession } from '../models/schedule';
import { DayOfWeek } from '../models/common';

// AI Service Request/Response Types
export interface AIServiceEntity {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface AIServiceConstraint {
  id: string;
  type: string;
  priority: string;
  entities: string[];
  rule: Record<string, any>;
  weight: number;
}

export interface OptimizationParameters {
  max_solve_time_seconds: number;
  preference_weight: number;
  efficiency_weight: number;
  balance_weight: number;
  allow_partial_solutions: boolean;
}

export interface OptimizationRequest {
  entities: {
    venues: AIServiceEntity[];
    lecturers: AIServiceEntity[];
    courses: AIServiceEntity[];
    student_groups: AIServiceEntity[];
  };
  constraints: AIServiceConstraint[];
  optimization_parameters: OptimizationParameters;
  existing_schedule?: any;
}

export interface AIScheduledSession {
  id: string;
  course_id: string;
  lecturer_id: string;
  venue_id: string;
  student_groups: string[];
  start_time: string;
  end_time: string;
  day_of_week: number;
}

export interface AISolution {
  sessions: AIScheduledSession[];
  score: number;
  is_feasible: boolean;
  conflicts: any[];
  metadata: Record<string, any>;
}

export interface OptimizationResponse {
  success: boolean;
  solution?: AISolution;
  message: string;
  conflicts?: any[];
  processing_time_seconds?: number;
}

export interface ValidationRequest {
  sessions: AIScheduledSession[];
  score: number;
  is_feasible: boolean;
  conflicts: any[];
  metadata: Record<string, any>;
}

export interface ValidationResponse {
  valid: boolean;
  score: number;
  conflicts: any[];
  message: string;
}

export interface ConflictAnalysisRequest {
  conflicts: any[];
  solution: AISolution;
  entities: {
    venues: AIServiceEntity[];
    lecturers: AIServiceEntity[];
    courses: AIServiceEntity[];
    student_groups: AIServiceEntity[];
  };
}

export interface ConflictAnalysisResponse {
  success: boolean;
  analysis: any;
  message: string;
}

export interface ResolutionSuggestion {
  resolution_id: string;
  description: string;
  resolution_type: string;
  affected_sessions: string[];
  parameters: Record<string, any>;
  score: number;
  effort_level: string;
  impact_description: string;
  confidence: number;
  ranking_score: number;
}

export interface ResolutionSuggestionsRequest {
  conflicts: any[];
  solution: AISolution;
  entities: {
    venues: AIServiceEntity[];
    lecturers: AIServiceEntity[];
    courses: AIServiceEntity[];
    student_groups: AIServiceEntity[];
  };
  max_suggestions?: number;
}

export interface ResolutionSuggestionsResponse {
  success: boolean;
  suggestions: ResolutionSuggestion[];
  total_suggestions: number;
  message: string;
}

export interface AIServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  fallbackEnabled: boolean;
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class AIServiceClient {
  private client: any;
  private config: AIServiceConfig;
  private isServiceAvailable: boolean = true;
  private lastHealthCheck: Date | null = null;
  private failureCount: number = 0;
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerOpenTime: Date | null = null;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      baseUrl: process.env['AI_SERVICE_URL'] || 'http://localhost:8001',
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      fallbackEnabled: true,
      healthCheckInterval: 60000, // 1 minute
      circuitBreakerThreshold: 5, // Open circuit after 5 failures
      circuitBreakerTimeout: 60000, // Keep circuit open for 1 minute
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config: any) => {
        console.log(`AI Service request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => {
        console.log(`AI Service response: ${response.status} ${response.config.url}`);
        this.onSuccess();
        return response;
      },
      (error: any) => {
        this.onFailure();
        if (error.response) {
          console.error(`AI Service error: ${error.response.status} ${error.response.data?.detail || error.message}`);
          throw new AIServiceError(
            `AI Service error: ${error.response.data?.detail || error.message}`,
            error.response.status,
            error
          );
        } else if (error.request) {
          console.error('AI Service is unavailable:', error.message);
          this.isServiceAvailable = false;
          throw new AIServiceError(
            'AI Service is unavailable',
            503,
            error
          );
        } else {
          console.error(`Request error: ${error.message}`);
          throw new AIServiceError(
            `Request error: ${error.message}`,
            undefined,
            error
          );
        }
      }
    );
  }

  /**
   * Check if AI service is healthy and available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Don't perform health check if circuit breaker is open and timeout hasn't passed
      if (this.circuitBreakerOpen && this.circuitBreakerOpenTime) {
        const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime.getTime();
        if (timeSinceOpen < this.config.circuitBreakerTimeout) {
          return false;
        }
      }

      const response = await this.client.get('/health', { timeout: 5000 });
      const isHealthy = response.data.status === 'healthy';
      
      if (isHealthy) {
        this.onSuccess();
        this.lastHealthCheck = new Date();
      }
      
      return isHealthy;
    } catch (error) {
      console.warn('AI Service health check failed:', error);
      this.onFailure();
      return false;
    }
  }

  /**
   * Check if service should be available based on circuit breaker state
   */
  private isServiceAccessible(): boolean {
    if (!this.circuitBreakerOpen) {
      return true;
    }

    if (this.circuitBreakerOpenTime) {
      const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime.getTime();
      if (timeSinceOpen >= this.config.circuitBreakerTimeout) {
        // Try to close circuit breaker
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenTime = null;
        console.log('Circuit breaker attempting to close - trying half-open state');
        return true;
      }
    }

    return false;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.isServiceAvailable = true;
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenTime = null;
      console.log('Circuit breaker closed - service recovered');
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.isServiceAvailable = false;
    
    if (this.failureCount >= this.config.circuitBreakerThreshold && !this.circuitBreakerOpen) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerOpenTime = new Date();
      console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  /**
   * Optimize timetable using AI service
   */
  async optimizeTimetable(request: OptimizationRequest): Promise<OptimizationResponse> {
    if (!this.isServiceAccessible()) {
      if (this.config.fallbackEnabled) {
        return this.fallbackOptimization(request);
      }
      throw new AIServiceError('AI Service is unavailable and fallback is disabled', 503);
    }

    return this.withRetry(async () => {
      const response = await this.client.post('/optimize', request);
      return response.data;
    }, () => this.config.fallbackEnabled ? this.fallbackOptimization(request) : null);
  }

  /**
   * Validate a timetable solution
   */
  async validateSolution(solution: ValidationRequest): Promise<ValidationResponse> {
    if (!this.isServiceAccessible()) {
      if (this.config.fallbackEnabled) {
        return this.fallbackValidation(solution);
      }
      throw new AIServiceError('AI Service is unavailable and fallback is disabled', 503);
    }

    return this.withRetry(async () => {
      const response = await this.client.post('/validate', solution);
      return response.data;
    }, () => this.config.fallbackEnabled ? this.fallbackValidation(solution) : null);
  }

  /**
   * Analyze conflicts in a timetable
   */
  async analyzeConflicts(request: ConflictAnalysisRequest): Promise<ConflictAnalysisResponse> {
    return this.withRetry(async () => {
      const response = await this.client.post('/analyze-conflicts', request);
      return response.data;
    });
  }

  /**
   * Get resolution suggestions for conflicts
   */
  async getResolutionSuggestions(request: ResolutionSuggestionsRequest): Promise<ResolutionSuggestionsResponse> {
    if (!this.isServiceAccessible()) {
      if (this.config.fallbackEnabled) {
        return this.fallbackResolutionSuggestions(request);
      }
      throw new AIServiceError('AI Service is unavailable and fallback is disabled', 503);
    }

    return this.withRetry(async () => {
      const response = await this.client.post('/suggest-resolutions', request);
      return response.data;
    }, () => this.config.fallbackEnabled ? this.fallbackResolutionSuggestions(request) : null);
  }

  /**
   * Convert internal entities to AI service format
   */
  convertEntitiesToAIFormat(
    venues: Venue[],
    lecturers: Lecturer[],
    courses: Course[],
    studentGroups: StudentGroup[]
  ): OptimizationRequest['entities'] {
    return {
      venues: venues.map(venue => ({
        id: venue.id,
        name: venue.name,
        type: 'venue',
        capacity: venue.capacity,
        equipment: venue.equipment,
        availability: venue.availability,
        location: venue.location,
        accessibility: venue.accessibility
      })),
      lecturers: lecturers.map(lecturer => ({
        id: lecturer.id,
        name: lecturer.name,
        type: 'lecturer',
        email: lecturer.email,
        department: lecturer.department,
        subjects: lecturer.subjects,
        availability: lecturer.availability,
        preferences: lecturer.preferences,
        max_hours_per_day: lecturer.maxHoursPerDay,
        max_hours_per_week: lecturer.maxHoursPerWeek
      })),
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        type: 'course',
        code: course.code,
        duration: course.duration,
        frequency: course.frequency,
        required_equipment: course.requiredEquipment,
        student_groups: course.studentGroups,
        lecturer_id: course.lecturerId,
        constraints: course.constraints
      })),
      student_groups: studentGroups.map(group => ({
        id: group.id,
        name: group.name,
        type: 'student_group',
        size: group.size,
        courses: group.courses,
        year_level: group.yearLevel,
        department: group.department
      }))
    };
  }

  /**
   * Convert internal constraints to AI service format
   */
  convertConstraintsToAIFormat(constraints: Constraint[]): AIServiceConstraint[] {
    return constraints.map(constraint => ({
      id: constraint.id,
      type: constraint.type,
      priority: constraint.priority,
      entities: constraint.entities,
      rule: constraint.rule,
      weight: this.getPriorityWeight(constraint.priority)
    }));
  }

  /**
   * Convert AI service solution to internal format
   */
  convertSolutionFromAIFormat(aiSolution: AISolution): ScheduledSession[] {
    return aiSolution.sessions.map(session => ({
      id: session.id,
      courseId: session.course_id,
      lecturerId: session.lecturer_id,
      venueId: session.venue_id,
      studentGroups: session.student_groups,
      startTime: new Date(session.start_time),
      endTime: new Date(session.end_time),
      dayOfWeek: this.convertNumberToDayOfWeek(session.day_of_week)
    }));
  }

  /**
   * Convert internal schedule to AI service format
   */
  convertScheduleToAIFormat(schedule: Schedule): AISolution {
    return {
      sessions: schedule.timeSlots.map(session => ({
        id: session.id,
        course_id: session.courseId,
        lecturer_id: session.lecturerId,
        venue_id: session.venueId,
        student_groups: session.studentGroups,
        start_time: session.startTime.toISOString(),
        end_time: session.endTime.toISOString(),
        day_of_week: this.convertDayOfWeekToNumber(session.dayOfWeek)
      })),
      score: 0.0, // Will be calculated by AI service
      is_feasible: schedule.status === 'published',
      conflicts: [],
      metadata: {
        schedule_id: schedule.id,
        name: schedule.name,
        academic_period: schedule.academicPeriod,
        status: schedule.status
      }
    };
  }

  /**
   * Execute operation with retry logic and fallback
   */
  private async withRetry<T>(
    operation: () => Promise<T>, 
    fallback?: () => Promise<T> | null
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.retryAttempts) {
          break;
        }
        
        // Don't retry on client errors (4xx)
        if (error instanceof AIServiceError && error.statusCode && error.statusCode < 500) {
          break;
        }
        
        console.warn(`AI Service attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms:`, error);
        await this.delay(this.config.retryDelay * attempt); // Exponential backoff
      }
    }
    
    // Try fallback if available
    if (fallback) {
      try {
        const fallbackResult = await fallback();
        if (fallbackResult !== null) {
          console.warn('Using fallback mechanism due to AI service failure');
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.error('Fallback mechanism also failed:', fallbackError);
      }
    }
    
    throw lastError!;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert priority to numeric weight
   */
  private getPriorityWeight(priority: string): number {
    switch (priority.toLowerCase()) {
      case 'critical': return 10.0;
      case 'high': return 7.5;
      case 'medium': return 5.0;
      case 'low': return 2.5;
      default: return 5.0;
    }
  }

  /**
   * Convert DayOfWeek enum to number for AI service
   */
  private convertDayOfWeekToNumber(dayOfWeek: DayOfWeek): number {
    switch (dayOfWeek) {
      case DayOfWeek.MONDAY: return 0;
      case DayOfWeek.TUESDAY: return 1;
      case DayOfWeek.WEDNESDAY: return 2;
      case DayOfWeek.THURSDAY: return 3;
      case DayOfWeek.FRIDAY: return 4;
      case DayOfWeek.SATURDAY: return 5;
      case DayOfWeek.SUNDAY: return 6;
      default: return 0;
    }
  }

  /**
   * Convert number to DayOfWeek enum from AI service
   */
  private convertNumberToDayOfWeek(dayNumber: number): DayOfWeek {
    switch (dayNumber) {
      case 0: return DayOfWeek.MONDAY;
      case 1: return DayOfWeek.TUESDAY;
      case 2: return DayOfWeek.WEDNESDAY;
      case 3: return DayOfWeek.THURSDAY;
      case 4: return DayOfWeek.FRIDAY;
      case 5: return DayOfWeek.SATURDAY;
      case 6: return DayOfWeek.SUNDAY;
      default: return DayOfWeek.MONDAY;
    }
  }

  /**
   * Fallback optimization when AI service is unavailable
   */
  private async fallbackOptimization(_request: OptimizationRequest): Promise<OptimizationResponse> {
    console.warn('Using fallback optimization - basic scheduling without AI optimization');
    
    // Basic fallback: return a simple response indicating manual scheduling is needed
    return {
      success: false,
      message: 'AI optimization service is unavailable. Manual scheduling required.',
      conflicts: [],
      processing_time_seconds: 0
    };
  }

  /**
   * Fallback validation when AI service is unavailable
   */
  private async fallbackValidation(_solution: ValidationRequest): Promise<ValidationResponse> {
    console.warn('Using fallback validation - basic conflict checking');
    
    // Basic fallback: assume solution is valid but recommend manual review
    return {
      valid: true,
      score: 0.5, // Neutral score
      conflicts: [],
      message: 'AI validation service is unavailable. Manual review recommended.'
    };
  }

  /**
   * Fallback resolution suggestions when AI service is unavailable
   */
  private async fallbackResolutionSuggestions(_request: ResolutionSuggestionsRequest): Promise<ResolutionSuggestionsResponse> {
    console.warn('Using fallback resolution suggestions - basic recommendations');
    
    // Basic fallback: provide generic suggestions
    const basicSuggestions: ResolutionSuggestion[] = [
      {
        resolution_id: 'fallback-1',
        description: 'Manual review and adjustment required',
        resolution_type: 'manual',
        affected_sessions: [],
        parameters: {},
        score: 0.5,
        effort_level: 'high',
        impact_description: 'Requires manual intervention to resolve conflicts',
        confidence: 0.3,
        ranking_score: 0.3
      }
    ];

    return {
      success: true,
      suggestions: basicSuggestions,
      total_suggestions: basicSuggestions.length,
      message: 'AI suggestion service is unavailable. Basic recommendations provided.'
    };
  }

  /**
   * Get service status information
   */
  getServiceStatus(): {
    isAvailable: boolean;
    circuitBreakerOpen: boolean;
    failureCount: number;
    lastHealthCheck: Date | null;
  } {
    return {
      isAvailable: this.isServiceAvailable,
      circuitBreakerOpen: this.circuitBreakerOpen,
      failureCount: this.failureCount,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Force circuit breaker reset (for testing/admin purposes)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenTime = null;
    this.failureCount = 0;
    this.isServiceAvailable = true;
    console.log('Circuit breaker manually reset');
  }
}

// Export singleton instance
export const aiServiceClient = new AIServiceClient();