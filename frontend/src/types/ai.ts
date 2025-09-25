// AI-related type definitions

export interface OptimizationRequest {
  scheduleId: string;
  parameters: OptimizationParameters;
  constraints: OptimizationConstraint[];
}

export interface OptimizationParameters {
  maxIterations: number;
  timeLimit: number; // seconds
  prioritizePreferences: boolean;
  minimizeGaps: boolean;
  maximizeVenueUtilization: boolean;
  balanceWorkload: boolean;
  weights: OptimizationWeights;
}

export interface OptimizationWeights {
  lecturerPreferences: number;
  studentConvenience: number;
  venueUtilization: number;
  timeEfficiency: number;
  workloadBalance: number;
}

export interface OptimizationConstraint {
  id: string;
  type: string;
  entityId: string;
  description: string;
  weight: number;
  isHard: boolean;
}

export interface OptimizationResult {
  id: string;
  status: OptimizationStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  schedule?: any; // Will be Schedule type
  metrics: OptimizationMetrics;
  suggestions: ConflictResolutionSuggestion[];
  errors?: string[];
}

export enum OptimizationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface OptimizationMetrics {
  totalClashes: number;
  resolvedClashes: number;
  improvementScore: number;
  executionTime: number;
  iterationsCompleted: number;
  constraintsSatisfied: number;
  constraintsTotal: number;
}

export interface ConflictResolutionSuggestion {
  id: string;
  clashId: string;
  title: string;
  description: string;
  impact: string;
  confidence: number;
  priority: number;
  changes: SuggestionChange[];
  pros: string[];
  cons: string[];
  estimatedEffort: EffortLevel;
  affectedEntities: string[];
}

export interface SuggestionChange {
  entityType: 'session' | 'venue' | 'lecturer' | 'time';
  entityId: string;
  changeType: 'move' | 'reschedule' | 'reassign' | 'swap';
  currentValue: any;
  proposedValue: any;
  reason: string;
}

export enum EffortLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface AIProcessingState {
  isProcessing: boolean;
  currentTask: string;
  progress: number;
  estimatedTimeRemaining?: number;
  logs: ProcessingLog[];
}

export interface ProcessingLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: any;
}