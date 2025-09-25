import { Request, Response } from 'express';
import { TemplateController } from '../../controllers/templateController';
import { TemplateService } from '../../services/import/templateService';

// Mock the TemplateService
jest.mock('../../services/import/templateService');

describe('TemplateController', () => {
  let templateController: TemplateController;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock response
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn()
    };

    // Create mock request
    mockRequest = {
      params: {}
    };

    // Create controller instance
    templateController = new TemplateController();
    
    // Get the mocked service instance
    mockTemplateService = (templateController as any).templateService;
  });

  describe('getAvailableTemplates', () => {
    it('should return list of available templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'timetable-complete',
          name: 'Complete Timetable Import',
          description: 'Import complete timetable data',
          fileType: 'excel' as const,
          version: '1.0.0',
          columns: [
            { name: 'Course Code', description: 'Course identifier', required: true, dataType: 'string' as const, examples: ['CS101'] },
            { name: 'Course Name', description: 'Course name', required: false, dataType: 'string' as const, examples: ['Intro to CS'] }
          ],
          sampleData: [],
          createdAt: new Date()
        }
      ];

      mockTemplateService.getAvailableTemplates.mockReturnValue(mockTemplates);

      await templateController.getAvailableTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.getAvailableTemplates).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [{
          id: 'timetable-complete',
          name: 'Complete Timetable Import',
          description: 'Import complete timetable data',
          fileType: 'excel',
          version: '1.0.0',
          columnCount: 2,
          requiredColumns: 1
        }]
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service error');
      mockTemplateService.getAvailableTemplates.mockImplementation(() => {
        throw error;
      });

      await templateController.getAvailableTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve available templates',
        error: 'Service error'
      });
    });
  });

  describe('getTemplateDetails', () => {
    it('should return template details for valid ID', async () => {
      const mockTemplate = {
        id: 'venues-only',
        name: 'Venues Import',
        description: 'Import venue information',
        fileType: 'csv' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'venues-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);

      await templateController.getTemplateDetails(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('venues-only');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplate
      });
    });

    it('should return 404 for invalid template ID', async () => {
      mockRequest.params = { templateId: 'invalid-id' };
      mockTemplateService.getTemplateById.mockReturnValue(null);

      await templateController.getTemplateDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template with ID invalid-id not found'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { templateId: 'venues-only' };
      const error = new Error('Database error');
      mockTemplateService.getTemplateById.mockImplementation(() => {
        throw error;
      });

      await templateController.getTemplateDetails(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve template details',
        error: 'Database error'
      });
    });
  });

  describe('downloadCSVTemplate', () => {
    it('should generate and return CSV template successfully', async () => {
      const mockTemplate = {
        id: 'venues-only',
        name: 'Venues Import',
        description: 'Import venue information',
        fileType: 'csv' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      const mockCSVContent = 'Venue Name,Capacity\nRoom 101,30';

      mockRequest.params = { templateId: 'venues-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateCSVTemplate.mockReturnValue(mockCSVContent);

      await templateController.downloadCSVTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('venues-only');
      expect(mockTemplateService.generateCSVTemplate).toHaveBeenCalledWith('venues-only');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="venues_import_template.csv"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.send).toHaveBeenCalledWith(mockCSVContent);
    });

    it('should return 404 for invalid template ID', async () => {
      mockRequest.params = { templateId: 'invalid-id' };
      mockTemplateService.getTemplateById.mockReturnValue(null);

      await templateController.downloadCSVTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template with ID invalid-id not found'
      });
    });

    it('should handle CSV generation errors', async () => {
      const mockTemplate = {
        id: 'venues-only',
        name: 'Venues Import',
        description: 'Import venue information',
        fileType: 'csv' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'venues-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateCSVTemplate.mockImplementation(() => {
        throw new Error('CSV generation failed');
      });

      await templateController.downloadCSVTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate CSV template',
        error: 'CSV generation failed'
      });
    });
  });

  describe('downloadExcelTemplate', () => {
    it('should generate and return Excel template successfully', async () => {
      const mockTemplate = {
        id: 'timetable-complete',
        name: 'Complete Timetable Import',
        description: 'Import complete timetable data',
        fileType: 'excel' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      const mockExcelBuffer = Buffer.from('mock excel content');

      mockRequest.params = { templateId: 'timetable-complete' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateExcelTemplate.mockReturnValue(mockExcelBuffer);

      await templateController.downloadExcelTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('timetable-complete');
      expect(mockTemplateService.generateExcelTemplate).toHaveBeenCalledWith('timetable-complete');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="complete_timetable_import_template.xlsx"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', mockExcelBuffer.length.toString());
      expect(mockResponse.send).toHaveBeenCalledWith(mockExcelBuffer);
    });

    it('should return 404 for invalid template ID', async () => {
      mockRequest.params = { templateId: 'invalid-id' };
      mockTemplateService.getTemplateById.mockReturnValue(null);

      await templateController.downloadExcelTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template with ID invalid-id not found'
      });
    });

    it('should handle Excel generation errors', async () => {
      const mockTemplate = {
        id: 'timetable-complete',
        name: 'Complete Timetable Import',
        description: 'Import complete timetable data',
        fileType: 'excel' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'timetable-complete' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateExcelTemplate.mockImplementation(() => {
        throw new Error('Excel generation failed');
      });

      await templateController.downloadExcelTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to generate Excel template',
        error: 'Excel generation failed'
      });
    });
  });

  describe('getTemplateColumns', () => {
    it('should return template columns successfully', async () => {
      const mockTemplate = {
        id: 'lecturers-only',
        name: 'Lecturers Import',
        description: 'Import lecturer information',
        fileType: 'csv' as const,
        version: '1.0.0',
        columns: [
          { name: 'Name', description: 'Lecturer name', required: true, dataType: 'string' as const, examples: ['Dr. Smith'] },
          { name: 'Email', description: 'Email address', required: true, dataType: 'string' as const, examples: ['smith@uni.edu'] }
        ],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'lecturers-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);

      await templateController.getTemplateColumns(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith('lecturers-only');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          templateId: 'lecturers-only',
          templateName: 'Lecturers Import',
          columns: mockTemplate.columns
        }
      });
    });

    it('should return 404 for invalid template ID', async () => {
      mockRequest.params = { templateId: 'invalid-id' };
      mockTemplateService.getTemplateById.mockReturnValue(null);

      await templateController.getTemplateColumns(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Template with ID invalid-id not found'
      });
    });

    it('should handle service errors', async () => {
      mockRequest.params = { templateId: 'lecturers-only' };
      const error = new Error('Service error');
      mockTemplateService.getTemplateById.mockImplementation(() => {
        throw error;
      });

      await templateController.getTemplateColumns(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve template columns',
        error: 'Service error'
      });
    });
  });

  describe('Filename Generation', () => {
    it('should generate proper filenames for CSV templates', async () => {
      const mockTemplate = {
        id: 'student-groups-only',
        name: 'Student Groups Import',
        description: 'Import student group information',
        fileType: 'csv' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'student-groups-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateCSVTemplate.mockReturnValue('mock csv');

      await templateController.downloadCSVTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 
        'attachment; filename="student_groups_import_template.csv"'
      );
    });

    it('should generate proper filenames for Excel templates', async () => {
      const mockTemplate = {
        id: 'courses-only',
        name: 'Courses Import',
        description: 'Import course information',
        fileType: 'excel' as const,
        version: '1.0.0',
        columns: [],
        sampleData: [],
        createdAt: new Date()
      };

      mockRequest.params = { templateId: 'courses-only' };
      mockTemplateService.getTemplateById.mockReturnValue(mockTemplate);
      mockTemplateService.generateExcelTemplate.mockReturnValue(Buffer.from('mock excel'));

      await templateController.downloadExcelTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 
        'attachment; filename="courses_import_template.xlsx"'
      );
    });
  });
});