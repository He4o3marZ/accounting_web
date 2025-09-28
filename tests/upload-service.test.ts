import { UploadService } from '../src/services/upload-service';
import { getDatabaseService } from '../src/services/database';
import { getQueueService } from '../src/services/queue';
import { getStorageService } from '../src/services/storage';
import { getPythonWorkerClient } from '../src/services/python-worker';

// Mock the dependencies
jest.mock('../src/services/database');
jest.mock('../src/services/queue');
jest.mock('../src/services/storage');
jest.mock('../src/services/python-worker');

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockDatabaseService: any;
  let mockQueueService: any;
  let mockStorageService: any;
  let mockPythonWorkerClient: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockDatabaseService = {
      saveFile: jest.fn(),
      getFile: jest.fn(),
      updateFileStatus: jest.fn(),
      saveTransactions: jest.fn(),
    };

    mockQueueService = {
      addJob: jest.fn(),
      getJob: jest.fn(),
    };

    mockStorageService = {
      uploadFile: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    mockPythonWorkerClient = {
      processFile: jest.fn(),
    };

    // Mock the getter functions
    (getDatabaseService as jest.Mock).mockReturnValue(mockDatabaseService);
    (getQueueService as jest.Mock).mockReturnValue(mockQueueService);
    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);
    (getPythonWorkerClient as jest.Mock).mockReturnValue(mockPythonWorkerClient);

    uploadService = new UploadService();
  });

  describe('uploadFile', () => {
    it('should upload a file and return job information', async () => {
      // Arrange
      const mockFileId = 'test-file-id';
      const mockJobId = 'test-job-id';
      const mockS3Key = 'test-s3-key';
      const mockSignedUrl = 'https://test-signed-url.com';

      mockDatabaseService.saveFile.mockResolvedValue({
        id: mockFileId,
        status: 'UPLOADED',
      });

      mockStorageService.uploadFile.mockResolvedValue(mockS3Key);
      mockStorageService.getSignedUrl.mockResolvedValue(mockSignedUrl);
      mockQueueService.addJob.mockResolvedValue({
        id: mockJobId,
        name: 'parse-jobs',
      });
      mockPythonWorkerClient.processFile.mockResolvedValue(undefined);

      // Act
      const result = await uploadService.uploadFile(
        Buffer.from('test file content'),
        'test.csv',
        'text/csv',
        'test-user-id'
      );

      // Assert
      expect(result).toEqual({
        success: true,
        jobId: mockJobId,
        message: 'File uploaded successfully',
        fileId: mockFileId,
      });

      expect(mockDatabaseService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          filename: expect.stringContaining('test.csv'),
          originalName: 'test.csv',
          mime: 'text/csv',
          s3Key: mockS3Key,
          status: 'UPLOADED',
        })
      );

      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        Buffer.from('test file content'),
        expect.stringContaining('test.csv')
      );

      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'parse-jobs',
        expect.objectContaining({
          jobId: mockJobId,
          s3Key: mockS3Key,
          mime: 'text/csv',
          originalName: 'test.csv',
          userId: 'test-user-id',
        })
      );
    });

    it('should handle upload errors gracefully', async () => {
      // Arrange
      mockDatabaseService.saveFile.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        uploadService.uploadFile(
          Buffer.from('test file content'),
          'test.csv',
          'text/csv',
          'test-user-id'
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('getStatus', () => {
    it('should return job status from queue', async () => {
      // Arrange
      const mockJobId = 'test-job-id';
      const mockJob = {
        id: mockJobId,
        name: 'parse-jobs',
        data: { jobId: mockJobId },
        progress: 50,
        processedOn: Date.now(),
        finishedOn: null,
        failedReason: null,
      };

      mockQueueService.getJob.mockResolvedValue(mockJob);

      // Act
      const result = await uploadService.getStatus(mockJobId);

      // Assert
      expect(result).toEqual({
        success: true,
        jobId: mockJobId,
        status: 'active',
        progress: 50,
        message: 'Job is being processed',
      });

      expect(mockQueueService.getJob).toHaveBeenCalledWith(mockJobId);
    });

    it('should return not found for non-existent job', async () => {
      // Arrange
      mockQueueService.getJob.mockResolvedValue(null);

      // Act
      const result = await uploadService.getStatus('non-existent-job');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Job not found',
        message: 'No job found with the given ID',
      });
    });
  });

  describe('getResults', () => {
    it('should return job results from database', async () => {
      // Arrange
      const mockFileId = 'test-file-id';
      const mockFile = {
        id: mockFileId,
        status: 'COMPLETED',
        result: {
          transactions: [
            {
              id: 'txn-1',
              date: '2023-01-01T00:00:00Z',
              description: 'Test transaction',
              amount: 100.0,
              currency: 'USD',
            },
          ],
          summary: {
            total: 100.0,
            totalIncome: 100.0,
            totalExpenses: 0.0,
            netCashflow: 100.0,
            transactionCount: 1,
            totalsByCategory: { 'General': 100.0 },
          },
        },
      };

      mockDatabaseService.getFile.mockResolvedValue(mockFile);

      // Act
      const result = await uploadService.getResults(mockFileId);

      // Assert
      expect(result).toEqual({
        success: true,
        jobId: mockFileId,
        status: 'completed',
        data: mockFile.result,
        message: 'Results retrieved successfully',
      });

      expect(mockDatabaseService.getFile).toHaveBeenCalledWith(mockFileId);
    });

    it('should return not found for non-existent file', async () => {
      // Arrange
      mockDatabaseService.getFile.mockResolvedValue(null);

      // Act
      const result = await uploadService.getResults('non-existent-file');

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'File not found',
        message: 'No file found with the given ID',
      });
    });
  });

  describe('ingestResult', () => {
    it('should ingest results from Python worker', async () => {
      // Arrange
      const mockJobId = 'test-job-id';
      const mockFileId = 'test-file-id';
      const mockResult = {
        jobId: mockJobId,
        status: 'completed' as const,
        transactions: [
          {
            id: 'txn-1',
            date: '2023-01-01T00:00:00Z',
            description: 'Test transaction',
            amount: 100.0,
            currency: 'USD',
          },
        ],
        summary: {
          total: 100.0,
          totalIncome: 100.0,
          totalExpenses: 0.0,
          netCashflow: 100.0,
          transactionCount: 1,
          totalsByCategory: { 'General': 100.0 },
        },
        metadata: {
          processingTime: 1500,
          confidence: 0.95,
          method: 'test',
        },
        createdAt: '2023-01-01T00:00:00Z',
      };

      mockDatabaseService.getFile.mockResolvedValue({
        id: mockFileId,
        status: 'PROCESSING',
      });

      mockDatabaseService.updateFileStatus.mockResolvedValue(undefined);
      mockDatabaseService.saveTransactions.mockResolvedValue(undefined);

      // Act
      await uploadService.ingestResult(mockJobId, mockResult);

      // Assert
      expect(mockDatabaseService.updateFileStatus).toHaveBeenCalledWith(
        mockFileId,
        'COMPLETED',
        mockResult
      );

      expect(mockDatabaseService.saveTransactions).toHaveBeenCalledWith(
        mockFileId,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'txn-1',
            date: expect.any(Date),
            description: 'Test transaction',
            amount: 100.0,
            currency: 'USD',
          }),
        ])
      );
    });
  });
});
