// Import and re-export contract types
import {
  JobPayload,
  Transaction,
  JobResult,
  FileUploadResponse,
  StatusResponse,
  ResultsResponse,
  ErrorResponse,
  ApiResponse,
  PythonWorkerRequest,
  PythonWorkerResponse,
} from '../../packages/contracts/dist';

export {
  JobPayload,
  Transaction,
  JobResult,
  FileUploadResponse,
  StatusResponse,
  ResultsResponse,
  ErrorResponse,
  ApiResponse,
  PythonWorkerRequest,
  PythonWorkerResponse,
};

// Additional application-specific types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

export interface FileUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mime: string;
  s3Key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  result?: JobResult;
}

export interface ParsedTransaction {
  id?: string;
  date: string;
  description: string;
  vendor?: string;
  amount: number;
  currency?: string;
  category?: string;
  taxAmount?: number | undefined;
  meta?: Record<string, any>;
}

export interface ProcessingResult {
  transactions: ParsedTransaction[];
  summary: {
    totalsByCategory: Record<string, number>;
    total: number;
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    transactionCount: number;
  };
  metadata: {
    processingTime: number;
    confidence?: number;
    method: string;
    errors?: string[];
  };
}

export interface QueueJob {
  id: string;
  name: string;
  data: JobPayload;
  opts: any;
  progress: any;
  returnvalue?: any;
  failedReason?: string;
  processedOn?: number | undefined;
  finishedOn?: number | undefined;
  timestamp: number;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string | undefined;
}

export interface RedisConfig {
  url: string;
  host?: string;
  port?: number;
  password?: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface WorkerConfig {
  url: string;
  apiKey: string;
}

export interface AppConfig {
  port: number;
  jwtSecret: string;
  adminEmail: string;
  adminPassword: string;
  s3: S3Config;
  redis: RedisConfig;
  database: DatabaseConfig;
  worker: WorkerConfig;
  internalApiKey: string;
}

// Express request extensions
export interface AuthenticatedRequest {
  user?: User | undefined;
  headers: any;
  body: any;
  params: any;
  query: any;
}

export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

// Service interfaces
export interface FileParser {
  parse(buffer: Buffer, filename: string): Promise<ParsedTransaction[]>;
  canHandle(mimeType: string): boolean;
}

export interface QueueService {
  addJob(name: string, data: JobPayload, options?: any): Promise<QueueJob>;
  getJob(jobId: string): Promise<QueueJob | null>;
  getJobStatus(jobId: string): Promise<'queued' | 'active' | 'completed' | 'failed'>;
  processJob(name: string, processor: (job: QueueJob) => Promise<any>): void;
}

export interface StorageService {
  uploadFile(buffer: Buffer, key: string, mimeType: string): Promise<string>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): string;
}

export interface DatabaseService {
  saveFile(file: Omit<FileUpload, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileUpload>;
  getFile(id: string): Promise<FileUpload | null>;
  updateFileStatus(id: string, status: FileUpload['status'], result?: JobResult): Promise<void>;
  getUserFiles(userId: string): Promise<FileUpload[]>;
}
