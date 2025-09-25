import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import { temporaryStorage } from './temporaryStorage';
import { fileMetadataService } from './fileMetadataService';
import { logger } from '../../utils/logger';
import { FileUploadResponse } from '../../types/import';

export interface FileValidationError {
  field: string;
  message: string;
  code: string;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private multerInstance: multer.Multer;

  private constructor() {
    this.multerInstance = this.createMulterInstance();
  }

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  private createMulterInstance(): multer.Multer {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1, // Only allow one file at a time
      },
      fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        logger.info('File filter check', {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });

        const allowedMimeTypes = [
          'text/csv',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        // Check file extension first (more reliable than MIME type)
        if (!allowedExtensions.includes(fileExtension)) {
          logger.warn('File rejected: Invalid extension', {
            originalName: file.originalname,
            extension: fileExtension,
            allowedExtensions
          });
          const error = new Error('Invalid file type. Only CSV and Excel files are allowed.');
          (error as any).code = 'INVALID_FILE_TYPE';
          return cb(error);
        }

        // Also check MIME type as secondary validation
        if (!allowedMimeTypes.includes(file.mimetype)) {
          logger.warn('File accepted despite MIME type mismatch', {
            originalName: file.originalname,
            mimeType: file.mimetype,
            extension: fileExtension
          });
          // Don't reject based on MIME type alone, as it can be unreliable
        }

        logger.info('File accepted by filter', {
          originalName: file.originalname,
          extension: fileExtension,
          mimeType: file.mimetype
        });

        cb(null, true);
      },
    });
  }

  public getUploadMiddleware() {
    const middleware = this.multerInstance.single('file');
    
    // Wrap the middleware to add logging
    return (req: any, res: any, next: any) => {
      logger.info('Upload middleware called', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      });
      
      middleware(req, res, (err) => {
        if (err) {
          logger.error('Multer middleware error:', err);
        } else {
          logger.info('Multer middleware success', {
            hasFile: !!req.file,
            fileName: req.file?.originalname,
            fileSize: req.file?.size
          });
        }
        next(err);
      });
    };
  }

  public validateFile(file: Express.Multer.File): FileValidationError[] {
    const errors: FileValidationError[] = [];

    // Check if file exists
    if (!file) {
      errors.push({
        field: 'file',
        message: 'No file provided',
        code: 'FILE_REQUIRED',
      });
      return errors;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      errors.push({
        field: 'file',
        message: 'File size exceeds 10MB limit',
        code: 'FILE_TOO_LARGE',
      });
    }

    // Validate file extension
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push({
        field: 'file',
        message: 'Invalid file extension. Only .csv, .xlsx, and .xls files are allowed.',
        code: 'INVALID_EXTENSION',
      });
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push({
        field: 'file',
        message: 'Invalid MIME type. Only CSV and Excel files are allowed.',
        code: 'INVALID_MIME_TYPE',
      });
    }

    // Validate filename
    if (!file.originalname || file.originalname.trim().length === 0) {
      errors.push({
        field: 'file',
        message: 'Invalid filename',
        code: 'INVALID_FILENAME',
      });
    }

    return errors;
  }

  public async processUpload(file: Express.Multer.File): Promise<FileUploadResponse> {
    try {
      logger.info(`Processing file upload: ${file.originalname}`, {
        size: file.size,
        mimetype: file.mimetype,
        bufferLength: file.buffer?.length
      });

      // Validate the file
      const validationErrors = this.validateFile(file);
      if (validationErrors.length > 0) {
        logger.error(`File validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        throw new Error(`File validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      logger.info(`File validation passed, storing file: ${file.originalname}`);

      // Store the file temporarily
      const storedFile = await temporaryStorage.storeFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      logger.info(`File stored successfully: ${file.originalname} (${storedFile.id})`);

      // Extract file metadata
      logger.info(`Extracting metadata for file: ${storedFile.id}`);
      const metadata = await fileMetadataService.extractMetadata(storedFile.id);

      logger.info(`Metadata extracted successfully: ${metadata.detectedColumns.length} columns, ${metadata.rowCount} rows`);

      const response: FileUploadResponse = {
        fileId: storedFile.id,
        originalName: storedFile.originalName,
        size: storedFile.size,
        detectedColumns: metadata.detectedColumns,
        rowCount: metadata.rowCount,
        previewData: metadata.previewData,
      };

      logger.info(`File upload processing completed successfully: ${file.originalname}`);
      return response;
    } catch (error) {
      logger.error(`File upload processing failed for ${file.originalname}:`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }

  public async deleteUploadedFile(fileId: string): Promise<boolean> {
    try {
      const deleted = await temporaryStorage.deleteFile(fileId);
      if (deleted) {
        logger.info(`Uploaded file deleted: ${fileId}`);
      }
      return deleted;
    } catch (error) {
      logger.error(`Failed to delete uploaded file ${fileId}:`, error);
      return false;
    }
  }

  public async getUploadedFile(fileId: string) {
    return await temporaryStorage.getFile(fileId);
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance();