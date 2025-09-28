import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService, S3Config } from '../types';

export class S3StorageService implements StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.region = config.region;
    
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
  }

  async uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    return key;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('File not found or empty');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  getFileUrl(key: string): string {
    // For S3, return the public URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
}

// Singleton instance
let storageService: S3StorageService | null = null;

export function getStorageService(): S3StorageService {
  if (!storageService) {
    const config: S3Config = {
      bucket: process.env['S3_BUCKET']!,
      region: process.env['S3_REGION']!,
      accessKeyId: process.env['S3_ACCESS_KEY_ID']!,
      secretAccessKey: process.env['S3_SECRET_ACCESS_KEY']!,
      endpoint: process.env['S3_ENDPOINT'],
    };

    if (!config.bucket || !config.region || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('S3 configuration is incomplete. Please check your environment variables.');
    }

    storageService = new S3StorageService(config);
  }
  return storageService;
}
