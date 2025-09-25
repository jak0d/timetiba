import { FileMetadataService } from '../../services/import/fileMetadataService';
import { temporaryStorage } from '../../services/import/temporaryStorage';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('../../services/import/temporaryStorage', () => ({
  temporaryStorage: {
    getFile: jest.fn(),
    getFileBuffer: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FileMetadataService', () => {
  let service: FileMetadataService;
  const mockTemporaryStorage = temporaryStorage as jest.Mocked<typeof temporaryStorage>;

  beforeEach(() => {
    service = FileMetadataService.getInstance();
    jest.clearAllMocks();
  });

  describe('extractMetadata', () => {
    const mockStoredFile = {
      id: 'test-file-id',
      originalName: 'test.csv',
      fileName: 'test-file-id.csv',
      filePath: '/tmp/test-file-id.csv',
      size: 1024,
      mimeType: 'text/csv',
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('should extract metadata from CSV file', async () => {
      const csvContent = 'name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25';
      const csvBuffer = Buffer.from(csvContent);

      mockTemporaryStorage.getFile.mockResolvedValue(mockStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(csvBuffer);

      const metadata = await service.extractMetadata('test-file-id');

      expect(metadata).toEqual({
        fileId: 'test-file-id',
        originalName: 'test.csv',
        fileType: 'csv',
        size: 1024,
        detectedColumns: ['name', 'email', 'age'],
        normalizedColumns: ['name', 'email', 'age'],
        rowCount: 2,
        previewData: [
          ['John Doe', 'john@example.com', '30'],
          ['Jane Smith', 'jane@example.com', '25']
        ],
        hasHeaders: true,
        encoding: 'utf8',
      });
    });

    it('should extract metadata from Excel file', async () => {
      // Create a simple Excel workbook
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Name', 'Email', 'Age'],
        ['John Doe', 'john@example.com', 30],
        ['Jane Smith', 'jane@example.com', 25]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const excelStoredFile = {
        ...mockStoredFile,
        originalName: 'test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      mockTemporaryStorage.getFile.mockResolvedValue(excelStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(excelBuffer);

      const metadata = await service.extractMetadata('test-file-id');

      expect(metadata.fileType).toBe('excel');
      expect(metadata.detectedColumns).toEqual(['Name', 'Email', 'Age']);
      expect(metadata.normalizedColumns).toEqual(['name', 'email', 'age']);
      expect(metadata.hasHeaders).toBe(true);
      expect(metadata.sheetNames).toEqual(['Sheet1']);
      expect(metadata.selectedSheet).toBe('Sheet1');
      expect(metadata.previewData).toHaveLength(2);
    });

    it('should handle CSV without headers', async () => {
      const csvContent = '123,456,789\n111,222,333';
      const csvBuffer = Buffer.from(csvContent);

      mockTemporaryStorage.getFile.mockResolvedValue(mockStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(csvBuffer);

      const metadata = await service.extractMetadata('test-file-id');

      expect(metadata.hasHeaders).toBe(false);
      expect(metadata.detectedColumns).toEqual(['123', '456', '789']);
    });

    it('should normalize column names correctly', async () => {
      const csvContent = 'First Name,Email Address,Date of Birth,Is Active?\nJohn,john@example.com,1990-01-01,true';
      const csvBuffer = Buffer.from(csvContent);

      mockTemporaryStorage.getFile.mockResolvedValue(mockStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(csvBuffer);

      const metadata = await service.extractMetadata('test-file-id');

      expect(metadata.normalizedColumns).toEqual([
        'first_name',
        'email_address',
        'date_of_birth',
        'is_active'
      ]);
    });

    it('should throw error when file not found', async () => {
      mockTemporaryStorage.getFile.mockResolvedValue(null);

      await expect(service.extractMetadata('non-existent-id')).rejects.toThrow(
        'File not found: non-existent-id'
      );
    });

    it('should throw error when file buffer cannot be read', async () => {
      mockTemporaryStorage.getFile.mockResolvedValue(mockStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(null);

      await expect(service.extractMetadata('test-file-id')).rejects.toThrow(
        'Could not read file: test-file-id'
      );
    });

    it('should handle unsupported file types', async () => {
      const unsupportedFile = {
        ...mockStoredFile,
        originalName: 'test.txt',
        mimeType: 'text/plain',
      };

      mockTemporaryStorage.getFile.mockResolvedValue(unsupportedFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(Buffer.from('test content'));

      await expect(service.extractMetadata('test-file-id')).rejects.toThrow(
        'Unsupported file type: txt (text/plain)'
      );
    });
  });

  describe('analyzeColumns', () => {
    const mockStoredFile = {
      id: 'test-file-id',
      originalName: 'test.csv',
      fileName: 'test-file-id.csv',
      filePath: '/tmp/test-file-id.csv',
      size: 1024,
      mimeType: 'text/csv',
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('should analyze CSV columns with data types', async () => {
      const csvContent = [
        'name,age,salary,is_active,start_date',
        'John Doe,30,50000.50,true,2023-01-15',
        'Jane Smith,25,45000.00,false,2023-02-01',
        'Bob Johnson,35,60000.75,true,2023-01-10',
        'Alice Brown,28,,false,2023-03-01'
      ].join('\n');
      
      const csvBuffer = Buffer.from(csvContent);

      mockTemporaryStorage.getFile.mockResolvedValue(mockStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(csvBuffer);

      const columnInfo = await service.analyzeColumns('test-file-id');

      expect(columnInfo).toHaveLength(5);
      
      expect(columnInfo[0]).toEqual({
        originalName: 'name',
        normalizedName: 'name',
        dataType: 'string',
        sampleValues: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown'],
        nullCount: 0,
      });

      expect(columnInfo[1]).toEqual({
        originalName: 'age',
        normalizedName: 'age',
        dataType: 'number',
        sampleValues: ['30', '25', '35', '28'],
        nullCount: 0,
      });

      expect(columnInfo[2]).toEqual({
        originalName: 'salary',
        normalizedName: 'salary',
        dataType: 'number',
        sampleValues: ['50000.50', '45000.00', '60000.75'],
        nullCount: 1,
      });

      expect(columnInfo[3]).toEqual({
        originalName: 'is_active',
        normalizedName: 'is_active',
        dataType: 'boolean',
        sampleValues: ['true', 'false', 'true', 'false'],
        nullCount: 0,
      });

      expect(columnInfo[4]).toEqual({
        originalName: 'start_date',
        normalizedName: 'start_date',
        dataType: 'date',
        sampleValues: ['2023-01-15', '2023-02-01', '2023-01-10', '2023-03-01'],
        nullCount: 0,
      });
    });

    it('should analyze Excel columns', async () => {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Product', 'Price', 'In Stock'],
        ['Laptop', 999.99, 'yes'],
        ['Mouse', 29.99, 'no'],
        ['Keyboard', 79.99, 'yes']
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const excelStoredFile = {
        ...mockStoredFile,
        originalName: 'products.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      mockTemporaryStorage.getFile.mockResolvedValue(excelStoredFile);
      mockTemporaryStorage.getFileBuffer.mockResolvedValue(excelBuffer);

      const columnInfo = await service.analyzeColumns('test-file-id', 'Products');

      expect(columnInfo).toHaveLength(3);
      expect(columnInfo[0]?.originalName).toBe('Product');
      expect(columnInfo[0]?.dataType).toBe('string');
      expect(columnInfo[1]?.originalName).toBe('Price');
      expect(columnInfo[1]?.dataType).toBe('number');
      expect(columnInfo[2]?.originalName).toBe('In Stock');
      expect(columnInfo[2]?.dataType).toBe('boolean');
    });

    it('should handle file not found error', async () => {
      mockTemporaryStorage.getFile.mockResolvedValue(null);

      await expect(service.analyzeColumns('non-existent-id')).rejects.toThrow(
        'File not found: non-existent-id'
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FileMetadataService.getInstance();
      const instance2 = FileMetadataService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('data type detection', () => {
    it('should detect number data type', () => {
      const service = FileMetadataService.getInstance();
      const values = ['123', '456.78', '0', '-123.45'];
      
      // Access private method through any cast for testing
      const dataType = (service as any).detectDataType(values);
      expect(dataType).toBe('number');
    });

    it('should detect boolean data type', () => {
      const service = FileMetadataService.getInstance();
      const values = ['true', 'false', 'yes', 'no'];
      
      const dataType = (service as any).detectDataType(values);
      expect(dataType).toBe('boolean');
    });

    it('should detect date data type', () => {
      const service = FileMetadataService.getInstance();
      const values = ['2023-01-15', '2023/02/01', '2023-12-31'];
      
      const dataType = (service as any).detectDataType(values);
      expect(dataType).toBe('date');
    });

    it('should default to string data type', () => {
      const service = FileMetadataService.getInstance();
      const values = ['hello', 'world', 'test'];
      
      const dataType = (service as any).detectDataType(values);
      expect(dataType).toBe('string');
    });
  });

  describe('column name normalization', () => {
    it('should normalize column names correctly', () => {
      const service = FileMetadataService.getInstance();
      
      expect((service as any).normalizeColumnName('First Name')).toBe('first_name');
      expect((service as any).normalizeColumnName('Email Address')).toBe('email_address');
      expect((service as any).normalizeColumnName('Date of Birth')).toBe('date_of_birth');
      expect((service as any).normalizeColumnName('Is Active?')).toBe('is_active');
      expect((service as any).normalizeColumnName('  Multiple   Spaces  ')).toBe('multiple_spaces');
      expect((service as any).normalizeColumnName('Special@#$Characters')).toBe('special_characters');
      expect((service as any).normalizeColumnName('')).toBe('');
    });
  });
});