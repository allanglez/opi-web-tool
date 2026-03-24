import { Readable } from 'stream';

export interface StorageAdapter {
  /**
   * Store a file and return the storage key
   */
  putObject(key: string, data: Buffer | Readable, mimeType: string): Promise<string>;

  /**
   * Get a public URL for accessing the file
   */
  getObjectUrl(key: string): Promise<string>;

  /**
   * Delete a file by storage key
   */
  deleteObject(key: string): Promise<void>;

  /**
   * List all object keys in the bucket, optionally filtered by prefix.
   */
  listObjects(prefix?: string): Promise<string[]>;

  /**
   * Get file metadata (size, etc.)
   */
  getObjectMetadata(key: string): Promise<{ sizeBytes: number; mimeType: string } | null>;

  /**
   * Get a readable stream for object download.
   */
  getObjectStream(
    key: string,
  ): Promise<{ stream: Readable; mimeType: string; sizeBytes?: number } | null>;
}
