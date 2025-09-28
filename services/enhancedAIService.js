const OpenAI = require('openai');
const config = require('../config');
const logger = require('./logger');
const IntelligentModelSelector = require('./intelligentModelSelector');
const SmartCache = require('./smartCache');
const ParallelProcessingEngine = require('./parallelProcessingEngine');
const ConfidenceScoringSystem = require('./confidenceScoringSystem');
const Validator = require('./validator');
const JSONParser = require('./jsonParser');

/**
 * Enhanced AI Service with intelligent optimizations
 * Implements smart model selection, caching, parallel processing, and confidence scoring
 */
class EnhancedAIService {
    constructor() {
        this.isAvailable = config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_openai_api_key_here';
        this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        
        // Initialize enhancement systems
        this.modelSelector = new IntelligentModelSelector();
        this.cache = new SmartCache({
            similarityThreshold: 0.85,
            maxCacheSize: 1000,
            defaultTTL: 3600000 // 1 hour
        });
        this.parallelProcessor = new ParallelProcessingEngine({
            maxConcurrency: 5,
            timeoutMs: 30000,
            retryAttempts: 2
        });
        this.confidenceScorer = new ConfidenceScoringSystem();
        this.validator = Validator;
        this.jsonParser = new JSONParser();
        
        // Performance tracking
        this.performanceStats = {
            totalRequests: 0,
            cacheHits: 0,
            averageProcessingTime: 0,
            averageConfidence: 0
        };
    }

    /**
     * Enhanced processing with all optimizations
     */
    async processAccountingDataEnhanced(parsedInvoice, progressCallback = null) {
        const startTime = Date.now();
        this.performanceStats.totalRequests++;
        
        logger.info('ENHANCED_AI_SERVICE', 'Starting enhanced processing', {
            hasLineItems: !!parsedInvoice.lineItems,
            lineItemCount: parsedInvoice.lineItems?.length || 0
        });

        try {
            // Step 1: Check cache first
            if (progressCallback) progressCallback(5, 'Checking cache...');
            const cacheKey = this.generateCacheKey(parsedInvoice);
            const cachedResult = await this.cache.getCachedResult(parsedInvoice, 'comprehensive_analysis');
            
            if (cachedResult) {
                this.performanceStats.cacheHits++;
                logger.info('ENHANCED_AI_SERVICE', 'Cache hit - returning cached result');
                if (progressCallback) progressCallback(100, 'Returning cached result');
                return cachedResult;
            }

            // Step 2: Analyze data complexity
            if (progressCallback) progressCallback(10, 'Analyzing data complexity...');
            const dataComplexity = this.analyzeDataComplexity(parsedInvoice);
            logger.debug('ENHANCED_AI_SERVICE', `Data complexity: ${dataComplexity}`);

            // Step 3: Create parallel processing tasks
            if (progressCallback) progressCallback(15, 'Preparing parallel tasks...');
            const tasks = this.createProcessingTasks(parsedInvoice, dataComplexity);
            
            // Step 4: Execute tasks in parallel
            if (progressCallback) progressCallback(20, 'Processing tasks in parallel...');
            const processingResults = await this.parallelProcessor.processConcurrently(tasks);
            
            if (processingResults.errors.size > 0) {
                logger.warn('ENHANCED_AI_SERVICE', 'Some tasks failed, using fallback', {
                    errorCount: processingResults.errors.size
                });
                return this.fallbackProcessing(parsedInvoice);
            }

            // Step 5: Merge results
            if (progressCallback) progressCallback(80, 'Merging results...');
            const mergedResult = this.mergeProcessingResults(processingResults.results);
            
            // Check if merge was successful
            if (!mergedResult || Object.keys(mergedResult).length === 0) {
                throw new Error('Failed to merge processing results - empty result');
            }
            
            // Step 6: Calculate confidence score
            if (progressCallback) progressCallback(90, 'Calculating confidence...');
            let confidenceAssessment;
            try {
                confidenceAssessment = this.confidenceScorer.calculateConfidence(mergedResult, {
                    userId: 'admin',
                    dataComplexity
                });
                logger.debug('ENHANCED_AI_SERVICE', 'Confidence calculation successful', {
                    overallScore: confidenceAssessment.overallScore,
                    confidenceLevel: confidenceAssessment.confidenceLevel
                });
            } catch (confidenceError) {
                logger.warn('ENHANCED_AI_SERVICE', 'Confidence calculation failed, using default', {
                    error: confidenceError.message
                });
                confidenceAssessment = {
                    overallScore: 0.5,
                    confidenceLevel: 'medium',
                    scores: {},
                    recommendations: []
                };
            }
            
            // Step 7: Cache result
            if (progressCallback) progressCallback(95, 'Caching result...');
            await this.cache.setCachedResult(parsedInvoice, mergedResult, 'comprehensive_analysis');
            
            // Step 8: Update performance stats
            const processingTime = Date.now() - startTime;
            this.updatePerformanceStats(processingTime, confidenceAssessment.overallScore);
            
            if (progressCallback) progressCallback(100, 'Processing complete!');
            
            logger.info('ENHANCED_AI_SERVICE', 'Enhanced processing completed', {
                processingTime,
                confidence: confidenceAssessment.overallScore,
                confidenceLevel: confidenceAssessment.confidenceLevel
            });

            return {
                ...mergedResult,
                confidence: confidenceAssessment,
                processingTime,
                enhanced: true
            };

        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', 'Enhanced processing failed, using fallback', {
                error: error.message,
                stack: error.stack,
                step: 'main_processing'
            });
            return this.fallbackProcessing(parsedInvoice);
        }
    }

    /**
     * Generate cache key for data
     */
    generateCacheKey(data) {
        const normalized = this.normalizeDataForCaching(data);
        return JSON.stringify(normalized, Object.keys(normalized).sort());
    }

    /**
     * Normalize data for consistent caching
     */
    normalizeDataForCaching(data) {
        if (data.lineItems && Array.isArray(data.lineItems)) {
            return {
                lineItemCount: data.lineItems.length,
                sampleItems: data.lineItems.slice(0, 3).map(item => ({
                    description: item.description,
                    amount: item.total
                })),
                totals: data.totals,
                currency: data.currency
            };
        }
        return data;
    }

    /**
     * Analyze data complexity (0-1 scale)
     */
    analyzeDataComplexity(parsedInvoice) {
        let complexity = 0;
        
        // Base complexity from line items
        const lineItemCount = parsedInvoice.lineItems?.length || 0;
        complexity += Math.min(lineItemCount / 100, 0.3); // Max 0.3 for line items
        
        // Complexity from data variety
        if (parsedInvoice.lineItems && Array.isArray(parsedInvoice.lineItems)) {
            const descriptions = parsedInvoice.lineItems.map(item => item.description || '');
            const uniqueDescriptions = new Set(descriptions).size;
            complexity += Math.min(uniqueDescriptions / lineItemCount, 0.2);
            
            // Complexity from amount variance
            const amounts = parsedInvoice.lineItems.map(item => Math.abs(item.total || 0));
            if (amounts.length > 0) {
                const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
                const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
                const coefficientOfVariation = Math.sqrt(variance) / avgAmount;
                complexity += Math.min(coefficientOfVariation / 2, 0.2);
            }
        }
        
        // Complexity from missing data
        const requiredFields = ['invoice_number', 'date', 'currency', 'totals'];
        const missingFields = requiredFields.filter(field => !parsedInvoice[field]);
        complexity += missingFields.length * 0.1;
        
        return Math.min(complexity, 1.0);
    }

    /**
     * Create processing tasks for parallel execution
     */
    createProcessingTasks(parsedInvoice, dataComplexity) {
        const tasks = [];
        
        // Task 1: Extract raw data
        tasks.push(this.parallelProcessor.constructor.createTask(
            'extract_data',
            async () => await this.extractRawData(parsedInvoice),
            [],
            true // Critical task
        ));
        
        // Task 2: Categorize transactions
        tasks.push(this.parallelProcessor.constructor.createTask(
            'categorize_transactions',
            async (deps) => await this.categorizeTransactions(deps.extract_data, dataComplexity),
            ['extract_data'],
            true
        ));
        
        // Task 3: Generate insights
        tasks.push(this.parallelProcessor.constructor.createTask(
            'generate_insights',
            async (deps) => await this.generateInsights(deps.extract_data, dataComplexity),
            ['extract_data'],
            false
        ));
        
        // Task 4: Validate data
        tasks.push(this.parallelProcessor.constructor.createTask(
            'validate_data',
            async (deps) => await this.validateData(deps.extract_data, deps.categorize_transactions),
            ['extract_data', 'categorize_transactions'],
            true
        ));
        
        return tasks;
    }

    /**
     * Extract raw data using intelligent model selection
     */
    async extractRawData(parsedInvoice) {
        const model = this.modelSelector.selectModel('extraction', 0.3, 0.8, 5);
        const temperature = this.modelSelector.getOptimalTemperature('extraction', 0.3);
        const maxTokens = this.modelSelector.getOptimalMaxTokens('extraction', 0.3, model);
        
        logger.debug('ENHANCED_AI_SERVICE', `Using model ${model} for extraction`, {
            temperature,
            maxTokens
        });

        const prompt = this.buildExtractionPrompt(parsedInvoice);
        
        try {
            const response = await this.openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: "You are a financial data extraction expert. Extract data accurately and return valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature,
                max_tokens: maxTokens
            });

            const content = response.choices[0].message.content.trim();
            const extractedData = await this.safeJsonParse(content, null, 'Data extraction');
            
            return {
                success: true,
                data: extractedData,
                model,
                tokens: response.usage?.total_tokens || 0
            };
        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', 'Data extraction failed', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Categorize transactions using intelligent model selection
     */
    async categorizeTransactions(extractResult, dataComplexity) {
        if (!extractResult.success || !extractResult.data) {
            return { success: false, error: 'No data to categorize' };
        }

        const model = this.modelSelector.selectModel('categorization', dataComplexity, 0.8, 3);
        const temperature = this.modelSelector.getOptimalTemperature('categorization', dataComplexity);
        const maxTokens = this.modelSelector.getOptimalMaxTokens('categorization', dataComplexity, model);
        
        const transactions = extractResult.data.transactions || [];
        const prompt = this.buildCategorizationPrompt(transactions);
        
        try {
            const response = await this.openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: "You are a financial categorization expert. Categorize transactions accurately and return valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature,
                max_tokens: maxTokens
            });

            const content = response.choices[0].message.content.trim();
            const categorizedData = await this.safeJsonParse(content, null, 'Transaction categorization');
            
            return {
                success: true,
                data: categorizedData,
                model,
                tokens: response.usage?.total_tokens || 0
            };
        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', 'Transaction categorization failed', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Generate insights using intelligent model selection
     */
    async generateInsights(extractResult, dataComplexity) {
        if (!extractResult.success || !extractResult.data) {
            return { success: false, error: 'No data to analyze' };
        }

        const model = this.modelSelector.selectModel('insights', dataComplexity, 0.9, 10);
        const temperature = this.modelSelector.getOptimalTemperature('insights', dataComplexity);
        const maxTokens = this.modelSelector.getOptimalMaxTokens('insights', dataComplexity, model);
        
        const prompt = this.buildInsightsPrompt(extractResult.data);
        
        try {
            const response = await this.openai.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: "You are a financial analyst. Provide accurate insights and recommendations. Always respond with valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature,
                max_tokens: maxTokens
            });

            const content = response.choices[0].message.content.trim();
            const insights = await this.safeJsonParse(content, null, 'Insights generation');
            
            return {
                success: true,
                data: insights,
                model,
                tokens: response.usage?.total_tokens || 0
            };
        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', 'Insights generation failed', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Validate data using enhanced validation
     */
    async validateData(extractResult, categorizeResult) {
        const validation = this.validator.validateFinancialData(extractResult.data);
        
        return {
            success: true,
            data: {
                isValid: validation.isValid,
                confidence: validation.confidence,
                issues: validation.issues,
                correctedData: validation.correctedData
            }
        };
    }

    /**
     * Merge processing results from parallel tasks
     */
    mergeProcessingResults(results) {
        logger.debug('ENHANCED_AI_SERVICE', 'Merging processing results', {
            resultKeys: Array.from(results.keys()),
            resultCount: results.size
        });

        const extractResult = results.get('extract_data');
        const categorizeResult = results.get('categorize_transactions');
        const insightsResult = results.get('generate_insights');
        const validateResult = results.get('validate_data');
        
        logger.debug('ENHANCED_AI_SERVICE', 'Individual task results', {
            extractSuccess: extractResult?.success,
            categorizeSuccess: categorizeResult?.success,
            insightsSuccess: insightsResult?.success,
            validateSuccess: validateResult?.success
        });
        
        // Start with extracted data
        let mergedResult = extractResult?.data || {};
        
        // Add categorized transactions
        if (categorizeResult?.success && categorizeResult.data) {
            mergedResult.transactions = categorizeResult.data.transactions || mergedResult.transactions;
            logger.debug('ENHANCED_AI_SERVICE', 'Added categorized transactions', {
                transactionCount: mergedResult.transactions?.length || 0
            });
        }
        
        // Add insights
        if (insightsResult?.success && insightsResult.data) {
            mergedResult.aiInsights = insightsResult.data.insights || {};
            mergedResult.alerts = insightsResult.data.alerts || [];
            mergedResult.highlights = insightsResult.data.highlights || [];
            logger.debug('ENHANCED_AI_SERVICE', 'Added insights', {
                alertsCount: mergedResult.alerts.length,
                highlightsCount: mergedResult.highlights.length
            });
        }
        
        // Add validation results
        if (validateResult?.success && validateResult.data) {
            mergedResult.validation = validateResult.data;
            if (validateResult.data.correctedData) {
                mergedResult = { ...mergedResult, ...validateResult.data.correctedData };
            }
            logger.debug('ENHANCED_AI_SERVICE', 'Added validation results');
        }
        
        // Ensure required structure
        if (!mergedResult.cashflow) {
            mergedResult.cashflow = {
                transactions: mergedResult.transactions || [],
                totals: mergedResult.totals || {}
            };
        }
        
        logger.debug('ENHANCED_AI_SERVICE', 'Final merged result structure', {
            hasCashflow: !!mergedResult.cashflow,
            hasTransactions: !!mergedResult.transactions,
            hasTotals: !!mergedResult.totals,
            hasAlerts: !!mergedResult.alerts,
            hasHighlights: !!mergedResult.highlights,
            hasAiInsights: !!mergedResult.aiInsights
        });
        
        return mergedResult;
    }

    /**
     * Build extraction prompt
     */
    buildExtractionPrompt(parsedInvoice) {
        const { lineItems = [], totals = {}, currency = '€' } = parsedInvoice;
        
        return `Extract financial data from this invoice information:

Line Items: ${JSON.stringify(lineItems.slice(0, 5), null, 2)}
Totals: ${JSON.stringify(totals, null, 2)}
Currency: ${currency}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations. Just the raw JSON object.

{
  "transactions": [
    {
      "date": "string",
      "description": "string", 
      "amount": number,
      "category": "string"
    }
  ],
  "totals": {
    "totalIncome": number,
    "totalExpenses": number,
    "netCashflow": number
  }
}`;
    }

    /**
     * Build categorization prompt
     */
    buildCategorizationPrompt(transactions) {
        return `Categorize these financial transactions:

${JSON.stringify(transactions.slice(0, 10), null, 2)}

IMPORTANT: Return ONLY valid JSON array, no markdown formatting, no code blocks, no explanations. Just the raw JSON array.

[
  {
    "date": "string",
    "description": "string",
    "amount": number,
    "category": "Income|Expenses|Assets|Liabilities|Other"
  }
]`;
    }

    /**
     * Build insights prompt
     */
    buildInsightsPrompt(data) {
        return `Analyze this financial data and provide insights:

${JSON.stringify(data, null, 2)}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations. Just the raw JSON object.

{
  "insights": {
    "businessType": "string",
    "spendingPatterns": "string",
    "financialHealth": "string",
    "recommendations": ["string"],
    "riskFactors": ["string"]
  },
  "alerts": [
    {
      "type": "string",
      "severity": "low|medium|high",
      "message": "string",
      "amount": number,
      "category": "string"
    }
  ],
  "highlights": [
    {
      "type": "string",
      "message": "string",
      "timestamp": "string"
    }
  ]
}`;
    }

    /**
     * Safe JSON parsing with retry and markdown handling
     */
    async safeJsonParse(jsonString, fallback = null, context = 'JSON parsing') {
        try {
            // Clean up markdown code blocks
            let cleanedJson = jsonString.trim();
            if (cleanedJson.startsWith('```json')) {
                cleanedJson = cleanedJson.replace(/```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedJson.startsWith('```')) {
                cleanedJson = cleanedJson.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Try direct parsing first
            try {
                const directResult = JSON.parse(cleanedJson);
                logger.debug('ENHANCED_AI_SERVICE', `Direct JSON parse successful for ${context}`);
                return directResult;
            } catch (directError) {
                // Fall back to retry parser
                const result = await this.jsonParser.parseWithRetry(cleanedJson, context);
                if (result.success) {
                    return result.data;
                } else {
                    logger.warn('ENHANCED_AI_SERVICE', `JSON parsing failed for ${context}`, {
                        method: result.method,
                        error: result.error,
                        cleanedJson: cleanedJson.substring(0, 100)
                    });
                    return fallback;
                }
            }
        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', `JSON parsing error for ${context}`, error);
            return fallback;
        }
    }

    /**
     * Fallback processing for when enhanced processing fails
     */
    fallbackProcessing(parsedInvoice) {
        logger.info('ENHANCED_AI_SERVICE', 'Using fallback processing');
        
        const expenses = [];
        const income = [];
        const transactions = [];
        
        if (parsedInvoice.lineItems && Array.isArray(parsedInvoice.lineItems)) {
            parsedInvoice.lineItems.forEach((item, index) => {
                const amount = parseFloat(item.total || 0);
                if (amount !== 0) {
                    const transaction = {
                        date: item.date || new Date().toISOString().split('T')[0],
                        description: item.description || `Item ${index + 1}`,
                        amount: -Math.abs(amount), // Make negative for expenses
                        category: 'Other'
                    };
                    transactions.push(transaction);
                    expenses.push(transaction);
                }
            });
        }
        
        const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const netCashflow = totalIncome - totalExpenses;
        
        return {
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
                businessType: "Unknown",
                confidence: 50
            },
            enhanced: false
        };
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(processingTime, confidence) {
        const currentAvg = this.performanceStats.averageProcessingTime;
        const requestCount = this.performanceStats.totalRequests;
        
        this.performanceStats.averageProcessingTime = 
            (currentAvg * (requestCount - 1) + processingTime) / requestCount;
        
        const currentConfidenceAvg = this.performanceStats.averageConfidence;
        this.performanceStats.averageConfidence = 
            (currentConfidenceAvg * (requestCount - 1) + confidence) / requestCount;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            cacheHitRate: this.performanceStats.cacheHits / this.performanceStats.totalRequests,
            cacheStats: this.cache.getStats()
        };
    }
}

module.exports = EnhancedAIService;
