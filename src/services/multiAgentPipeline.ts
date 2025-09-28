/**
 * Multi-Agent Pipeline for Specialized Financial Analysis
 * Each agent is specialized for specific financial analysis tasks
 */

import { logger } from './logger';
import { config } from '../config';
import OpenAI from 'openai';

export interface AgentResult {
    success: boolean;
    data: any;
    confidence: number;
    processingTime: number;
    agent: string;
    error?: string;
}

export interface AgentTask {
    id: string;
    type: string;
    data: any;
    priority: 'high' | 'medium' | 'low';
    dependencies?: string[];
    timeout?: number;
}

export class MultiAgentPipeline {
    private openai: OpenAI;
    private agents: Map<string, any> = new Map();
    private taskQueue: AgentTask[] = [];
    private results: Map<string, AgentResult> = new Map();
    private isProcessing = false;

    constructor() {
        this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        this.initializeAgents();
    }

    /**
     * Initialize specialized agents
     */
    private initializeAgents() {
        // Data Extraction Agent
        this.agents.set('data_extractor', {
            name: 'Data Extraction Agent',
            description: 'Specialized in extracting and parsing financial data from various formats',
            capabilities: ['csv_parsing', 'json_extraction', 'data_validation'],
            model: 'gpt-4o-mini',
            maxTokens: 2000
        });

        // Transaction Categorization Agent
        this.agents.set('transaction_categorizer', {
            name: 'Transaction Categorization Agent',
            description: 'Specialized in categorizing and classifying financial transactions',
            capabilities: ['expense_categorization', 'income_classification', 'tax_categorization'],
            model: 'gpt-4o-mini',
            maxTokens: 1500
        });

        // Financial Analysis Agent
        this.agents.set('financial_analyst', {
            name: 'Financial Analysis Agent',
            description: 'Specialized in comprehensive financial analysis and insights',
            capabilities: ['cashflow_analysis', 'profit_loss_analysis', 'trend_analysis'],
            model: 'gpt-4',
            maxTokens: 3000
        });

        // Risk Assessment Agent
        this.agents.set('risk_assessor', {
            name: 'Risk Assessment Agent',
            description: 'Specialized in identifying financial risks and anomalies',
            capabilities: ['anomaly_detection', 'risk_scoring', 'alert_generation'],
            model: 'gpt-4',
            maxTokens: 2000
        });

        // Compliance Agent
        this.agents.set('compliance_checker', {
            name: 'Compliance Checker Agent',
            description: 'Specialized in checking financial compliance and regulations',
            capabilities: ['tax_compliance', 'accounting_standards', 'audit_trails'],
            model: 'gpt-4o-mini',
            maxTokens: 1500
        });

        // Forecasting Agent
        this.agents.set('forecasting_agent', {
            name: 'Forecasting Agent',
            description: 'Specialized in financial forecasting and predictions',
            capabilities: ['budget_forecasting', 'trend_prediction', 'scenario_analysis'],
            model: 'gpt-4',
            maxTokens: 2500
        });

        logger.info('MULTI_AGENT_PIPELINE', 'Initialized specialized agents', {
            agentCount: this.agents.size,
            agents: Array.from(this.agents.keys())
        });
    }

    /**
     * Process data using the multi-agent pipeline
     */
    async processData(invoiceData: any, options: any = {}): Promise<AgentResult[]> {
        const startTime = Date.now();
        const results: AgentResult[] = [];

        try {
            logger.info('MULTI_AGENT_PIPELINE', 'Starting multi-agent processing', {
                dataType: typeof invoiceData,
                hasLineItems: !!invoiceData.lineItems,
                lineItemCount: invoiceData.lineItems?.length || 0
            });

            // Create tasks for each agent
            const tasks = this.createTasks(invoiceData, options);
            
            // Process tasks in parallel with dependency management
            const taskResults = await this.processTasksParallel(tasks);
            
            // Merge results
            const mergedResults = this.mergeAgentResults(taskResults);
            
            const processingTime = Date.now() - startTime;
            logger.info('MULTI_AGENT_PIPELINE', 'Multi-agent processing completed', {
                processingTime,
                resultsCount: mergedResults.length,
                successCount: mergedResults.filter(r => r.success).length
            });

            return mergedResults;

        } catch (error) {
            logger.error('MULTI_AGENT_PIPELINE', 'Multi-agent processing failed', error);
            return [{
                success: false,
                data: null,
                confidence: 0,
                processingTime: Date.now() - startTime,
                agent: 'pipeline',
                error: error instanceof Error ? error.message : 'Unknown error'
            }];
        }
    }

    /**
     * Create tasks for each agent based on data complexity
     */
    private createTasks(invoiceData: any, options: any): AgentTask[] {
        const tasks: AgentTask[] = [];
        const hasLineItems = invoiceData.lineItems && invoiceData.lineItems.length > 0;
        const dataComplexity = this.calculateDataComplexity(invoiceData);

        // Always include data extraction
        tasks.push({
            id: 'extract_data',
            type: 'data_extractor',
            data: invoiceData,
            priority: 'high',
            timeout: 30000
        });

        // Add categorization if we have line items
        if (hasLineItems) {
            tasks.push({
                id: 'categorize_transactions',
                type: 'transaction_categorizer',
                data: invoiceData,
                priority: 'high',
                dependencies: ['extract_data'],
                timeout: 25000
            });
        }

        // Add financial analysis for complex data
        if (dataComplexity > 0.3) {
            tasks.push({
                id: 'analyze_finances',
                type: 'financial_analyst',
                data: invoiceData,
                priority: 'high',
                dependencies: ['extract_data'],
                timeout: 45000
            });
        }

        // Add risk assessment for high-value transactions
        const totalAmount = this.calculateTotalAmount(invoiceData);
        if (totalAmount > 10000) {
            tasks.push({
                id: 'assess_risks',
                type: 'risk_assessor',
                data: invoiceData,
                priority: 'medium',
                dependencies: ['extract_data', 'categorize_transactions'],
                timeout: 30000
            });
        }

        // Add compliance checking
        tasks.push({
            id: 'check_compliance',
            type: 'compliance_checker',
            data: invoiceData,
            priority: 'medium',
            dependencies: ['extract_data'],
            timeout: 20000
        });

        // Add forecasting for historical data
        if (options.enableForecasting !== false) {
            tasks.push({
                id: 'generate_forecast',
                type: 'forecasting_agent',
                data: invoiceData,
                priority: 'low',
                dependencies: ['analyze_finances'],
                timeout: 35000
            });
        }

        return tasks;
    }

    /**
     * Process tasks in parallel with dependency management
     */
    private async processTasksParallel(tasks: AgentTask[]): Promise<AgentResult[]> {
        const results: AgentResult[] = [];
        const completed = new Set<string>();
        const processing = new Map<string, Promise<AgentResult>>();

        // Process tasks in rounds based on dependencies
        while (completed.size < tasks.length) {
            const readyTasks = tasks.filter(task => 
                !completed.has(task.id) && 
                !processing.has(task.id) &&
                (!task.dependencies || task.dependencies.every(dep => completed.has(dep)))
            );

            if (readyTasks.length === 0) {
                // Wait for any processing task to complete
                const promises = Array.from(processing.values());
                if (promises.length === 0) break;
                
                const result = await Promise.race(promises);
                results.push(result);
                completed.add(result.agent);
                
                // Remove completed task from processing
                for (const [taskId, promise] of processing.entries()) {
                    if (promise === Promise.resolve(result)) {
                        processing.delete(taskId);
                        break;
                    }
                }
                continue;
            }

            // Start processing ready tasks
            for (const task of readyTasks) {
                const promise = this.executeAgentTask(task);
                processing.set(task.id, promise);
            }
        }

        // Wait for remaining tasks
        const remainingPromises = Array.from(processing.values());
        const remainingResults = await Promise.all(remainingPromises);
        results.push(...remainingResults);

        return results;
    }

    /**
     * Execute a single agent task
     */
    private async executeAgentTask(task: AgentTask): Promise<AgentResult> {
        const startTime = Date.now();
        const agent = this.agents.get(task.type);

        if (!agent) {
            return {
                success: false,
                data: null,
                confidence: 0,
                processingTime: Date.now() - startTime,
                agent: task.type,
                error: `Agent ${task.type} not found`
            };
        }

        try {
            logger.debug('MULTI_AGENT_PIPELINE', `Executing agent task: ${task.id}`, {
                agent: task.type,
                priority: task.priority
            });

            const result = await this.callAgent(agent, task);
            const processingTime = Date.now() - startTime;

            logger.info('MULTI_AGENT_PIPELINE', `Agent task completed: ${task.id}`, {
                agent: task.type,
                processingTime,
                success: result.success,
                confidence: result.confidence
            });

            return {
                ...result,
                processingTime,
                agent: task.type
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            logger.error('MULTI_AGENT_PIPELINE', `Agent task failed: ${task.id}`, {
                agent: task.type,
                error: error instanceof Error ? error.message : 'Unknown error',
                processingTime
            });

            return {
                success: false,
                data: null,
                confidence: 0,
                processingTime,
                agent: task.type,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Call a specific agent with the task data
     */
    private async callAgent(agent: any, task: AgentTask): Promise<Omit<AgentResult, 'processingTime' | 'agent'>> {
        const prompt = this.buildAgentPrompt(agent, task);
        
        const response = await this.openai.chat.completions.create({
            model: agent.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a specialized ${agent.name}. ${agent.description}. 
                    Your capabilities: ${agent.capabilities.join(', ')}.
                    Provide accurate, detailed analysis in JSON format.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: agent.maxTokens,
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content || '';
        
        try {
            const data = JSON.parse(content);
            return {
                success: true,
                data,
                confidence: this.calculateConfidence(data, agent)
            };
        } catch (parseError) {
            // Try to extract JSON from markdown
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);
                return {
                    success: true,
                    data,
                    confidence: this.calculateConfidence(data, agent)
                };
            }
            
            return {
                success: false,
                data: { raw: content },
                confidence: 0.1,
                error: 'Failed to parse agent response as JSON'
            };
        }
    }

    /**
     * Build agent-specific prompt
     */
    private buildAgentPrompt(agent: any, task: AgentTask): string {
        const basePrompt = `Analyze the following financial data and provide insights in JSON format:`;
        
        switch (task.type) {
            case 'data_extractor':
                return `${basePrompt}
                
                Extract and structure the following data:
                - Transaction details (dates, amounts, descriptions)
                - Categorization information
                - Totals and subtotals
                - Any metadata or additional information
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            case 'transaction_categorizer':
                return `${basePrompt}
                
                Categorize each transaction into appropriate financial categories:
                - Income categories (sales, services, investments, etc.)
                - Expense categories (operating, administrative, marketing, etc.)
                - Tax-related categories
                - Asset/liability classifications
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            case 'financial_analyst':
                return `${basePrompt}
                
                Provide comprehensive financial analysis:
                - Cash flow analysis
                - Profit and loss insights
                - Financial health indicators
                - Trend analysis
                - Recommendations for improvement
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            case 'risk_assessor':
                return `${basePrompt}
                
                Assess financial risks and anomalies:
                - Unusual transaction patterns
                - Potential compliance issues
                - Financial health risks
                - Recommendations for risk mitigation
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            case 'compliance_checker':
                return `${basePrompt}
                
                Check compliance and regulatory requirements:
                - Tax compliance issues
                - Accounting standard adherence
                - Audit trail completeness
                - Regulatory recommendations
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            case 'forecasting_agent':
                return `${basePrompt}
                
                Generate financial forecasts and predictions:
                - Budget projections
                - Trend predictions
                - Scenario analysis
                - Growth forecasts
                
                Data: ${JSON.stringify(task.data, null, 2)}`;

            default:
                return `${basePrompt}
                
                Analyze the financial data and provide relevant insights.
                
                Data: ${JSON.stringify(task.data, null, 2)}`;
        }
    }

    /**
     * Calculate confidence score for agent result
     */
    private calculateConfidence(data: any, agent: any): number {
        let confidence = 0.5; // Base confidence

        // Check data completeness
        if (data && typeof data === 'object') {
            const keys = Object.keys(data);
            confidence += Math.min(keys.length * 0.1, 0.3);
        }

        // Check for specific agent requirements
        switch (agent.name) {
            case 'Data Extraction Agent':
                if (data.transactions || data.lineItems) confidence += 0.2;
                break;
            case 'Transaction Categorization Agent':
                if (data.categories || data.classifications) confidence += 0.2;
                break;
            case 'Financial Analysis Agent':
                if (data.analysis || data.insights) confidence += 0.2;
                break;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Calculate data complexity
     */
    private calculateDataComplexity(data: any): number {
        let complexity = 0;
        
        if (data.lineItems && data.lineItems.length > 0) {
            complexity += Math.min(data.lineItems.length * 0.05, 0.5);
        }
        
        if (data.totals && typeof data.totals === 'object') {
            complexity += 0.2;
        }
        
        if (data.metadata && typeof data.metadata === 'object') {
            complexity += 0.1;
        }
        
        return Math.min(complexity, 1.0);
    }

    /**
     * Calculate total amount from data
     */
    private calculateTotalAmount(data: any): number {
        if (data.totals && data.totals.net_total) {
            return parseFloat(data.totals.net_total) || 0;
        }
        
        if (data.lineItems && Array.isArray(data.lineItems)) {
            return data.lineItems.reduce((sum: number, item: any) => {
                return sum + (parseFloat(item.amount) || 0);
            }, 0);
        }
        
        return 0;
    }

    /**
     * Merge results from multiple agents
     */
    private mergeAgentResults(results: AgentResult[]): AgentResult[] {
        // Sort by confidence and success
        return results.sort((a, b) => {
            if (a.success !== b.success) {
                return a.success ? -1 : 1;
            }
            return b.confidence - a.confidence;
        });
    }

    /**
     * Get agent statistics
     */
    getAgentStats(): any {
        return {
            totalAgents: this.agents.size,
            agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
                id,
                name: agent.name,
                capabilities: agent.capabilities,
                model: agent.model
            })),
            taskQueue: this.taskQueue.length,
            isProcessing: this.isProcessing
        };
    }
}


