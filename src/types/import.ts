// Import-related type definitions

export interface FileUploadRequest {
  file: Express.Multer.File;
  importType?: 'timetable' | 'entities';
}

export interface FileUploadResponse {
  fileId: string;
  originalName: string;
  size: number;
  detectedColumns: string[];
  rowCount: number;
  previewData: any[][];
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  metadata: {
    totalRows: number;
    emptyRows: number;
    duplicateRows: number;
    encoding?: string;
    delimiter?: string;
    sheetName?: string;
  };
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup' | 'schedule';
  transformation?: TransformationType;
  required: boolean;
  defaultValue?: any;
}

export enum TransformationType {
  NONE = 'none',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  TRIM = 'trim',
  DATE_PARSE = 'date_parse',
  NUMBER_PARSE = 'number_parse',
  BOOLEAN_PARSE = 'boolean_parse',
  SPLIT_ARRAY = 'split_array'
}

export interface MappingConfiguration {
  id: string;
  name: string;
  fileType: 'csv' | 'excel';
  mappings: ColumnMapping[];
  createdAt: Date;
  lastUsed: Date;
}

export interface MatchResult {
  entityId?: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'none';
  suggestedMatches: SuggestedMatch[];
}

export interface SuggestedMatch {
  entityId: string;
  entity: any;
  confidence: number;
  matchingFields: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  entityCounts: {
    venues: { new: number; existing: number };
    lecturers: { new: number; existing: number };
    courses: { new: number; existing: number };
    studentGroups: { new: number; existing: number };
    schedules: { new: number; conflicts: number };
  };
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestedFix?: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  suggestedFix?: string;
}

export interface CreateImportJobRequest {
  userId: string;
  fileId: string;
  mappingConfig: MappingConfiguration;
  validationResult: ValidationResult;
}

export interface ImportJob {
  id: string;
  userId: string;
  fileId: string;
  mappingConfig: MappingConfiguration;
  validationResult: ValidationResult;
  status: ImportStatus;
  progress: ImportProgress;
  createdAt: Date;
  completedAt?: Date;
}

export enum ImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ImportProgress {
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  currentStage: ImportStage;
  estimatedTimeRemaining?: number;
}

export enum ImportStage {
  PARSING = 'parsing',
  MAPPING = 'mapping',
  VALIDATION = 'validation',
  ENTITY_CREATION = 'entity_creation',
  SCHEDULE_IMPORT = 'schedule_import',
  FINALIZATION = 'finalization'
}

export interface ImportSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'excel';
  status: ImportSessionStatus;
  mappingConfigId?: string;
  validationResults?: ValidationResult;
  importJobId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export enum ImportSessionStatus {
  UPLOADED = 'uploaded',
  MAPPED = 'mapped',
  VALIDATED = 'validated',
  IMPORTING = 'importing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface MappedImportData {
  venues: Partial<any>[];
  lecturers: Partial<any>[];
  courses: Partial<any>[];
  studentGroups: Partial<any>[];
  schedules: Partial<any>[];
  metadata: {
    sourceFile: string;
    mappingConfig: string;
    importedAt: Date;
    importedBy: string;
  };
}

export interface EntityMatchResults {
  venues: Map<number, MatchResult>;
  lecturers: Map<number, MatchResult>;
  courses: Map<number, MatchResult>;
  studentGroups: Map<number, MatchResult>;
}

export interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  fileType: 'csv' | 'excel';
  columns: TemplateColumn[];
  sampleData: Record<string, any>[];
  version: string;
  createdAt: Date;
}

export interface TemplateColumn {
  name: string;
  description: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  format?: string;
  examples: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    allowedValues?: string[];
  };
}

export interface ErrorRecoveryStrategy {
  skipInvalidRows: boolean;
  createMissingEntities: boolean;
  resolveConflictsAutomatically: boolean;
  rollbackOnError: boolean;
  maxErrorThreshold: number;
}

// CSV-specific types
export interface CSVParseOptions {
  delimiter?: string;
  encoding?: string;
  headers?: boolean;
  skipEmptyLines?: boolean;
  strict?: boolean;
}

export interface CSVParseResult extends ParsedData {
  metadata: ParsedData['metadata'] & {
    delimiter: string;
    detectedAutomatically: boolean;
  };
}

export interface CSVDelimiterDetectionResult {
  delimiter: string;
  confidence: number;
}

// Excel-specific types
export interface ExcelParseOptions {
  sheetIndex?: number;
  sheetName?: string;
  range?: string;
  headers?: boolean;
  skipEmptyLines?: boolean;
}

export interface ExcelParseResult extends ParsedData {
  metadata: ParsedData['metadata'] & {
    sheetName: string;
    availableSheets: string[];
  };
}

export interface ExcelSheetInfo {
  name: string;
  index: number;
  rowCount: number;
  columnCount: number;
}