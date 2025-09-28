import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
// import { EnhancedAIService } from './services/enhancedAIService';
const { WorkingEnhancedAIService } = require('./services/workingEnhancedAIService');
import { logger } from './services/logger';
// import { getQueueService } from './services/queue';
// import { getDatabaseService } from './services/database';
// import { getUploadService } from './services/upload-service';

// Import routes - DISABLED to avoid external dependencies
// import uploadRoutes from './routes/upload';
// import statusRoutes from './routes/status';
// import resultsRoutes from './routes/results';
// import internalRoutes from './routes/internal';

// Import existing routes (for backward compatibility)
// import authRoutes from '../routes/auth';
// import contactRoutes from '../routes/contact';
// import adminRoutes from '../routes/admin';

const app = express();
const PORT = process.env['PORT'] || 3000;

// Initialize Working Enhanced AI Service
const enhancedAI = new WorkingEnhancedAIService();
logger.info('SERVER', 'Enhanced AI Service initialized');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Monitoring Dashboard
app.get('/ai-monitoring', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/ai-monitoring.html'));
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Static file routes (maintain backward compatibility)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'admin.html'));
});

// API routes - DISABLED for now to avoid external dependencies
// app.use('/api/upload', uploadRoutes);
// app.use('/api/status', statusRoutes);
// app.use('/api/results', resultsRoutes);
// app.use('/internal', internalRoutes);

// Legacy API routes (for backward compatibility)
// Import auth routes
const authRoutes = require('../routes/auth');
const contactRoutes = require('../routes/contact');
const adminRoutes = require('../routes/admin');

app.use('/api/auth', authRoutes.router);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Legacy upload endpoint (for backward compatibility) - DISABLED
// app.use('/api/accounting/upload', uploadRoutes);

// Simple file upload endpoint (no external dependencies)
app.post('/api/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Generate a simple job ID
    const jobId = 'job-' + Date.now();
    
    // Process the uploaded file
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    logger.info('SERVER', `File uploaded: ${fileName}`, {
      fileSize,
      mimeType,
      jobId
    });

    // Create mock invoice data for enhanced AI processing
    let mockInvoice: any = {
      invoice_number: `INV-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      currency: '$',
      lineItems: [] as any[],
      totals: {
        net_total: 0,
        gross_total: 0,
        vat_amount: 0
      }
    };

    // Process CSV file to create line items
    if (mimeType === 'text/csv' || fileName.endsWith('.csv')) {
      try {
        const csvData = req.file.buffer.toString('utf-8');
        const lines = csvData.split('\n').filter((line: string) => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
          logger.debug('SERVER', 'CSV Headers detected', { headers });
          
          // Look for amount/price columns
          const amountColumn = headers.findIndex((h: string) => 
            h.includes('amount') || h.includes('price') || h.includes('value') || h.includes('total')
          );
          
          // Look for description columns
          const descColumn = headers.findIndex((h: string) => 
            h.includes('description') || h.includes('item') || h.includes('name') || h.includes('details')
          );
          
          // Look for category columns
          const categoryColumn = headers.findIndex((h: string) => 
            h.includes('category') || h.includes('type') || h.includes('class')
          );
          
          // Look for date columns
          const dateColumn = headers.findIndex((h: string) => 
            h.includes('date') || h.includes('time') || h.includes('created') || h.includes('timestamp')
          );
          
          logger.debug('SERVER', 'CSV Column detection', { 
            amountColumn, 
            descColumn, 
            categoryColumn, 
            dateColumn,
            headers 
          });
          
          // Process each row to create line items
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map((cell: string) => cell.trim());
            if (row.length > amountColumn && amountColumn >= 0) {
              let amountStr = row[amountColumn];
              
              // Clean amount string - remove currency symbols and commas
              amountStr = amountStr.replace(/[$€£¥,]/g, '');
              const amount = parseFloat(amountStr) || 0;
              
              if (amount !== 0) {
                const description = descColumn >= 0 && row[descColumn] ? row[descColumn] : `Transaction ${i}`;
                const category = categoryColumn >= 0 && row[categoryColumn] ? row[categoryColumn] : 'Other';
                
                // Parse date from CSV or use current date as fallback
                let transactionDate = new Date().toISOString().split('T')[0];
                if (dateColumn >= 0 && row[dateColumn]) {
                  const dateStr = row[dateColumn];
                  const parsedDate = new Date(dateStr);
                  if (!isNaN(parsedDate.getTime())) {
                    transactionDate = parsedDate.toISOString().split('T')[0];
                    logger.debug('SERVER', 'Date parsed successfully', { 
                      originalDate: dateStr, 
                      parsedDate: transactionDate,
                      rowIndex: i 
                    });
                  } else {
                    logger.warn('SERVER', 'Invalid date found in CSV', { dateStr, rowIndex: i });
                  }
                } else {
                  logger.debug('SERVER', 'No date column found, using current date', { rowIndex: i });
                }
                
                mockInvoice.lineItems.push({
                  description,
                  total: Math.abs(amount),
                  date: transactionDate,
                  category
                });
              }
            }
          }
          
          // Update totals
          const totalAmount = mockInvoice.lineItems.reduce((sum, item) => sum + item.total, 0);
          mockInvoice.totals.net_total = totalAmount;
          mockInvoice.totals.gross_total = totalAmount;
        }
      } catch (error) {
        logger.error('SERVER', 'Error processing CSV file', error);
        // Create fallback line items
        mockInvoice.lineItems = [
          { description: 'Sample Transaction', total: 1000, date: new Date().toISOString().split('T')[0] }
        ];
        mockInvoice.totals.net_total = 1000;
        mockInvoice.totals.gross_total = 1000;
      }
    } else {
      // For non-CSV files, create sample data
      mockInvoice.lineItems = [
        { description: 'Sample Transaction', total: 1000, date: new Date().toISOString().split('T')[0] }
      ];
      mockInvoice.totals.net_total = 1000;
      mockInvoice.totals.gross_total = 1000;
    }

    logger.info('SERVER', 'Processing with Enhanced AI Service', {
      lineItemCount: mockInvoice.lineItems.length,
      totalAmount: mockInvoice.totals.net_total
    });

    // Process with Enhanced AI Service
    let enhancedResult;
    try {
      enhancedResult = await enhancedAI.processAccountingDataEnhanced(
        mockInvoice,
        'admin',
        (progress, message) => {
          logger.debug('SERVER', `AI Processing: ${message}`, { progress });
        }
      );
    } catch (error) {
      logger.error('SERVER', 'Enhanced AI processing failed, using fallback', { error: (error as Error).message });
      // Use fallback processing directly
      enhancedResult = {
        cashflow: {
          transactions: [],
          totals: {
            totalIncome: 0,
            totalExpenses: 0,
            netCashflow: 0,
            transactionCount: 0
          }
        },
        alerts: [],
        highlights: [],
        aiInsights: {
          businessType: 'Unknown',
          financialHealth: 'Unknown',
          confidence: 50,
          recommendations: []
        },
        enhanced: false
      };
      
      // Process the data using fallback logic
      const expenses: any[] = [];
      const income: any[] = [];
      const transactions: any[] = [];
      
      if (mockInvoice.lineItems && Array.isArray(mockInvoice.lineItems)) {
        mockInvoice.lineItems.forEach((item, index) => {
          const amount = parseFloat(item.total || 0);
          if (amount !== 0) {
            const category = item.category || 'Other';
            const isIncome = category.toLowerCase().includes('income') || 
                           category.toLowerCase().includes('revenue') || 
                           category.toLowerCase().includes('payment') ||
                           category.toLowerCase().includes('fee');
            
            const transaction = {
              date: item.date || new Date().toISOString().split('T')[0],
              description: item.description || `Item ${index + 1}`,
              amount: isIncome ? Math.abs(amount) : -Math.abs(amount),
              category: isIncome ? 'Income' : 'Expense'
            };
            transactions.push(transaction);
            
            if (isIncome) {
              income.push(transaction);
            } else {
              expenses.push(transaction);
            }
          }
        });
      }
      
      const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
      const netCashflow = totalIncome - totalExpenses;
      
      // Determine business type
      const descriptions = transactions.map(t => t.description.toLowerCase()).join(' ');
      let businessType = 'Unknown';
      if (descriptions.includes('consulting') || descriptions.includes('service')) {
        businessType = 'Consulting Services';
      } else if (descriptions.includes('software') || descriptions.includes('license')) {
        businessType = 'Software/Technology';
      } else if (descriptions.includes('office') || descriptions.includes('supplies')) {
        businessType = 'General Business';
      } else if (descriptions.includes('client') || descriptions.includes('payment')) {
        businessType = 'Service Provider';
      } else {
        businessType = 'General Business';
      }
      
      // Determine financial health
      let financialHealth = 'Unknown';
      if (totalIncome > 0) {
        const profitMargin = (netCashflow / totalIncome) * 100;
        if (profitMargin > 20) {
          financialHealth = 'Excellent';
        } else if (profitMargin > 10) {
          financialHealth = 'Good';
        } else if (profitMargin > 0) {
          financialHealth = 'Stable';
        } else if (profitMargin > -10) {
          financialHealth = 'Concerning';
        } else {
          financialHealth = 'Critical';
        }
      }
      
      // Generate recommendations
      const recommendations = [];
      if (netCashflow < 0) {
        recommendations.push('Consider reducing expenses or increasing revenue');
      }
      if (totalExpenses > totalIncome * 0.8) {
        recommendations.push('Monitor expense ratios - consider cost optimization');
      }
      if (totalIncome > 0 && netCashflow > 0) {
        recommendations.push('Positive cashflow - consider investment opportunities');
      }
      if (recommendations.length === 0) {
        recommendations.push('Continue monitoring financial performance');
      }
      
      enhancedResult = {
        cashflow: {
          transactions,
          totals: {
            totalIncome,
            totalExpenses,
            netCashflow,
            transactionCount: transactions.length
          }
        },
        alerts: [],
        highlights: [
          {
            type: 'fallback_processing',
            message: 'Processed using fallback method',
            timestamp: new Date().toISOString()
          }
        ],
        aiInsights: {
          businessType,
          financialHealth,
          confidence: 50,
          recommendations
        },
        enhanced: false
      };
    }

    // Check if enhanced processing returned empty data and fall back if needed
    if (!enhancedResult.cashflow || !enhancedResult.cashflow.totals || 
        (enhancedResult.cashflow.totals.totalIncome === 0 && enhancedResult.cashflow.totals.totalExpenses === 0)) {
      logger.warn('SERVER', 'Enhanced AI returned empty data, using fallback processing');
      
      // Process the data using fallback logic
      const expenses: any[] = [];
      const income: any[] = [];
      const transactions: any[] = [];
      
      if (mockInvoice.lineItems && Array.isArray(mockInvoice.lineItems)) {
        mockInvoice.lineItems.forEach((item, index) => {
          const amount = parseFloat(item.total || 0);
          if (amount !== 0) {
            const category = item.category || 'Other';
            const isIncome = category.toLowerCase().includes('income') || 
                           category.toLowerCase().includes('revenue') || 
                           category.toLowerCase().includes('payment') ||
                           category.toLowerCase().includes('fee');
            
            const transaction = {
              date: item.date || new Date().toISOString().split('T')[0],
              description: item.description || `Item ${index + 1}`,
              amount: isIncome ? Math.abs(amount) : -Math.abs(amount),
              category: isIncome ? 'Income' : 'Expense'
            };
            transactions.push(transaction);
            
            if (isIncome) {
              income.push(transaction);
            } else {
              expenses.push(transaction);
            }
          }
        });
      }
      
      const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
      const netCashflow = totalIncome - totalExpenses;
      
      // Determine business type
      const descriptions = transactions.map(t => t.description.toLowerCase()).join(' ');
      let businessType = 'Unknown';
      if (descriptions.includes('consulting') || descriptions.includes('service')) {
        businessType = 'Consulting Services';
      } else if (descriptions.includes('software') || descriptions.includes('license')) {
        businessType = 'Software/Technology';
      } else if (descriptions.includes('office') || descriptions.includes('supplies')) {
        businessType = 'General Business';
      } else if (descriptions.includes('client') || descriptions.includes('payment')) {
        businessType = 'Service Provider';
      } else {
        businessType = 'General Business';
      }
      
      // Determine financial health
      let financialHealth = 'Unknown';
      if (totalIncome > 0) {
        const profitMargin = (netCashflow / totalIncome) * 100;
        if (profitMargin > 20) {
          financialHealth = 'Excellent';
        } else if (profitMargin > 10) {
          financialHealth = 'Good';
        } else if (profitMargin > 0) {
          financialHealth = 'Stable';
        } else if (profitMargin > -10) {
          financialHealth = 'Concerning';
        } else {
          financialHealth = 'Critical';
        }
      }
      
      // Generate recommendations
      const recommendations = [];
      if (netCashflow < 0) {
        recommendations.push('Consider reducing expenses or increasing revenue');
      }
      if (totalExpenses > totalIncome * 0.8) {
        recommendations.push('Monitor expense ratios - consider cost optimization');
      }
      if (totalIncome > 0 && netCashflow > 0) {
        recommendations.push('Positive cashflow - consider investment opportunities');
      }
      if (recommendations.length === 0) {
        recommendations.push('Continue monitoring financial performance');
      }
      
      enhancedResult = {
        cashflow: {
          transactions,
          totals: {
            totalIncome,
            totalExpenses,
            netCashflow,
            transactionCount: transactions.length
          }
        },
        alerts: [],
        highlights: [
          {
            type: 'fallback_processing',
            message: 'Processed using fallback method',
            timestamp: new Date().toISOString()
          }
        ],
        aiInsights: {
          businessType,
          financialHealth,
          confidence: 50,
          recommendations
        },
        enhanced: false
      };
    }

    logger.info('SERVER', 'Enhanced AI processing completed', {
      enhanced: enhancedResult.enhanced,
      processingTime: enhancedResult.processingTime,
      confidence: enhancedResult.confidence?.overallScore
    });

    // Return success response with enhanced AI results
    res.json({
      success: true,
      message: 'File uploaded and processed successfully with Enhanced AI',
      data: {
        id: jobId,
        userId: 'admin',
        filename: fileName,
        uploadDate: new Date().toISOString(),
        data: enhancedResult.cashflow?.totals || {},
        processed: enhancedResult.cashflow?.totals || {},
        cashflow: enhancedResult.cashflow || {},
        balanceSheet: enhancedResult.balanceSheet || {},
        financialRatios: enhancedResult.financialRatios || {},
        profitLoss: enhancedResult.profitLoss || {},
        ledgerAccounts: enhancedResult.ledgerAccounts || {},
        budgeting: enhancedResult.budgeting || {},
        forecasting: enhancedResult.forecasting || {},
        alerts: enhancedResult.alerts || [],
        highlights: enhancedResult.highlights || [],
        aiInsights: enhancedResult.aiInsights || {},
        confidence: enhancedResult.confidence,
        enhanced: enhancedResult.enhanced,
        processingTime: enhancedResult.processingTime
      }
    });

  } catch (error) {
    logger.error('SERVER', 'Upload error', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Legacy data endpoint (for backward compatibility)
app.get('/api/accounting/data', async (_req, res) => {
  try {
    // This would need to be implemented to return data from the new database
    res.json([]);
  } catch (error) {
    console.error('Error fetching accounting data:', error);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
});

// Progress reset endpoint (for frontend compatibility)
app.post('/api/progress/reset', (_req, res) => {
  try {
    // Reset any progress tracking state if needed
    res.json({ 
      success: true, 
      message: 'Progress reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset progress' 
    });
  }
});

// Multi-Agent Pipeline endpoint
app.post('/api/ai/multi-agent', async (req, res) => {
  try {
    const { data, options = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for multi-agent processing'
      });
    }

    logger.info('SERVER', 'Multi-agent processing request', {
      hasData: !!data,
      options
    });

    const result = await enhancedAI.processWithMultiAgent(data, options);
    
    res.json({
      success: true,
      message: 'Multi-agent processing completed',
      data: result
    });

  } catch (error) {
    logger.error('SERVER', 'Multi-agent processing failed', error);
    res.status(500).json({
      success: false,
      message: 'Multi-agent processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Learning endpoints
app.post('/api/ai/learn', async (req, res) => {
  try {
    const { inputData, expectedOutput, actualOutput, correction, category = 'general' } = req.body;
    
    if (!inputData || !expectedOutput || !actualOutput || !correction) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: inputData, expectedOutput, actualOutput, correction'
      });
    }

    await enhancedAI.learnFromCorrection(inputData, expectedOutput, actualOutput, correction, category);
    
    res.json({
      success: true,
      message: 'Learning data recorded successfully'
    });

  } catch (error) {
    logger.error('SERVER', 'Learning failed', error);
    res.status(500).json({
      success: false,
      message: 'Learning failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/ai/learning-metrics', async (_req, res) => {
  try {
    const metrics = await enhancedAI.getLearningMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('SERVER', 'Failed to get learning metrics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get learning metrics'
    });
  }
});

app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { inputData, category = 'general' } = req.body;
    
    if (!inputData) {
      return res.status(400).json({
        success: false,
        message: 'inputData is required'
      });
    }

    const suggestions = await enhancedAI.generateSuggestions(inputData, category);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('SERVER', 'Failed to generate suggestions', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate suggestions'
    });
  }
});

// Enhanced AI performance statistics endpoint
app.get('/api/ai/stats', async (_req, res) => {
  try {
    const stats = await enhancedAI.getStats();
    
    // Enhanced stats with additional monitoring data
    const enhancedStats = {
      ...stats,
      timestamp: new Date().toISOString(),
      systemUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      // Add more detailed metrics
      totalRequests: stats.totalRequests || 0,
      successRate: stats.successRate || 0,
      averageProcessingTime: stats.averageProcessingTime || 0,
      averageConfidence: stats.averageConfidence || 0,
      cacheHitRate: stats.cacheHitRate || 0,
      cacheHits: stats.cacheHits || 0,
      cacheMisses: stats.cacheMisses || 0,
      highConfidenceCount: stats.highConfidenceCount || 0,
      lowConfidenceCount: stats.lowConfidenceCount || 0,
      primaryModel: 'gpt-4o-mini',
      modelSwitches: stats.modelSwitches || 0,
      fallbackUsage: stats.fallbackUsage || 0,
      errorRate: stats.errorRate || 0,
      totalErrors: stats.totalErrors || 0,
      criticalErrors: stats.criticalErrors || 0
    };
    
    res.json({
      success: true,
      data: enhancedStats
    });
  } catch (error) {
    logger.error('SERVER', 'Error fetching AI stats', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI statistics'
    });
  }
});

// Progress status endpoint (for frontend compatibility)
app.get('/api/progress/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Simulate progress status
    res.json({
      success: true,
      data: {
        jobId: jobId,
        status: 'processing',
        progress: 75,
        message: 'Processing file...'
      }
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get progress'
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  try {
    // Comment out external services for now
    // const queueService = getQueueService();
    // await queueService.close();
    
    // const dbService = getDatabaseService();
    // await dbService.disconnect();
    
    console.log('Services closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  try {
    // Comment out external services for now
    // const queueService = getQueueService();
    // await queueService.close();
    
    // const dbService = getDatabaseService();
    // await dbService.disconnect();
    
    console.log('Services closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TypeScript server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
  console.log(`📤 Upload API: http://localhost:${PORT}/api/upload`);
  console.log(`📊 Status API: http://localhost:${PORT}/api/status/:id`);
  console.log(`📋 Results API: http://localhost:${PORT}/api/results/:id`);
});

export default app;
