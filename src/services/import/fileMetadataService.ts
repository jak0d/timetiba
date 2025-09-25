import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { temporaryStorage } from './temporaryStorage';
import { logger } from '../../utils/logger';

export interface FileMetadata {
  fileId: string;
  originalName: string;
  fileType: 'csv' | 'excel';
  size: number;
  detectedColumns: string[];
  normalizedColumns: string[];
  rowCount: number;
  previewData: any[][];
  encoding?: string;
  sheetNames?: string[];
  selectedSheet?: string;
  hasHeaders: boolean;
}

export interface ColumnInfo {
  originalName: string;
  normalizedName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: any[];
  nullCount: number;
}

export class FileMetadataService {
  private static instance: FileMetadataService;

  private constructor() {}

  public static getInstance(): FileMetadataService {
    if (!FileMetadataService.instance) {
      FileMetadataService.instance = new FileMetadataService();
    }
    return FileMetadataService.instance;
  }

  public async extractMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const storedFile = await temporaryStorage.getFile(fileId);
      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      const fileBuffer = await temporaryStorage.getFileBuffer(fileId);
      if (!fileBuffer) {
        throw new Error(`Could not read file: ${fileId}`);
      }

      const fileExtension = this.getFileExtension(storedFile.originalName);
      const fileType = this.determineFileType(fileExtension, storedFile.mimeType);

      let metadata: FileMetadata;

      if (fileType === 'csv') {
        metadata = await this.extractCSVMetadata(fileId, storedFile.originalName, fileBuffer, storedFile.size);
      } else {
        metadata = await this.extractExcelMetadata(fileId, storedFile.originalName, fileBuffer, storedFile.size);
      }

      logger.info(`File metadata extracted: ${storedFile.originalName}`, {
        fileId,
        fileType: metadata.fileType,
        columns: metadata.detectedColumns.length,
        rows: metadata.rowCount
      });

      return metadata;
    } catch (error) {
      logger.error(`Failed to extract metadata for file ${fileId}:`, error);
      throw error;
    }
  }

  private async extractCSVMetadata(
    fileId: string,
    originalName: string,
    fileBuffer: Buffer,
    size: number
  ): Promise<FileMetadata> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      let headers: string[] = [];
      let hasHeaders = true;

      const stream = Readable.from(fileBuffer.toString('utf8'));
      
      stream
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
          // Check if first row looks like headers (contains non-numeric values)
          hasHeaders = this.detectHeaders(headerList);
        })
        .on('data', (row: any) => {
          if (rows.length < 10) { // Only collect first 10 rows for preview
            rows.push(row);
          }
        })
        .on('end', () => {
          const detectedColumns = headers;
          const normalizedColumns = detectedColumns.map(col => this.normalizeColumnName(col));
          
          // Convert rows to array format for preview
          const previewData = rows.map(row => 
            detectedColumns.map(col => row[col] || '')
          );

          const metadata: FileMetadata = {
            fileId,
            originalName,
            fileType: 'csv',
            size,
            detectedColumns,
            normalizedColumns,
            rowCount: rows.length, // This is just preview count, not total
            previewData,
            hasHeaders,
            encoding: 'utf8', // Could be enhanced to detect encoding
          };

          resolve(metadata);
        })
        .on('error', (error: any) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });
    });
  }

  private async extractExcelMetadata(
    fileId: string,
    originalName: string,
    fileBuffer: Buffer,
    size: number
  ): Promise<FileMetadata> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      
      if (sheetNames.length === 0) {
        throw new Error('Excel file contains no sheets');
      }

      // Use first sheet by default
      const firstSheetName = sheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName!];
      
      if (!worksheet) {
        throw new Error(`Sheet "${firstSheetName}" not found`);
      }

      // Convert sheet to JSON to analyze structure
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Return array of arrays
        defval: '', // Default value for empty cells
        raw: false // Convert values to strings
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('Excel sheet is empty');
      }

      // Detect headers from first row
      const firstRow = jsonData[0] || [];
      const hasHeaders = this.detectHeaders(firstRow);
      
      let detectedColumns: string[];
      let dataStartIndex: number;

      if (hasHeaders) {
        detectedColumns = firstRow.map(col => String(col || '').trim());
        dataStartIndex = 1;
      } else {
        // Generate column names if no headers detected
        detectedColumns = firstRow.map((_, index) => `Column ${index + 1}`);
        dataStartIndex = 0;
      }

      const normalizedColumns = detectedColumns.map(col => this.normalizeColumnName(col));
      
      // Get preview data (first 10 data rows)
      const previewData = jsonData
        .slice(dataStartIndex, dataStartIndex + 10)
        .map(row => detectedColumns.map((_, index) => row[index] || ''));

      const metadata: FileMetadata = {
        fileId,
        originalName,
        fileType: 'excel',
        size,
        detectedColumns,
        normalizedColumns,
        rowCount: Math.max(0, jsonData.length - dataStartIndex), // Approximate row count
        previewData,
        hasHeaders,
        sheetNames,
        selectedSheet: firstSheetName!,
      };

      return metadata;
    } catch (error) {
      throw new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  private determineFileType(extension: string, mimeType: string): 'csv' | 'excel' {
    if (extension === 'csv' || mimeType.includes('csv')) {
      return 'csv';
    }
    if (['xlsx', 'xls'].includes(extension) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return 'excel';
    }
    throw new Error(`Unsupported file type: ${extension} (${mimeType})`);
  }

  private detectHeaders(firstRow: any[]): boolean {
    if (!firstRow || firstRow.length === 0) {
      return false;
    }

    // Check if first row contains mostly string values that look like headers
    const stringCount = firstRow.filter(cell => {
      const str = String(cell || '').trim();
      return str.length > 0 && isNaN(Number(str));
    }).length;

    // If more than half of the first row contains non-numeric values, assume headers
    return stringCount > firstRow.length / 2;
  }

  private normalizeColumnName(columnName: string): string {
    if (!columnName) {
      return '';
    }

    return columnName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  public async analyzeColumns(fileId: string, sheetName?: string): Promise<ColumnInfo[]> {
    try {
      const storedFile = await temporaryStorage.getFile(fileId);
      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      const fileBuffer = await temporaryStorage.getFileBuffer(fileId);
      if (!fileBuffer) {
        throw new Error(`Could not read file: ${fileId}`);
      }

      const fileExtension = this.getFileExtension(storedFile.originalName);
      const fileType = this.determineFileType(fileExtension, storedFile.mimeType);

      if (fileType === 'csv') {
        return this.analyzeCSVColumns(fileBuffer);
      } else {
        return this.analyzeExcelColumns(fileBuffer, sheetName);
      }
    } catch (error) {
      logger.error(`Failed to analyze columns for file ${fileId}:`, error);
      throw error;
    }
  }

  private async analyzeCSVColumns(fileBuffer: Buffer): Promise<ColumnInfo[]> {
    return new Promise((resolve, reject) => {
      const rows: any[] = [];
      let headers: string[] = [];

      const stream = Readable.from(fileBuffer.toString('utf8'));
      
      stream
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
        })
        .on('data', (row: any) => {
          if (rows.length < 100) { // Analyze first 100 rows
            rows.push(row);
          }
        })
        .on('end', () => {
          const columnInfo = headers.map(header => {
            const values = rows.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
            
            return {
              originalName: header,
              normalizedName: this.normalizeColumnName(header),
              dataType: this.detectDataType(values),
              sampleValues: values.slice(0, 5), // First 5 non-empty values
              nullCount: rows.length - values.length,
            };
          });

          resolve(columnInfo);
        })
        .on('error', (error: any) => {
          reject(new Error(`CSV analysis error: ${error.message}`));
        });
    });
  }

  private async analyzeExcelColumns(fileBuffer: Buffer, sheetName?: string): Promise<ColumnInfo[]> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const targetSheet = sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheet!];
      
      if (!worksheet) {
        throw new Error(`Sheet "${targetSheet}" not found`);
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false
      }) as any[][];

      if (jsonData.length === 0) {
        return [];
      }

      const firstRow = jsonData[0] || [];
      const hasHeaders = this.detectHeaders(firstRow);
      
      let headers: string[];
      let dataStartIndex: number;

      if (hasHeaders) {
        headers = firstRow.map(col => String(col || '').trim());
        dataStartIndex = 1;
      } else {
        headers = firstRow.map((_, index) => `Column ${index + 1}`);
        dataStartIndex = 0;
      }

      const dataRows = jsonData.slice(dataStartIndex, dataStartIndex + 100); // Analyze first 100 rows

      const columnInfo = headers.map((header, index) => {
        const values = dataRows
          .map(row => row[index])
          .filter(val => val !== null && val !== undefined && val !== '');
        
        return {
          originalName: header,
          normalizedName: this.normalizeColumnName(header),
          dataType: this.detectDataType(values),
          sampleValues: values.slice(0, 5),
          nullCount: dataRows.length - values.length,
        };
      });

      return columnInfo;
    } catch (error) {
      throw new Error(`Excel analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectDataType(values: any[]): 'string' | 'number' | 'date' | 'boolean' {
    if (values.length === 0) {
      return 'string';
    }

    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const value of values) {
      const str = String(value).trim();
      
      // Check for boolean
      if (['true', 'false', 'yes', 'no', '1', '0'].includes(str.toLowerCase())) {
        booleanCount++;
        continue;
      }

      // Check for number
      if (!isNaN(Number(str)) && str !== '') {
        numberCount++;
        continue;
      }

      // Check for date
      const date = new Date(str);
      if (!isNaN(date.getTime()) && str.match(/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/)) {
        dateCount++;
        continue;
      }
    }

    const total = values.length;
    
    // If more than 70% of values match a type, consider it that type
    if (numberCount / total > 0.7) return 'number';
    if (dateCount / total > 0.7) return 'date';
    if (booleanCount / total > 0.7) return 'boolean';
    
    return 'string';
  }
}

// Export singleton instance
export const fileMetadataService = FileMetadataService.getInstance();