import * as fs from 'fs';
import * as path from 'path';
import { CSVParser } from '../../services/import/csvParser';
import { CSVParseOptions } from '../../types/import';

describe('CSVParser', () => {
  let csvParser: CSVParser;
  let testFilesDir: string;

  beforeAll(() => {
    csvParser = new CSVParser();
    testFilesDir = path.join(__dirname, 'test-files');
    
    // Create test files directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up any existing test files
    if (fs.existsSync(testFilesDir)) {
      const files = fs.readdirSync(testFilesDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testFilesDir, file));
      });
    }
  });

  describe('parseCSV', () => {
    it('should parse a simple CSV file with comma delimiter', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,john@example.com,Computer Science\nJane Smith,jane@example.com,Mathematics';
      const filePath = path.join(testFilesDir, 'simple.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        department: 'Computer Science'
      });
      expect(result.metadata.totalRows).toBe(2);
      expect(result.metadata.delimiter).toBe(',');
      expect(result.metadata.encoding).toBeDefined();
    });

    it('should parse CSV with semicolon delimiter', async () => {
      const csvContent = 'Name;Email;Department\nJohn Doe;john@example.com;Computer Science\nJane Smith;jane@example.com;Mathematics';
      const filePath = path.join(testFilesDir, 'semicolon.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.metadata.delimiter).toBe(';');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.['name']).toBe('John Doe');
    });

    it('should parse CSV with tab delimiter', async () => {
      const csvContent = 'Name\tEmail\tDepartment\nJohn Doe\tjohn@example.com\tComputer Science\nJane Smith\tjane@example.com\tMathematics';
      const filePath = path.join(testFilesDir, 'tab.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.metadata.delimiter).toBe('\t');
      expect(result.rows).toHaveLength(2);
    });

    it('should handle CSV with quoted fields containing delimiters', async () => {
      const csvContent = 'Name,Description,Department\n"John, Jr.","""Senior"" Developer",Computer Science\n"Jane Smith","Data Analyst, Senior",Mathematics';
      const filePath = path.join(testFilesDir, 'quoted.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.rows[0]?.['name']).toBe('John, Jr.');
      expect(result.rows[0]?.['description']).toBe('"Senior" Developer');
      expect(result.rows[1]?.['description']).toBe('Data Analyst, Senior');
    });

    it('should handle empty rows and clean data', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,john@example.com,Computer Science\n\n  ,  ,  \nJane Smith,jane@example.com,Mathematics\n';
      const filePath = path.join(testFilesDir, 'empty-rows.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.rows).toHaveLength(2); // Empty rows should be skipped
      expect(result.metadata.emptyRows).toBe(2);
      expect(result.rows[0]?.['name']).toBe('John Doe');
      expect(result.rows[1]?.['name']).toBe('Jane Smith');
    });

    it('should detect and handle duplicate rows', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,john@example.com,Computer Science\nJane Smith,jane@example.com,Mathematics\nJohn Doe,john@example.com,Computer Science';
      const filePath = path.join(testFilesDir, 'duplicates.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.rows).toHaveLength(3); // All rows included, but duplicates tracked
      expect(result.metadata.duplicateRows).toBe(1);
    });

    it('should normalize column headers', async () => {
      const csvContent = 'Full Name!,E-mail Address,Department & Faculty\nJohn Doe,john@example.com,Computer Science';
      const filePath = path.join(testFilesDir, 'special-headers.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.headers).toEqual(['full_name', 'email_address', 'department_faculty']);
    });

    it('should handle null values and empty strings', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,,Computer Science\nJane Smith,jane@example.com,\n,null,N/A\nBob Wilson,bob@example.com,-';
      const filePath = path.join(testFilesDir, 'null-values.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.rows[0]?.['email']).toBeNull();
      expect(result.rows[1]?.['department']).toBeNull();
      expect(result.rows[2]?.['name']).toBeNull();
      expect(result.rows[2]?.['email']).toBeNull();
      expect(result.rows[2]?.['department']).toBeNull();
      expect(result.rows[3]?.['department']).toBeNull();
    });

    it('should respect custom parse options', async () => {
      const csvContent = 'Name;Email;Department\nJohn Doe;john@example.com;Computer Science';
      const filePath = path.join(testFilesDir, 'custom-options.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const options: CSVParseOptions = {
        delimiter: ';',
        encoding: 'utf8',
        headers: true,
        skipEmptyLines: true
      };

      const result = await csvParser.parseCSV(filePath, options);

      expect(result.metadata.delimiter).toBe(';');
      expect(result.metadata.detectedAutomatically).toBe(false);
    });

    it('should handle different encodings', async () => {
      // Create a file with Latin-1 encoding (ISO-8859-1)
      const csvContent = 'Name,Description\nJosé,Café owner\nMüller,Naïve approach';
      const filePath = path.join(testFilesDir, 'latin1.csv');
      
      // Write with Latin-1 encoding
      const buffer = Buffer.from(csvContent, 'latin1');
      fs.writeFileSync(filePath, buffer);

      const result = await csvParser.parseCSV(filePath);

      expect(result.rows).toHaveLength(2);
      expect(result.metadata.encoding).toBeDefined();
    });
  });

  describe('validateCSVStructure', () => {
    it('should validate a well-formed CSV file', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,john@example.com,Computer Science\nJane Smith,jane@example.com,Mathematics';
      const filePath = path.join(testFilesDir, 'valid.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.validateCSVStructure(filePath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty file', async () => {
      const filePath = path.join(testFilesDir, 'empty.csv');
      fs.writeFileSync(filePath, '', 'utf8');

      const result = await csvParser.validateCSVStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should detect missing file', async () => {
      const filePath = path.join(testFilesDir, 'nonexistent.csv');

      const result = await csvParser.validateCSVStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should detect inconsistent column counts', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,john@example.com,Computer Science\nJane Smith,jane@example.com'; // Missing department
      const filePath = path.join(testFilesDir, 'inconsistent.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.validateCSVStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Inconsistent column count'))).toBe(true);
    });

    it('should detect missing headers', async () => {
      const csvContent = '\nJohn Doe,john@example.com,Computer Science';
      const filePath = path.join(testFilesDir, 'no-headers.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.validateCSVStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No header row found');
    });
  });

  describe('edge cases', () => {
    it('should handle very large CSV files efficiently', async () => {
      // Create a large CSV file
      const headers = 'Name,Email,Department\n';
      let csvContent = headers;
      
      for (let i = 0; i < 1000; i++) {
        csvContent += `User${i},user${i}@example.com,Department${i % 10}\n`;
      }
      
      const filePath = path.join(testFilesDir, 'large.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const startTime = Date.now();
      const result = await csvParser.parseCSV(filePath);
      const endTime = Date.now();

      expect(result.rows).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle CSV with only headers', async () => {
      const csvContent = 'Name,Email,Department\n';
      const filePath = path.join(testFilesDir, 'headers-only.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(0);
      expect(result.metadata.totalRows).toBe(0);
    });

    it('should handle malformed CSV gracefully', async () => {
      const csvContent = 'Name,Email,Department\nJohn Doe,"unclosed quote,Computer Science\nJane Smith,jane@example.com,Mathematics';
      const filePath = path.join(testFilesDir, 'malformed.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      // Should not throw an error, but may have parsing issues
      await expect(csvParser.parseCSV(filePath)).resolves.toBeDefined();
    });

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csvContent = '\uFEFFName,Email,Department\nJohn Doe,john@example.com,Computer Science';
      const filePath = path.join(testFilesDir, 'bom.csv');
      fs.writeFileSync(filePath, csvContent, 'utf8');

      const result = await csvParser.parseCSV(filePath);

      expect(result.headers[0]).toBe('name'); // BOM should be handled
      expect(result.rows).toHaveLength(1);
    });
  });
});