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
        const allowedMimeTypes = [
          'text/csv',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
          const error = new Error('Invalid file type. Only CSV and Excel files are allowed.');
          (error as any).code = 'INVALID_FILE_TYPE';
          return cb(error);
        }

        cb(null, true);
      },
    });
  }

  public getUploadMiddleware() {
    return this.multerInstance.single('file');
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
      // Validate the file
      const validationErrors = this.validateFile(file);
      if (validationErrors.length > 0) {
        throw new Error(`File validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Store the file temporarily
      const storedFile = await temporaryStorage.storeFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      logger.info(`File uploaded successfully: ${file.originalname} (${storedFile.id})`);

      // Extract file metadata
      const metadata = await fileMetadataService.extractMetadata(storedFile.id);

      const response: FileUploadResponse = {
        fileId: storedFile.id,
        originalName: storedFile.originalName,
        size: storedFile.size,
        detectedColumns: metadata.detectedColumns,
        rowCount: metadata.rowCount,
        previewData: metadata.previewData,
      };

      return response;
    } catch (error) {
      logger.error(`File upload processing failed for ${file.originalname}:`, error);
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