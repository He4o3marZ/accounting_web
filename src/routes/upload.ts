import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getUploadService } from '../services/upload-service';
import { optionalAuth } from '../middleware/auth';
// import { FileUploadRequest } from '../types';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png', '.tiff'];
    const fileExt = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (fileExt && allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, Excel, PDF, and image files are allowed.') as any, false);
    }
  }
});

// Validation schemas
const UploadRequestSchema = z.object({
  // No body validation needed for file uploads
});

// POST /api/upload - File upload endpoint
router.post('/', optionalAuth, upload.single('file'), async (req: any, res: Response) => {
  try {
    // Validate request
    UploadRequestSchema.parse(req.body);

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Get user ID (default to admin if not authenticated)
    const userId = req.user?._id || 'admin';
    
    // Process file upload
    const uploadService = getUploadService();
    const result = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      userId
    );

    return res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
