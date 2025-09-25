import request from 'supertest';
import express from 'express';
import { ImportController } from '../../controllers/importController';
import { fileMetadataService } from '../../services/import/fileMetadataService';

// Mock dependencies
jest.mock('../../services/import/fileMetadataService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ImportController File Metadata', () => {
  let app: express.Application;
  let controller: ImportController;
  const mockFileMetadataService = fileMetadataService as jest.Mocked<typeof fileMetadataService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new ImportController();
    
    // Setup routes
    app.get('/files/:fileId/metadata', controller.getFileMetadata.bind(controller));
    app.get('/files/:fileId/columns', controller.analyzeFileColumns.bind(controller));

    jest.clearAllMocks();
  });

  describe('GET /files/:fileId/metadata', () => {
    it('should return file metadata successfully', async () => {
      const mockMetadata = {
        fileId: 'test-file-id',
        originalName: 'test.csv',
        fileType: 'csv' as const,
        size: 1024,
        detectedColumns: ['name', 'email', 'age'],
        normalizedColumns: ['name', 'email', 'age'],
        rowCount: 10,
        previewData: [
          ['John Doe', 'john@example.com', '30'],
          ['Jane Smith', 'jane@example.com', '25']
        ],
        hasHeaders: true,
        encoding: 'utf8',
      };

      mockFileMetadataService.extractMetadata.mockResolvedValue(mockMetadata);

      const response = await request(app)
        .get('/files/test-file-id/metadata');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockMetadata,
      });

      expect(mockFileMetadataService.extractMetadata).toHaveBeenCalledWith('test-file-id');
    });

    it('should return 400 when file ID is missing', async () => {
      const response = await request(app)
        .get('/files//metadata');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    it('should return 404 when file is not found', async () => {
      mockFileMetadataService.extractMetadata.mockRejectedValue(
        new Error('File not found: non-existent-id')
      );

      const response = await request(app)
        .get('/files/non-existent-id/metadata');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'File not found or expired',
      });
    });

    it('should handle metadata extraction errors', async () => {
      mockFileMetadataService.extractMetadata.mockRejectedValue(
        new Error('Parsing failed')
      );

      const response = await request(app)
        .get('/files/test-file-id/metadata');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to retrieve file metadata',
        error: {
          code: 'GET_METADATA_ERROR',
          message: 'Parsing failed',
        },
      });
    });
  });

  describe('GET /files/:fileId/columns', () => {
    it('should return column analysis successfully', async () => {
      const mockColumnInfo = [
        {
          originalName: 'name',
          normalizedName: 'name',
          dataType: 'string' as const,
          sampleValues: ['John Doe', 'Jane Smith'],
          nullCount: 0,
        },
        {
          originalName: 'age',
          normalizedName: 'age',
          dataType: 'number' as const,
          sampleValues: ['30', '25'],
          nullCount: 0,
        },
        {
          originalName: 'is_active',
          normalizedName: 'is_active',
          dataType: 'boolean' as const,
          sampleValues: ['true', 'false'],
          nullCount: 0,
        },
      ];

      mockFileMetadataService.analyzeColumns.mockResolvedValue(mockColumnInfo);

      const response = await request(app)
        .get('/files/test-file-id/columns');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockColumnInfo,
      });

      expect(mockFileMetadataService.analyzeColumns).toHaveBeenCalledWith('test-file-id', undefined);
    });

    it('should pass sheet name parameter for Excel files', async () => {
      const mockColumnInfo = [
        {
          originalName: 'product',
          normalizedName: 'product',
          dataType: 'string' as const,
          sampleValues: ['Laptop', 'Mouse'],
          nullCount: 0,
        },
      ];

      mockFileMetadataService.analyzeColumns.mockResolvedValue(mockColumnInfo);

      const response = await request(app)
        .get('/files/test-file-id/columns?sheetName=Products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockColumnInfo,
      });

      expect(mockFileMetadataService.analyzeColumns).toHaveBeenCalledWith('test-file-id', 'Products');
    });

    it('should return 400 when file ID is missing', async () => {
      const response = await request(app)
        .get('/files//columns');

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });

    it('should return 404 when file is not found', async () => {
      mockFileMetadataService.analyzeColumns.mockRejectedValue(
        new Error('File not found: non-existent-id')
      );

      const response = await request(app)
        .get('/files/non-existent-id/columns');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: 'File not found or expired',
      });
    });

    it('should handle column analysis errors', async () => {
      mockFileMetadataService.analyzeColumns.mockRejectedValue(
        new Error('Analysis failed')
      );

      const response = await request(app)
        .get('/files/test-file-id/columns');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to analyze file columns',
        error: {
          code: 'ANALYZE_COLUMNS_ERROR',
          message: 'Analysis failed',
        },
      });
    });
  });
});