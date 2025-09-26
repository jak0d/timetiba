import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { fileUploadService } from '../services/import/fileUploadService';
import { fileMetadataService } from '../services/import/fileMetadataService';
import { SimpleLLMDataProcessingService as LLMDataProcessingService, LLMProcessingOptions } from '../services/import/llmDataProcessingService.simple';
import { csvParser } from '../services/import/csvParser';
import { excelParser } from '../services/import/excelParser';
import { ImportJobService } from '../services/import/importJobService';
import { ProgressTrackingService } from '../services/import/progressTrackingService';
import { logger } from '../utils/logger';

// Import controller for handling timetable import operations
export class ImportController {
  private llmService: LLMDataProcessingService;

  constructor() {
    this.llmService = new LLMDataProcessingService();
  }
  
  /**
   * Handle file upload for import
   * POST /api/import/upload
   */
  public async uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('File upload request received', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        userId: req.user?.userId || 'anonymous'
      });

      if (!req.file) {
        logger.warn('File upload failed: No file provided');
        res.status(400).json({
          success: false,
          message: 'No file provided',
          code: 'FILE_REQUIRED',
          timestamp: new Date()
        });
        return;
      }

      // Process the uploaded file
      const uploadResult = await fileUploadService.processUpload(req.file);

      logger.info(`File upload successful: ${req.file.originalname}`, {
        fileId: uploadResult.fileId,
        size: uploadResult.size,
        rowCount: uploadResult.rowCount,
        columnCount: uploadResult.detectedColumns.length,
        userId: req.user?.userId || 'anonymous'
      });

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: uploadResult.fileId,
          filename: uploadResult.originalName,
          size: uploadResult.size,
          metadata: {
            rows: uploadResult.rowCount,
            columns: uploadResult.detectedColumns,
            preview: uploadResult.previewData
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('File upload failed:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        userId: req.user?.userId || 'anonymous'
      });

      // Handle multer errors
      if (error instanceof Error) {
        if ((error as any).code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit',
            code: 'FILE_TOO_LARGE',
            timestamp: new Date()
          });
          return;
        }

        if ((error as any).code === 'INVALID_FILE_TYPE') {
          res.status(400).json({
            success: false,
            message: 'Invalid file type. Only CSV and Excel files are allowed.',
            code: 'INVALID_FILE_TYPE',
            timestamp: new Date()
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'File upload failed',
        code: 'UPLOAD_ERROR',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  /**
   * Delete uploaded file
   * DELETE /api/import/files/:fileId
   */
  public async deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
        return;
      }

      const deleted = await fileUploadService.deleteUploadedFile(fileId);

      if (deleted) {
        logger.info(`File deleted: ${fileId}`, {
          userId: req.user?.userId || 'anonymous'
        });

        res.status(200).json({
          success: true,
          message: 'File deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found or already deleted'
        });
      }

    } catch (error) {
      logger.error('File deletion failed:', error);

      res.status(500).json({
        success: false,
        message: 'File deletion failed',
        error: {
          code: 'DELETE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get file information
   * GET /api/import/files/:fileId
   */
  public async getFileInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
        return;
      }

      const fileInfo = await fileUploadService.getUploadedFile(fileId);

      if (fileInfo) {
        res.status(200).json({
          success: true,
          data: {
            id: fileInfo.id,
            originalName: fileInfo.originalName,
            size: fileInfo.size,
            mimeType: fileInfo.mimeType,
            uploadedAt: fileInfo.uploadedAt,
            expiresAt: fileInfo.expiresAt
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found or expired'
        });
      }

    } catch (error) {
      logger.error('Get file info failed:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file information',
        error: {
          code: 'GET_FILE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get detailed file metadata
   * GET /api/import/files/:fileId/metadata
   */
  public async getFileMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
        return;
      }

      const metadata = await fileMetadataService.extractMetadata(fileId);

      res.status(200).json({
        success: true,
        data: metadata
      });

    } catch (error) {
      logger.error('Get file metadata failed:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: 'File not found or expired'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file metadata',
        error: {
          code: 'GET_METADATA_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Analyze file columns
   * GET /api/import/files/:fileId/columns
   */
  public async analyzeFileColumns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { sheetName } = req.query;

      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
        return;
      }

      const columnInfo = await fileMetadataService.analyzeColumns(
        fileId, 
        sheetName as string
      );

      res.status(200).json({
        success: true,
        data: columnInfo
      });

    } catch (error) {
      logger.error('Analyze file columns failed:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: 'File not found or expired'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to analyze file columns',
        error: {
          code: 'ANALYZE_COLUMNS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Process file with LLM for intelligent entity detection and mapping
   * POST /api/import/files/:fileId/llm-process
   */
  public async processWithLLM(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const options: Partial<LLMProcessingOptions> = req.body.options || {};

      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required'
        });
        return;
      }

      logger.info('Starting LLM processing', { 
        fileId, 
        userId: req.user?.userId,
        options 
      });

      // Get file info and parse data
      const fileInfo = await fileUploadService.getUploadedFile(fileId);
      if (!fileInfo) {
        res.status(404).json({
          success: false,
          message: 'File not found or expired'
        });
        return;
      }

      // Parse the file based on type
      let parsedData;
      if (fileInfo.mimeType.includes('csv')) {
        parsedData = await csvParser.parseFile(fileInfo.filePath);
      } else if (fileInfo.mimeType.includes('excel') || fileInfo.mimeType.includes('spreadsheet')) {
        parsedData = await excelParser.parseFile(fileInfo.filePath);
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported file type for LLM processing'
        });
        return;
      }

      // Process with LLM
      const analysisResult = await this.llmService.processDataWithLLM(parsedData, {
        preserveOriginalNames: true,
        createMissingEntities: true,
        confidenceThreshold: 0.7,
        maxRetries: 3,
        enableContextualMapping: true,
        ...options
      });

      logger.info('LLM processing completed', {
        fileId,
        confidence: analysisResult.confidence,
        entitiesDetected: {
          venues: analysisResult.detectedEntities.venues.length,
          lecturers: analysisResult.detectedEntities.lecturers.length,
          courses: analysisResult.detectedEntities.courses.length,
          studentGroups: analysisResult.detectedEntities.studentGroups.length,
          schedules: analysisResult.detectedEntities.schedules.length
        }
      });

      res.status(200).json({
        success: true,
        message: 'LLM processing completed successfully',
        data: {
          analysis: analysisResult,
          processingInfo: {
            fileId,
            originalFileName: fileInfo.originalName,
            processedAt: new Date(),
            confidence: analysisResult.confidence
          }
        }
      });

    } catch (error) {
      logger.error('LLM processing failed:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        fileId: req.params.fileId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        message: 'LLM processing failed',
        error: {
          code: 'LLM_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Create entities from LLM analysis results
   * POST /api/import/llm-analysis/create-entities
   */
  public async createEntitiesFromLLM(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { analysisResult, options } = req.body;

      if (!analysisResult) {
        res.status(400).json({
          success: false,
          message: 'Analysis result is required'
        });
        return;
      }

      logger.info('Creating entities from LLM analysis', {
        userId: req.user?.userId,
        entitiesCount: {
          venues: analysisResult.detectedEntities?.venues?.length || 0,
          lecturers: analysisResult.detectedEntities?.lecturers?.length || 0,
          courses: analysisResult.detectedEntities?.courses?.length || 0,
          studentGroups: analysisResult.detectedEntities?.studentGroups?.length || 0,
          schedules: analysisResult.detectedEntities?.schedules?.length || 0
        }
      });

      // Create entities preserving original names
      const mappedData = await this.llmService.createEntitiesFromLLMAnalysis(
        analysisResult,
        {
          preserveOriginalNames: true,
          createMissingEntities: true,
          confidenceThreshold: 0.7,
          maxRetries: 3,
          enableContextualMapping: true,
          ...options
        }
      );

      logger.info('Entities created successfully from LLM analysis', {
        userId: req.user?.userId,
        createdEntities: {
          venues: mappedData.venues.length,
          lecturers: mappedData.lecturers.length,
          courses: mappedData.courses.length,
          studentGroups: mappedData.studentGroups.length,
          schedules: mappedData.schedules.length
        }
      });

      res.status(200).json({
        success: true,
        message: 'Entities created successfully from LLM analysis',
        data: {
          mappedData,
          summary: {
            totalEntitiesCreated: 
              mappedData.venues.length + 
              mappedData.lecturers.length + 
              mappedData.courses.length + 
              mappedData.studentGroups.length,
            schedulesCreated: mappedData.schedules.length,
            createdAt: new Date()
          }
        }
      });

    } catch (error) {
      logger.error('Entity creation from LLM analysis failed:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create entities from LLM analysis',
        error: {
          code: 'ENTITY_CREATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Get LLM processing status and capabilities
   * GET /api/import/llm/status
   */
  public async getLLMStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const isAvailable = this.llmService.isServiceAvailable();
      
      res.status(200).json({
        success: true,
        data: {
          available: isAvailable,
          model: isAvailable ? 'gemini-1.5-pro' : 'fallback-analysis',
          capabilities: [
            'Intelligent entity detection',
            'Automatic column mapping',
            'Original name preservation',
            'Contextual data understanding',
            'Schedule structure analysis',
            'Entity relationship detection'
          ],
          supportedFormats: ['CSV', 'Excel (.xlsx, .xls)'],
          maxFileSize: '10MB',
          processingTime: isAvailable ? 'Typically 30-60 seconds' : 'Instant (fallback mode)',
          note: isAvailable ? 'Using Google Gemini AI' : 'Using fallback analysis - set GEMINI_API_KEY for full AI features'
        }
      });

    } catch (error) {
      logger.error('Get LLM status failed:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to get LLM status',
        error: {
          code: 'LLM_STATUS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Start an import job
   * POST /api/import/jobs
   */
  public async startImportJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId, mappings, options = {} } = req.body;
      const userId = req.user?.userId || 'anonymous';

      if (!fileId || !mappings) {
        res.status(400).json({
          success: false,
          message: 'File ID and mappings are required',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      const importJobService = ImportJobService.getInstance();
      
      // Create mock validation result for now
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalRows: 100, // This should come from actual file analysis
          validRows: 95,
          errorRows: 5,
          warningRows: 0
        }
      };

      const jobId = await importJobService.createImportJob({
        userId,
        fileId,
        mappingConfig: {
          id: 'temp',
          name: 'Temporary mapping',
          mappings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        validationResult
      });

      // Get initial job status
      const jobStatus = await importJobService.getJobStatus(jobId);

      res.status(201).json({
        success: true,
        message: 'Import job started successfully',
        data: {
          id: jobId,
          status: jobStatus?.status || 'pending',
          progress: 0,
          currentStage: 'parsing',
          stages: [
            { id: 'parsing', name: 'Parsing Data', status: 'pending', progress: 0 },
            { id: 'validation', name: 'Validating Data', status: 'pending', progress: 0 },
            { id: 'processing', name: 'Processing Entities', status: 'pending', progress: 0 },
            { id: 'finalization', name: 'Finalizing Import', status: 'pending', progress: 0 }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to start import job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start import job',
        code: 'IMPORT_JOB_ERROR',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get import job status
   * GET /api/import/jobs/:jobId
   */
  public async getImportJobStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId || 'anonymous';

      const importJobService = ImportJobService.getInstance();
      const jobStatus = await importJobService.getJobStatus(jobId);

      if (!jobStatus) {
        res.status(404).json({
          success: false,
          message: 'Import job not found',
          code: 'JOB_NOT_FOUND'
        });
        return;
      }

      // Convert internal job status to API format
      const apiJobStatus = {
        id: jobStatus.id,
        status: jobStatus.status,
        progress: Math.round((jobStatus.progress.processedRows / jobStatus.progress.totalRows) * 100),
        currentStage: jobStatus.progress.currentStage,
        stages: [
          {
            id: 'parsing',
            name: 'Parsing Data',
            status: jobStatus.progress.currentStage === 'parsing' ? 'running' : 
                   ['validation', 'processing', 'finalization'].includes(jobStatus.progress.currentStage) ? 'completed' : 'pending',
            progress: jobStatus.progress.currentStage === 'parsing' ? 
                     Math.round((jobStatus.progress.processedRows / jobStatus.progress.totalRows) * 100) : 
                     ['validation', 'processing', 'finalization'].includes(jobStatus.progress.currentStage) ? 100 : 0
          },
          {
            id: 'validation',
            name: 'Validating Data',
            status: jobStatus.progress.currentStage === 'validation' ? 'running' : 
                   ['processing', 'finalization'].includes(jobStatus.progress.currentStage) ? 'completed' : 'pending',
            progress: jobStatus.progress.currentStage === 'validation' ? 
                     Math.round((jobStatus.progress.processedRows / jobStatus.progress.totalRows) * 100) : 
                     ['processing', 'finalization'].includes(jobStatus.progress.currentStage) ? 100 : 0
          },
          {
            id: 'processing',
            name: 'Processing Entities',
            status: jobStatus.progress.currentStage === 'processing' ? 'running' : 
                   jobStatus.progress.currentStage === 'finalization' ? 'completed' : 'pending',
            progress: jobStatus.progress.currentStage === 'processing' ? 
                     Math.round((jobStatus.progress.processedRows / jobStatus.progress.totalRows) * 100) : 
                     jobStatus.progress.currentStage === 'finalization' ? 100 : 0
          },
          {
            id: 'finalization',
            name: 'Finalizing Import',
            status: jobStatus.progress.currentStage === 'finalization' ? 'running' : 
                   jobStatus.status === 'completed' ? 'completed' : 'pending',
            progress: jobStatus.progress.currentStage === 'finalization' || jobStatus.status === 'completed' ? 100 : 0
          }
        ],
        result: jobStatus.status === 'completed' ? {
          summary: {
            totalProcessed: jobStatus.progress.totalRows,
            successful: jobStatus.progress.successfulRows,
            failed: jobStatus.progress.failedRows,
            warnings: 0
          },
          entities: {
            venues: { created: 0, updated: 0, errors: 0 },
            lecturers: { created: 0, updated: 0, errors: 0 },
            courses: { created: 0, updated: 0, errors: 0 },
            schedules: { created: 0, updated: 0, errors: 0 }
          }
        } : undefined,
        createdAt: jobStatus.createdAt.toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: apiJobStatus
      });

    } catch (error) {
      logger.error('Failed to get import job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        code: 'JOB_STATUS_ERROR',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Cancel an import job
   * POST /api/import/jobs/:jobId/cancel
   */
  public async cancelImportJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId || 'anonymous';

      const importJobService = ImportJobService.getInstance();
      const cancelled = await importJobService.cancelJob(jobId, userId);

      if (cancelled) {
        res.status(200).json({
          success: true,
          message: 'Import job cancelled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to cancel import job',
          code: 'CANCEL_FAILED'
        });
      }

    } catch (error) {
      logger.error('Failed to cancel import job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        code: 'CANCEL_ERROR',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Retry a failed import job
   * POST /api/import/jobs/:jobId/retry
   */
  public async retryImportJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId || 'anonymous';

      // For now, just return the same job with reset status
      const importJobService = ImportJobService.getInstance();
      const jobStatus = await importJobService.getJobStatus(jobId);

      if (!jobStatus) {
        res.status(404).json({
          success: false,
          message: 'Import job not found',
          code: 'JOB_NOT_FOUND'
        });
        return;
      }

      // Reset job status (simplified implementation)
      const retriedJob = {
        ...jobStatus,
        status: 'pending',
        progress: {
          ...jobStatus.progress,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          currentStage: 'parsing'
        }
      };

      res.status(200).json({
        success: true,
        message: 'Import job retried successfully',
        data: retriedJob
      });

    } catch (error) {
      logger.error('Failed to retry import job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retry job',
        code: 'RETRY_ERROR',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get user's import jobs
   * GET /api/import/jobs
   */
  public async getUserImportJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || 'anonymous';
      const { page = 1, limit = 20, status } = req.query;

      const importJobService = ImportJobService.getInstance();
      const jobs = await importJobService.getJobsByUser(userId, Number(limit));

      // Filter by status if provided
      const filteredJobs = status ? jobs.filter(job => job.status === status) : jobs;

      res.status(200).json({
        success: true,
        data: {
          jobs: filteredJobs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: filteredJobs.length,
            totalPages: Math.ceil(filteredJobs.length / Number(limit))
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get user import jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get import jobs',
        code: 'GET_JOBS_ERROR',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}