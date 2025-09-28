import { Router, Response } from 'express';
import { z } from 'zod';
import { getUploadService } from '../services/upload-service';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const StatusParamsSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
});

// GET /api/status/:id - Get job status
router.get('/:id', optionalAuth, async (req: any, res: Response) => {
  try {
    // Validate parameters
    const { id } = StatusParamsSchema.parse(req.params);

    // Get status
    const uploadService = getUploadService();
    const status = await uploadService.getStatus(id);

    return res.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: (error as any).errors.map((e: any) => e.message).join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
