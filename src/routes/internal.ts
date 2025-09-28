import { Router, Response } from 'express';
import { z } from 'zod';
import { getUploadService } from '../services/upload-service';
// import { JobResult } from '../types';

const router = Router();

// Validation schemas
const IngestParamsSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
});

const IngestBodySchema = z.object({
  jobId: z.string(),
  status: z.enum(['completed', 'failed']),
  transactions: z.array(z.object({
    id: z.string().optional(),
    date: z.string().datetime(),
    description: z.string(),
    vendor: z.string().optional(),
    amount: z.number(),
    currency: z.string().optional(),
    category: z.string().optional(),
    taxAmount: z.number().optional(),
    meta: z.record(z.string(), z.any()).optional(),
  })),
  summary: z.object({
    totalsByCategory: z.record(z.string(), z.number()),
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

// Middleware to verify internal API key
const verifyInternalApiKey = (req: any, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env['INTERNAL_API_KEY'] || 'dev-key';
  
  if (apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
  
  return next();
};

// POST /internal/ingest/:jobId - Ingest results from Python worker
router.post('/ingest/:jobId', verifyInternalApiKey, async (req: any, res: Response) => {
  try {
    // Validate parameters and body
    const { jobId } = IngestParamsSchema.parse(req.params);
    const body = IngestBodySchema.parse(req.body);

    // Verify jobId matches
    if (body.jobId !== jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID mismatch',
        message: 'Job ID in URL does not match job ID in body'
      });
    }

    // Ingest results
    const uploadService = getUploadService();
    
    // Ensure currency is always present for transactions
    const processedBody = {
      ...body,
      transactions: body.transactions.map(t => ({
        ...t,
        currency: t.currency || 'EUR'
      }))
    };
    
    await uploadService.ingestResult(jobId, processedBody);

    return res.json({
      success: true,
      message: 'Results ingested successfully'
    });
  } catch (error) {
    console.error('Result ingestion error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: (error as any).errors.map((e: any) => e.message).join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Result ingestion failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
