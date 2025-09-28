import { logger } from './logger';

/**
 * Intelligent Model Selection System
 * Selects the most appropriate AI model based on task complexity and requirements
 */
export class IntelligentModelSelector {
    private models: any;
    private taskComplexityThresholds: any;

    constructor() {
        this.models = {
            'gpt-4o-mini': {
                cost: 1,
                speed: 3,
                accuracy: 2,
                maxTokens: 128000,
                capabilities: ['extraction', 'categorization', 'validation', 'simple_analysis']
            },
            'gpt-4': {
                cost: 3,
                speed: 2,
                accuracy: 4,
                maxTokens: 128000,
                capabilities: ['complex_analysis', 'insights', 'creative_generation', 'reasoning']
            },
            'gpt-3.5-turbo': {
                cost: 0.5,
                speed: 4,
                accuracy: 1,
                maxTokens: 16385,
                capabilities: ['simple_extraction', 'basic_categorization']
            }
        };
        
        this.taskComplexityThresholds = {
            'extraction': 0.3,
            'categorization': 0.4,
            'validation': 0.5,
            'analysis': 0.7,
            'insights': 0.8
        };
    }

    /**
     * Select the most appropriate model for a given task
     */
    selectModel(task: string, dataComplexity: number = 0.5, confidenceThreshold: number = 0.8, maxCost: number = 10): string {
        logger.debug('MODEL_SELECTOR', `Selecting model for task: ${task}`, {
            dataComplexity,
            confidenceThreshold,
            maxCost
        });

        // Filter models by capabilities and cost
        const availableModels = Object.entries(this.models)
            .filter(([name, config]: [string, any]) => 
                config.capabilities.includes(task) && 
                config.cost <= maxCost
            )
            .map(([name, config]: [string, any]) => ({ name, ...config }));

        if (availableModels.length === 0) {
            logger.warn('MODEL_SELECTOR', 'No suitable models found, using fallback');
            return 'gpt-4o-mini';
        }

        // Calculate scores for each model
        const scoredModels = availableModels.map(model => {
            const score = this.calculateModelScore(model, task, dataComplexity, confidenceThreshold);
            return { ...model, score };
        });

        // Sort by score (higher is better)
        scoredModels.sort((a, b) => b.score - a.score);

        const selected = scoredModels[0];
        logger.info('MODEL_SELECTOR', `Selected model: ${selected.name}`, {
            score: selected.score,
            task,
            dataComplexity
        });

        return selected.name;
    }

    /**
     * Calculate a score for a model based on task requirements
     */
    private calculateModelScore(model: any, task: string, dataComplexity: number, confidenceThreshold: number): number {
        let score = 0;

        // Base score from model capabilities
        score += model.accuracy * 0.4;
        score += model.speed * 0.2;
        score += (1 / model.cost) * 0.2; // Lower cost = higher score

        // Task-specific adjustments
        const taskThreshold = this.taskComplexityThresholds[task] || 0.5;
        
        if (dataComplexity > taskThreshold) {
            // For complex data, prioritize accuracy
            score += model.accuracy * 0.3;
        } else {
            // For simple data, prioritize speed and cost
            score += model.speed * 0.2;
            score += (1 / model.cost) * 0.3;
        }

        // Confidence threshold adjustments
        if (confidenceThreshold > 0.9) {
            score += model.accuracy * 0.2;
        }

        return score;
    }

    /**
     * Get model configuration for a specific model
     */
    getModelConfig(modelName: string): any {
        return this.models[modelName] || this.models['gpt-4o-mini'];
    }

    /**
     * Estimate cost for a given task
     */
    estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
        const config = this.getModelConfig(modelName);
        const inputCost = (inputTokens / 1000) * config.cost;
        const outputCost = (outputTokens / 1000) * config.cost * 1.5; // Output is typically more expensive
        return inputCost + outputCost;
    }

    /**
     * Get optimal temperature for a task
     */
    getOptimalTemperature(task: string, dataComplexity: number): number {
        const baseTemperatures: any = {
            'extraction': 0.1,
            'categorization': 0.2,
            'validation': 0.1,
            'analysis': 0.3,
            'insights': 0.7
        };

        const baseTemp = baseTemperatures[task] || 0.3;
        
        // Adjust based on data complexity
        if (dataComplexity > 0.7) {
            return Math.min(baseTemp + 0.2, 0.9);
        } else if (dataComplexity < 0.3) {
            return Math.max(baseTemp - 0.1, 0.0);
        }
        
        return baseTemp;
    }

    /**
     * Get optimal max tokens for a task
     */
    getOptimalMaxTokens(task: string, dataComplexity: number, modelName: string): number {
        const config = this.getModelConfig(modelName);
        const baseTokens: any = {
            'extraction': 1000,
            'categorization': 2000,
            'validation': 1500,
            'analysis': 3000,
            'insights': 4000
        };

        const baseTokenCount = baseTokens[task] || 2000;
        
        // Adjust based on data complexity
        const adjustedTokens = Math.floor(baseTokenCount * (1 + dataComplexity));
        
        // Don't exceed model limits
        return Math.min(adjustedTokens, config.maxTokens);
    }
}


