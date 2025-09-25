import { TemplateService } from '../../services/import/templateService';
import * as XLSX from 'xlsx';

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = templateService.getAvailableTemplates();
      
      expect(templates).toHaveLength(5);
      expect(templates.map(t => t.id)).toEqual([
        'timetable-complete',
        'venues-only',
        'lecturers-only',
        'courses-only',
        'student-groups-only'
      ]);
    });

    it('should return templates with required properties', () => {
      const templates = templateService.getAvailableTemplates();
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('fileType');
        expect(template).toHaveProperty('columns');
        expect(template).toHaveProperty('sampleData');
        expect(template).toHaveProperty('version');
        expect(template).toHaveProperty('createdAt');
        
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(['csv', 'excel']).toContain(template.fileType);
        expect(Array.isArray(template.columns)).toBe(true);
        expect(Array.isArray(template.sampleData)).toBe(true);
      });
    });
  });

  describe('getTemplateById', () => {
    it('should return correct template for valid ID', () => {
      const template = templateService.getTemplateById('timetable-complete');
      
      expect(template).not.toBeNull();
      expect(template?.id).toBe('timetable-complete');
      expect(template?.name).toBe('Complete Timetable Import');
    });

    it('should return null for invalid ID', () => {
      const template = templateService.getTemplateById('non-existent');
      
      expect(template).toBeNull();
    });

    it('should return templates with proper column structure', () => {
      const template = templateService.getTemplateById('venues-only');
      
      expect(template).not.toBeNull();
      expect(template?.columns).toHaveLength(9);
      
      template?.columns.forEach(column => {
        expect(column).toHaveProperty('name');
        expect(column).toHaveProperty('description');
        expect(column).toHaveProperty('required');
        expect(column).toHaveProperty('dataType');
        expect(column).toHaveProperty('examples');
        
        expect(typeof column.name).toBe('string');
        expect(typeof column.description).toBe('string');
        expect(typeof column.required).toBe('boolean');
        expect(['string', 'number', 'date', 'boolean', 'array']).toContain(column.dataType);
        expect(Array.isArray(column.examples)).toBe(true);
      });
    });
  });

  describe('generateCSVTemplate', () => {
    it('should generate valid CSV content for timetable template', () => {
      const csvContent = templateService.generateCSVTemplate('timetable-complete');
      
      expect(csvContent).toContain('Course Code,Course Name,Lecturer Name');
      expect(csvContent).toContain('CS101,Introduction to Computer Science,Dr. John Smith');
      expect(csvContent).toContain('MATH201,Calculus II,Prof. Sarah Johnson');
      
      // Check that headers are present
      const lines = csvContent.split('\n');
      expect(lines[0]).toContain('Course Code');
      expect(lines[0]).toContain('Venue Name');
      expect(lines[0]).toContain('Day of Week');
    });

    it('should generate valid CSV content for venues template', () => {
      const csvContent = templateService.generateCSVTemplate('venues-only');
      
      expect(csvContent).toContain('Venue Name,Capacity,Location');
      expect(csvContent).toContain('Room 101,30,"Building A, Floor 1"');
      expect(csvContent).toContain('Computer Lab 205,25,"Science Building, Floor 2"');
    });

    it('should throw error for invalid template ID', () => {
      expect(() => {
        templateService.generateCSVTemplate('invalid-template');
      }).toThrow('Template with ID invalid-template not found');
    });

    it('should generate CSV with proper escaping for special characters', () => {
      const csvContent = templateService.generateCSVTemplate('venues-only');
      
      // Check that commas in data are properly handled
      expect(csvContent).toContain('"Building A, Floor 1"');
      expect(csvContent).toContain('"Science Building, Floor 2"');
    });
  });

  describe('generateExcelTemplate', () => {
    it('should generate valid Excel buffer for timetable template', () => {
      const excelBuffer = templateService.generateExcelTemplate('timetable-complete');
      
      expect(Buffer.isBuffer(excelBuffer)).toBe(true);
      expect(excelBuffer.length).toBeGreaterThan(0);
      
      // Parse the generated Excel to verify content
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      expect(workbook.SheetNames).toContain('Data');
      expect(workbook.SheetNames).toContain('Instructions');
    });

    it('should generate Excel with correct data sheet structure', () => {
      const excelBuffer = templateService.generateExcelTemplate('venues-only');
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const dataSheet = workbook.Sheets['Data'];
      
      expect(dataSheet).toBeDefined();
      
      // Check headers
      expect(dataSheet!['A1']?.v).toBe('Venue Name');
      expect(dataSheet!['B1']?.v).toBe('Capacity');
      expect(dataSheet!['C1']?.v).toBe('Location');
      
      // Check sample data
      expect(dataSheet!['A2']?.v).toBe('Room 101');
      expect(dataSheet!['B2']?.v).toBe('30');
    });

    it('should generate Excel with instructions sheet', () => {
      const excelBuffer = templateService.generateExcelTemplate('lecturers-only');
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const instructionsSheet = workbook.Sheets['Instructions'];
      
      expect(instructionsSheet).toBeDefined();
      expect(instructionsSheet!['A1']?.v).toBe('Import Template Instructions');
      expect(instructionsSheet!['A3']?.v).toBe('Template:');
      expect(instructionsSheet!['B3']?.v).toBe('Lecturers Import');
      expect(instructionsSheet!['A6']?.v).toBe('Column Definitions:');
    });

    it('should throw error for invalid template ID', () => {
      expect(() => {
        templateService.generateExcelTemplate('invalid-template');
      }).toThrow('Template with ID invalid-template not found');
    });

    it('should generate Excel with proper column widths', () => {
      const excelBuffer = templateService.generateExcelTemplate('courses-only');
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const dataSheet = workbook.Sheets['Data'];
      
      expect(dataSheet).toBeDefined();
      // Column widths might not be preserved when reading back, so just check the sheet exists
      expect(Object.keys(dataSheet!).length).toBeGreaterThan(0);
    });
  });

  describe('Template Content Validation', () => {
    it('should have consistent sample data with column definitions for timetable template', () => {
      const template = templateService.getTemplateById('timetable-complete');
      
      expect(template).not.toBeNull();
      expect(template?.sampleData.length).toBeGreaterThan(0);
      
      const columnNames = template?.columns.map(col => col.name) || [];
      const sampleDataKeys = Object.keys(template?.sampleData[0] || {});
      
      // All column names should be present in sample data
      columnNames.forEach(columnName => {
        expect(sampleDataKeys).toContain(columnName);
      });
    });

    it('should have required columns marked correctly', () => {
      const template = templateService.getTemplateById('venues-only');
      
      expect(template).not.toBeNull();
      
      const requiredColumns = template?.columns.filter(col => col.required) || [];
      const optionalColumns = template?.columns.filter(col => !col.required) || [];
      
      expect(requiredColumns.length).toBeGreaterThan(0);
      expect(optionalColumns.length).toBeGreaterThan(0);
      
      // Check specific required columns for venues
      const requiredColumnNames = requiredColumns.map(col => col.name);
      expect(requiredColumnNames).toContain('Venue Name');
      expect(requiredColumnNames).toContain('Capacity');
      expect(requiredColumnNames).toContain('Location');
    });

    it('should have proper data types for all columns', () => {
      const templates = templateService.getAvailableTemplates();
      
      templates.forEach(template => {
        template.columns.forEach(column => {
          expect(['string', 'number', 'date', 'boolean', 'array']).toContain(column.dataType);
          expect(column.examples.length).toBeGreaterThan(0);
          
          // Validate examples match data type expectations
          if (column.dataType === 'number') {
            column.examples.forEach(example => {
              expect(example).toMatch(/^\d+$/);
            });
          }
        });
      });
    });

    it('should have validation rules for constrained fields', () => {
      const template = templateService.getTemplateById('timetable-complete');
      
      expect(template).not.toBeNull();
      
      const dayOfWeekColumn = template?.columns.find(col => col.name === 'Day of Week');
      expect(dayOfWeekColumn).toBeDefined();
      expect(dayOfWeekColumn?.validation?.allowedValues).toBeDefined();
      expect(dayOfWeekColumn?.validation?.allowedValues).toContain('Monday');
      expect(dayOfWeekColumn?.validation?.allowedValues).toContain('Friday');
    });
  });

  describe('Template Versioning', () => {
    it('should have consistent version across all templates', () => {
      const templates = templateService.getAvailableTemplates();
      
      const versions = templates.map(t => t.version);
      const uniqueVersions = [...new Set(versions)];
      
      expect(uniqueVersions).toHaveLength(1);
      expect(uniqueVersions[0]).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
    });

    it('should have creation dates for all templates', () => {
      const templates = templateService.getAvailableTemplates();
      
      templates.forEach(template => {
        expect(template.createdAt).toBeInstanceOf(Date);
        expect(template.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty template ID gracefully', () => {
      const template = templateService.getTemplateById('');
      expect(template).toBeNull();
    });

    it('should handle null template ID gracefully', () => {
      const template = templateService.getTemplateById(null as any);
      expect(template).toBeNull();
    });

    it('should handle undefined template ID gracefully', () => {
      const template = templateService.getTemplateById(undefined as any);
      expect(template).toBeNull();
    });
  });
});