import {
  JobPayloadSchema,
  TransactionSchema,
  JobResultSchema,
  FileUploadResponseSchema,
  StatusResponseSchema,
  ResultsResponseSchema,
  ErrorResponseSchema,
} from '../packages/contracts/dist';

describe('Contracts', () => {
  describe('JobPayloadSchema', () => {
    it('should validate a valid job payload', () => {
      const validPayload = {
        jobId: 'test-job-123',
        s3Key: 'uploads/test-file.csv',
        mime: 'text/csv',
        originalName: 'test-file.csv',
        userId: 'user-123',
        createdAt: '2023-01-01T00:00:00Z',
      };

      const result = JobPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('should reject invalid job payload', () => {
      const invalidPayload = {
        jobId: 'test-job-123',
        // Missing required fields
      };

      const result = JobPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('TransactionSchema', () => {
    it('should validate a valid transaction', () => {
      const validTransaction = {
        id: 'txn-123',
        date: '2023-01-01T00:00:00Z',
        description: 'Test transaction',
        vendor: 'Test Vendor',
        amount: 100.50,
        currency: 'USD',
        category: 'Sales',
        taxAmount: 10.05,
        meta: {
          source: 'csv',
          filename: 'test.csv',
        },
      };

      const result = TransactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTransaction);
      }
    });

    it('should validate transaction with minimal required fields', () => {
      const minimalTransaction = {
        date: '2023-01-01T00:00:00Z',
        description: 'Minimal transaction',
        amount: 50.00,
      };

      const result = TransactionSchema.safeParse(minimalTransaction);
      expect(result.success).toBe(true);
      if (result.success) {
      expect(result.data).toEqual({
        ...minimalTransaction,
        id: undefined,
        vendor: undefined,
        currency: 'EUR', // Default value
        category: undefined,
        taxAmount: undefined,
        meta: undefined,
      });
      }
    });

    it('should reject transaction with invalid date format', () => {
      const invalidTransaction = {
        date: 'invalid-date',
        description: 'Test transaction',
        amount: 100.50,
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject transaction with invalid amount', () => {
      const invalidTransaction = {
        date: '2023-01-01T00:00:00Z',
        description: 'Test transaction',
        amount: 'not-a-number',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('JobResultSchema', () => {
    it('should validate a valid job result', () => {
      const validResult = {
        jobId: 'test-job-123',
        status: 'completed' as const,
        transactions: [
          {
            date: '2023-01-01T00:00:00Z',
            description: 'Test transaction',
            amount: 100.50,
            currency: 'USD',
          },
        ],
        summary: {
          totalsByCategory: { 'Sales': 100.50 },
          total: 100.50,
          totalIncome: 100.50,
          totalExpenses: 0.0,
          netCashflow: 100.50,
          transactionCount: 1,
        },
        metadata: {
          processingTime: 1500,
          confidence: 0.95,
          method: 'csv_parser',
        },
        createdAt: '2023-01-01T00:00:00Z',
      };

      const result = JobResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validResult);
      }
    });

    it('should validate job result with failed status', () => {
      const failedResult = {
        jobId: 'test-job-123',
        status: 'failed' as const,
        transactions: [],
        summary: {
          totalsByCategory: {},
          total: 0.0,
          totalIncome: 0.0,
          totalExpenses: 0.0,
          netCashflow: 0.0,
          transactionCount: 0,
        },
        metadata: {
          processingTime: 0,
          method: 'failed',
          errors: ['Parsing failed'],
        },
        createdAt: '2023-01-01T00:00:00Z',
      };

      const result = JobResultSchema.safeParse(failedResult);
      expect(result.success).toBe(true);
    });
  });

  describe('API Response Schemas', () => {
    it('should validate FileUploadResponse', () => {
      const validResponse = {
        success: true,
        jobId: 'test-job-123',
        message: 'File uploaded successfully',
        fileId: 'file-123',
      };

      const result = FileUploadResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate StatusResponse', () => {
      const validResponse = {
        jobId: 'test-job-123',
        status: 'active' as const,
        progress: 50,
        message: 'Job is being processed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const result = StatusResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate ResultsResponse', () => {
      const validResponse = {
        success: true,
        data: {
          id: 'test-job-123',
          filename: 'test.csv',
          uploadDate: '2023-01-01T00:00:00Z',
          expenses: [],
          income: [],
          totalExpenses: 0.0,
          totalIncome: 0.0,
          netCashflow: 0.0,
          transactionCount: 0,
        },
      };

      const result = ResultsResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should validate ErrorResponse', () => {
      const validResponse = {
        success: false,
        error: 'Validation error',
        message: 'Invalid input provided',
      };

      const result = ErrorResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});
