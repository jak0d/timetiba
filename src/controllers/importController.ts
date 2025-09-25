import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { fileUploadService } from '../services/import/fileUploadService';
import { fileMetadataService } from '../services/import/fileMetadataService';
import { logger } from '../utils/logger';

// Import controller for handling timetable import operations
export class ImportController {
  
  /**
   * Handle file upload for import
   * POST /api/import/upload
   */
  public async uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file provided',
          error: {
            code: 'FILE_REQUIRED',
            field: 'file'
          }
        });
        return;
      }

      // Process the uploaded file
      const uploadResult = await fileUploadService.processUpload(req.file);

      logger.info(`File upload successful: ${req.file.originalname}`, {
        fileId: uploadResult.fileId,
        size: uploadResult.size,
        userId: req.user?.userId || 'anonymous'
      });

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: uploadResult
      });

    } catch (error) {
      logger.error('File upload failed:', error);

      // Handle multer errors
      if (error instanceof Error) {
        if ((error as any).code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit',
            error: {
              code: 'FILE_TOO_LARGE',
              field: 'file'
            }
          });
          return;
        }

        if ((error as any).code === 'INVALID_FILE_TYPE') {
          res.status(400).json({
            success: false,
            message: 'Invalid file type. Only CSV and Excel files are allowed.',
            error: {
              code: 'INVALID_FILE_TYPE',
              field: 'file'
            }
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: {
          code: 'UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
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
}