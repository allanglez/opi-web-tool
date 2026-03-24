import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { StorageAdapter } from './storage.interface';

export interface S3StorageConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  signedUrlExpiresSeconds?: number;
  tlsRejectUnauthorized?: boolean;
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly s3Client: S3Client;
  private readonly signedUrlExpiresSeconds: number;
  private bucketReadyPromise: Promise<void>;

  constructor(private readonly config: S3StorageConfig) {
    const rejectUnauthorized = config.tlsRejectUnauthorized ?? true;

    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      tls: rejectUnauthorized,
    });
    this.signedUrlExpiresSeconds = config.signedUrlExpiresSeconds ?? 3600;
    this.bucketReadyPromise = this.ensureBucketExists();
  }

  async putObject(key: string, data: Buffer | Readable, mimeType: string): Promise<string> {
    await this.bucketReadyPromise;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: mimeType,
      }),
    );

    return key;
  }

  async getObjectUrl(key: string): Promise<string> {
    await this.bucketReadyPromise;
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      { expiresIn: this.signedUrlExpiresSeconds },
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucketReadyPromise;
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async listObjects(prefix?: string): Promise<string[]> {
    await this.bucketReadyPromise;

    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) keys.push(obj.Key);
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async getObjectMetadata(key: string): Promise<{ sizeBytes: number; mimeType: string } | null> {
    await this.bucketReadyPromise;

    try {
      const metadata = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return {
        sizeBytes: metadata.ContentLength ?? 0,
        mimeType: metadata.ContentType ?? 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async getObjectStream(
    key: string,
  ): Promise<{ stream: Readable; mimeType: string; sizeBytes?: number } | null> {
    await this.bucketReadyPromise;

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        return null;
      }

      const responseBody = response.Body;
      const stream = responseBody instanceof Readable
        ? responseBody
        : Readable.fromWeb(responseBody as globalThis.ReadableStream<Uint8Array>);

      return {
        stream,
        mimeType: response.ContentType ?? 'application/octet-stream',
        sizeBytes: response.ContentLength ?? undefined,
      };
    } catch {
      return null;
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
    } catch (error) {
      const errCode = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: string }).code
        : undefined;

      if (errCode === 'SELF_SIGNED_CERT_IN_CHAIN' || errCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        console.error(`[S3Storage] TLS certificate error connecting to S3/MinIO endpoint (${this.config.endpoint ?? 'default'}). Set AUDIO_S3_TLS_REJECT_UNAUTHORIZED=false to bypass.`, error);
        throw error;
      }

      const shouldCreate =
        typeof error === 'object'
        && error !== null
        && 'name' in error
        && ['NotFound', 'NoSuchBucket', 'NoSuchKey'].includes((error as { name: string }).name);

      if (!shouldCreate) {
        throw error;
      }

      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.config.bucket }));
      } catch (createError) {
        // Ignore if the bucket was created in the meantime or we already own it
        const isAlreadyOwned =
          typeof createError === 'object'
          && createError !== null
          && 'name' in createError
          && ['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes((createError as { name: string }).name);
          
        if (!isAlreadyOwned) {
          throw createError;
        }
      }
    }
  }
}
