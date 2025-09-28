import { Router, Response } from 'express';
import { z } from 'zod';
import { getUploadService } from '../services/upload-service';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Validation schemas
const ResultsParamsSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
});

// GET /api/results/:id - Get job results
router.get('/:id', optionalAuth, async (req: any, res: Response) => {
  try {
    // Validate parameters
    const { id } = ResultsParamsSchema.parse(req.params);

    // Get results
    const uploadService = getUploadService();
    const results = await uploadService.getResults(id);

    return res.json(results);
  } catch (error) {
    console.error('Results retrieval error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: (error as any).errors.map((e: any) => e.message).join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Results retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
