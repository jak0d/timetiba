import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { ParsedData, ExcelParseOptions, ExcelParseResult, ExcelSheetInfo } from '../../types/import';

export class ExcelParser {
  /**
   * Parse Excel file with sheet selection support
   */
  async parseExcel(filePath: string, options: ExcelParseOptions = {}): Promise<ExcelParseResult> {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get available sheets
      const availableSheets = workbook.SheetNames;
      
      if (availableSheets.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      // Determine which sheet to parse
      let sheetName: string;
      if (options.sheetName && availableSheets.includes(options.sheetName)) {
        sheetName = options.sheetName;
      } else if (options.sheetIndex !== undefined && options.sheetIndex < availableSheets.length && availableSheets[options.sheetIndex]) {
        sheetName = availableSheets[options.sheetIndex]!;
      } else {
        sheetName = availableSheets[0]!; // Default to first sheet
      }

      // Parse the selected sheet
      const parseResult = await this.parseSheet(workbook, sheetName, options);

      return {
        ...parseResult,
        metadata: {
          ...parseResult.metadata,
          sheetName,
          availableSheets
        }
      };
    } catch (error) {
      throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get information about all sheets in the Excel file
   */
  async getSheetInfo(filePath: string): Promise<ExcelSheetInfo[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      
      return workbook.SheetNames.map((name, index) => {
        const sheet = workbook.Sheets[name];
        const range = XLSX.utils.decode_range(sheet?.['!ref'] || 'A1:A1');
        
        return {
          name,
          index,
          rowCount: range.e.r + 1,
          columnCount: range.e.c + 1
        };
      });
    } catch (error) {
      throw new Error(`Failed to get sheet info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a specific sheet from the workbook
   */
  private async parseSheet(workbook: XLSX.WorkBook, sheetName: string, options: ExcelParseOptions): Promise<ParsedData> {
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Convert sheet to JSON - always use array format to handle headers manually
    const sheetToJsonOptions: any = {
      header: 1, // Always use first row as header to get consistent structure
      defval: null, // Default value for empty cells
      raw: false // Convert values to strings for consistency
    };
    
    if (options.range) {
      sheetToJsonOptions.range = options.range;
    }
    
    const jsonData = XLSX.utils.sheet_to_json(sheet, sheetToJsonOptions);

    // Process the data
    let headers: string[] = [];
    let rows: Record<string, any>[] = [];
    let totalRows = 0;
    let emptyRows = 0;
    const duplicateRows = new Set<string>();
    const seenRows = new Set<string>();

    if (jsonData.length === 0) {
      return {
        headers: [],
        rows: [],
        metadata: {
          totalRows: 0,
          emptyRows: 0,
          duplicateRows: 0,
          sheetName
        }
      };
    }

    // Handle headers
    if (options.headers !== false) {
      if (jsonData.length > 0) {
        // First row contains headers
        const firstRow = jsonData[0] as Record<string, any>;
        const headerValues = Object.values(firstRow).map(val => String(val || ''));
        headers = this.normalizeHeaders(headerValues);
        
        // Process data rows (skip first row which contains headers)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          totalRows++;
          
          // Create normalized row object
          const normalizedRow: Record<string, any> = {};
          if (typeof row === 'object' && row !== null) {
            const values = Object.values(row as Record<string, any>);
            headers.forEach((header, index) => {
              normalizedRow[header] = values[index] || null;
            });
          }

          // Check for empty rows
          const values = Object.values(normalizedRow);
          const isEmpty = values.every(value => 
            value === null || value === undefined || String(value).trim() === ''
          );
          
          if (isEmpty) {
            emptyRows++;
            if (options.skipEmptyLines !== false) {
              continue;
            }
          }

          // Check for duplicates
          const rowString = JSON.stringify(normalizedRow);
          if (seenRows.has(rowString)) {
            duplicateRows.add(rowString);
          } else {
            seenRows.add(rowString);
          }

          // Clean and normalize data
          const cleanedData = this.cleanRowData(normalizedRow);
          rows.push(cleanedData);
        }
      }
    } else {
      // No headers, treat all rows as data
      headers = [];
      
      for (const row of jsonData) {
        totalRows++;
        
        // Convert to proper object with column indices
        const rowObject: Record<string, any> = {};
        if (typeof row === 'object' && row !== null) {
          const values = Object.values(row as Record<string, any>);
          values.forEach((value, index) => {
            rowObject[`column_${index}`] = value;
          });
        }

        // Check for empty rows
        const values = Object.values(rowObject);
        const isEmpty = values.every(value => 
          value === null || value === undefined || String(value).trim() === ''
        );
        
        if (isEmpty) {
          emptyRows++;
          if (options.skipEmptyLines !== false) {
            continue;
          }
        }

        // Check for duplicates
        const rowString = JSON.stringify(rowObject);
        if (seenRows.has(rowString)) {
          duplicateRows.add(rowString);
        } else {
          seenRows.add(rowString);
        }

        // Clean and normalize data
        const cleanedData = this.cleanRowData(rowObject);
        rows.push(cleanedData);
      }
    }

    return {
      headers,
      rows,
      metadata: {
        totalRows,
        emptyRows,
        duplicateRows: duplicateRows.size,
        sheetName
      }
    };
  }

  /**
   * Normalize column headers
   */
  private normalizeHeaders(headers: string[]): string[] {
    return headers.map(header => {
      if (!header) return '';
      
      return String(header)
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, '_')    // Replace spaces with underscores
        .replace(/_{2,}/g, '_')  // Replace multiple underscores with single
        .replace(/^_|_$/g, '');  // Remove leading/trailing underscores
    });
  }

  /**
   * Clean and normalize row data
   */
  private cleanRowData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      let cleanedValue = value;
      
      if (typeof value === 'string') {
        // Trim whitespace
        cleanedValue = value.trim();
        
        // Handle empty strings
        if (cleanedValue === '') {
          cleanedValue = null;
        }
        
        // Handle common null representations
        if (['null', 'NULL', 'n/a', 'N/A', 'na', 'NA', '-', ''].includes(cleanedValue)) {
          cleanedValue = null;
        }
      }
      
      // Handle Excel date serial numbers
      if (typeof value === 'number' && this.isExcelDate(value)) {
        cleanedValue = this.excelDateToJSDate(value).toISOString();
      }
      
      cleaned[key] = cleanedValue;
    }
    
    return cleaned;
  }

  /**
   * Check if a number might be an Excel date serial number
   */
  private isExcelDate(value: number): boolean {
    // Excel dates are typically between 1 (1900-01-01) and 50000+ (modern dates)
    // This is a simple heuristic - in practice you might want more sophisticated detection
    return value > 1 && value < 100000 && Number.isInteger(value);
  }

  /**
   * Convert Excel date serial number to JavaScript Date
   */
  private excelDateToJSDate(serial: number): Date {
    // Excel's epoch is 1900-01-01, but it incorrectly treats 1900 as a leap year
    // JavaScript's epoch is 1970-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
    
    // Adjust for Excel's leap year bug
    if (serial > 59) {
      jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return jsDate;
  }

  /**
   * Validate Excel file structure
   */
  async validateExcelStructure(filePath: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      if (!fs.existsSync(filePath)) {
        errors.push('File does not exist');
        return { isValid: false, errors };
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        errors.push('File is empty');
        return { isValid: false, errors };
      }

      // Try to read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        errors.push('No sheets found in Excel file');
        return { isValid: false, errors };
      }

      // Validate first sheet has some content
      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const firstSheet = workbook.Sheets[firstSheetName];
        if (!firstSheet || !firstSheet['!ref']) {
          errors.push('First sheet appears to be empty');
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Get preview data from Excel file (first few rows)
   */
  async getPreviewData(filePath: string, options: ExcelParseOptions & { maxRows?: number } = {}): Promise<{
    headers: string[];
    previewRows: Record<string, any>[];
    totalSheets: number;
    sheetNames: string[];
  }> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      // Determine which sheet to preview
      let sheetName: string;
      if (options.sheetName && sheetNames.includes(options.sheetName)) {
        sheetName = options.sheetName;
      } else if (options.sheetIndex !== undefined && options.sheetIndex < sheetNames.length && sheetNames[options.sheetIndex]) {
        sheetName = sheetNames[options.sheetIndex]!;
      } else {
        sheetName = sheetNames[0]!;
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }
      
      const maxRows = options.maxRows || 10;

      // Get limited data for preview
      const sheetToJsonOptions: any = {
        header: 1, // Always use first row as header to get consistent structure
        defval: null,
        raw: false
      };
      
      if (options.range) {
        sheetToJsonOptions.range = options.range;
      }
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, sheetToJsonOptions);

      let headers: string[] = [];

      if (jsonData.length > 0 && options.headers !== false) {
        const firstRow = jsonData[0] as Record<string, any>;
        const headerValues = Object.values(firstRow).map(val => String(val || ''));
        headers = this.normalizeHeaders(headerValues);
      }

      const dataStartIndex = options.headers !== false ? 1 : 0;
      const dataRows = jsonData.slice(dataStartIndex, dataStartIndex + maxRows);
      
      const previewRows = dataRows.map(row => {
        const normalizedRow: Record<string, any> = {};
        if (typeof row === 'object' && row !== null) {
          const values = Object.values(row as Record<string, any>);
          if (headers.length > 0) {
            headers.forEach((header, index) => {
              normalizedRow[header] = values[index] || null;
            });
          } else {
            values.forEach((value, index) => {
              normalizedRow[`column_${index}`] = value;
            });
          }
        }
        return this.cleanRowData(normalizedRow);
      });

      return {
        headers,
        previewRows,
        totalSheets: sheetNames.length,
        sheetNames
      };
    } catch (error) {
      throw new Error(`Failed to get preview data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}