import { ImportController } from '../../controllers/importController';
import { ImportJobService } from '../../services/import/importJobService';
import { ProgressTrackingService } from '../../services/import/progressTrackingService';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the services
jest.mock('../../services/import/importJobService');
jest.mock('../../services/import/progressTrackingService');
jest.mock('../../utils/logger');

describe('Import Progress', () => {
  let importController: ImportController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockImportJobService: jest.Mocked<ImportJobService>;
  let mockProgressService: jest.Mocked<ProgressTrackingService>;

  beforeEach(() => {
    importController = new ImportController();
    
    mockRequest = {
      user: { userId: 'test-user' },
      params: {},
      body: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockImportJobService = {
      createImportJob: jest.fn(),
      getJobStatus: jest.fn(),
      cancelJob: jest.fn(),
      getJobsByUser: jest.fn()
    } as any;

    mockProgressService = {
      initializeProgress: jest.fn(),
      updateProgress: jest.fn(),
      completeJob: jest.fn(),
      failJob: jest.fn()
    } as any;

    (ImportJobService.getInstance as jest.Mock).mockReturnValue(mockImportJobService);
    (ProgressTrackingService.getInstance as jest.Mock).mockReturnValue(mockProgressService);
  });

  describe('startImportJob', () => {
    it('should create a new import job successfully', async () => {
      const jobId = 'test-job-123';
      mockRequest.body = {
        fileId: 'test-file-123',
        mappings: [
          { sourceColumn: 'name', targetField: 'venueName', confidence: 95, required: true, dataType: 'string' }
        ]
      };

      mockImportJobService.createImportJob.mockResolvedValue(jobId);
      mockImportJobService.getJobStatus.mockResolvedValue({
        id: jobId,
        userId: 'test-user',
        fileId: 'test-file-123',
        status: 'pending',
        progress: {
          totalRows: 100,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          currentStage: 'parsing'
        },
        createdAt: new Date()
      });

      await importController.startImportJob(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Import job started successfully',
        data: expect.objectContaining({
          id: jobId,
          status: 'pending',
          progress: 0,
          currentStage: 'parsing',
          stages: expect.arrayContaining([
            expect.objectContaining({ id: 'parsing', name: 'Parsing Data' }),
            expect.objectContaining({ id: 'validation', name: 'Validating Data' }),
            expect.objectContaining({ id: 'processing', name: 'Processing Entities' }),
            expect.objectContaining({ id: 'finalization', name: 'Finalizing Import' })
          ])
        })
      });
    });

    it('should return error when required parameters are missing', async () => {
      mockRequest.body = { fileId: 'test-file-123' }; // Missing mappings

      await importController.startImportJob(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'File ID and mappings are required',
        code: 'MISSING_PARAMETERS'
      });
    });
  });

  describe('getImportJobStatus', () => {
    it('should return job status successfully', async () => {
      const jobId = 'test-job-123';
      mockRequest.params = { jobId };

      mockImportJobService.getJobStatus.mockResolvedValue({
        id: jobId,
        userId: 'test-user',
        fileId: 'test-file-123',
        status: 'processing',
        progress: {
          totalRows: 100,
          processedRows: 50,
          successfulRows: 45,
          failedRows: 5,
          currentStage: 'validation'
        },
        createdAt: new Date()
      });

      await importController.getImportJobStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: jobId,
          status: 'processing',
          progress: 50,
          currentStage: 'validation',
          stages: expect.any(Array)
        })
      });
    });

    it('should return 404 when job not found', async () => {
      mockRequest.params = { jobId: 'non-existent-job' };
      mockImportJobService.getJobStatus.mockResolvedValue(null);

      await importController.getImportJobStatus(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Import job not found',
        code: 'JOB_NOT_FOUND'
      });
    });
  });

  describe('cancelImportJob', () => {
    it('should cancel job successfully', async () => {
      const jobId = 'test-job-123';
      mockRequest.params = { jobId };

      mockImportJobService.cancelJob.mockResolvedValue(true);

      await importController.cancelImportJob(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Import job cancelled successfully'
      });
    });

    it('should return error when cancel fails', async () => {
      const jobId = 'test-job-123';
      mockRequest.params = { jobId };

      mockImportJobService.cancelJob.mockResolvedValue(false);

      await importController.cancelImportJob(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to cancel import job',
        code: 'CANCEL_FAILED'
      });
    });
  });
});