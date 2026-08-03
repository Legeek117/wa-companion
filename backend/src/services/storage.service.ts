import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface StorageResult {
  url: string;
  key: string;
  size: number;
}

class StorageService {
  private uploadsPath: string;

  constructor() {
    this.uploadsPath = env.UPLOADS_PATH;
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    try {
      if (!fs.existsSync(this.uploadsPath)) {
        fs.mkdirSync(this.uploadsPath, { recursive: true });
        logger.info(`Created uploads directory: ${this.uploadsPath}`);
      }
    } catch (error) {
      logger.error('Failed to create uploads directory', { error });
    }
  }

  private generateKey(folder: string, originalName?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = originalName ? path.extname(originalName) : '';
    return `${folder}/${timestamp}-${random}${ext}`;
  }

  async upload(
    buffer: Buffer,
    folder: string = 'media',
    originalName?: string
  ): Promise<StorageResult> {
    try {
      const key = this.generateKey(folder, originalName);
      const fullPath = path.join(this.uploadsPath, key);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, buffer);

      const size = buffer.length;
      const url = `/uploads/${key}`;

      logger.debug(`File uploaded: ${key} (${size} bytes)`);

      return { url, key, size };
    } catch (error) {
      logger.error('Storage upload failed', { error, folder });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUrl(key: string): Promise<string> {
    try {
      const fullPath = path.join(this.uploadsPath, key);

      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        logger.warn(`File not found: ${key}`);
        return '';
      }

      return `/uploads/${key}`;
    } catch (error) {
      logger.error('Storage getUrl failed', { error, key });
      throw new Error(`Failed to get file URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = path.join(this.uploadsPath, key);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.debug(`File deleted: ${key}`);
      }
    } catch (error) {
      logger.error('Storage delete failed', { error, key });
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.uploadsPath, key);
      return fs.existsSync(fullPath);
    } catch (error) {
      logger.error('Storage fileExists check failed', { error, key });
      return false;
    }
  }

  getLocalPath(key: string): string {
    return path.join(this.uploadsPath, key);
  }
}

export const storageService = new StorageService();
