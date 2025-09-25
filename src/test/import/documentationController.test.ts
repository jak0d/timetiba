import { Request, Response } from 'express';
import { DocumentationController } from '../../controllers/documentationController';
import { DocumentationService } from '../../services/import/documentationService';

// Mock the DocumentationService
jest.mock('../../services/import/documentationService');

describe('DocumentationController', () => {
  let controller: DocumentationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDocumentationService: jest.Mocked<DocumentationService>;

  beforeEach(() => {
    controller = new DocumentationController();
    mockDocumentationService = new DocumentationService() as jest.Mocked<DocumentationService>;
    (controller as any).documentationService = mockDocumentationService;

    mockRequest = {};
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getImportDocumentation', () => {
    it('should return complete import documentation', async () => {
      const mockDocumentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        description: 'Test description',
        sections: [],
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      mockDocumentationService.getImportDocumentation.mockReturnValue(mockDocumentation);

      await controller.getImportDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getImportDocumentation).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocumentation
      });
    });

    it('should handle errors when getting documentation', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getImportDocumentation.mockImplementation(() => {
        throw error;
      });

      await controller.getImportDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve import documentation',
        error: 'Service error'
      });
    });
  });

  describe('getContextualHelp', () => {
    it('should return contextual help for a valid step', async () => {
      const mockHelp = {
        id: 'test-step',
        title: 'Test Step',
        content: 'Test content'
      };

      mockRequest.params = { step: 'test-step' };
      mockDocumentationService.getContextualHelp.mockReturnValue(mockHelp);

      await controller.getContextualHelp(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getContextualHelp).toHaveBeenCalledWith('test-step');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHelp
      });
    });

    it('should return 400 when step parameter is missing', async () => {
      mockRequest.params = {};

      await controller.getContextualHelp(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Step parameter is required'
      });
    });

    it('should return 404 when help is not found', async () => {
      mockRequest.params = { step: 'nonexistent-step' };
      mockDocumentationService.getContextualHelp.mockReturnValue(null);

      await controller.getContextualHelp(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'No help found for step: nonexistent-step'
      });
    });

    it('should handle errors when getting contextual help', async () => {
      const error = new Error('Service error');
      mockRequest.params = { step: 'test-step' };
      mockDocumentationService.getContextualHelp.mockImplementation(() => {
        throw error;
      });

      await controller.getContextualHelp(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve contextual help',
        error: 'Service error'
      });
    });
  });

  describe('getValidationRules', () => {
    it('should return validation rules', async () => {
      const mockRules = [
        {
          field: 'Course Code',
          rule: 'Required, unique',
          description: 'Test description',
          example: 'CS101',
          errorMessage: 'Test error'
        }
      ];

      mockDocumentationService.getValidationRules.mockReturnValue(mockRules);

      await controller.getValidationRules(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getValidationRules).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRules
      });
    });

    it('should handle errors when getting validation rules', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getValidationRules.mockImplementation(() => {
        throw error;
      });

      await controller.getValidationRules(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve validation rules',
        error: 'Service error'
      });
    });
  });

  describe('getImportSteps', () => {
    it('should return import steps', async () => {
      const mockSteps = [
        {
          step: 1,
          title: 'Test Step',
          description: 'Test description',
          actions: ['Action 1', 'Action 2']
        }
      ];

      mockDocumentationService.getImportSteps.mockReturnValue(mockSteps);

      await controller.getImportSteps(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getImportSteps).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSteps
      });
    });

    it('should handle errors when getting import steps', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getImportSteps.mockImplementation(() => {
        throw error;
      });

      await controller.getImportSteps(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve import steps',
        error: 'Service error'
      });
    });
  });

  describe('getFormatRequirements', () => {
    it('should return format requirements', async () => {
      const mockRequirements = {
        id: 'format-requirements',
        title: 'Format Requirements',
        content: 'Test content'
      };

      mockDocumentationService.getFormatRequirements.mockReturnValue(mockRequirements);

      await controller.getFormatRequirements(mockRequest as Request, mockResponse as Response);

      expect(mockDocumentationService.getFormatRequirements).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRequirements
      });
    });

    it('should handle errors when getting format requirements', async () => {
      const error = new Error('Service error');
      mockDocumentationService.getFormatRequirements.mockImplementation(() => {
        throw error;
      });

      await controller.getFormatRequirements(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve format requirements',
        error: 'Service error'
      });
    });
  });

  describe('searchDocumentation', () => {
    it('should search documentation and return results', async () => {
      const mockDocumentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        description: 'Test description',
        sections: [
          {
            id: 'section1',
            title: 'Test Section',
            content: 'This section contains test information',
            tips: ['Test tip'],
            warnings: ['Test warning']
          }
        ],
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      mockRequest.query = { query: 'test' };
      mockDocumentationService.getImportDocumentation.mockReturnValue(mockDocumentation);

      await controller.searchDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          query: 'test',
          results: expect.any(Array),
          totalResults: expect.any(Number)
        }
      });
    });

    it('should return 400 when query parameter is missing', async () => {
      mockRequest.query = {};

      await controller.searchDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
    });

    it('should return 400 when query parameter is not a string', async () => {
      mockRequest.query = { query: 123 as any };

      await controller.searchDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Search query is required'
      });
    });

    it('should handle errors when searching documentation', async () => {
      const error = new Error('Service error');
      mockRequest.query = { query: 'test' };
      mockDocumentationService.getImportDocumentation.mockImplementation(() => {
        throw error;
      });

      await controller.searchDocumentation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to search documentation',
        error: 'Service error'
      });
    });
  });

  describe('getDocumentationSection', () => {
    it('should return a specific documentation section', async () => {
      const mockDocumentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        description: 'Test description',
        sections: [
          {
            id: 'section1',
            title: 'Test Section',
            content: 'Test content'
          }
        ],
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      mockRequest.params = { sectionId: 'section1' };
      mockDocumentationService.getImportDocumentation.mockReturnValue(mockDocumentation);

      await controller.getDocumentationSection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'section1',
          title: 'Test Section',
          content: 'Test content'
        }
      });
    });

    it('should return 400 when section ID is missing', async () => {
      mockRequest.params = {};

      await controller.getDocumentationSection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Section ID is required'
      });
    });

    it('should return 404 when section is not found', async () => {
      const mockDocumentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        description: 'Test description',
        sections: [],
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      mockRequest.params = { sectionId: 'nonexistent' };
      mockDocumentationService.getImportDocumentation.mockReturnValue(mockDocumentation);

      await controller.getDocumentationSection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Documentation section not found: nonexistent'
      });
    });

    it('should handle errors when getting documentation section', async () => {
      const error = new Error('Service error');
      mockRequest.params = { sectionId: 'section1' };
      mockDocumentationService.getImportDocumentation.mockImplementation(() => {
        throw error;
      });

      await controller.getDocumentationSection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve documentation section',
        error: 'Service error'
      });
    });
  });

  describe('search functionality', () => {
    it('should find content in section text', () => {
      const controller = new DocumentationController();
      const mockDocumentation = {
        sections: [
          {
            id: 'section1',
            title: 'Upload Files',
            content: 'This section explains how to upload CSV files',
            tips: [],
            warnings: []
          }
        ]
      };

      const results = (controller as any).searchInDocumentation(mockDocumentation, 'csv');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('section');
      expect(results[0].title).toBe('Upload Files');
    });

    it('should find content in tips', () => {
      const controller = new DocumentationController();
      const mockDocumentation = {
        sections: [
          {
            id: 'section1',
            title: 'Upload Files',
            content: 'Upload section',
            tips: ['Make sure your CSV file is properly formatted'],
            warnings: []
          }
        ]
      };

      const results = (controller as any).searchInDocumentation(mockDocumentation, 'csv');
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('tip');
    });

    it('should calculate relevance scores correctly', () => {
      const controller = new DocumentationController();
      
      const score1 = (controller as any).calculateRelevance('This is a test CSV file', 'csv');
      const score2 = (controller as any).calculateRelevance('CSV files are important', 'csv');
      const score3 = (controller as any).calculateRelevance('This is about something else', 'csv');
      
      expect(score1).toBeGreaterThan(score3);
      expect(score2).toBeGreaterThan(score3);
    });

    it('should find sections by ID', () => {
      const controller = new DocumentationController();
      const sections = [
        {
          id: 'section1',
          title: 'Section 1',
          subsections: [
            {
              id: 'subsection1',
              title: 'Subsection 1'
            }
          ]
        }
      ];

      const found = (controller as any).findSectionById(sections, 'subsection1');
      expect(found).toBeTruthy();
      expect(found.id).toBe('subsection1');
    });
  });
});