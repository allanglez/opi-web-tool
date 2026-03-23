import { LocalStorageAdapter } from './local.storage';
import { S3StorageAdapter } from './s3.storage';
import { StorageAdapter } from './storage.interface';

export function createStorageAdapter(): StorageAdapter {
  const provider = (process.env.AUDIO_STORAGE_PROVIDER || 'local').toLowerCase();

  if (provider === 's3' || provider === 'minio') {
    const bucket = process.env.AUDIO_S3_BUCKET;
    const region = process.env.AUDIO_S3_REGION || 'us-east-1';
    const accessKeyId = process.env.AUDIO_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AUDIO_S3_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing required S3 audio storage env vars: AUDIO_S3_BUCKET, AUDIO_S3_ACCESS_KEY_ID, AUDIO_S3_SECRET_ACCESS_KEY');
    }

    return new S3StorageAdapter({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint: process.env.AUDIO_S3_ENDPOINT,
      forcePathStyle: (process.env.AUDIO_S3_FORCE_PATH_STYLE || 'false') === 'true',
      signedUrlExpiresSeconds: parseInt(process.env.AUDIO_S3_SIGNED_URL_EXPIRES_SECONDS || '3600', 10),
      tlsRejectUnauthorized: process.env.AUDIO_S3_TLS_REJECT_UNAUTHORIZED !== 'false',
    });
  }

  const uploadDir = process.env.AUDIO_STORAGE_PATH || process.env.LOCAL_UPLOAD_DIR || './audio-storage';
  return new LocalStorageAdapter(uploadDir);
}
