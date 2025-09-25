import * as fs from 'fs';
import csv from 'csv-parser';
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';
import { ParsedData, CSVParseOptions, CSVParseResult } from '../../types/import';

export interface CSVDelimiterDetectionResult {
  delimiter: string;
  confidence: number;
}

export class CSVParser {
  private static readonly DEFAULT_DELIMITERS = [',', ';', '\t', '|'];
  private static readonly SUPPORTED_ENCODINGS = ['utf8', 'latin1', 'ascii', 'utf16le'];

  /**
   * Parse CSV file with automatic encoding detection
   */
  async parseCSV(filePath: string, options: CSVParseOptions = {}): Promise<CSVParseResult> {
    try {
      // Detect encoding
      const encoding = await this.detectEncoding(filePath);
      
      // Detect delimiter if not provided
      const delimiter = options.delimiter || await this.detectDelimiter(filePath, encoding);
      
      // Parse the CSV file
      const parseResult = await this.parseCSVWithOptions(filePath, {
        delimiter,
        encoding,
        headers: options.headers !== false,
        skipEmptyLines: options.skipEmptyLines !== false,
        strict: options.strict === true
      });

      return {
        ...parseResult,
        metadata: {
          ...parseResult.metadata,
          encoding,
          delimiter,
          detectedAutomatically: !options.delimiter
        }
      };
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect file encoding using chardet
   */
  private async detectEncoding(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const detected = chardet.detect(buffer);
    
    if (!detected) {
      return 'utf8'; // Default fallback
    }

    // Normalize encoding name
    const encoding = detected.toLowerCase();
    
    // Map common encoding variations
    const encodingMap: Record<string, string> = {
      'utf-8': 'utf8',
      'iso-8859-1': 'latin1',
      'windows-1252': 'latin1',
      'ascii': 'ascii',
      'utf-16le': 'utf16le'
    };

    const normalizedEncoding = encodingMap[encoding] || encoding;
    
    if (CSVParser.SUPPORTED_ENCODINGS.includes(normalizedEncoding)) {
      return normalizedEncoding;
    } else {
      return 'utf8'; // Safe fallback
    }
  }

  /**
   * Detect CSV delimiter by analyzing first few lines
   */
  private async detectDelimiter(filePath: string, encoding: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, encoding);
    const lines = content.split('\n').slice(0, 5); // Analyze first 5 lines
    
    const delimiterCounts: Record<string, number> = {};
    
    // Count occurrences of each delimiter
    for (const delimiter of CSVParser.DEFAULT_DELIMITERS) {
      delimiterCounts[delimiter] = 0;
      
      for (const line of lines) {
        if (line.trim()) {
          delimiterCounts[delimiter] += (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        }
      }
    }
    
    // Find delimiter with highest consistent count
    let bestDelimiter = ',';
    let maxCount = 0;
    
    for (const [delimiter, count] of Object.entries(delimiterCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }

  /**
   * Parse CSV file with specific options
   */
  private async parseCSVWithOptions(filePath: string, options: Required<CSVParseOptions>): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      let headers: string[] = [];
      let totalRows = 0;
      let emptyRows = 0;
      const duplicateRows = new Set<string>();
      const seenRows = new Set<string>();
      let isFirstRow = true;

      // Read file with proper encoding
      const buffer = fs.readFileSync(filePath);
      const content = iconv.decode(buffer, options.encoding);
      
      // Create readable stream from decoded content
      const stream = require('stream');
      const readable = new stream.Readable();
      readable.push(content);
      readable.push(null);

      readable
        .pipe(csv({
          separator: options.delimiter,
          headers: false // We'll handle headers manually
        }))
        .on('data', (data: string[]) => {
          if (isFirstRow && options.headers) {
            // First row contains headers
            headers = this.normalizeHeaders(Array.isArray(data) ? data : Object.values(data));
            isFirstRow = false;
            return;
          }
          
          isFirstRow = false;
          totalRows++;
          
          // Convert array to object using headers
          const rowObject: Record<string, any> = {};
          const dataArray = Array.isArray(data) ? data : Object.values(data);
          
          if (headers.length > 0) {
            headers.forEach((header, index) => {
              rowObject[header] = dataArray[index] || null;
            });
          } else {
            // If no headers, use index-based keys
            dataArray.forEach((value, index) => {
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
              return;
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
          results.push(cleanedData);
        })
        .on('end', () => {
          resolve({
            headers,
            rows: results,
            metadata: {
              totalRows,
              emptyRows,
              duplicateRows: duplicateRows.size,
              encoding: options.encoding
            }
          });
        })
        .on('error', (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });
    });
  }

  /**
   * Normalize column headers
   */
  private normalizeHeaders(headers: string[] | any): string[] {
    const headerArray = Array.isArray(headers) ? headers : Object.values(headers);
    
    return headerArray.map((header: any) => {
      if (!header) return '';
      
      const headerStr = String(header);
      return headerStr
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
      
      cleaned[key] = cleanedValue;
    }
    
    return cleaned;
  }

  /**
   * Validate CSV file structure
   */
  async validateCSVStructure(filePath: string): Promise<{ isValid: boolean; errors: string[] }> {
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

      // Try to parse first few lines to validate structure
      const encoding = await this.detectEncoding(filePath);
      const delimiter = await this.detectDelimiter(filePath, encoding);
      
      const buffer = fs.readFileSync(filePath);
      const content = iconv.decode(buffer, encoding);
      const lines = content.split('\n').slice(0, 10);
      
      if (lines.length === 0) {
        errors.push('No readable content found');
        return { isValid: false, errors };
      }

      // Check if first line looks like headers
      const firstLine = lines[0];
      if (!firstLine || firstLine.trim() === '') {
        errors.push('No header row found');
        return { isValid: false, errors };
      }

      // Check for consistent column count
      const headerCount = firstLine.split(delimiter).length;
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (line && line.trim()) {
          const columnCount = line.split(delimiter).length;
          if (columnCount !== headerCount) {
            errors.push(`Inconsistent column count at line ${i + 1}: expected ${headerCount}, got ${columnCount}`);
          }
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }
}