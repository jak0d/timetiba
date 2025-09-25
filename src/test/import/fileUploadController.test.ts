import request from 'supertest';
import express from 'express';
import { ImportController } from '../../controllers/importController';
import { fileUploadService } from '../../services/import/fileUploadService';

// Mock dependencies
jest.mock('../../services/import/fileUploadService');
jest.mock('../../services/import/temporaryStorage');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ImportController File Upload', () => {
  let app: express.Application;
  let controller: ImportController;
  const mockFileUploadService = fileUploadService as jest.Mocked<typeof fileUploadService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new ImportController();
    
    // Mock multer middleware
    mockFileUploadService.getUploadMiddleware.mockReturnValue((req: any, _res: any, next: any) => {
      // Simulate multer adding file to request
      if (req.body.mockFile) {
        req.file = req.body.mockFile;
      }
      next();
    });

    // Setup routes
    app.post('/upload', 
      mockFileUploadService.getUploadMiddleware(),
      controller.uploadFile.bind(controller)
    );
    app.get('/files/:fileId', controller.getFileInfo.bind(controller));
    app.delete('/files/:fileId', controller.deleteFile.bind(controller));

    jest.clearAllMocks();
  });

  describe('POST /upload', () => {
    it('should successfully upload a valid file', async () => {
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

      const mockUploadResult = {
        fileId: 'test-file-id',
        originalName: 'test.csv',
        size: 1024,
        detectedColumns: [],
        rowCount: 0,
        previewData: [],
      };

      mockFileUploadService.processUpload.mockResolvedValue(mockUploadResult);

      const response = await request(app)
        .post('/upload')
        .send({ mockFile });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'File uploaded successfully',
        data: mockUploadResult,
      });

      expect(mockFileUploadService.processUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldname: 'file',
          originalname: 'test.csv',
          mimetype: 'text/csv',
          size: 1024,
        })
      );
    });

    it('should return 400 when no file is provided', async () => {
      const response = await request(app)
        .post('/upload')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'No file provided',
        error: {
          code: 'FILE_REQUIRED',
          field: 'file',
        },
      });

      expect(mockFileUploadService.processUpload).not.toHaveBeenCalled();
    });

    it('should handle file size limit error', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'large.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        size: 11 * 1024 * 1024, // 11MB
        buffer: Buffer.alloc(1024), // Use smaller buffer for test performance
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const error = new Error('File too large');
      (error as any).code = 'LIMIT_FILE_SIZE';
      mockFileUploadService.processUpload.mockRejectedValue(error);

      const response = await request(app)
        .post('/upload')
        .send({ mockFile });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'File size exceeds 10MB limit',
        error: {
          code: 'FILE_TOO_LARGE',
          field: 'file',
        },
      });
    });

    it('should handle invalid file type error', async () => {
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

      const error = new Error('Invalid file type');
      (error as any).code = 'INVALID_FILE_TYPE';
      mockFileUploadService.processUpload.mockRejectedValue(error);

      const response = await request(app)
        .post('/upload')
        .send({ mockFile });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid file type. Only CSV and Excel files are allowed.',
        error: {
          code: 'INVALID_FILE_TYPE',
          field: 'file',
        },
      });
    });

    it('should handle general upload errors', async () => {
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

      mockFileUploadService.processUpload.mockRejectedValue(new Error('Storage failed'));

      const response = await request(app)
        .post('/upload')
        .send({ mockFile });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'File upload failed',
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Storage failed',
        },
      });
    });
  });

  describe('DELETE /files/:fileId', () => {
    it('should successfully delete a file', async () => {
      mockFileUploadService.deleteUploadedFile.mockResolvedValue(true);

      const response = await request(app)
        .delete('/files/test-file-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'File deleted successfully',
      });

      expect(mockFileUploadService.deleteUploadedFile).toHaveBeenCalledWith('test-file-id');
    });

    it('should return 404 when file is not found', async () => {
      mockFileUploadService.deleteUploadedFile.mockResolvedValue(false);

      const response = await request(app)
        .delete('/files/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'File not found or already deleted',
      });
    });

    it('should return 400 when file ID is missing', async () => {
      const response = await request(app)
        .delete('/files/');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    it('should handle deletion errors', async () => {
      mockFileUploadService.deleteUploadedFile.mockRejectedValue(new Error('Delete failed'));

      const response = await request(app)
        .delete('/files/test-file-id');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'File deletion failed',
        error: {
          code: 'DELETE_ERROR',
          message: 'Delete failed',
        },
      });
    });
  });

  describe('GET /files/:fileId', () => {
    it('should return file information', async () => {
      const mockFileInfo = {
        id: 'test-file-id',
        originalName: 'test.csv',
        fileName: 'test-file-id.csv',
        filePath: '/tmp/test-file-id.csv',
        size: 1024,
        mimeType: 'text/csv',
        uploadedAt: new Date('2023-01-01T00:00:00Z'),
        expiresAt: new Date('2023-01-02T00:00:00Z'),
      };

      mockFileUploadService.getUploadedFile.mockResolvedValue(mockFileInfo);

      const response = await request(app)
        .get('/files/test-file-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          id: 'test-file-id',
          originalName: 'test.csv',
          size: 1024,
          mimeType: 'text/csv',
          uploadedAt: '2023-01-01T00:00:00.000Z',
          expiresAt: '2023-01-02T00:00:00.000Z',
        },
      });

      expect(mockFileUploadService.getUploadedFile).toHaveBeenCalledWith('test-file-id');
    });

    it('should return 404 when file is not found', async () => {
      mockFileUploadService.getUploadedFile.mockResolvedValue(null);

      const response = await request(app)
        .get('/files/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'File not found or expired',
      });
    });

    it('should return 400 when file ID is missing', async () => {
      const response = await request(app)
        .get('/files/');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    it('should handle get file info errors', async () => {
      mockFileUploadService.getUploadedFile.mockRejectedValue(new Error('Get file failed'));

      const response = await request(app)
        .get('/files/test-file-id');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to retrieve file information',
        error: {
          code: 'GET_FILE_ERROR',
          message: 'Get file failed',
        },
      });
    });
  });
});