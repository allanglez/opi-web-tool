import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { StorageAdapter } from './storage.interface';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly uploadDir: string) {
    // Ensure upload directory exists
    fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
  }

  async putObject(key: string, data: Buffer | Readable, _mimeType: string): Promise<string> {
    const filePath = join(this.uploadDir, key);
    
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      const writeStream = createWriteStream(filePath);
      await pipeline(data, writeStream);
    }
    
    return key;
  }

  async getObjectUrl(key: string): Promise<string> {
    // For local storage, we'll serve via API endpoint
    // Return a relative path that the API can use to construct download URLs
    return `/api/v1/audio/${key}/download`;
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  async getObjectStream(
    key: string,
  ): Promise<{ stream: Readable; mimeType: string; sizeBytes?: number } | null> {
    const filePath = join(this.uploadDir, key);
    try {
      const stats = await fs.stat(filePath);
      const stream = createReadStream(filePath);
      return {
        stream,
        mimeType: this.detectMimeTypeFromFilename(key),
        sizeBytes: stats.size,
      };
    } catch {
      return null;
    }
  }

  private detectMimeTypeFromFilename(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.wav')) return 'audio/wav';
    if (lower.endsWith('.ogg')) return 'audio/ogg';
    if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/mp4';
    if (lower.endsWith('.webm')) return 'audio/webm';
    return 'application/octet-stream';
  }

  async listObjects(prefix?: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.uploadDir, { recursive: true }) as string[];
      const keys = entries
        .filter((name) => !prefix || name.startsWith(prefix));
      return keys;
    } catch {
      return [];
    }
  }

  async getObjectMetadata(key: string): Promise<{ sizeBytes: number; mimeType: string } | null> {
    const filePath = join(this.uploadDir, key);
    try {
      const stats = await fs.stat(filePath);
      return {
        sizeBytes: stats.size,
        mimeType: 'application/octet-stream' // We don't store MIME type for local files
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a safe storage key from user-provided filename
   */
  static generateStorageKey(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.split('.').pop() || 'webm';
    const sanitizedName = originalFilename
      .split('.')[0]
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${random}_${sanitizedName}.${extension}`;
  }
}
