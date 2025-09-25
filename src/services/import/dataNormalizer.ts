import { ParsedData } from '../../types/import';

export interface DataNormalizationOptions {
  trimWhitespace?: boolean;
  removeEmptyRows?: boolean;
  removeDuplicateRows?: boolean;
  normalizeHeaders?: boolean;
  convertDataTypes?: boolean;
  handleNullValues?: boolean;
  customNullValues?: string[];
}

export interface DataNormalizationResult {
  normalizedData: ParsedData;
  transformationLog: DataTransformation[];
  qualityReport: DataQualityReport;
}

export interface DataTransformation {
  type: TransformationType;
  description: string;
  rowsAffected: number;
  details?: any;
}

export enum TransformationType {
  HEADER_NORMALIZATION = 'header_normalization',
  WHITESPACE_TRIMMING = 'whitespace_trimming',
  EMPTY_ROW_REMOVAL = 'empty_row_removal',
  DUPLICATE_ROW_REMOVAL = 'duplicate_row_removal',
  DATA_TYPE_CONVERSION = 'data_type_conversion',
  NULL_VALUE_HANDLING = 'null_value_handling',
  SPECIAL_CHARACTER_CLEANING = 'special_character_cleaning'
}

export interface DataQualityReport {
  totalRows: number;
  validRows: number;
  emptyRows: number;
  duplicateRows: number;
  nullValues: number;
  dataTypeIssues: number;
  qualityScore: number; // 0-100
  recommendations: string[];
}

export interface DetectedDataType {
  column: string;
  detectedType: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'url';
  confidence: number;
  samples: any[];
}

export class DataNormalizer {
  private static readonly DEFAULT_NULL_VALUES = [
    '', 'null', 'NULL', 'nil', 'NIL', 'n/a', 'N/A', 'na', 'NA', 
    'none', 'NONE', 'undefined', 'UNDEFINED', '-', '--', '---',
    'empty', 'EMPTY', 'blank', 'BLANK'
  ];

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PHONE_REGEX = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
  private static readonly URL_REGEX = /^https?:\/\/.+/;
  private static readonly DATE_PATTERNS = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    /^\d{1,2}-\d{1,2}-\d{4}$/ // M-D-YYYY
  ];

  /**
   * Normalize and clean parsed data
   */
  async normalizeData(data: ParsedData, options: DataNormalizationOptions = {}): Promise<DataNormalizationResult> {
    const transformationLog: DataTransformation[] = [];
    let normalizedData = { ...data };
    
    // Set default options
    const opts: Required<DataNormalizationOptions> = {
      trimWhitespace: options.trimWhitespace !== false,
      removeEmptyRows: options.removeEmptyRows !== false,
      removeDuplicateRows: options.removeDuplicateRows !== false,
      normalizeHeaders: options.normalizeHeaders !== false,
      convertDataTypes: options.convertDataTypes !== false,
      handleNullValues: options.handleNullValues !== false,
      customNullValues: options.customNullValues || []
    };

    // 1. Normalize headers
    if (opts.normalizeHeaders && normalizedData.headers.length > 0) {
      const originalHeaders = [...normalizedData.headers];
      normalizedData.headers = this.normalizeHeaders(normalizedData.headers);
      
      // Update row keys to match normalized headers
      normalizedData.rows = normalizedData.rows.map(row => {
        const normalizedRow: Record<string, any> = {};
        originalHeaders.forEach((originalHeader, index) => {
          const normalizedHeader = normalizedData.headers[index];
          if (normalizedHeader) {
            normalizedRow[normalizedHeader] = row[originalHeader];
          }
        });
        return normalizedRow;
      });

      transformationLog.push({
        type: TransformationType.HEADER_NORMALIZATION,
        description: 'Normalized column headers for consistency',
        rowsAffected: 0,
        details: { originalHeaders, normalizedHeaders: normalizedData.headers }
      });
    }

    // 2. Handle null values
    if (opts.handleNullValues) {
      const nullValues = [...DataNormalizer.DEFAULT_NULL_VALUES, ...opts.customNullValues];
      let nullsHandled = 0;
      
      normalizedData.rows = normalizedData.rows.map(row => {
        const cleanedRow: Record<string, any> = {};
        let rowNullsHandled = 0;
        
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && nullValues.includes(value.trim())) {
            cleanedRow[key] = null;
            rowNullsHandled++;
          } else {
            cleanedRow[key] = value;
          }
        }
        
        nullsHandled += rowNullsHandled;
        return cleanedRow;
      });

      if (nullsHandled > 0) {
        transformationLog.push({
          type: TransformationType.NULL_VALUE_HANDLING,
          description: 'Converted null-like values to proper null values',
          rowsAffected: nullsHandled,
          details: { nullValues }
        });
      }
    }

    // 3. Trim whitespace
    if (opts.trimWhitespace) {
      let trimmedValues = 0;
      
      normalizedData.rows = normalizedData.rows.map(row => {
        const trimmedRow: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== value) {
              trimmedValues++;
            }
            trimmedRow[key] = trimmed || null;
          } else {
            trimmedRow[key] = value;
          }
        }
        
        return trimmedRow;
      });

      if (trimmedValues > 0) {
        transformationLog.push({
          type: TransformationType.WHITESPACE_TRIMMING,
          description: 'Trimmed whitespace from string values',
          rowsAffected: trimmedValues,
        });
      }
    }

    // 4. Remove empty rows
    if (opts.removeEmptyRows) {
      const originalRowCount = normalizedData.rows.length;
      
      normalizedData.rows = normalizedData.rows.filter(row => {
        const values = Object.values(row);
        return !values.every(value => 
          value === null || value === undefined || 
          (typeof value === 'string' && value.trim() === '')
        );
      });

      const removedRows = originalRowCount - normalizedData.rows.length;
      if (removedRows > 0) {
        normalizedData.metadata.emptyRows = (normalizedData.metadata.emptyRows || 0) + removedRows;
        
        transformationLog.push({
          type: TransformationType.EMPTY_ROW_REMOVAL,
          description: 'Removed empty rows',
          rowsAffected: removedRows
        });
      }
    }

    // 5. Remove duplicate rows
    if (opts.removeDuplicateRows) {
      const originalRowCount = normalizedData.rows.length;
      const seenRows = new Set<string>();
      const uniqueRows: Record<string, any>[] = [];
      
      for (const row of normalizedData.rows) {
        const rowString = JSON.stringify(row);
        if (!seenRows.has(rowString)) {
          seenRows.add(rowString);
          uniqueRows.push(row);
        }
      }

      const removedDuplicates = originalRowCount - uniqueRows.length;
      if (removedDuplicates > 0) {
        normalizedData.rows = uniqueRows;
        normalizedData.metadata.duplicateRows = removedDuplicates;
        
        transformationLog.push({
          type: TransformationType.DUPLICATE_ROW_REMOVAL,
          description: 'Removed duplicate rows',
          rowsAffected: removedDuplicates
        });
      }
    }

    // 6. Convert data types
    if (opts.convertDataTypes) {
      const dataTypes = this.detectDataTypes(normalizedData);
      let conversionsApplied = 0;
      
      normalizedData.rows = normalizedData.rows.map(row => {
        const convertedRow: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(row)) {
          const dataType = dataTypes.find(dt => dt.column === key);
          if (dataType && value !== null && value !== undefined) {
            const converted = this.convertValue(value, dataType.detectedType);
            if (converted !== value) {
              conversionsApplied++;
            }
            convertedRow[key] = converted;
          } else {
            convertedRow[key] = value;
          }
        }
        
        return convertedRow;
      });

      if (conversionsApplied > 0) {
        transformationLog.push({
          type: TransformationType.DATA_TYPE_CONVERSION,
          description: 'Applied automatic data type conversions',
          rowsAffected: conversionsApplied,
          details: { detectedTypes: dataTypes }
        });
      }
    }

    // Generate quality report (use original data for accurate counts)
    const qualityReport = this.generateQualityReport(data, transformationLog);

    return {
      normalizedData,
      transformationLog,
      qualityReport
    };
  }

  /**
   * Detect data types for each column
   */
  detectDataTypes(data: ParsedData): DetectedDataType[] {
    const detectedTypes: DetectedDataType[] = [];
    
    for (const header of data.headers) {
      const columnValues = data.rows
        .map(row => row[header])
        .filter(value => value !== null && value !== undefined && value !== '');
      
      if (columnValues.length === 0) {
        detectedTypes.push({
          column: header,
          detectedType: 'string',
          confidence: 0,
          samples: []
        });
        continue;
      }

      const samples = columnValues.slice(0, 10); // Sample first 10 values
      const typeScores = {
        string: 0,
        number: 0,
        date: 0,
        boolean: 0,
        email: 0,
        phone: 0,
        url: 0
      };

      for (const value of columnValues) {
        const strValue = String(value);
        
        // Check for email
        if (DataNormalizer.EMAIL_REGEX.test(strValue)) {
          typeScores.email++;
          continue;
        }
        
        // Check for phone (only if it contains formatting characters and doesn't look like a date)
        if ((strValue.includes('-') || strValue.includes('(') || strValue.includes(' ')) && 
            !DataNormalizer.DATE_PATTERNS.some(pattern => pattern.test(strValue)) &&
            DataNormalizer.PHONE_REGEX.test(strValue)) {
          typeScores.phone++;
          continue;
        }
        
        // Check for URL
        if (DataNormalizer.URL_REGEX.test(strValue)) {
          typeScores.url++;
          continue;
        }
        
        // Check for boolean
        if (['true', 'false', 'yes', 'no', '1', '0', 'TRUE', 'FALSE', 'YES', 'NO'].includes(strValue)) {
          typeScores.boolean++;
          continue;
        }
        
        // Check for number (but not if it looks like a date)
        if (!isNaN(Number(strValue)) && strValue.trim() !== '' && 
            !DataNormalizer.DATE_PATTERNS.some(pattern => pattern.test(strValue))) {
          typeScores.number++;
          continue;
        }
        
        // Check for date
        if (DataNormalizer.DATE_PATTERNS.some(pattern => pattern.test(strValue)) || 
            !isNaN(Date.parse(strValue))) {
          typeScores.date++;
          continue;
        }
        
        // Default to string
        typeScores.string++;
      }

      // Determine the most likely type
      const totalValues = columnValues.length;
      const bestType = Object.entries(typeScores).reduce((best, [type, score]) => 
        score > best.score ? { type: type as keyof typeof typeScores, score } : best,
        { type: 'string' as keyof typeof typeScores, score: 0 }
      );

      detectedTypes.push({
        column: header,
        detectedType: bestType.type,
        confidence: totalValues > 0 ? bestType.score / totalValues : 0,
        samples
      });
    }

    return detectedTypes;
  }

  /**
   * Convert a value to the specified data type
   */
  private convertValue(value: any, targetType: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    const strValue = String(value);

    try {
      switch (targetType) {
        case 'number':
          const num = Number(strValue);
          return isNaN(num) ? value : num;
          
        case 'boolean':
          const lower = strValue.toLowerCase();
          if (['true', 'yes', '1'].includes(lower)) return true;
          if (['false', 'no', '0'].includes(lower)) return false;
          return value;
          
        case 'date':
          const date = new Date(strValue);
          return isNaN(date.getTime()) ? value : date.toISOString();
          
        case 'email':
        case 'phone':
        case 'url':
        case 'string':
        default:
          return strValue;
      }
    } catch (error) {
      return value; // Return original value if conversion fails
    }
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
   * Generate data quality report
   */
  private generateQualityReport(data: ParsedData, _transformations: DataTransformation[]): DataQualityReport {
    const totalRows = data.rows.length;
    let nullValues = 0;
    let dataTypeIssues = 0;
    
    // Count null values and data type issues
    for (const row of data.rows) {
      for (const value of Object.values(row)) {
        if (value === null || value === undefined) {
          nullValues++;
        }
      }
    }

    // Calculate quality score (0-100)
    const emptyRows = data.metadata.emptyRows || 0;
    const duplicateRows = data.metadata.duplicateRows || 0;
    
    let qualityScore = 100;
    
    if (totalRows > 0) {
      // Deduct points for issues
      qualityScore -= Math.min(30, (emptyRows / totalRows) * 100); // Max 30 points for empty rows
      qualityScore -= Math.min(20, (duplicateRows / totalRows) * 100); // Max 20 points for duplicates
      qualityScore -= Math.min(25, (nullValues / (totalRows * data.headers.length)) * 100); // Max 25 points for nulls
      qualityScore -= Math.min(25, (dataTypeIssues / (totalRows * data.headers.length)) * 100); // Max 25 points for type issues
    }

    qualityScore = Math.max(0, Math.round(qualityScore));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (emptyRows > 0) {
      recommendations.push(`Consider removing ${emptyRows} empty rows to improve data quality`);
    }
    
    if (duplicateRows > 0) {
      recommendations.push(`Found ${duplicateRows} duplicate rows that should be reviewed`);
    }
    
    if (nullValues > totalRows * data.headers.length * 0.1) {
      recommendations.push('High number of null values detected - consider data validation at source');
    }
    
    if (qualityScore < 70) {
      recommendations.push('Data quality is below recommended threshold - manual review suggested');
    }

    return {
      totalRows,
      validRows: totalRows - emptyRows,
      emptyRows,
      duplicateRows,
      nullValues,
      dataTypeIssues,
      qualityScore,
      recommendations
    };
  }

  /**
   * Find and report duplicate rows with details
   */
  findDuplicateRows(data: ParsedData): Array<{
    rowIndices: number[];
    rowData: Record<string, any>;
    count: number;
  }> {
    const duplicateGroups = new Map<string, number[]>();
    
    data.rows.forEach((row, index) => {
      const rowString = JSON.stringify(row);
      if (!duplicateGroups.has(rowString)) {
        duplicateGroups.set(rowString, []);
      }
      duplicateGroups.get(rowString)!.push(index);
    });

    return Array.from(duplicateGroups.entries())
      .filter(([, indices]) => indices.length > 1)
      .map(([rowString, indices]) => ({
        rowIndices: indices,
        rowData: JSON.parse(rowString),
        count: indices.length
      }));
  }

  /**
   * Validate data against common patterns and rules
   */
  validateData(data: ParsedData): Array<{
    row: number;
    column: string;
    issue: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
  }> {
    const issues: Array<{
      row: number;
      column: string;
      issue: string;
      severity: 'error' | 'warning' | 'info';
      suggestion?: string;
    }> = [];

    const dataTypes = this.detectDataTypes(data);

    data.rows.forEach((row, rowIndex) => {
      for (const [column, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
          continue; // Skip null values
        }

        const strValue = String(value);
        const dataType = dataTypes.find(dt => dt.column === column);

        // Validate based on detected data type
        if (dataType) {
          switch (dataType.detectedType) {
            case 'email':
              if (!DataNormalizer.EMAIL_REGEX.test(strValue)) {
                issues.push({
                  row: rowIndex,
                  column,
                  issue: 'Invalid email format',
                  severity: 'error',
                  suggestion: 'Ensure email follows format: user@domain.com'
                });
              }
              break;
              
            case 'number':
              if (isNaN(Number(strValue))) {
                issues.push({
                  row: rowIndex,
                  column,
                  issue: 'Expected numeric value',
                  severity: 'warning',
                  suggestion: 'Convert to number or verify data type'
                });
              }
              break;
              
            case 'date':
              if (isNaN(Date.parse(strValue))) {
                issues.push({
                  row: rowIndex,
                  column,
                  issue: 'Invalid date format',
                  severity: 'warning',
                  suggestion: 'Use standard date format (YYYY-MM-DD)'
                });
              }
              break;
          }
        }

        // Check for suspicious patterns
        if (strValue.length > 1000) {
          issues.push({
            row: rowIndex,
            column,
            issue: 'Unusually long text value',
            severity: 'info',
            suggestion: 'Verify if this is expected data'
          });
        }

        if (/^\s+|\s+$/.test(strValue)) {
          issues.push({
            row: rowIndex,
            column,
            issue: 'Leading or trailing whitespace',
            severity: 'info',
            suggestion: 'Consider trimming whitespace'
          });
        }
      }
    });

    return issues;
  }
}