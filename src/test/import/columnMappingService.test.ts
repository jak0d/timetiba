import { ColumnMappingService } from '../../services/import/columnMappingService';
import { ColumnMapping, TransformationType } from '../../types/import';

describe('ColumnMappingService', () => {
  let service: ColumnMappingService;

  beforeEach(() => {
    service = new ColumnMappingService();
  });

  describe('detectColumnMappings', () => {
    it('should detect venue mappings correctly', () => {
      const headers = ['Room Name', 'Capacity', 'Building Location', 'Room Type'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions.find(s => s.sourceColumn === 'Room Name')).toMatchObject({
        targetField: 'name',
        entityType: 'venue',
        required: true
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Capacity')).toMatchObject({
        targetField: 'capacity',
        entityType: 'venue',
        transformation: TransformationType.NUMBER_PARSE
      });
      expect(result.unmappedColumns).toHaveLength(0);
      expect(result.requiredFieldsCovered).toContain('venue.name');
    });

    it('should detect lecturer mappings correctly', () => {
      const headers = ['Lecturer Name', 'Email Address', 'Department', 'Office Room'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions.find(s => s.sourceColumn === 'Lecturer Name')).toMatchObject({
        targetField: 'name',
        entityType: 'lecturer',
        required: true
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Email Address')).toMatchObject({
        targetField: 'email',
        entityType: 'lecturer',
        transformation: TransformationType.LOWERCASE
      });
      expect(result.requiredFieldsCovered).toContain('lecturer.name');
    });

    it('should detect course mappings correctly', () => {
      const headers = ['Course Title', 'Course Code', 'Credit Hours', 'Department'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions.find(s => s.sourceColumn === 'Course Title')).toMatchObject({
        targetField: 'name',
        entityType: 'course',
        required: true
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Course Code')).toMatchObject({
        targetField: 'code',
        entityType: 'course',
        required: true,
        transformation: TransformationType.UPPERCASE
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Credit Hours')).toMatchObject({
        targetField: 'credits',
        entityType: 'course',
        transformation: TransformationType.NUMBER_PARSE
      });
    });

    it('should detect student group mappings correctly', () => {
      const headers = ['Group Name', 'Class Size', 'Year Level', 'Program'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions.find(s => s.sourceColumn === 'Group Name')).toMatchObject({
        targetField: 'name',
        entityType: 'studentGroup',
        required: true
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Class Size')).toMatchObject({
        targetField: 'size',
        entityType: 'studentGroup',
        transformation: TransformationType.NUMBER_PARSE
      });
    });

    it('should detect schedule mappings correctly', () => {
      const headers = ['Course', 'Lecturer', 'Room', 'Start Time', 'End Time', 'Day', 'Student Group'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(7);
      expect(result.suggestions.find(s => s.sourceColumn === 'Course')).toMatchObject({
        targetField: 'course',
        entityType: 'schedule',
        required: true
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Start Time')).toMatchObject({
        targetField: 'startTime',
        entityType: 'schedule',
        required: true,
        transformation: TransformationType.DATE_PARSE
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'End Time')).toMatchObject({
        targetField: 'endTime',
        entityType: 'schedule',
        required: true,
        transformation: TransformationType.DATE_PARSE
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'Day')).toMatchObject({
        targetField: 'dayOfWeek',
        entityType: 'schedule',
        required: true
      });
    });

    it('should handle mixed case and special characters in headers', () => {
      const headers = ['ROOM_NAME', 'room-capacity', 'Building.Location', 'Room Type!!!'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(4);
      expect(result.suggestions.find(s => s.sourceColumn === 'ROOM_NAME')).toMatchObject({
        targetField: 'name',
        entityType: 'venue'
      });
      expect(result.suggestions.find(s => s.sourceColumn === 'room-capacity')).toMatchObject({
        targetField: 'capacity',
        entityType: 'venue'
      });
    });

    it('should identify unmapped columns', () => {
      const headers = ['Room Name', 'Unknown Column', 'Capacity', 'Another Unknown'];
      const result = service.detectColumnMappings(headers);

      expect(result.unmappedColumns).toContain('Unknown Column');
      expect(result.unmappedColumns).toContain('Another Unknown');
      expect(result.suggestions).toHaveLength(2);
    });

    it('should identify missing required fields', () => {
      const headers = ['Capacity', 'Location']; // Missing required 'name' field for venue
      const result = service.detectColumnMappings(headers);

      expect(result.missingRequiredFields).toContain('venue.name');
    });

    it('should calculate confidence scores correctly', () => {
      const headers = ['Room Name', 'Capacity'];
      const result = service.detectColumnMappings(headers);

      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.suggestions[0]?.confidence).toBeGreaterThan(0.8);
    });

    it('should handle empty headers array', () => {
      const headers: string[] = [];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(0);
      expect(result.unmappedColumns).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should handle headers with no matches', () => {
      const headers = ['xyz', 'abc', 'def'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions).toHaveLength(0);
      expect(result.unmappedColumns).toHaveLength(3);
      expect(result.confidence).toBe(0);
    });
  });

  describe('generateMappingSuggestions', () => {
    it('should generate suggestions for all entity types', () => {
      const headers = ['Course', 'Lecturer', 'Room', 'Start Time'];
      const suggestions = service.generateMappingSuggestions(headers);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.entityType === 'schedule')).toBe(true);
    });

    it('should filter suggestions by entity type', () => {
      const headers = ['Course', 'Lecturer', 'Room', 'Start Time'];
      const suggestions = service.generateMappingSuggestions(headers, 'schedule');

      expect(suggestions.every(s => s.entityType === 'schedule')).toBe(true);
    });

    it('should provide reasoning for suggestions', () => {
      const headers = ['Room Name'];
      const suggestions = service.generateMappingSuggestions(headers);

      expect(suggestions[0]?.reasoning).toContain('Matched');
    });
  });

  describe('validateMappingCompleteness', () => {
    it('should validate complete venue mappings', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingCompleteness(mappings, 'venue');

      expect(result.isComplete).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const result = service.validateMappingCompleteness(mappings, 'venue');

      expect(result.isComplete).toBe(false);
      expect(result.missingRequired).toContain('name');
    });

    it('should provide warnings for missing important optional fields', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingCompleteness(mappings, 'venue');

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('capacity');
    });

    it('should validate complete course mappings', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Course Name',
          targetField: 'name',
          entityType: 'course',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Course Code',
          targetField: 'code',
          entityType: 'course',
          required: true,
          transformation: TransformationType.UPPERCASE
        }
      ];

      const result = service.validateMappingCompleteness(mappings, 'course');

      expect(result.isComplete).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('should validate complete schedule mappings', () => {
      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Course',
          targetField: 'course',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Lecturer',
          targetField: 'lecturer',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Room',
          targetField: 'venue',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Start Time',
          targetField: 'startTime',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.DATE_PARSE
        },
        {
          sourceColumn: 'End Time',
          targetField: 'endTime',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.DATE_PARSE
        },
        {
          sourceColumn: 'Day',
          targetField: 'dayOfWeek',
          entityType: 'schedule',
          required: true,
          transformation: TransformationType.TRIM
        }
      ];

      const result = service.validateMappingCompleteness(mappings, 'schedule');

      expect(result.isComplete).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });
  });

  describe('fuzzy matching edge cases', () => {
    it('should handle similar field names with different confidence', () => {
      const headers = ['Room', 'Rooms', 'Room Name', 'Room Number'];
      const result = service.detectColumnMappings(headers);

      const roomSuggestions = result.suggestions.filter(s => s.targetField === 'name');
      expect(roomSuggestions.length).toBeGreaterThan(0);
      
      // All room-related fields should be detected
      expect(result.suggestions.some(s => s.sourceColumn === 'Room Name')).toBe(true);
      expect(result.suggestions.some(s => s.sourceColumn === 'Room')).toBe(true);
      
      // Confidence scores should be reasonable
      const roomNameSuggestion = result.suggestions.find(s => s.sourceColumn === 'Room Name');
      const roomSuggestion = result.suggestions.find(s => s.sourceColumn === 'Room');
      
      if (roomNameSuggestion && roomSuggestion) {
        expect(roomNameSuggestion.confidence).toBeGreaterThanOrEqual(0.7);
        expect(roomSuggestion.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should handle abbreviations and common variations', () => {
      const headers = ['Prof', 'Dept', 'Rm', 'Std Grp'];
      const result = service.detectColumnMappings(headers);

      expect(result.suggestions.some(s => s.sourceColumn === 'Prof' && s.targetField === 'name')).toBe(true);
      expect(result.suggestions.some(s => s.sourceColumn === 'Dept' && s.targetField === 'department')).toBe(true);
      expect(result.suggestions.some(s => s.sourceColumn === 'Rm' && s.targetField === 'name')).toBe(true);
    });

    it('should prioritize exact matches over fuzzy matches', () => {
      const headers = ['name', 'venue name'];
      const result = service.detectColumnMappings(headers);

      const exactMatch = result.suggestions.find(s => s.sourceColumn === 'name');
      const fuzzyMatch = result.suggestions.find(s => s.sourceColumn === 'venue name');

      if (exactMatch && fuzzyMatch && exactMatch.targetField === fuzzyMatch.targetField) {
        expect(exactMatch.confidence).toBeGreaterThanOrEqual(fuzzyMatch.confidence);
      }
    });
  });

  describe('transformation suggestions', () => {
    it('should suggest DATE_PARSE for time fields', () => {
      const headers = ['Start Time', 'End Time'];
      const result = service.detectColumnMappings(headers);

      const startTimeSuggestion = result.suggestions.find(s => s.sourceColumn === 'Start Time');
      const endTimeSuggestion = result.suggestions.find(s => s.sourceColumn === 'End Time');

      expect(startTimeSuggestion?.transformation).toBe(TransformationType.DATE_PARSE);
      expect(endTimeSuggestion?.transformation).toBe(TransformationType.DATE_PARSE);
    });

    it('should suggest NUMBER_PARSE for numeric fields', () => {
      const headers = ['Capacity', 'Credits', 'Size'];
      const result = service.detectColumnMappings(headers);

      result.suggestions.forEach(suggestion => {
        if (['capacity', 'credits', 'size'].includes(suggestion.targetField)) {
          expect(suggestion.transformation).toBe(TransformationType.NUMBER_PARSE);
        }
      });
    });

    it('should suggest UPPERCASE for code fields', () => {
      const headers = ['Course Code'];
      const result = service.detectColumnMappings(headers);

      const codeSuggestion = result.suggestions.find(s => s.targetField === 'code');
      expect(codeSuggestion?.transformation).toBe(TransformationType.UPPERCASE);
    });

    it('should suggest LOWERCASE for email fields', () => {
      const headers = ['Email'];
      const result = service.detectColumnMappings(headers);

      const emailSuggestion = result.suggestions.find(s => s.targetField === 'email');
      expect(emailSuggestion?.transformation).toBe(TransformationType.LOWERCASE);
    });
  });
});