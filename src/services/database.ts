import { PrismaClient } from '@prisma/client';
import { DatabaseService, FileUpload } from '../types';

export class PrismaDatabaseService implements DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async saveFile(file: Omit<FileUpload, 'id' | 'createdAt' | 'updatedAt'>): Promise<FileUpload> {
    const savedFile = await this.prisma.file.create({
      data: {
        userId: file.userId,
        filename: file.filename,
        originalName: file.originalName,
        mime: file.mime,
        s3Key: file.s3Key,
        status: file.status as any,
        result: file.result ? JSON.parse(JSON.stringify(file.result)) : null,
      },
    });

    return {
      id: savedFile.id,
      userId: savedFile.userId,
      filename: savedFile.filename,
      originalName: savedFile.originalName,
      mime: savedFile.mime,
      s3Key: savedFile.s3Key,
      status: savedFile.status as FileUpload['status'],
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
      result: savedFile.result as any,
    };
  }

  async getFile(id: string): Promise<FileUpload | null> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) return null;

    return {
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      originalName: file.originalName,
      mime: file.mime,
      s3Key: file.s3Key,
      status: file.status as FileUpload['status'],
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      result: file.result as any,
    };
  }

  async updateFileStatus(id: string, status: FileUpload['status'], result?: any): Promise<void> {
    await this.prisma.file.update({
      where: { id },
      data: {
        status: status as any,
        result: result ? JSON.parse(JSON.stringify(result)) : undefined,
        updatedAt: new Date(),
      },
    });
  }

  async getUserFiles(userId: string): Promise<FileUpload[]> {
    const files = await this.prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file: any) => ({
      id: file.id,
      userId: file.userId,
      filename: file.filename,
      originalName: file.originalName,
      mime: file.mime,
      s3Key: file.s3Key,
      status: file.status as FileUpload['status'],
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      result: file.result as any,
    }));
  }

  async saveTransactions(fileId: string, transactions: any[]): Promise<void> {
    await this.prisma.transaction.createMany({
      data: transactions.map(transaction => ({
        fileId,
        userId: transaction.userId,
        date: new Date(transaction.date),
        description: transaction.description,
        vendor: transaction.vendor,
        amount: transaction.amount,
        currency: transaction.currency || 'EUR',
        category: transaction.category,
        taxAmount: transaction.taxAmount,
        meta: transaction.meta ? JSON.parse(JSON.stringify(transaction.meta)) : null,
      })),
    });
  }

  async getFileTransactions(fileId: string): Promise<any[]> {
    return this.prisma.transaction.findMany({
      where: { fileId },
      orderBy: { date: 'desc' },
    });
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Singleton instance
let databaseService: PrismaDatabaseService | null = null;

export function getDatabaseService(): PrismaDatabaseService {
  if (!databaseService) {
    databaseService = new PrismaDatabaseService();
  }
  return databaseService;
}
