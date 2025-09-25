import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface StorageConfig {
  tempDirectory: string;
  maxFileSize: number; // in bytes
  allowedExtensions: string[];
  cleanupInterval: number; // in milliseconds
  fileRetentionTime: number; // in milliseconds
}

export interface StoredFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  expiresAt: Date;
}

export class TemporaryStorageService {
  private static instance: TemporaryStorageService;
  private config: StorageConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private storedFiles: Map<string, StoredFile> = new Map();

  private constructor() {
    this.config = {
      tempDirectory: process.env['TEMP_UPLOAD_DIR'] || path.join(process.cwd(), 'temp', 'uploads'),
      maxFileSize: parseInt(process.env['MAX_UPLOAD_SIZE'] || '10485760'), // 10MB default
      allowedExtensions: ['.csv', '.xlsx', '.xls'],
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      fileRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  public static getInstance(): TemporaryStorageService {
    if (!TemporaryStorageService.instance) {
      TemporaryStorageService.instance = new TemporaryStorageService();
    }
    return TemporaryStorageService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Ensure temp directory exists
      await this.ensureDirectoryExists(this.config.tempDirectory);
      
      // Start cleanup timer
      this.startCleanupTimer();
      
      logger.info(`Temporary storage initialized at: ${this.config.tempDirectory}`);
    } catch (error) {
      logger.error('Failed to initialize temporary storage:', error);
      throw error;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info(`Created temporary directory: ${dirPath}`);
    }
  }

  public async storeFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StoredFile> {
    // Validate file size
    if (fileBuffer.length > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Validate file extension
    const extension = path.extname(originalName).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed`);
    }

    const fileId = uuidv4();
    const fileName = `${fileId}${extension}`;
    const filePath = path.join(this.config.tempDirectory, fileName);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.fileRetentionTime);

    try {
      // Write file to disk
      await fs.writeFile(filePath, fileBuffer);

      const storedFile: StoredFile = {
        id: fileId,
        originalName,
        fileName,
        filePath,
        size: fileBuffer.length,
        mimeType,
        uploadedAt: now,
        expiresAt,
      };

      // Store file metadata
      this.storedFiles.set(fileId, storedFile);

      logger.info(`File stored: ${originalName} (${fileId})`);
      return storedFile;
    } catch (error) {
      logger.error(`Failed to store file ${originalName}:`, error);
      throw error;
    }
  }

  public async getFile(fileId: string): Promise<StoredFile | null> {
    const storedFile = this.storedFiles.get(fileId);
    
    if (!storedFile) {
      return null;
    }

    // Check if file has expired
    if (new Date() > storedFile.expiresAt) {
      await this.deleteFile(fileId);
      return null;
    }

    // Verify file still exists on disk
    try {
      await fs.access(storedFile.filePath);
      return storedFile;
    } catch {
      // File doesn't exist on disk, remove from memory
      this.storedFiles.delete(fileId);
      return null;
    }
  }

  public async getFileBuffer(fileId: string): Promise<Buffer | null> {
    const storedFile = await this.getFile(fileId);
    
    if (!storedFile) {
      return null;
    }

    try {
      return await fs.readFile(storedFile.filePath);
    } catch (error) {
      logger.error(`Failed to read file ${fileId}:`, error);
      return null;
    }
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    const storedFile = this.storedFiles.get(fileId);
    
    if (!storedFile) {
      return false;
    }

    try {
      // Remove file from disk
      await fs.unlink(storedFile.filePath);
      
      // Remove from memory
      this.storedFiles.delete(fileId);
      
      logger.info(`File deleted: ${storedFile.originalName} (${fileId})`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId}:`, error);
      
      // Still remove from memory even if disk deletion failed
      this.storedFiles.delete(fileId);
      return false;
    }
  }

  public async cleanupExpiredFiles(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    const expiredFiles = Array.from(this.storedFiles.entries())
      .filter(([_, file]) => now > file.expiresAt)
      .map(([id, _]) => id);

    for (const fileId of expiredFiles) {
      const deleted = await this.deleteFile(fileId);
      if (deleted) {
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired files`);
    }

    return cleanedCount;
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredFiles();
      } catch (error) {
        logger.error('Error during file cleanup:', error);
      }
    }, this.config.cleanupInterval);

    logger.info(`File cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  public getStorageStats(): {
    totalFiles: number;
    totalSize: number;
    expiredFiles: number;
  } {
    const now = new Date();
    let totalSize = 0;
    let expiredFiles = 0;

    for (const file of this.storedFiles.values()) {
      totalSize += file.size;
      if (now > file.expiresAt) {
        expiredFiles++;
      }
    }

    return {
      totalFiles: this.storedFiles.size,
      totalSize,
      expiredFiles,
    };
  }

  public async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Optionally clean up all files on shutdown
    const fileIds = Array.from(this.storedFiles.keys());
    for (const fileId of fileIds) {
      await this.deleteFile(fileId);
    }

    logger.info('Temporary storage service shut down');
  }
}

// Export singleton instance
export const temporaryStorage = TemporaryStorageService.getInstance();