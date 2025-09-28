import OpenAI from 'openai';
import { config } from '../config';
import { logger } from './logger';
import { IntelligentModelSelector } from './intelligentModelSelector';
import { SmartCache } from './smartCache';
import { ParallelProcessingEngine } from './parallelProcessingEngine';
import { ConfidenceScoringSystem } from './confidenceScoringSystem';
import { MultiAgentPipeline } from './multiAgentPipeline';
import { AdaptiveLearningSystem } from './adaptiveLearningSystem';
import { validator } from './validator';
import { jsonParser } from './jsonParser';

/**
 * Enhanced AI Service with intelligent optimizations
 * Implements smart model selection, caching, parallel processing, and confidence scoring
 */
export class EnhancedAIService {
    private isAvailable: boolean;
    private openai: OpenAI;
    private modelSelector: IntelligentModelSelector;
    private cache: SmartCache;
    private parallelProcessor: ParallelProcessingEngine;
    private confidenceScorer: ConfidenceScoringSystem;
    private multiAgentPipeline: MultiAgentPipeline;
    private adaptiveLearning: AdaptiveLearningSystem;
    private validator: any;
    private jsonParser: any;
    
    // Performance tracking
    private performanceStats = {
        totalRequests: 0,
        cacheHits: 0,
        averageProcessingTime: 0,
        averageConfidence: 0
    };

    constructor() {
        this.isAvailable = config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_openai_api_key_here' && config.OPENAI_API_KEY.startsWith('sk-');
        this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        
        // Debug log to verify API key
        logger.info('ENHANCED_AI_SERVICE', 'API Key check', {
            hasKey: !!config.OPENAI_API_KEY,
            keyPrefix: config.OPENAI_API_KEY?.substring(0, 10),
            isAvailable: this.isAvailable
        });
        
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
        this.multiAgentPipeline = new MultiAgentPipeline();
        this.adaptiveLearning = new AdaptiveLearningSystem();
        this.validator = validator;
        this.jsonParser = jsonParser;
    }

    /**
     * Enhanced processing with all optimizations
     */
    async processAccountingDataEnhanced(parsedInvoice: any, userId: string, progressCallback?: (progress: number, message: string) => void) {
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
    private generateCacheKey(data: any): string {
        const normalized = this.normalizeDataForCaching(data);
        return JSON.stringify(normalized, Object.keys(normalized).sort());
    }

    /**
     * Normalize data for consistent caching
     */
    private normalizeDataForCaching(data: any): any {
        if (data.lineItems && Array.isArray(data.lineItems)) {
            return {
                lineItemCount: data.lineItems.length,
                sampleItems: data.lineItems.slice(0, 3).map((item: any) => ({
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
    private analyzeDataComplexity(parsedInvoice: any): number {
        let complexity = 0;
        
        // Base complexity from line items
        const lineItemCount = parsedInvoice.lineItems?.length || 0;
        complexity += Math.min(lineItemCount / 100, 0.3); // Max 0.3 for line items
        
        // Complexity from data variety
        if (parsedInvoice.lineItems && Array.isArray(parsedInvoice.lineItems)) {
            const descriptions = parsedInvoice.lineItems.map((item: any) => item.description || '');
            const uniqueDescriptions = new Set(descriptions).size;
            complexity += Math.min(uniqueDescriptions / lineItemCount, 0.2);
            
            // Complexity from amount variance
            const amounts = parsedInvoice.lineItems.map((item: any) => Math.abs(item.total || 0));
            if (amounts.length > 0) {
                const avgAmount = amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length;
                const variance = amounts.reduce((sum: number, amt: number) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length;
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
    private createProcessingTasks(parsedInvoice: any, dataComplexity: number): any[] {
        const tasks = [];
        
        // Task 1: Extract raw data
        tasks.push(ParallelProcessingEngine.createTask(
            'extract_data',
            async () => await this.extractRawData(parsedInvoice),
            [],
            true // Critical task
        ));
        
        // Task 2: Categorize transactions (depends on extract_data)
        tasks.push(ParallelProcessingEngine.createTask(
            'categorize_transactions',
            async (extractData: any) => {
                if (!extractData) {
                    logger.warn('ENHANCED_AI_SERVICE', 'No extract data for categorization, skipping');
                    return { success: false, error: 'No extract data available' };
                }
                return await this.categorizeTransactions(extractData, dataComplexity);
            },
            ['extract_data'],
            false // Non-critical, can fail
        ));
        
        // Task 3: Generate insights (depends on extract_data)
        tasks.push(ParallelProcessingEngine.createTask(
            'generate_insights',
            async (extractData: any) => {
                if (!extractData) {
                    logger.warn('ENHANCED_AI_SERVICE', 'No extract data for insights, skipping');
                    return { success: false, error: 'No extract data available' };
                }
                return await this.generateInsights(extractData, dataComplexity);
            },
            ['extract_data'],
            false // Non-critical, can fail
        ));
        
        // Task 4: Validate data (depends on extract_data and categorize_transactions)
        tasks.push(ParallelProcessingEngine.createTask(
            'validate_data',
            async (extractData: any, categorizeData: any) => {
                if (!extractData) {
                    logger.warn('ENHANCED_AI_SERVICE', 'No extract data for validation, skipping');
                    return { success: false, error: 'No extract data available' };
                }
                return await this.validateData(extractData, categorizeData);
            },
            ['extract_data', 'categorize_transactions'],
            false // Non-critical, can fail
        ));
        
        return tasks;
    }

    /**
     * Extract raw data using intelligent model selection
     */
    private async extractRawData(parsedInvoice: any): Promise<any> {
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

            const content = response.choices[0].message.content?.trim() || '';
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
    private async categorizeTransactions(extractResult: any, dataComplexity: number): Promise<any> {
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

            const content = response.choices[0].message.content?.trim() || '';
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
    private async generateInsights(extractResult: any, dataComplexity: number): Promise<any> {
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

            const content = response.choices[0].message.content?.trim() || '';
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
    private async validateData(extractResult: any, categorizeResult: any): Promise<any> {
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
    private mergeProcessingResults(results: Map<string, any>): any {
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
        
        // Start with extracted data - the actual data is in extractResult.data
        let mergedResult = extractResult?.data || {};
        
        logger.debug('ENHANCED_AI_SERVICE', 'Raw extract result', {
            hasExtractResult: !!extractResult,
            extractSuccess: extractResult?.success,
            hasData: !!extractResult?.data,
            dataKeys: extractResult?.data ? Object.keys(extractResult.data) : []
        });
        
        // Extract and structure the data properly
        const transactions = mergedResult.transactions || [];
        const totals = mergedResult.totals || {};
        const businessType = mergedResult.businessType || "Unknown";
        const financialHealth = mergedResult.financialHealth || "Unknown";
        
        logger.debug('ENHANCED_AI_SERVICE', 'Raw extracted data', {
            hasData: !!extractResult?.data,
            dataKeys: extractResult?.data ? Object.keys(extractResult.data) : [],
            transactionsCount: transactions.length,
            totalsKeys: Object.keys(totals),
            businessType,
            financialHealth
        });
        
        logger.debug('ENHANCED_AI_SERVICE', 'Extracted data from AI', {
            transactionCount: transactions.length,
            totalIncome: totals.totalIncome,
            totalExpenses: totals.totalExpenses,
            netCashflow: totals.netCashflow,
            businessType,
            financialHealth,
            rawMergedResult: mergedResult
        });
        
        // Add categorized transactions (if available)
        if (categorizeResult?.success && categorizeResult.data) {
            mergedResult.transactions = categorizeResult.data.transactions || transactions;
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
        
        // Ensure required structure with proper data
        mergedResult.cashflow = {
            transactions: transactions,
            totals: {
                totalIncome: totals.totalIncome || 0,
                totalExpenses: totals.totalExpenses || 0,
                netCashflow: totals.netCashflow || 0,
                transactionCount: transactions.length
            }
        };
        
        // Add business insights
        mergedResult.aiInsights = {
            businessType,
            financialHealth,
            recommendations: mergedResult.aiInsights?.recommendations || []
        };
        
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
    private buildExtractionPrompt(parsedInvoice: any): string {
        const { lineItems = [], totals = {}, currency = '€' } = parsedInvoice;
        
        return `Extract and categorize financial data from these transactions:

Line Items: ${JSON.stringify(lineItems.slice(0, 10), null, 2)}

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations. Just the raw JSON object.

Analyze each transaction and categorize it as Income or Expense based on the description. Calculate totals accordingly.

{
  "transactions": [
    {
      "date": "string",
      "description": "string", 
      "amount": number,
      "category": "Income|Expense"
    }
  ],
  "totals": {
    "totalIncome": number,
    "totalExpenses": number,
    "netCashflow": number
  },
  "businessType": "string",
  "financialHealth": "string"
}`;
    }

    /**
     * Build categorization prompt
     */
    private buildCategorizationPrompt(transactions: any[]): string {
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
    private buildInsightsPrompt(data: any): string {
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
    private async safeJsonParse(jsonString: string, fallback: any = null, context: string = 'JSON parsing'): Promise<any> {
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
    private fallbackProcessing(parsedInvoice: any): any {
        logger.info('ENHANCED_AI_SERVICE', 'Using fallback processing');
        
        const expenses = [];
        const income = [];
        const transactions = [];
        
        if (parsedInvoice.lineItems && Array.isArray(parsedInvoice.lineItems)) {
            parsedInvoice.lineItems.forEach((item: any, index: number) => {
                const amount = parseFloat(item.total || 0);
                if (amount !== 0) {
                    // Determine if this is income or expense based on category or amount
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
        
        const totalExpenses = expenses.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
        const totalIncome = income.reduce((sum: number, t: any) => sum + t.amount, 0);
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
                businessType: this.determineBusinessType(transactions),
                financialHealth: this.determineFinancialHealth(netCashflow, totalIncome, totalExpenses),
                confidence: 50,
                recommendations: this.generateBasicRecommendations(netCashflow, totalIncome, totalExpenses)
            },
            enhanced: false
        };
    }

    /**
     * Determine business type based on transaction patterns
     */
    private determineBusinessType(transactions: any[]): string {
        if (transactions.length === 0) return 'Unknown';
        
        const descriptions = transactions.map(t => t.description.toLowerCase()).join(' ');
        
        if (descriptions.includes('consulting') || descriptions.includes('service')) {
            return 'Consulting Services';
        } else if (descriptions.includes('software') || descriptions.includes('license')) {
            return 'Software/Technology';
        } else if (descriptions.includes('office') || descriptions.includes('supplies')) {
            return 'General Business';
        } else if (descriptions.includes('client') || descriptions.includes('payment')) {
            return 'Service Provider';
        } else {
            return 'General Business';
        }
    }

    /**
     * Determine financial health based on cashflow metrics
     */
    private determineFinancialHealth(netCashflow: number, totalIncome: number, totalExpenses: number): string {
        if (totalIncome === 0) return 'Unknown';
        
        const profitMargin = (netCashflow / totalIncome) * 100;
        
        if (profitMargin > 20) {
            return 'Excellent';
        } else if (profitMargin > 10) {
            return 'Good';
        } else if (profitMargin > 0) {
            return 'Stable';
        } else if (profitMargin > -10) {
            return 'Concerning';
        } else {
            return 'Critical';
        }
    }

    /**
     * Generate basic recommendations based on financial metrics
     */
    private generateBasicRecommendations(netCashflow: number, totalIncome: number, totalExpenses: number): string[] {
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
        
        return recommendations;
    }

    /**
     * Update performance statistics
     */
    private updatePerformanceStats(processingTime: number, confidence: number): void {
        const currentAvg = this.performanceStats.averageProcessingTime;
        const requestCount = this.performanceStats.totalRequests;
        
        this.performanceStats.averageProcessingTime = 
            (currentAvg * (requestCount - 1) + processingTime) / requestCount;
        
        const currentConfidenceAvg = this.performanceStats.averageConfidence;
        this.performanceStats.averageConfidence = 
            (currentConfidenceAvg * (requestCount - 1) + confidence) / requestCount;
    }

    /**
     * Process data using Multi-Agent Pipeline
     */
    async processWithMultiAgent(invoiceData: any, options: any = {}): Promise<any> {
        if (!this.isAvailable) {
            logger.warn('ENHANCED_AI_SERVICE', 'Multi-agent processing not available, using fallback');
            return this.fallbackProcessing(invoiceData);
        }

        try {
            logger.info('ENHANCED_AI_SERVICE', 'Starting multi-agent processing', {
                hasLineItems: !!invoiceData.lineItems,
                lineItemCount: invoiceData.lineItems?.length || 0
            });

            const startTime = Date.now();
            const agentResults = await this.multiAgentPipeline.processData(invoiceData, options);
            const processingTime = Date.now() - startTime;

            // Merge agent results into comprehensive analysis
            const mergedResult = this.mergeAgentResults(agentResults);
            
            // Calculate overall confidence
            const overallConfidence = this.calculateOverallConfidence(agentResults);

            logger.info('ENHANCED_AI_SERVICE', 'Multi-agent processing completed', {
                processingTime,
                agentCount: agentResults.length,
                successCount: agentResults.filter(r => r.success).length,
                overallConfidence
            });

            return {
                ...mergedResult,
                processingTime,
                confidence: overallConfidence,
                agentResults,
                enhanced: true
            };

        } catch (error) {
            logger.error('ENHANCED_AI_SERVICE', 'Multi-agent processing failed', error);
            return this.fallbackProcessing(invoiceData);
        }
    }

    /**
     * Merge results from multiple agents
     */
    private mergeAgentResults(agentResults: any[]): any {
        const merged = {
            transactions: [],
            categories: {},
            analysis: {},
            risks: [],
            compliance: {},
            forecast: {},
            insights: [],
            alerts: [],
            highlights: []
        };

        for (const result of agentResults) {
            if (!result.success || !result.data) continue;

            switch (result.agent) {
                case 'data_extractor':
                    if (result.data.transactions) {
                        merged.transactions = result.data.transactions;
                    }
                    break;
                case 'transaction_categorizer':
                    if (result.data.categories) {
                        merged.categories = result.data.categories;
                    }
                    break;
                case 'financial_analyst':
                    if (result.data.analysis) {
                        merged.analysis = result.data.analysis;
                    }
                    if (result.data.insights) {
                        merged.insights.push(...result.data.insights);
                    }
                    break;
                case 'risk_assessor':
                    if (result.data.risks) {
                        merged.risks.push(...result.data.risks);
                    }
                    if (result.data.alerts) {
                        merged.alerts.push(...result.data.alerts);
                    }
                    break;
                case 'compliance_checker':
                    if (result.data.compliance) {
                        merged.compliance = result.data.compliance;
                    }
                    break;
                case 'forecasting_agent':
                    if (result.data.forecast) {
                        merged.forecast = result.data.forecast;
                    }
                    break;
            }
        }

        return merged;
    }

    /**
     * Calculate overall confidence from agent results
     */
    private calculateOverallConfidence(agentResults: any[]): any {
        if (agentResults.length === 0) return { overallScore: 0, level: 'very low' };

        const successfulResults = agentResults.filter(r => r.success);
        const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;
        
        return this.confidenceScorer.calculateConfidence(mergedResult, {
            userId: 'admin',
            dataComplexity: 0.75
        });
    }

    /**
     * Learn from user correction
     */
    async learnFromCorrection(
        inputData: any,
        expectedOutput: any,
        actualOutput: any,
        correction: any,
        category: string = 'general'
    ): Promise<void> {
        await this.adaptiveLearning.learnFromCorrection(
            inputData,
            expectedOutput,
            actualOutput,
            correction,
            category
        );
    }

    /**
     * Apply learned patterns to improve processing
     */
    async applyLearning(inputData: any, category: string = 'general'): Promise<any> {
        return await this.adaptiveLearning.applyLearning(inputData, category);
    }

    /**
     * Get learning metrics
     */
    getLearningMetrics(): any {
        return this.adaptiveLearning.getLearningMetrics();
    }

    /**
     * Generate improvement suggestions
     */
    generateSuggestions(inputData: any, category: string = 'general'): string[] {
        return this.adaptiveLearning.generateSuggestions(inputData, category);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats(): any {
        return {
            ...this.performanceStats,
            cacheHitRate: this.performanceStats.cacheHits / this.performanceStats.totalRequests,
            cacheStats: this.cache.getStats(),
            multiAgentStats: this.multiAgentPipeline.getAgentStats(),
            learningMetrics: this.adaptiveLearning.getLearningMetrics()
        };
    }
}
