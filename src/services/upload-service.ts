import { v4 as uuidv4 } from 'uuid';
import { JobPayload, FileUploadResponse, StatusResponse, ResultsResponse, JobResult } from '../types';
import { getDatabaseService } from './database';
import { getStorageService } from './storage';
import { getQueueService } from './queue';
import { getParserRouter } from './parsers';
import { getPythonWorkerClient } from './python-worker';

export class UploadService {
  private db = getDatabaseService();
  private storage = getStorageService();
  private queue = getQueueService();
  private parser = getParserRouter();
  private pythonWorker = getPythonWorkerClient();

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userId: string
  ): Promise<FileUploadResponse> {
    try {
      // Generate unique identifiers
      const jobId = uuidv4();
      const s3Key = `uploads/${userId}/${jobId}/${filename}`;
      
      // Upload file to S3
      await this.storage.uploadFile(buffer, s3Key, mimeType);
      
      // Create file record in database
      const fileRecord = await this.db.saveFile({
        userId,
        filename,
        originalName: filename,
        mime: mimeType,
        s3Key,
        status: 'pending',
      });

      // Create job payload
      const jobPayload: JobPayload = {
        jobId,
        s3Key,
        mime: mimeType,
        originalName: filename,
        userId,
        createdAt: new Date().toISOString(),
      };

      // Decide processing strategy
      if (this.parser.canHandle(mimeType) && !this.parser.shouldRouteToPython(mimeType)) {
        // Process with TypeScript parser
        await this.processWithTypeScript(jobPayload, fileRecord.id);
      } else {
        // Route to Python worker
        await this.processWithPython(jobPayload, fileRecord.id);
      }

      return {
        success: true,
        message: 'File uploaded successfully',
        jobId,
        data: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          uploadDate: fileRecord.createdAt.toISOString(),
        },
      };
    } catch (error) {
      console.error('Upload service error:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processWithTypeScript(jobPayload: JobPayload, fileId: string): Promise<void> {
    try {
      // Update status to processing
      await this.db.updateFileStatus(fileId, 'processing');

      // Download file from S3
      const buffer = await this.storage.downloadFile(jobPayload.s3Key);
      
      // Parse with TypeScript parser
      const transactions = await this.parser.parseFile(buffer, jobPayload.originalName, jobPayload.mime);
      
      // Create processing result
      const result: JobResult = {
        jobId: jobPayload.jobId,
        status: 'completed',
        transactions: transactions.map(t => ({
          ...t,
          currency: t.currency || 'EUR',
        })),
        summary: this.calculateSummary(transactions),
        metadata: {
          processingTime: Date.now() - new Date(jobPayload.createdAt).getTime(),
          method: 'typescript',
        },
        createdAt: new Date().toISOString(),
      };

      // Save transactions to database
      await this.db.saveTransactions(fileId, transactions);
      
      // Update file status
      await this.db.updateFileStatus(fileId, 'completed', result);
      
    } catch (error) {
      console.error('TypeScript processing error:', error);
      await this.db.updateFileStatus(fileId, 'failed');
      throw error;
    }
  }

  private async processWithPython(jobPayload: JobPayload, fileId: string): Promise<void> {
    try {
      // Update status to processing
      await this.db.updateFileStatus(fileId, 'processing');

      // Add job to queue
      await this.queue.addJob('parse-jobs', jobPayload);

      // Send to Python worker
      const callbackUrl = `${process.env['API_URL'] || 'http://localhost:3000'}/internal/ingest/${jobPayload.jobId}`;
      await this.pythonWorker.processFile(jobPayload, callbackUrl);
      
    } catch (error) {
      console.error('Python processing error:', error);
      await this.db.updateFileStatus(fileId, 'failed');
      throw error;
    }
  }

  async getStatus(jobId: string): Promise<StatusResponse> {
    try {
      const file = await this.db.getFile(jobId);
      if (!file) {
        throw new Error('File not found');
      }

      const status = file.status === 'pending' ? 'queued' : 
                   file.status === 'processing' ? 'active' : 
                   file.status === 'completed' ? 'completed' : 'failed';

      return {
        jobId,
        status,
        progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 50,
        message: this.getStatusMessage(status),
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
        result: file.result,
      };
    } catch (error) {
      console.error('Status check error:', error);
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getResults(jobId: string): Promise<ResultsResponse> {
    try {
      const file = await this.db.getFile(jobId);
      if (!file) {
        throw new Error('File not found');
      }

      if (file.status !== 'completed' || !file.result) {
        throw new Error('File processing not completed');
      }

      const transactions = await this.db.getFileTransactions(jobId);

      return {
        success: true,
        data: {
          id: file.id,
          filename: file.filename,
          uploadDate: file.createdAt.toISOString(),
          expenses: transactions.filter(t => t.amount < 0),
          income: transactions.filter(t => t.amount > 0),
          totalExpenses: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
          totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
          netCashflow: transactions.reduce((sum, t) => sum + t.amount, 0),
          transactionCount: transactions.length,
        },
      };
    } catch (error) {
      console.error('Results retrieval error:', error);
      throw new Error(`Results retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async ingestResult(jobId: string, result: JobResult): Promise<void> {
    try {
      const file = await this.db.getFile(jobId);
      if (!file) {
        throw new Error('File not found');
      }

      // Save transactions to database
      await this.db.saveTransactions(jobId, result.transactions);
      
      // Update file status
      await this.db.updateFileStatus(jobId, 'completed', result);
      
    } catch (error) {
      console.error('Result ingestion error:', error);
      throw new Error(`Result ingestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateSummary(transactions: any[]): JobResult['summary'] {
    const totalsByCategory: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(transaction => {
      const category = transaction.category || 'General';
      totalsByCategory[category] = (totalsByCategory[category] || 0) + transaction.amount;
      
      if (transaction.amount > 0) {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += Math.abs(transaction.amount);
      }
    });

    return {
      totalsByCategory,
      total: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'queued': return 'File queued for processing';
      case 'active': return 'File is being processed';
      case 'completed': return 'Processing completed successfully';
      case 'failed': return 'Processing failed';
      default: return 'Unknown status';
    }
  }
}

// Singleton instance
let uploadService: UploadService | null = null;

export function getUploadService(): UploadService {
  if (!uploadService) {
    uploadService = new UploadService();
  }
  return uploadService;
}
