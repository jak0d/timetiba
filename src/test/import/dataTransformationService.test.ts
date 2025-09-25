import { DataTransformationService } from '../../services/import/dataTransformationService';
import { ColumnMapping, TransformationType } from '../../types/import';

describe('DataTransformationService', () => {
  let service: DataTransformationService;

  beforeEach(() => {
    service = new DataTransformationService();
  });

  describe('transformData', () => {
    it('should transform venue data correctly', async () => {
      const rawData = [
        {
          'Room Name': '  Room A101  ',
          'Capacity': '50',
          'Location': 'Building A'
        },
        {
          'Room Name': 'Room B202',
          'Capacity': '30',
          'Location': 'Building B'
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        },
        {
          sourceColumn: 'Location',
          targetField: 'location',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.TRIM
        }
      ];

      const result = await service.transformData(rawData, mappings);

      expect(result.success).toBe(true);
      expect(result.mappedData.venues).toHaveLength(2);
      expect(result.mappedData.venues[0]).toEqual({
        name: 'Room A101',
        capacity: 50,
        location: 'Building A'
      });
      expect(result.statistics.successfulRows).toBe(2);
      expect(result.statistics.failedRows).toBe(0);
    });

    it('should transform lecturer data correctly', async () => {
      const rawData = [
        {
          'Lecturer Name': 'Dr. John Smith',
          'Email': 'JOHN.SMITH@UNIVERSITY.EDU',
          'Department': 'Computer Science'
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Lecturer Name',
          targetField: 'name',
          entityType: 'lecturer',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Email',
          targetField: 'email',
          entityType: 'lecturer',
          required: false,
          transformation: TransformationType.LOWERCASE
        },
        {
          sourceColumn: 'Department',
          targetField: 'department',
          entityType: 'lecturer',
          required: false,
          transformation: TransformationType.TRIM
        }
      ];

      const result = await service.transformData(rawData, mappings);

      expect(result.success).toBe(true);
      expect(result.mappedData.lecturers).toHaveLength(1);
      expect(result.mappedData.lecturers[0]).toEqual({
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        department: 'Computer Science'
      });
    });

    it('should transform course data correctly', async () => {
      const rawData = [
        {
          'Course Name': 'Introduction to Programming',
          'Course Code': 'cs101',
          'Credits': '3'
        }
      ];

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
        },
        {
          sourceColumn: 'Credits',
          targetField: 'credits',
          entityType: 'course',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const result = await service.transformData(rawData, mappings);

      expect(result.success).toBe(true);
      expect(result.mappedData.courses).toHaveLength(1);
      expect(result.mappedData.courses[0]).toEqual({
        name: 'Introduction to Programming',
        code: 'CS101',
        credits: 3
      });
    });

    it('should transform schedule data correctly', async () => {
      const rawData = [
        {
          'Course': 'CS101',
          'Lecturer': 'Dr. Smith',
          'Room': 'A101',
          'Start Time': '09:00',
          'End Time': '10:30',
          'Day': 'Monday'
        }
      ];

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

      const result = await service.transformData(rawData, mappings);

      expect(result.success).toBe(true);
      expect(result.mappedData.schedules).toHaveLength(1);
      expect(result.mappedData.schedules[0]).toEqual({
        course: 'CS101',
        lecturer: 'Dr. Smith',
        venue: 'A101',
        startTime: '09:00:00',
        endTime: '10:30:00',
        dayOfWeek: 'Monday'
      });
    });

    it('should handle missing required fields', async () => {
      const rawData = [
        {
          'Capacity': '50'
          // Missing required 'Room Name'
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const result = await service.transformData(rawData, mappings);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Missing required field 'name' in row 1");
      expect(result.statistics.failedRows).toBe(1);
    });

    it('should use default values when provided', async () => {
      const rawData = [
        {
          'Room Name': 'Room A101'
          // Missing capacity
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE,
          defaultValue: 25
        }
      ];

      const result = await service.transformData(rawData, mappings, { useDefaultValues: true });

      expect(result.success).toBe(true);
      expect(result.mappedData.venues[0]).toEqual({
        name: 'Room A101',
        capacity: 25
      });
    });

    it('should skip invalid rows when option is enabled', async () => {
      const rawData = [
        {
          'Room Name': 'Room A101',
          'Capacity': '50'
        },
        {
          // Missing required name
          'Capacity': '30'
        },
        {
          'Room Name': 'Room C303',
          'Capacity': '40'
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Room Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        }
      ];

      const result = await service.transformData(rawData, mappings, { skipInvalidRows: true });

      expect(result.mappedData.venues).toHaveLength(2);
      expect(result.statistics.successfulRows).toBe(2);
      expect(result.statistics.failedRows).toBe(1);
    });
  });

  describe('applyTransformation', () => {
    describe('UPPERCASE transformation', () => {
      it('should convert string to uppercase', () => {
        const result = service.applyTransformation('hello world', TransformationType.UPPERCASE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('HELLO WORLD');
      });

      it('should fail for non-string input', () => {
        const result = service.applyTransformation(123, TransformationType.UPPERCASE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('UPPERCASE transformation requires string input');
      });
    });

    describe('LOWERCASE transformation', () => {
      it('should convert string to lowercase', () => {
        const result = service.applyTransformation('HELLO WORLD', TransformationType.LOWERCASE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('hello world');
      });

      it('should fail for non-string input', () => {
        const result = service.applyTransformation(123, TransformationType.LOWERCASE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('LOWERCASE transformation requires string input');
      });
    });

    describe('TRIM transformation', () => {
      it('should trim whitespace from string', () => {
        const result = service.applyTransformation('  hello world  ', TransformationType.TRIM);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('hello world');
      });

      it('should fail for non-string input', () => {
        const result = service.applyTransformation(123, TransformationType.TRIM);
        expect(result.success).toBe(false);
        expect(result.error).toContain('TRIM transformation requires string input');
      });
    });

    describe('NUMBER_PARSE transformation', () => {
      it('should parse valid number strings', () => {
        const result = service.applyTransformation('123.45', TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(123.45);
      });

      it('should handle numbers with formatting', () => {
        const result = service.applyTransformation('1,234.56', TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(1234.56);
        expect(result.warnings).toContain('Removed formatting characters from numeric value');
      });

      it('should handle currency symbols', () => {
        const result = service.applyTransformation('$100.00', TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(100);
      });

      it('should return existing numbers unchanged', () => {
        const result = service.applyTransformation(42, TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(42);
      });

      it('should fail for invalid number strings', () => {
        const result = service.applyTransformation('not a number', TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unable to parse number');
      });

      it('should fail for empty values', () => {
        const result = service.applyTransformation('', TransformationType.NUMBER_PARSE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Empty numeric value');
      });
    });

    describe('BOOLEAN_PARSE transformation', () => {
      it('should parse true values', () => {
        const trueValues = ['true', 'yes', 'y', '1', 'on', 'enabled', 'active'];
        trueValues.forEach(value => {
          const result = service.applyTransformation(value, TransformationType.BOOLEAN_PARSE);
          expect(result.success).toBe(true);
          expect(result.transformedValue).toBe(true);
        });
      });

      it('should parse false values', () => {
        const falseValues = ['false', 'no', 'n', '0', 'off', 'disabled', 'inactive'];
        falseValues.forEach(value => {
          const result = service.applyTransformation(value, TransformationType.BOOLEAN_PARSE);
          expect(result.success).toBe(true);
          expect(result.transformedValue).toBe(false);
        });
      });

      it('should handle case insensitive values', () => {
        const result = service.applyTransformation('TRUE', TransformationType.BOOLEAN_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(true);
      });

      it('should return existing boolean values unchanged', () => {
        const result = service.applyTransformation(true, TransformationType.BOOLEAN_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe(true);
      });

      it('should fail for invalid boolean strings', () => {
        const result = service.applyTransformation('maybe', TransformationType.BOOLEAN_PARSE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unable to parse boolean');
      });
    });

    describe('DATE_PARSE transformation', () => {
      it('should parse ISO date strings', () => {
        const result = service.applyTransformation('2023-12-25', TransformationType.DATE_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toContain('2023-12-25');
      });

      it('should parse common date formats', () => {
        const result = service.applyTransformation('12/25/2023', TransformationType.DATE_PARSE);
        expect(result.success).toBe(true);
        expect(typeof result.transformedValue).toBe('string');
      });

      it('should parse time formats', () => {
        const result = service.applyTransformation('14:30', TransformationType.DATE_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('14:30:00');
      });

      it('should parse time with AM/PM', () => {
        const result = service.applyTransformation('2:30 PM', TransformationType.DATE_PARSE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('14:30:00');
      });

      it('should handle 12 AM/PM correctly', () => {
        const midnightResult = service.applyTransformation('12:00 AM', TransformationType.DATE_PARSE);
        expect(midnightResult.success).toBe(true);
        expect(midnightResult.transformedValue).toBe('00:00:00');

        const noonResult = service.applyTransformation('12:00 PM', TransformationType.DATE_PARSE);
        expect(noonResult.success).toBe(true);
        expect(noonResult.transformedValue).toBe('12:00:00');
      });

      it('should fail for invalid date strings', () => {
        const result = service.applyTransformation('not a date', TransformationType.DATE_PARSE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unable to parse date/time');
      });

      it('should fail for empty values', () => {
        const result = service.applyTransformation('', TransformationType.DATE_PARSE);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Empty date value');
      });
    });

    describe('SPLIT_ARRAY transformation', () => {
      it('should split comma-separated values', () => {
        const result = service.applyTransformation('apple,banana,cherry', TransformationType.SPLIT_ARRAY);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toEqual(['apple', 'banana', 'cherry']);
      });

      it('should trim whitespace from array items', () => {
        const result = service.applyTransformation('apple, banana , cherry', TransformationType.SPLIT_ARRAY);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toEqual(['apple', 'banana', 'cherry']);
      });

      it('should return existing arrays unchanged', () => {
        const input = ['apple', 'banana'];
        const result = service.applyTransformation(input, TransformationType.SPLIT_ARRAY);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toEqual(input);
      });

      it('should return empty array for empty values', () => {
        const result = service.applyTransformation('', TransformationType.SPLIT_ARRAY);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toEqual([]);
      });

      it('should filter out empty items', () => {
        const result = service.applyTransformation('apple,,banana,', TransformationType.SPLIT_ARRAY);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toEqual(['apple', 'banana']);
      });
    });

    describe('NONE transformation', () => {
      it('should return value unchanged', () => {
        const result = service.applyTransformation('test value', TransformationType.NONE);
        expect(result.success).toBe(true);
        expect(result.transformedValue).toBe('test value');
      });
    });
  });

  describe('validateTransformedData', () => {
    it('should validate venue data', () => {
      const mappedData = {
        venues: [
          { name: 'Room A101', capacity: 50 },
          { name: '', capacity: -10 }, // Invalid: empty name, negative capacity
          { name: 'Room C303', capacity: 'invalid' } // Invalid: non-numeric capacity
        ],
        lecturers: [],
        courses: [],
        studentGroups: [],
        schedules: [],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Venue 2: Missing required name');
      expect(result.errors).toContain('Venue 2: Invalid capacity value');
      expect(result.errors).toContain('Venue 3: Invalid capacity value');
    });

    it('should validate lecturer data', () => {
      const mappedData = {
        venues: [],
        lecturers: [
          { name: 'Dr. Smith', email: 'smith@university.edu' },
          { name: '', email: 'invalid-email' } // Invalid: empty name, invalid email
        ],
        courses: [],
        studentGroups: [],
        schedules: [],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Lecturer 2: Missing required name');
      expect(result.errors).toContain('Lecturer 2: Invalid email format');
    });

    it('should validate course data', () => {
      const mappedData = {
        venues: [],
        lecturers: [],
        courses: [
          { name: 'CS101', code: 'CS101', credits: 3 },
          { name: '', code: '', credits: -1 } // Invalid: missing name and code, negative credits
        ],
        studentGroups: [],
        schedules: [],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Course 2: Missing required name');
      expect(result.errors).toContain('Course 2: Missing required code');
      expect(result.errors).toContain('Course 2: Invalid credits value');
    });

    it('should validate student group data', () => {
      const mappedData = {
        venues: [],
        lecturers: [],
        courses: [],
        studentGroups: [
          { name: 'Group A', size: 25 },
          { name: '', size: -5 } // Invalid: empty name, negative size
        ],
        schedules: [],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Student Group 2: Missing required name');
      expect(result.errors).toContain('Student Group 2: Invalid size value');
    });

    it('should validate schedule data', () => {
      const mappedData = {
        venues: [],
        lecturers: [],
        courses: [],
        studentGroups: [],
        schedules: [
          {
            course: 'CS101',
            lecturer: 'Dr. Smith',
            venue: 'Room A101',
            startTime: '09:00:00',
            endTime: '10:30:00',
            dayOfWeek: 'Monday'
          },
          {
            course: '',
            lecturer: '',
            venue: '',
            startTime: 'invalid-time',
            endTime: '25:00:00',
            dayOfWeek: 'InvalidDay'
          }
        ],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Schedule 2: Missing required field 'course'");
      expect(result.errors).toContain("Schedule 2: Missing required field 'lecturer'");
      expect(result.errors).toContain("Schedule 2: Missing required field 'venue'");
      expect(result.errors).toContain('Schedule 2: Invalid start time format');
      expect(result.errors).toContain('Schedule 2: Invalid end time format');
      expect(result.errors).toContain('Schedule 2: Invalid day of week');
    });

    it('should pass validation for valid data', () => {
      const mappedData = {
        venues: [{ name: 'Room A101', capacity: 50 }],
        lecturers: [{ name: 'Dr. Smith', email: 'smith@university.edu' }],
        courses: [{ name: 'CS101', code: 'CS101', credits: 3 }],
        studentGroups: [{ name: 'Group A', size: 25 }],
        schedules: [{
          course: 'CS101',
          lecturer: 'Dr. Smith',
          venue: 'Room A101',
          startTime: '09:00:00',
          endTime: '10:30:00',
          dayOfWeek: 'Monday'
        }],
        metadata: {
          sourceFile: 'test.csv',
          mappingConfig: 'test',
          importedAt: new Date(),
          importedBy: 'test'
        }
      };

      const result = service.validateTransformedData(mappedData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('transformation statistics', () => {
    it('should track transformation counts', async () => {
      const rawData = [
        {
          'Name': '  Room A101  ',
          'Code': 'cs101',
          'Capacity': '50',
          'Active': 'yes'
        }
      ];

      const mappings: ColumnMapping[] = [
        {
          sourceColumn: 'Name',
          targetField: 'name',
          entityType: 'venue',
          required: true,
          transformation: TransformationType.TRIM
        },
        {
          sourceColumn: 'Code',
          targetField: 'code',
          entityType: 'course',
          required: true,
          transformation: TransformationType.UPPERCASE
        },
        {
          sourceColumn: 'Capacity',
          targetField: 'capacity',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.NUMBER_PARSE
        },
        {
          sourceColumn: 'Active',
          targetField: 'active',
          entityType: 'venue',
          required: false,
          transformation: TransformationType.BOOLEAN_PARSE
        }
      ];

      const result = await service.transformData(rawData, mappings);

      expect(result.statistics.transformationCounts[TransformationType.TRIM]).toBe(1);
      expect(result.statistics.transformationCounts[TransformationType.UPPERCASE]).toBe(1);
      expect(result.statistics.transformationCounts[TransformationType.NUMBER_PARSE]).toBe(1);
      expect(result.statistics.transformationCounts[TransformationType.BOOLEAN_PARSE]).toBe(1);
    });
  });
});