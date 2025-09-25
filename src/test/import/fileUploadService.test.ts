import { FileUploadService } from '../../services/import/fileUploadService';
import { temporaryStorage } from '../../services/import/temporaryStorage';
import { fileMetadataService } from '../../services/import/fileMetadataService';

// Mock the temporary storage
jest.mock('../../services/import/temporaryStorage', () => ({
  temporaryStorage: {
    storeFile: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

// Mock the file metadata service
jest.mock('../../services/import/fileMetadataService', () => ({
  fileMetadataService: {
    extractMetadata: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FileUploadService', () => {
  let service: FileUploadService;
  const mockTemporaryStorage = temporaryStorage as jest.Mocked<typeof temporaryStorage>;
  const mockFileMetadataService = fileMetadataService as jest.Mocked<typeof fileMetadataService>;

  beforeEach(() => {
    service = FileUploadService.getInstance();
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should return error when no file is provided', () => {
      const errors = service.validateFile(null as any);
      
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: 'file',
        message: 'No file provided',
        code: 'FILE_REQUIRED',
      });
    });

    it('should return error when file size exceeds limit', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.alloc(11 * 1024 * 1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toContainEqual({
        field: 'file',
        message: 'File size exceeds 10MB limit',
        code: 'FILE_TOO_LARGE',
      });
    });

    it('should return error for invalid file extension', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toContainEqual({
        field: 'file',
        message: 'Invalid file extension. Only .csv, .xlsx, and .xls files are allowed.',
        code: 'INVALID_EXTENSION',
      });
    });

    it('should return error for invalid MIME type', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toContainEqual({
        field: 'file',
        message: 'Invalid MIME type. Only CSV and Excel files are allowed.',
        code: 'INVALID_MIME_TYPE',
      });
    });

    it('should return error for empty filename', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: '',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toContainEqual({
        field: 'file',
        message: 'Invalid filename',
        code: 'INVALID_FILENAME',
      });
    });

    it('should pass validation for valid CSV file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for valid Excel file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const errors = service.validateFile(mockFile);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('processUpload', () => {
    it('should successfully process valid file upload', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.from('name,email\nJohn,john@example.com'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const mockStoredFile = {
        id: 'test-file-id',
        originalName: 'test.csv',
        fileName: 'test-file-id.csv',
        filePath: '/tmp/test-file-id.csv',
        size: 1024,
        mimeType: 'text/csv',
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockMetadata = {
        fileId: 'test-file-id',
        originalName: 'test.csv',
        fileType: 'csv' as const,
        size: 1024,
        detectedColumns: ['name', 'email'],
        normalizedColumns: ['name', 'email'],
        rowCount: 1,
        previewData: [['John', 'john@example.com']],
        hasHeaders: true,
        encoding: 'utf8',
      };

      mockTemporaryStorage.storeFile.mockResolvedValue(mockStoredFile);
      mockFileMetadataService.extractMetadata.mockResolvedValue(mockMetadata);

      const result = await service.processUpload(mockFile);

      expect(mockTemporaryStorage.storeFile).toHaveBeenCalledWith(
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype
      );

      expect(mockFileMetadataService.extractMetadata).toHaveBeenCalledWith('test-file-id');

      expect(result).toEqual({
        fileId: 'test-file-id',
        originalName: 'test.csv',
        size: 1024,
        detectedColumns: ['name', 'email'],
        rowCount: 1,
        previewData: [['John', 'john@example.com']],
      });
    });

    it('should throw error for invalid file', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      await expect(service.processUpload(mockFile)).rejects.toThrow(
        'File validation failed:'
      );

      expect(mockTemporaryStorage.storeFile).not.toHaveBeenCalled();
    });

    it('should throw error when storage fails', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 1024,
        buffer: Buffer.alloc(1024),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      mockTemporaryStorage.storeFile.mockRejectedValue(new Error('Storage failed'));

      await expect(service.processUpload(mockFile)).rejects.toThrow('Storage failed');
    });
  });

  describe('deleteUploadedFile', () => {
    it('should successfully delete file', async () => {
      mockTemporaryStorage.deleteFile.mockResolvedValue(true);

      const result = await service.deleteUploadedFile('test-file-id');

      expect(result).toBe(true);
      expect(mockTemporaryStorage.deleteFile).toHaveBeenCalledWith('test-file-id');
    });

    it('should return false when file deletion fails', async () => {
      mockTemporaryStorage.deleteFile.mockResolvedValue(false);

      const result = await service.deleteUploadedFile('test-file-id');

      expect(result).toBe(false);
    });

    it('should handle deletion errors gracefully', async () => {
      mockTemporaryStorage.deleteFile.mockRejectedValue(new Error('Delete failed'));

      const result = await service.deleteUploadedFile('test-file-id');

      expect(result).toBe(false);
    });
  });

  describe('getUploadedFile', () => {
    it('should return file information', async () => {
      const mockFileInfo = {
        id: 'test-file-id',
        originalName: 'test.csv',
        fileName: 'test-file-id.csv',
        filePath: '/tmp/test-file-id.csv',
        size: 1024,
        mimeType: 'text/csv',
        uploadedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockTemporaryStorage.getFile.mockResolvedValue(mockFileInfo);

      const result = await service.getUploadedFile('test-file-id');

      expect(result).toEqual(mockFileInfo);
      expect(mockTemporaryStorage.getFile).toHaveBeenCalledWith('test-file-id');
    });

    it('should return null for non-existent file', async () => {
      mockTemporaryStorage.getFile.mockResolvedValue(null);

      const result = await service.getUploadedFile('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getUploadMiddleware', () => {
    it('should return multer middleware', () => {
      const middleware = service.getUploadMiddleware();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FileUploadService.getInstance();
      const instance2 = FileUploadService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});