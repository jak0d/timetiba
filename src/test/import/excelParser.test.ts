import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { ExcelParser } from '../../services/import/excelParser';
import { ExcelParseOptions } from '../../types/import';

describe('ExcelParser', () => {
  let excelParser: ExcelParser;
  let testFilesDir: string;

  beforeAll(() => {
    excelParser = new ExcelParser();
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
        if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
          fs.unlinkSync(path.join(testFilesDir, file));
        }
      });
    }
  });

  // Helper function to create test Excel files
  const createTestExcelFile = (filename: string, data: any[][], sheetName = 'Sheet1', additionalSheets?: { name: string; data: any[][] }[]) => {
    const workbook = XLSX.utils.book_new();
    
    // Add main sheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Add additional sheets if provided
    if (additionalSheets) {
      additionalSheets.forEach(sheet => {
        const ws = XLSX.utils.aoa_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
      });
    }
    
    const filePath = path.join(testFilesDir, filename);
    XLSX.writeFile(workbook, filePath);
    return filePath;
  };

  describe('parseExcel', () => {
    it('should parse a simple Excel file', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', 'Mathematics']
      ];
      
      const filePath = createTestExcelFile('simple.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        department: 'Computer Science'
      });
      expect(result.metadata.totalRows).toBe(2);
      expect(result.metadata.sheetName).toBe('Sheet1');
      expect(result.metadata.availableSheets).toEqual(['Sheet1']);
    });

    it('should parse Excel file with multiple sheets', async () => {
      const mainData = [
        ['Name', 'Email'],
        ['John Doe', 'john@example.com']
      ];
      
      const additionalSheets = [
        {
          name: 'Departments',
          data: [
            ['Department', 'Head'],
            ['Computer Science', 'Dr. Smith'],
            ['Mathematics', 'Dr. Johnson']
          ]
        }
      ];
      
      const filePath = createTestExcelFile('multiple-sheets.xlsx', mainData, 'Employees', additionalSheets);
      const result = await excelParser.parseExcel(filePath);

      expect(result.metadata.availableSheets).toEqual(['Employees', 'Departments']);
      expect(result.metadata.sheetName).toBe('Employees');
      expect(result.rows).toHaveLength(1);
    });

    it('should parse specific sheet by name', async () => {
      const mainData = [
        ['Name', 'Email'],
        ['John Doe', 'john@example.com']
      ];
      
      const additionalSheets = [
        {
          name: 'Departments',
          data: [
            ['Department', 'Head'],
            ['Computer Science', 'Dr. Smith'],
            ['Mathematics', 'Dr. Johnson']
          ]
        }
      ];
      
      const filePath = createTestExcelFile('multiple-sheets.xlsx', mainData, 'Employees', additionalSheets);
      
      const options: ExcelParseOptions = {
        sheetName: 'Departments'
      };
      
      const result = await excelParser.parseExcel(filePath, options);

      expect(result.metadata.sheetName).toBe('Departments');
      expect(result.headers).toEqual(['department', 'head']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.['department']).toBe('Computer Science');
    });

    it('should parse specific sheet by index', async () => {
      const mainData = [
        ['Name', 'Email'],
        ['John Doe', 'john@example.com']
      ];
      
      const additionalSheets = [
        {
          name: 'Departments',
          data: [
            ['Department', 'Head'],
            ['Computer Science', 'Dr. Smith']
          ]
        }
      ];
      
      const filePath = createTestExcelFile('multiple-sheets.xlsx', mainData, 'Employees', additionalSheets);
      
      const options: ExcelParseOptions = {
        sheetIndex: 1
      };
      
      const result = await excelParser.parseExcel(filePath, options);

      expect(result.metadata.sheetName).toBe('Departments');
      expect(result.rows).toHaveLength(1);
    });

    it('should handle empty rows and clean data', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['', '', ''],
        ['  ', '  ', '  '],
        ['Jane Smith', 'jane@example.com', 'Mathematics']
      ];
      
      const filePath = createTestExcelFile('empty-rows.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.rows).toHaveLength(2); // Empty rows should be skipped
      expect(result.metadata.emptyRows).toBe(2);
      expect(result.rows[0]?.['name']).toBe('John Doe');
      expect(result.rows[1]?.['name']).toBe('Jane Smith');
    });

    it('should detect and handle duplicate rows', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', 'Mathematics'],
        ['John Doe', 'john@example.com', 'Computer Science']
      ];
      
      const filePath = createTestExcelFile('duplicates.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.rows).toHaveLength(3); // All rows included, but duplicates tracked
      expect(result.metadata.duplicateRows).toBe(1);
    });

    it('should normalize column headers', async () => {
      const data = [
        ['Full Name!', 'E-mail Address', 'Department & Faculty'],
        ['John Doe', 'john@example.com', 'Computer Science']
      ];
      
      const filePath = createTestExcelFile('special-headers.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.headers).toEqual(['full_name', 'email_address', 'department_faculty']);
    });

    it('should handle null values and empty strings', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', '', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', ''],
        ['', 'null', 'N/A'],
        ['Bob Wilson', 'bob@example.com', '-']
      ];
      
      const filePath = createTestExcelFile('null-values.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.rows[0]?.['email']).toBeNull();
      expect(result.rows[1]?.['department']).toBeNull();
      expect(result.rows[2]?.['name']).toBeNull();
      expect(result.rows[2]?.['email']).toBeNull();
      expect(result.rows[2]?.['department']).toBeNull();
      expect(result.rows[3]?.['department']).toBeNull();
    });

    it('should respect custom parse options', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science']
      ];
      
      const filePath = createTestExcelFile('custom-options.xlsx', data);
      
      const options: ExcelParseOptions = {
        headers: true,
        skipEmptyLines: true
      };

      const result = await excelParser.parseExcel(filePath, options);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(1);
    });

    it('should handle Excel file without headers', async () => {
      const data = [
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', 'Mathematics']
      ];
      
      const filePath = createTestExcelFile('no-headers.xlsx', data);
      
      const options: ExcelParseOptions = {
        headers: false
      };

      const result = await excelParser.parseExcel(filePath, options);

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(2);
      expect(Object.keys(result.rows[0] || {})).toContain('column_0');
    });

    it('should handle range specification', async () => {
      const data = [
        ['Name', 'Email', 'Department', 'Extra'],
        ['John Doe', 'john@example.com', 'Computer Science', 'Data'],
        ['Jane Smith', 'jane@example.com', 'Mathematics', 'More Data'],
        ['Bob Wilson', 'bob@example.com', 'Physics', 'Even More']
      ];
      
      const filePath = createTestExcelFile('range-test.xlsx', data);
      
      const options: ExcelParseOptions = {
        range: 'A1:C4' // Only first 3 columns and 4 rows
      };

      const result = await excelParser.parseExcel(filePath, options);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).not.toHaveProperty('extra');
    });
  });

  describe('getSheetInfo', () => {
    it('should return information about all sheets', async () => {
      const mainData = [
        ['Name', 'Email'],
        ['John Doe', 'john@example.com'],
        ['Jane Smith', 'jane@example.com']
      ];
      
      const additionalSheets = [
        {
          name: 'Departments',
          data: [
            ['Department', 'Head'],
            ['Computer Science', 'Dr. Smith']
          ]
        }
      ];
      
      const filePath = createTestExcelFile('sheet-info.xlsx', mainData, 'Employees', additionalSheets);
      const sheetInfo = await excelParser.getSheetInfo(filePath);

      expect(sheetInfo).toHaveLength(2);
      expect(sheetInfo[0]).toEqual({
        name: 'Employees',
        index: 0,
        rowCount: 3,
        columnCount: 2
      });
      expect(sheetInfo[1]).toEqual({
        name: 'Departments',
        index: 1,
        rowCount: 2,
        columnCount: 2
      });
    });
  });

  describe('validateExcelStructure', () => {
    it('should validate a well-formed Excel file', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science']
      ];
      
      const filePath = createTestExcelFile('valid.xlsx', data);
      const result = await excelParser.validateExcelStructure(filePath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing file', async () => {
      const filePath = path.join(testFilesDir, 'nonexistent.xlsx');
      const result = await excelParser.validateExcelStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist');
    });

    it('should detect empty file', async () => {
      const filePath = path.join(testFilesDir, 'empty.xlsx');
      fs.writeFileSync(filePath, '');

      const result = await excelParser.validateExcelStructure(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });
  });

  describe('getPreviewData', () => {
    it('should return preview data with limited rows', async () => {
      const data = [
        ['Name', 'Email', 'Department'],
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', 'Mathematics'],
        ['Bob Wilson', 'bob@example.com', 'Physics'],
        ['Alice Brown', 'alice@example.com', 'Chemistry']
      ];
      
      const filePath = createTestExcelFile('preview.xlsx', data);
      const preview = await excelParser.getPreviewData(filePath, { maxRows: 2 });

      expect(preview.headers).toEqual(['name', 'email', 'department']);
      expect(preview.previewRows).toHaveLength(2);
      expect(preview.totalSheets).toBe(1);
      expect(preview.sheetNames).toEqual(['Sheet1']);
      expect(preview.previewRows[0]?.['name']).toBe('John Doe');
      expect(preview.previewRows[1]?.['name']).toBe('Jane Smith');
    });

    it('should handle multiple sheets in preview', async () => {
      const mainData = [
        ['Name', 'Email'],
        ['John Doe', 'john@example.com']
      ];
      
      const additionalSheets = [
        {
          name: 'Departments',
          data: [
            ['Department', 'Head'],
            ['Computer Science', 'Dr. Smith']
          ]
        }
      ];
      
      const filePath = createTestExcelFile('preview-multi.xlsx', mainData, 'Employees', additionalSheets);
      const preview = await excelParser.getPreviewData(filePath);

      expect(preview.totalSheets).toBe(2);
      expect(preview.sheetNames).toEqual(['Employees', 'Departments']);
    });
  });

  describe('edge cases', () => {
    it('should handle very large Excel files efficiently', async () => {
      // Create a large dataset
      const data = [['Name', 'Email', 'Department']];
      for (let i = 0; i < 1000; i++) {
        data.push([`User${i}`, `user${i}@example.com`, `Department${i % 10}`]);
      }
      
      const filePath = createTestExcelFile('large.xlsx', data);

      const startTime = Date.now();
      const result = await excelParser.parseExcel(filePath);
      const endTime = Date.now();

      expect(result.rows).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle Excel with only headers', async () => {
      const data = [['Name', 'Email', 'Department']];
      
      const filePath = createTestExcelFile('headers-only.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.headers).toEqual(['name', 'email', 'department']);
      expect(result.rows).toHaveLength(0);
      expect(result.metadata.totalRows).toBe(0);
    });

    it('should handle completely empty Excel file', async () => {
      const data: any[][] = [];
      
      const filePath = createTestExcelFile('completely-empty.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(0);
      expect(result.metadata.totalRows).toBe(0);
    });

    it('should handle Excel with mixed data types', async () => {
      const data = [
        ['Name', 'Age', 'Salary', 'Active'],
        ['John Doe', 30, 50000, true],
        ['Jane Smith', 25, 45000, false],
        ['Bob Wilson', 35, 60000, true]
      ];
      
      const filePath = createTestExcelFile('mixed-types.xlsx', data);
      const result = await excelParser.parseExcel(filePath);

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]?.['age']).toBe('30');
      expect(result.rows[0]?.['salary']).toBe('50000');
      expect(result.rows[0]?.['active']).toBe('TRUE');
    });
  });
});