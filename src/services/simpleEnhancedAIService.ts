import OpenAI from 'openai';
import { config } from '../config';
import { logger } from './logger';

/**
 * Simplified Enhanced AI Service for testing
 */
export class SimpleEnhancedAIService {
    private isAvailable: boolean;
    private openai: OpenAI;

    constructor() {
        this.isAvailable = config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_openai_api_key_here' && config.OPENAI_API_KEY.startsWith('sk-');
        this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        
        logger.info('SIMPLE_ENHANCED_AI', 'Service initialized', {
            isAvailable: this.isAvailable,
            hasApiKey: !!config.OPENAI_API_KEY
        });
    }

    /**
     * Simple enhanced processing without parallel processing
     */
    async processAccountingDataEnhanced(parsedInvoice: any, progressCallback?: (progress: number, message: string) => void) {
        const startTime = Date.now();
        
        logger.info('SIMPLE_ENHANCED_AI', 'Starting simple enhanced processing', {
            hasLineItems: !!parsedInvoice.lineItems,
            lineItemCount: parsedInvoice.lineItems?.length || 0
        });

        try {
            if (!this.isAvailable) {
                logger.warn('SIMPLE_ENHANCED_AI', 'AI not available, using fallback');
                return this.fallbackProcessing(parsedInvoice);
            }

            if (progressCallback) progressCallback(10, 'Extracting data...');
            
            // Step 1: Extract data
            const extractedData = await this.extractRawData(parsedInvoice);
            if (!extractedData.success) {
                logger.error('SIMPLE_ENHANCED_AI', 'Data extraction failed', extractedData.error);
                return this.fallbackProcessing(parsedInvoice);
            }

            if (progressCallback) progressCallback(30, 'Categorizing transactions...');
            
            // Step 2: Categorize transactions
            const categorizedData = await this.categorizeTransactions(extractedData.data);
            if (!categorizedData.success) {
                logger.warn('SIMPLE_ENHANCED_AI', 'Categorization failed, using extracted data');
            }

            if (progressCallback) progressCallback(60, 'Generating insights...');
            
            // Step 3: Generate insights
            const insights = await this.generateInsights(extractedData.data);
            if (!insights.success) {
                logger.warn('SIMPLE_ENHANCED_AI', 'Insights generation failed');
            }

            if (progressCallback) progressCallback(90, 'Finalizing...');
            
            // Step 4: Merge results
            const result = {
                cashflow: {
                    transactions: categorizedData.success ? categorizedData.data.transactions : extractedData.data.transactions || [],
                    totals: extractedData.data.totals || {}
                },
                transactions: categorizedData.success ? categorizedData.data.transactions : extractedData.data.transactions || [],
                totals: extractedData.data.totals || {},
                alerts: insights.success ? insights.data.alerts || [] : [],
                highlights: insights.success ? insights.data.highlights || [] : [],
                aiInsights: insights.success ? insights.data.insights || {} : {},
                enhanced: true,
                processingTime: Date.now() - startTime
            };

            if (progressCallback) progressCallback(100, 'Complete!');
            
            logger.info('SIMPLE_ENHANCED_AI', 'Simple enhanced processing completed', {
                processingTime: result.processingTime,
                transactionCount: result.transactions.length
            });

            return result;

        } catch (error) {
            logger.error('SIMPLE_ENHANCED_AI', 'Simple enhanced processing failed', error);
            return this.fallbackProcessing(parsedInvoice);
        }
    }

    /**
     * Extract raw data
     */
    private async extractRawData(parsedInvoice: any): Promise<any> {
        try {
            const prompt = this.buildExtractionPrompt(parsedInvoice);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are a financial data extraction expert. Extract data accurately and return valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 1500
            });

            const content = response.choices[0].message.content?.trim() || '';
            const extractedData = JSON.parse(content);
            
            return {
                success: true,
                data: extractedData
            };
        } catch (error) {
            logger.error('SIMPLE_ENHANCED_AI', 'Data extraction failed', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Categorize transactions
     */
    private async categorizeTransactions(data: any): Promise<any> {
        try {
            const transactions = data.transactions || [];
            const prompt = this.buildCategorizationPrompt(transactions);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are a financial categorization expert. Categorize transactions accurately and return valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 2000
            });

            const content = response.choices[0].message.content?.trim() || '';
            const categorizedData = JSON.parse(content);
            
            return {
                success: true,
                data: { transactions: categorizedData }
            };
        } catch (error) {
            logger.error('SIMPLE_ENHANCED_AI', 'Categorization failed', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate insights
     */
    private async generateInsights(data: any): Promise<any> {
        try {
            const prompt = this.buildInsightsPrompt(data);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: "system", content: "You are a financial analyst. Provide accurate insights and recommendations. Always respond with valid JSON only." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000
            });

            const content = response.choices[0].message.content?.trim() || '';
            const insights = JSON.parse(content);
            
            return {
                success: true,
                data: insights
            };
        } catch (error) {
            logger.error('SIMPLE_ENHANCED_AI', 'Insights generation failed', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build extraction prompt
     */
    private buildExtractionPrompt(parsedInvoice: any): string {
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
     * Fallback processing
     */
    private fallbackProcessing(parsedInvoice: any): any {
        logger.info('SIMPLE_ENHANCED_AI', 'Using fallback processing');
        
        const expenses = [];
        const income = [];
        const transactions = [];
        
        if (parsedInvoice.lineItems && Array.isArray(parsedInvoice.lineItems)) {
            parsedInvoice.lineItems.forEach((item: any, index: number) => {
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
                businessType: "Unknown",
                confidence: 50
            },
            enhanced: false
        };
    }
}


