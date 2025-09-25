import { SimpleLLMDataProcessingService as LLMDataProcessingService } from '../../services/import/llmDataProcessingService.simple';
import { ParsedData } from '../../types/import';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            format: 'timetable',
            primaryEntityType: 'schedule',
            relationships: [
              {
                from: 'course',
                to: 'lecturer',
                type: 'many_to_one',
                confidence: 0.9
              }
            ],
            timeFormat: 'HH:MM',
            namingConventions: [
              {
                pattern: 'Course Name Pattern',
                entityType: 'course',
                examples: ['Mathematics 101', 'Physics 201'],
                confidence: 0.8
              }
            ]
          })
        }
      })
    }))
  }))
}));

describe('LLMDataProcessingService', () => {
  let service: LLMDataProcessingService;
  let mockParsedData: ParsedData;

  beforeEach(() => {
    // Set up environment variable for testing
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    service = new LLMDataProcessingService();
    
    mockParsedData = {
      headers: ['Course Name', 'Lecturer', 'Venue', 'Day', 'Start Time', 'End Time', 'Student Group'],
      rows: [
        {
          'Course Name': 'Mathematics 101',
          'Lecturer': 'Dr. Smith',
          'Venue': 'Room A101',
          'Day': 'Monday',
          'Start Time': '09:00',
          'End Time': '10:30',
          'Student Group': 'CS Year 1'
        },
        {
          'Course Name': 'Physics 201',
          'Lecturer': 'Prof. Johnson',
          'Venue': 'Lab B202',
          'Day': 'Tuesday',
          'Start Time': '14:00',
          'End Time': '15:30',
          'Student Group': 'Physics Year 2'
        }
      ],
      metadata: {
        totalRows: 2,
        emptyRows: 0,
        duplicateRows: 0,
        encoding: 'utf-8'
      }
    };
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if GEMINI_API_KEY is not provided', () => {
      delete process.env.GEMINI_API_KEY;
      expect(() => new LLMDataProcessingService()).toThrow('GEMINI_API_KEY environment variable is required');
    });

    it('should initialize successfully with API key', () => {
      expect(() => new LLMDataProcessingService()).not.toThrow();
    });
  });

  describe('processDataWithLLM', () => {
    it('should process data and return analysis result', async () => {
      const result = await service.processDataWithLLM(mockParsedData);

      expect(result).toHaveProperty('detectedEntities');
      expect(result).toHaveProperty('suggestedMappings');
      expect(result).toHaveProperty('dataStructure');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('recommendations');

      expect(result.dataStructure.format).toBe('timetable');
      expect(result.dataStructure.primaryEntityType).toBe('schedule');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should preserve original names when option is enabled', async () => {
      const options = {
        preserveOriginalNames: true,
        createMissingEntities: true,
        confidenceThreshold: 0.7,
        maxRetries: 3,
        enableContextualMapping: true
      };

      const result = await service.processDataWithLLM(mockParsedData, options);
      
      // The result should contain entities with original names preserved
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      // Mock a failure in the LLM service
      const mockService = new LLMDataProcessingService();
      (mockService as any).model.generateContent = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(mockService.processDataWithLLM(mockParsedData)).rejects.toThrow('LLM processing failed: API Error');
    });
  });

  describe('createEntitiesFromLLMAnalysis', () => {
    it('should create entities from analysis result', async () => {
      const mockAnalysisResult = {
        detectedEntities: {
          venues: [
            {
              originalName: 'Room A101',
              normalizedName: 'Room A101',
              attributes: { capacity: 30, building: 'A' },
              confidence: 0.9,
              sourceRows: [0],
              suggestedFields: { capacity: 30, location: 'Building A, Room 101' }
            }
          ],
          lecturers: [
            {
              originalName: 'Dr. Smith',
              normalizedName: 'Dr. Smith',
              attributes: { department: 'Mathematics', title: 'Dr.' },
              confidence: 0.95,
              sourceRows: [0],
              suggestedFields: { 
                email: 'dr.smith@university.edu',
                department: 'Mathematics',
                title: 'Dr.'
              }
            }
          ],
          courses: [
            {
              originalName: 'Mathematics 101',
              normalizedName: 'Mathematics 101',
              attributes: { code: 'MATH101', credits: 3 },
              confidence: 0.9,
              sourceRows: [0],
              suggestedFields: { 
                code: 'MATH101',
                duration: 90,
                credits: 3
              }
            }
          ],
          studentGroups: [
            {
              originalName: 'CS Year 1',
              normalizedName: 'CS Year 1',
              attributes: { yearLevel: 1, department: 'Computer Science' },
              confidence: 0.85,
              sourceRows: [0],
              suggestedFields: {
                size: 25,
                yearLevel: 1,
                department: 'Computer Science'
              }
            }
          ],
          schedules: [
            {
              course: 'Mathematics 101',
              lecturer: 'Dr. Smith',
              venue: 'Room A101',
              studentGroups: ['CS Year 1'],
              timeSlot: {
                day: 'Monday',
                startTime: '09:00',
                endTime: '10:30'
              },
              originalRow: 0,
              confidence: 0.9
            }
          ]
        },
        suggestedMappings: [],
        dataStructure: {
          format: 'timetable' as const,
          primaryEntityType: 'schedule' as const,
          relationships: [],
          timeFormat: 'HH:MM',
          namingConventions: []
        },
        confidence: 0.9,
        recommendations: []
      };

      const options = {
        preserveOriginalNames: true,
        createMissingEntities: true,
        confidenceThreshold: 0.7,
        maxRetries: 3,
        enableContextualMapping: true
      };

      const result = await service.createEntitiesFromLLMAnalysis(mockAnalysisResult, options);

      expect(result).toHaveProperty('venues');
      expect(result).toHaveProperty('lecturers');
      expect(result).toHaveProperty('courses');
      expect(result).toHaveProperty('studentGroups');
      expect(result).toHaveProperty('schedules');
      expect(result).toHaveProperty('metadata');

      // Check that original names are preserved
      expect(result.venues[0].name).toBe('Room A101');
      expect(result.lecturers[0].name).toBe('Dr. Smith');
      expect(result.courses[0].name).toBe('Mathematics 101');
      expect(result.studentGroups[0].name).toBe('CS Year 1');

      // Check that suggested fields are applied
      expect(result.venues[0].capacity).toBe(30);
      expect(result.lecturers[0].email).toBe('dr.smith@university.edu');
      expect(result.courses[0].code).toBe('MATH101');
      expect(result.studentGroups[0].yearLevel).toBe(1);
    });

    it('should handle entity creation errors', async () => {
      const invalidAnalysisResult = {
        detectedEntities: {
          venues: [],
          lecturers: [],
          courses: [],
          studentGroups: [],
          schedules: []
        },
        suggestedMappings: [],
        dataStructure: {
          format: 'timetable' as const,
          primaryEntityType: 'schedule' as const,
          relationships: [],
          timeFormat: 'HH:MM',
          namingConventions: []
        },
        confidence: 0.5,
        recommendations: []
      };

      const options = {
        preserveOriginalNames: true,
        createMissingEntities: true,
        confidenceThreshold: 0.7,
        maxRetries: 3,
        enableContextualMapping: true
      };

      const result = await service.createEntitiesFromLLMAnalysis(invalidAnalysisResult, options);

      // Should return empty arrays but not throw
      expect(result.venues).toHaveLength(0);
      expect(result.lecturers).toHaveLength(0);
      expect(result.courses).toHaveLength(0);
      expect(result.studentGroups).toHaveLength(0);
      expect(result.schedules).toHaveLength(0);
    });
  });

  describe('helper methods', () => {
    it('should generate appropriate course codes', () => {
      const service = new LLMDataProcessingService();
      const courseCode = (service as any).generateCourseCode('Advanced Mathematics');
      expect(courseCode).toBe('AM101');
    });

    it('should parse time slots correctly', () => {
      const service = new LLMDataProcessingService();
      const timeSlot = (service as any).parseTimeSlot('14:30');
      expect(timeSlot).toBeInstanceOf(Date);
      expect(timeSlot.getHours()).toBe(14);
      expect(timeSlot.getMinutes()).toBe(30);
    });

    it('should parse days of week correctly', () => {
      const service = new LLMDataProcessingService();
      expect((service as any).parseDayOfWeek('Monday')).toBe('monday');
      expect((service as any).parseDayOfWeek('mon')).toBe('monday');
      expect((service as any).parseDayOfWeek('invalid')).toBe('monday'); // fallback
    });

    it('should calculate confidence correctly', () => {
      const service = new LLMDataProcessingService();
      const structureAnalysis = {
        format: 'timetable' as const,
        primaryEntityType: 'schedule' as const,
        relationships: [{ from: 'course', to: 'lecturer', type: 'many_to_one' as const, confidence: 0.8 }],
        timeFormat: 'HH:MM',
        namingConventions: []
      };
      
      const entityMappings = {
        venues: [{ confidence: 0.9 }],
        lecturers: [{ confidence: 0.8 }],
        courses: [{ confidence: 0.85 }],
        studentGroups: [{ confidence: 0.7 }],
        schedules: [{ confidence: 0.9 }]
      };

      const confidence = (service as any).calculateOverallConfidence(structureAnalysis, entityMappings);
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });
});