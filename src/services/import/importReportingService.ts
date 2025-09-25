import { redisManager } from '../../utils/redisConfig';
import { logger } from '../../utils/logger';
import { 
  ImportJob, 
  ImportStatus, 
  ImportStage 
} from '../../types/import';

export interface ImportReport {
  jobId: string;
  userId: string;
  fileName: string;
  status: ImportStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  summary: ImportSummary;
  entityResults: EntityImportResults;
  errors: ImportErrorReport[];
  warnings: ImportWarningReport[];
  dataQuality: DataQualityReport;
  recommendations: string[];
}

export interface ImportSummary {
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  processingSpeed: number; // rows per second
  stages: StageReport[];
}

export interface StageReport {
  stage: ImportStage;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  rowsProcessed: number;
  success: boolean;
  errors: number;
  warnings: number;
}

export interface EntityImportResults {
  venues: EntityTypeResult;
  lecturers: EntityTypeResult;
  courses: EntityTypeResult;
  studentGroups: EntityTypeResult;
  schedules: EntityTypeResult;
}

export interface EntityTypeResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  duplicatesFound: number;
  conflictsResolved: number;
}

export interface ImportErrorReport {
  row: number;
  column?: string;
  entityType?: string;
  errorType: 'validation' | 'constraint' | 'database' | 'business_rule';
  severity: 'error' | 'warning';
  message: string;
  suggestedFix?: string;
  context?: Record<string, any>;
}

export interface ImportWarningReport {
  row: number;
  column?: string;
  entityType?: string;
  warningType: 'data_quality' | 'duplicate' | 'missing_reference' | 'format';
  message: string;
  suggestedAction?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface DataQualityReport {
  score: number; // 0-100
  issues: DataQualityIssue[];
  suggestions: DataQualitySuggestion[];
  metrics: {
    completeness: number; // percentage of non-empty fields
    consistency: number; // percentage of consistent formats
    accuracy: number; // percentage of valid data
    duplicates: number; // number of duplicate records found
  };
}

export interface DataQualityIssue {
  type: 'missing_data' | 'invalid_format' | 'inconsistent_data' | 'duplicate_data';
  field: string;
  count: number;
  percentage: number;
  examples: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface DataQualitySuggestion {
  issue: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export class ImportReportingService {
  private static instance: ImportReportingService;

  private constructor() {}

  public static getInstance(): ImportReportingService {
    if (!ImportReportingService.instance) {
      ImportReportingService.instance = new ImportReportingService();
    }
    return ImportReportingService.instance;
  }

  /**
   * Generate comprehensive import report
   */
  public async generateImportReport(jobId: string): Promise<ImportReport> {
    try {
      // Get job metadata
      const job = await this.getJobMetadata(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Get processing stages
      const stages = await this.getStageReports(jobId);

      // Get entity results
      const entityResults = await this.getEntityResults(jobId);

      // Get errors and warnings
      const errors = await this.getImportErrors(jobId);
      const warnings = await this.getImportWarnings(jobId);

      // Generate data quality report
      const dataQuality = await this.generateDataQualityReport(jobId, errors, warnings);

      // Calculate summary
      const summary = this.calculateImportSummary(job, stages);

      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, dataQuality, errors);

      const report: ImportReport = {
        jobId,
        userId: job.userId,
        fileName: await this.getOriginalFileName(job.fileId),
        status: job.status,
        startTime: job.createdAt,
        ...(job.completedAt && { endTime: job.completedAt }),
        ...(job.completedAt && { 
          duration: Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)
        }),
        summary,
        entityResults,
        errors,
        warnings,
        dataQuality,
        recommendations
      };

      // Store report for future access
      await this.storeReport(jobId, report);

      logger.info(`Generated import report for job ${jobId}`);
      return report;

    } catch (error) {
      logger.error(`Failed to generate import report for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get stored import report
   */
  public async getImportReport(jobId: string, userId: string): Promise<ImportReport | null> {
    try {
      const reportKey = `import:report:${jobId}`;
      const reportData = await redisManager.getClient().get(reportKey);
      
      if (!reportData) {
        return null;
      }

      const report: ImportReport = JSON.parse(reportData);
      
      // Verify user access
      if (report.userId !== userId) {
        throw new Error('Unauthorized access to import report');
      }

      // Convert date strings back to Date objects
      report.startTime = new Date(report.startTime);
      if (report.endTime) {
        report.endTime = new Date(report.endTime);
      }

      return report;

    } catch (error) {
      // Re-throw authorization errors
      if (error instanceof Error && error.message.includes('Unauthorized access')) {
        throw error;
      }
      
      logger.error(`Failed to get import report for job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Get import reports for a user
   */
  public async getUserImportReports(
    userId: string, 
    limit: number = 10,
    status?: ImportStatus
  ): Promise<ImportReport[]> {
    try {
      // Get user's job IDs
      const jobIds = await redisManager.getClient().smembers(`user:jobs:${userId}`);
      
      const reports: ImportReport[] = [];
      
      for (const jobId of jobIds.slice(0, limit * 2)) { // Get more to filter
        const report = await this.getImportReport(jobId, userId);
        if (report && (!status || report.status === status)) {
          reports.push(report);
        }
        
        if (reports.length >= limit) {
          break;
        }
      }

      // Sort by start time (newest first)
      reports.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      return reports.slice(0, limit);

    } catch (error) {
      logger.error(`Failed to get import reports for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Generate error report with specific row numbers and suggestions
   */
  public async generateErrorReport(jobId: string): Promise<{
    errors: ImportErrorReport[];
    summary: {
      totalErrors: number;
      errorsByType: Record<string, number>;
      errorsByEntity: Record<string, number>;
      criticalErrors: number;
    };
  }> {
    try {
      const errors = await this.getImportErrors(jobId);
      
      const errorsByType: Record<string, number> = {};
      const errorsByEntity: Record<string, number> = {};
      let criticalErrors = 0;

      errors.forEach(error => {
        errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
        
        if (error.entityType) {
          errorsByEntity[error.entityType] = (errorsByEntity[error.entityType] || 0) + 1;
        }
        
        if (error.severity === 'error') {
          criticalErrors++;
        }
      });

      return {
        errors,
        summary: {
          totalErrors: errors.length,
          errorsByType,
          errorsByEntity,
          criticalErrors
        }
      };

    } catch (error) {
      logger.error(`Failed to generate error report for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Export report to different formats
   */
  public async exportReport(
    jobId: string, 
    userId: string, 
    format: 'json' | 'csv' | 'pdf'
  ): Promise<Buffer | string> {
    try {
      const report = await this.getImportReport(jobId, userId);
      if (!report) {
        throw new Error('Report not found');
      }

      switch (format) {
        case 'json':
          return JSON.stringify(report, null, 2);
        
        case 'csv':
          return this.exportReportToCsv(report);
        
        case 'pdf':
          return await this.exportReportToPdf(report);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      logger.error(`Failed to export report for job ${jobId}:`, error);
      throw error;
    }
  }

  private async getJobMetadata(jobId: string): Promise<ImportJob | null> {
    const jobKey = `import:job:${jobId}`;
    const jobData = await redisManager.getClient().get(jobKey);
    
    if (!jobData) {
      return null;
    }

    const job = JSON.parse(jobData);
    job.createdAt = new Date(job.createdAt);
    if (job.completedAt) {
      job.completedAt = new Date(job.completedAt);
    }

    return job;
  }

  private async getStageReports(jobId: string): Promise<StageReport[]> {
    const stageKey = `import:stages:${jobId}`;
    const stageData = await redisManager.getClient().get(stageKey);
    
    if (!stageData) {
      return [];
    }

    const stages = JSON.parse(stageData);
    return stages.map((stage: any) => ({
      ...stage,
      startTime: new Date(stage.startTime),
      endTime: stage.endTime ? new Date(stage.endTime) : undefined
    }));
  }

  private async getEntityResults(jobId: string): Promise<EntityImportResults> {
    const entityKey = `import:entities:${jobId}`;
    const entityData = await redisManager.getClient().get(entityKey);
    
    if (!entityData) {
      // Return default empty results
      const emptyResult: EntityTypeResult = {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        duplicatesFound: 0,
        conflictsResolved: 0
      };

      return {
        venues: emptyResult,
        lecturers: emptyResult,
        courses: emptyResult,
        studentGroups: emptyResult,
        schedules: emptyResult
      };
    }

    return JSON.parse(entityData);
  }

  private async getImportErrors(jobId: string): Promise<ImportErrorReport[]> {
    const errorKey = `import:errors:${jobId}`;
    const errorData = await redisManager.getClient().get(errorKey);
    
    if (!errorData) {
      return [];
    }

    return JSON.parse(errorData);
  }

  private async getImportWarnings(jobId: string): Promise<ImportWarningReport[]> {
    const warningKey = `import:warnings:${jobId}`;
    const warningData = await redisManager.getClient().get(warningKey);
    
    if (!warningData) {
      return [];
    }

    return JSON.parse(warningData);
  }

  private async generateDataQualityReport(
    jobId: string,
    errors: ImportErrorReport[],
    warnings: ImportWarningReport[]
  ): Promise<DataQualityReport> {
    // Get data quality metrics from validation results
    const qualityKey = `import:quality:${jobId}`;
    const qualityData = await redisManager.getClient().get(qualityKey);
    
    let metrics = {
      completeness: 95,
      consistency: 90,
      accuracy: 85,
      duplicates: 0
    };

    if (qualityData) {
      metrics = { ...metrics, ...JSON.parse(qualityData) };
    }

    // Analyze issues from errors and warnings
    const issues = this.analyzeDataQualityIssues(errors, warnings);
    
    // Generate suggestions
    const suggestions = this.generateDataQualitySuggestions(issues);
    
    // Calculate overall score
    const score = Math.round(
      (metrics.completeness + metrics.consistency + metrics.accuracy) / 3
    );

    return {
      score,
      issues,
      suggestions,
      metrics
    };
  }

  private analyzeDataQualityIssues(
    errors: ImportErrorReport[],
    warnings: ImportWarningReport[]
  ): DataQualityIssue[] {
    const issueMap = new Map<string, DataQualityIssue>();

    // Analyze errors
    errors.forEach(error => {
      const key = `${error.errorType}-${error.column || 'unknown'}`;
      const existing = issueMap.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        issueMap.set(key, {
          type: this.mapErrorTypeToQualityIssue(error.errorType),
          field: error.column || 'unknown',
          count: 1,
          percentage: 0, // Will be calculated later
          examples: [error.message],
          severity: error.severity === 'error' ? 'high' : 'medium'
        });
      }
    });

    // Analyze warnings
    warnings.forEach(warning => {
      const key = `${warning.warningType}-${warning.column || 'unknown'}`;
      const existing = issueMap.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        issueMap.set(key, {
          type: this.mapWarningTypeToQualityIssue(warning.warningType),
          field: warning.column || 'unknown',
          count: 1,
          percentage: 0, // Will be calculated later
          examples: [warning.message],
          severity: warning.impact === 'high' ? 'high' : 'medium'
        });
      }
    });

    return Array.from(issueMap.values());
  }

  private generateDataQualitySuggestions(issues: DataQualityIssue[]): DataQualitySuggestion[] {
    const suggestions: DataQualitySuggestion[] = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'missing_data':
          suggestions.push({
            issue: `Missing data in ${issue.field}`,
            suggestion: 'Consider providing default values or making the field optional',
            priority: issue.severity === 'high' ? 'high' : 'medium',
            estimatedImpact: 'Improved data completeness'
          });
          break;
        
        case 'invalid_format':
          suggestions.push({
            issue: `Invalid format in ${issue.field}`,
            suggestion: 'Standardize data format before import or add format validation',
            priority: 'high',
            estimatedImpact: 'Reduced import errors'
          });
          break;
        
        case 'duplicate_data':
          suggestions.push({
            issue: `Duplicate records in ${issue.field}`,
            suggestion: 'Remove duplicates or implement merge strategy',
            priority: 'medium',
            estimatedImpact: 'Cleaner data and reduced storage'
          });
          break;
      }
    });

    return suggestions;
  }

  private calculateImportSummary(
    job: ImportJob,
    stages: StageReport[]
  ): ImportSummary {
    const totalRows = job.progress.totalRows;
    const processedRows = job.progress.processedRows;
    const successfulRows = job.progress.successfulRows;
    const failedRows = job.progress.failedRows;
    const skippedRows = totalRows - processedRows;

    // Calculate processing speed
    const duration = job.completedAt 
      ? (job.completedAt.getTime() - job.createdAt.getTime()) / 1000
      : 0;
    const processingSpeed = duration > 0 ? processedRows / duration : 0;

    return {
      totalRows,
      processedRows,
      successfulRows,
      failedRows,
      skippedRows,
      processingSpeed,
      stages
    };
  }

  private generateRecommendations(
    summary: ImportSummary,
    dataQuality: DataQualityReport,
    errors: ImportErrorReport[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (summary.processingSpeed < 10) {
      recommendations.push('Consider optimizing data format or reducing file size for faster processing');
    }

    // Data quality recommendations
    if (dataQuality.score < 80) {
      recommendations.push('Improve data quality by addressing validation errors before import');
    }

    // Error-based recommendations
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if ((errorTypes['validation'] || 0) > 10) {
      recommendations.push('Review data validation rules and ensure source data meets requirements');
    }

    if ((errorTypes['constraint'] || 0) > 5) {
      recommendations.push('Check database constraints and resolve conflicts before import');
    }

    // Success rate recommendations
    const successRate = (summary.successfulRows / summary.totalRows) * 100;
    if (successRate < 90) {
      recommendations.push('Review failed rows and consider data cleanup before re-import');
    }

    return recommendations;
  }

  private async getOriginalFileName(fileId: string): Promise<string> {
    const fileKey = `import:file:${fileId}`;
    const fileData = await redisManager.getClient().get(fileKey);
    
    if (!fileData) {
      return 'Unknown file';
    }

    const file = JSON.parse(fileData);
    return file.originalName || 'Unknown file';
  }

  private async storeReport(jobId: string, report: ImportReport): Promise<void> {
    const reportKey = `import:report:${jobId}`;
    await redisManager.getClient().setex(
      reportKey,
      86400 * 7, // 7 days TTL
      JSON.stringify(report)
    );
  }

  private mapErrorTypeToQualityIssue(errorType: string): DataQualityIssue['type'] {
    switch (errorType) {
      case 'validation':
        return 'invalid_format';
      case 'constraint':
        return 'inconsistent_data';
      default:
        return 'invalid_format';
    }
  }

  private mapWarningTypeToQualityIssue(warningType: string): DataQualityIssue['type'] {
    switch (warningType) {
      case 'data_quality':
        return 'invalid_format';
      case 'duplicate':
        return 'duplicate_data';
      case 'missing_reference':
        return 'missing_data';
      default:
        return 'inconsistent_data';
    }
  }

  private exportReportToCsv(report: ImportReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Import Report Summary');
    lines.push(`Job ID,${report.jobId}`);
    lines.push(`File Name,${report.fileName}`);
    lines.push(`Status,${report.status}`);
    lines.push(`Duration,${report.duration || 0} seconds`);
    lines.push('');
    
    // Summary
    lines.push('Summary');
    lines.push('Metric,Value');
    lines.push(`Total Rows,${report.summary.totalRows}`);
    lines.push(`Processed Rows,${report.summary.processedRows}`);
    lines.push(`Successful Rows,${report.summary.successfulRows}`);
    lines.push(`Failed Rows,${report.summary.failedRows}`);
    lines.push(`Processing Speed,${report.summary.processingSpeed.toFixed(2)} rows/sec`);
    lines.push('');
    
    // Errors
    if (report.errors.length > 0) {
      lines.push('Errors');
      lines.push('Row,Column,Type,Severity,Message');
      report.errors.forEach(error => {
        lines.push(`${error.row},${error.column || ''},${error.errorType},${error.severity},"${error.message}"`);
      });
    }
    
    return lines.join('\n');
  }

  private async exportReportToPdf(report: ImportReport): Promise<Buffer> {
    // This would require a PDF library like puppeteer or pdfkit
    // For now, return a simple text representation as buffer
    const content = `
Import Report
=============

Job ID: ${report.jobId}
File: ${report.fileName}
Status: ${report.status}
Duration: ${report.duration || 0} seconds

Summary:
- Total Rows: ${report.summary.totalRows}
- Processed: ${report.summary.processedRows}
- Successful: ${report.summary.successfulRows}
- Failed: ${report.summary.failedRows}

Data Quality Score: ${report.dataQuality.score}/100

Recommendations:
${report.recommendations.map(r => `- ${r}`).join('\n')}
    `;
    
    return Buffer.from(content, 'utf-8');
  }
}

// Export singleton instance
export const importReportingService = ImportReportingService.getInstance();