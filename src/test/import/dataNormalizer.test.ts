import { DataNormalizer, DataNormalizationOptions, TransformationType } from '../../services/import/dataNormalizer';
import { ParsedData } from '../../types/import';

describe('DataNormalizer', () => {
  let dataNormalizer: DataNormalizer;

  beforeEach(() => {
    dataNormalizer = new DataNormalizer();
  });

  describe('normalizeData', () => {
    it('should normalize headers by default', async () => {
      const inputData: ParsedData = {
        headers: ['Full Name!', 'E-mail Address', 'Department & Faculty'],
        rows: [
          { 'Full Name!': 'John Doe', 'E-mail Address': 'john@example.com', 'Department & Faculty': 'Computer Science' }
        ],
        metadata: { totalRows: 1, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData);

      expect(result.normalizedData.headers).toEqual(['full_name', 'email_address', 'department_faculty']);
      expect(result.normalizedData.rows[0]).toEqual({
        full_name: 'John Doe',
        email_address: 'john@example.com',
        department_faculty: 'Computer Science'
      });
      expect(result.transformationLog).toHaveLength(1);
      expect(result.transformationLog[0]?.type).toBe(TransformationType.HEADER_NORMALIZATION);
    });

    it('should handle null values', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [
          { name: 'John Doe', email: '', department: 'Computer Science' },
          { name: 'Jane Smith', email: 'jane@example.com', department: 'null' },
          { name: '', email: 'bob@example.com', department: 'N/A' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData, { handleNullValues: true });

      expect(result.normalizedData.rows[0]?.['email']).toBeNull();
      expect(result.normalizedData.rows[1]?.['department']).toBeNull();
      expect(result.normalizedData.rows[2]?.['name']).toBeNull();
      expect(result.normalizedData.rows[2]?.['department']).toBeNull();
      
      const nullTransformation = result.transformationLog.find(t => t.type === TransformationType.NULL_VALUE_HANDLING);
      expect(nullTransformation).toBeDefined();
      expect(nullTransformation?.rowsAffected).toBeGreaterThan(0);
    });

    it('should trim whitespace', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email'],
        rows: [
          { name: '  John Doe  ', email: 'john@example.com  ' },
          { name: 'Jane Smith', email: '  jane@example.com' }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData, { trimWhitespace: true });

      expect(result.normalizedData.rows[0]?.['name']).toBe('John Doe');
      expect(result.normalizedData.rows[0]?.['email']).toBe('john@example.com');
      expect(result.normalizedData.rows[1]?.['email']).toBe('jane@example.com');
      
      const trimTransformation = result.transformationLog.find(t => t.type === TransformationType.WHITESPACE_TRIMMING);
      expect(trimTransformation).toBeDefined();
    });

    it('should remove empty rows', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [
          { name: 'John Doe', email: 'john@example.com', department: 'Computer Science' },
          { name: '', email: '', department: '' },
          { name: null, email: null, department: null },
          { name: 'Jane Smith', email: 'jane@example.com', department: 'Mathematics' }
        ],
        metadata: { totalRows: 4, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData, { removeEmptyRows: true });

      expect(result.normalizedData.rows).toHaveLength(2);
      expect(result.normalizedData.rows[0]?.['name']).toBe('John Doe');
      expect(result.normalizedData.rows[1]?.['name']).toBe('Jane Smith');
      
      const emptyRowTransformation = result.transformationLog.find(t => t.type === TransformationType.EMPTY_ROW_REMOVAL);
      expect(emptyRowTransformation).toBeDefined();
      expect(emptyRowTransformation?.rowsAffected).toBe(2);
    });

    it('should remove duplicate rows', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [
          { name: 'John Doe', email: 'john@example.com', department: 'Computer Science' },
          { name: 'Jane Smith', email: 'jane@example.com', department: 'Mathematics' },
          { name: 'John Doe', email: 'john@example.com', department: 'Computer Science' },
          { name: 'Bob Wilson', email: 'bob@example.com', department: 'Physics' }
        ],
        metadata: { totalRows: 4, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData, { removeDuplicateRows: true });

      expect(result.normalizedData.rows).toHaveLength(3);
      expect(result.normalizedData.metadata.duplicateRows).toBe(1);
      
      const duplicateTransformation = result.transformationLog.find(t => t.type === TransformationType.DUPLICATE_ROW_REMOVAL);
      expect(duplicateTransformation).toBeDefined();
      expect(duplicateTransformation?.rowsAffected).toBe(1);
    });

    it('should convert data types', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'age', 'salary', 'active', 'start_date'],
        rows: [
          { name: 'John Doe', age: '30', salary: '50000', active: 'true', start_date: '2023-01-15' },
          { name: 'Jane Smith', age: '25', salary: '45000', active: 'false', start_date: '2023-02-01' }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData, { convertDataTypes: true });

      expect(typeof result.normalizedData.rows[0]?.['age']).toBe('number');
      expect(result.normalizedData.rows[0]?.['age']).toBe(30);
      expect(typeof result.normalizedData.rows[0]?.['salary']).toBe('number');
      expect(result.normalizedData.rows[0]?.['salary']).toBe(50000);
      expect(typeof result.normalizedData.rows[0]?.['active']).toBe('boolean');
      expect(result.normalizedData.rows[0]?.['active']).toBe(true);
      
      const typeTransformation = result.transformationLog.find(t => t.type === TransformationType.DATA_TYPE_CONVERSION);
      expect(typeTransformation).toBeDefined();
    });

    it('should handle custom null values', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [
          { name: 'John Doe', email: 'MISSING', department: 'Computer Science' },
          { name: 'Jane Smith', email: 'jane@example.com', department: 'UNKNOWN' }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const options: DataNormalizationOptions = {
        handleNullValues: true,
        customNullValues: ['MISSING', 'UNKNOWN']
      };

      const result = await dataNormalizer.normalizeData(inputData, options);

      expect(result.normalizedData.rows[0]?.['email']).toBeNull();
      expect(result.normalizedData.rows[1]?.['department']).toBeNull();
    });

    it('should generate quality report', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [
          { name: 'John Doe', email: 'john@example.com', department: 'Computer Science' },
          { name: '', email: '', department: '' },
          { name: 'Jane Smith', email: null, department: 'Mathematics' }
        ],
        metadata: { totalRows: 3, emptyRows: 1, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData);

      expect(result.qualityReport).toBeDefined();
      expect(result.qualityReport.totalRows).toBe(3);
      expect(result.qualityReport.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityReport.qualityScore).toBeLessThanOrEqual(100);
      expect(result.qualityReport.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('detectDataTypes', () => {
    it('should detect string data type', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'description'],
        rows: [
          { name: 'John Doe', description: 'Software Engineer' },
          { name: 'Jane Smith', description: 'Data Scientist' }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes).toHaveLength(2);
      expect(dataTypes[0]?.detectedType).toBe('string');
      expect(dataTypes[1]?.detectedType).toBe('string');
    });

    it('should detect number data type', async () => {
      const inputData: ParsedData = {
        headers: ['age', 'salary'],
        rows: [
          { age: '30', salary: '50000' },
          { age: '25', salary: '45000' },
          { age: '35', salary: '60000' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes[0]?.detectedType).toBe('number');
      expect(dataTypes[1]?.detectedType).toBe('number');
      expect(dataTypes[0]?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect email data type', async () => {
      const inputData: ParsedData = {
        headers: ['email'],
        rows: [
          { email: 'john@example.com' },
          { email: 'jane.smith@company.org' },
          { email: 'bob.wilson@university.edu' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes[0]?.detectedType).toBe('email');
      expect(dataTypes[0]?.confidence).toBe(1);
    });

    it('should detect boolean data type', async () => {
      const inputData: ParsedData = {
        headers: ['active', 'verified'],
        rows: [
          { active: 'true', verified: 'yes' },
          { active: 'false', verified: 'no' },
          { active: 'TRUE', verified: 'YES' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes[0]?.detectedType).toBe('boolean');
      expect(dataTypes[1]?.detectedType).toBe('boolean');
    });

    it('should detect date data type', async () => {
      const inputData: ParsedData = {
        headers: ['start_date', 'end_date'],
        rows: [
          { start_date: '2023-01-15', end_date: '01/15/2023' },
          { start_date: '2023-02-01', end_date: '02/01/2023' },
          { start_date: '2023-03-10', end_date: '03/10/2023' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes[0]?.detectedType).toBe('date');
      expect(dataTypes[1]?.detectedType).toBe('date');
    });

    it('should handle mixed data types', async () => {
      const inputData: ParsedData = {
        headers: ['mixed_column'],
        rows: [
          { mixed_column: 'text' },
          { mixed_column: '123' },
          { mixed_column: 'more text' },
          { mixed_column: 'even more text' }
        ],
        metadata: { totalRows: 4, emptyRows: 0, duplicateRows: 0 }
      };

      const dataTypes = dataNormalizer.detectDataTypes(inputData);

      expect(dataTypes[0]?.detectedType).toBe('string');
      expect(dataTypes[0]?.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('findDuplicateRows', () => {
    it('should find duplicate rows', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email'],
        rows: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Bob Wilson', email: 'bob@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' }
        ],
        metadata: { totalRows: 5, emptyRows: 0, duplicateRows: 0 }
      };

      const duplicates = dataNormalizer.findDuplicateRows(inputData);

      expect(duplicates).toHaveLength(2);
      expect(duplicates[0]?.count).toBe(2);
      expect(duplicates[1]?.count).toBe(2);
      expect(duplicates[0]?.rowIndices).toEqual([0, 2]);
      expect(duplicates[1]?.rowIndices).toEqual([1, 4]);
    });

    it('should return empty array when no duplicates exist', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email'],
        rows: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
          { name: 'Bob Wilson', email: 'bob@example.com' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const duplicates = dataNormalizer.findDuplicateRows(inputData);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('validateData', () => {
    it('should validate email format', async () => {
      const inputData: ParsedData = {
        headers: ['email'],
        rows: [
          { email: 'john@example.com' },
          { email: 'invalid-email' },
          { email: 'jane@company.org' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const issues = dataNormalizer.validateData(inputData);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.row).toBe(1);
      expect(issues[0]?.column).toBe('email');
      expect(issues[0]?.issue).toBe('Invalid email format');
      expect(issues[0]?.severity).toBe('error');
    });

    it('should detect leading/trailing whitespace', async () => {
      const inputData: ParsedData = {
        headers: ['name'],
        rows: [
          { name: '  John Doe  ' },
          { name: 'Jane Smith' },
          { name: 'Bob Wilson  ' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const issues = dataNormalizer.validateData(inputData);

      expect(issues).toHaveLength(2);
      expect(issues[0]?.issue).toBe('Leading or trailing whitespace');
      expect(issues[1]?.issue).toBe('Leading or trailing whitespace');
    });

    it('should detect unusually long text', async () => {
      const longText = 'a'.repeat(1500);
      const inputData: ParsedData = {
        headers: ['description'],
        rows: [
          { description: 'Normal text' },
          { description: longText }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const issues = dataNormalizer.validateData(inputData);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.issue).toBe('Unusually long text value');
      expect(issues[0]?.severity).toBe('info');
    });

    it('should validate number format', async () => {
      const inputData: ParsedData = {
        headers: ['age'],
        rows: [
          { age: '30' },
          { age: 'not-a-number' },
          { age: '25' }
        ],
        metadata: { totalRows: 3, emptyRows: 0, duplicateRows: 0 }
      };

      const issues = dataNormalizer.validateData(inputData);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.issue).toBe('Expected numeric value');
      expect(issues[0]?.severity).toBe('warning');
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', async () => {
      const inputData: ParsedData = {
        headers: [],
        rows: [],
        metadata: { totalRows: 0, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData);

      expect(result.normalizedData.headers).toEqual([]);
      expect(result.normalizedData.rows).toEqual([]);
      expect(result.qualityReport.totalRows).toBe(0);
    });

    it('should handle data with only headers', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email', 'department'],
        rows: [],
        metadata: { totalRows: 0, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData);

      expect(result.normalizedData.headers).toEqual(['name', 'email', 'department']);
      expect(result.normalizedData.rows).toEqual([]);
    });

    it('should handle all null data', async () => {
      const inputData: ParsedData = {
        headers: ['name', 'email'],
        rows: [
          { name: null, email: null },
          { name: null, email: null }
        ],
        metadata: { totalRows: 2, emptyRows: 0, duplicateRows: 0 }
      };

      const result = await dataNormalizer.normalizeData(inputData);

      expect(result.normalizedData.rows).toHaveLength(0); // Should be removed as empty rows
      expect(result.qualityReport.emptyRows).toBe(2);
    });

    it('should handle very large datasets efficiently', async () => {
      const rows = [];
      for (let i = 0; i < 1000; i++) {
        rows.push({
          name: `User${i}`,
          email: `user${i}@example.com`,
          age: String(20 + (i % 50))
        });
      }

      const inputData: ParsedData = {
        headers: ['name', 'email', 'age'],
        rows,
        metadata: { totalRows: 1000, emptyRows: 0, duplicateRows: 0 }
      };

      const startTime = Date.now();
      const result = await dataNormalizer.normalizeData(inputData, { convertDataTypes: true });
      const endTime = Date.now();

      expect(result.normalizedData.rows).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});