import { z } from 'zod';

// Job payload schema for queue
export const JobPayloadSchema = z.object({
  jobId: z.string(),
  s3Key: z.string(),
  mime: z.string(),
  originalName: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
});

export type JobPayload = z.infer<typeof JobPayloadSchema>;

// Transaction schema
export const TransactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().datetime(),
  description: z.string(),
  vendor: z.string().optional(),
  amount: z.number(),
  currency: z.string().optional().default('EUR'),
  category: z.string().optional(),
  taxAmount: z.number().optional(),
  meta: z.record(z.any()).optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Job result schema
export const JobResultSchema = z.object({
  jobId: z.string(),
  status: z.enum(['completed', 'failed']),
  transactions: z.array(TransactionSchema),
  summary: z.object({
    totalsByCategory: z.record(z.number()),
    total: z.number(),
    totalIncome: z.number(),
    totalExpenses: z.number(),
    netCashflow: z.number(),
    transactionCount: z.number(),
  }),
  metadata: z.object({
    processingTime: z.number(),
    confidence: z.number().optional(),
    method: z.string(),
    errors: z.array(z.string()).optional(),
  }),
  createdAt: z.string().datetime(),
});

export type JobResult = z.infer<typeof JobResultSchema>;

// File upload response schema (maintains backward compatibility)
export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  jobId: z.string(),
  data: z.object({
    id: z.string(),
    filename: z.string(),
    uploadDate: z.string(),
    // ... other fields for backward compatibility
  }).optional(),
});

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;

// Status response schema
export const StatusResponseSchema = z.object({
  jobId: z.string(),
  status: z.enum(['queued', 'active', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  message: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  result: JobResultSchema.optional(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

// Results response schema (maintains backward compatibility)
export const ResultsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    filename: z.string(),
    uploadDate: z.string(),
    expenses: z.array(TransactionSchema),
    income: z.array(TransactionSchema),
    totalExpenses: z.number(),
    totalIncome: z.number(),
    netCashflow: z.number(),
    transactionCount: z.number(),
    // ... other fields for backward compatibility
  }),
});

export type ResultsResponse = z.infer<typeof ResultsResponseSchema>;

// Error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// API response union type
export const ApiResponseSchema = z.union([
  FileUploadResponseSchema,
  StatusResponseSchema,
  ResultsResponseSchema,
  ErrorResponseSchema,
]);

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// Python worker request schema
export const PythonWorkerRequestSchema = z.object({
  jobId: z.string(),
  s3Key: z.string(),
  mime: z.string(),
  originalName: z.string(),
  userId: z.string(),
  callbackUrl: z.string().url(),
  apiKey: z.string(),
});

export type PythonWorkerRequest = z.infer<typeof PythonWorkerRequestSchema>;

// Python worker response schema
export const PythonWorkerResponseSchema = z.object({
  success: z.boolean(),
  jobId: z.string(),
  result: JobResultSchema.optional(),
  error: z.string().optional(),
});

export type PythonWorkerResponse = z.infer<typeof PythonWorkerResponseSchema>;






