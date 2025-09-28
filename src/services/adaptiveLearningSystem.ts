/**
 * Adaptive Learning System
 * Learns from user corrections and improves AI accuracy over time
 */

import { logger } from './logger';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

export interface LearningPattern {
    id: string;
    inputPattern: any;
    expectedOutput: any;
    actualOutput: any;
    correction: any;
    confidence: number;
    timestamp: Date;
    category: string;
    frequency: number;
}

export interface LearningMetrics {
    totalCorrections: number;
    accuracyImprovement: number;
    patternCount: number;
    categoryAccuracy: { [key: string]: number };
    recentImprovements: LearningPattern[];
}

export class AdaptiveLearningSystem {
    private learningData: Map<string, LearningPattern> = new Map();
    private patterns: Map<string, any> = new Map();
    private learningFile: string;
    private isLearningEnabled: boolean = true;

    constructor() {
        this.learningFile = path.join(process.cwd(), 'data', 'learning-patterns.json');
        this.loadLearningData();
        this.initializePatterns();
        
        logger.info('ADAPTIVE_LEARNING', 'Adaptive Learning System initialized', {
            patternCount: this.learningData.size,
            isEnabled: this.isLearningEnabled
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
        if (!this.isLearningEnabled) return;

        try {
            const patternId = this.generatePatternId(inputData, category);
            const existingPattern = this.learningData.get(patternId);

            if (existingPattern) {
                // Update existing pattern
                existingPattern.frequency += 1;
                existingPattern.correction = correction;
                existingPattern.timestamp = new Date();
                existingPattern.confidence = this.calculateConfidence(existingPattern);
            } else {
                // Create new pattern
                const newPattern: LearningPattern = {
                    id: patternId,
                    inputPattern: this.normalizeInput(inputData),
                    expectedOutput,
                    actualOutput,
                    correction,
                    confidence: 0.5,
                    timestamp: new Date(),
                    category,
                    frequency: 1
                };
                this.learningData.set(patternId, newPattern);
            }

            // Update patterns
            await this.updatePatterns();
            
            // Save learning data
            await this.saveLearningData();

            logger.info('ADAPTIVE_LEARNING', 'Learned from correction', {
                patternId,
                category,
                frequency: existingPattern?.frequency || 1,
                totalPatterns: this.learningData.size
            });

        } catch (error) {
            logger.error('ADAPTIVE_LEARNING', 'Failed to learn from correction', error);
        }
    }

    /**
     * Apply learned patterns to improve output
     */
    async applyLearning(inputData: any, category: string = 'general'): Promise<any> {
        if (!this.isLearningEnabled) return null;

        try {
            const patternId = this.generatePatternId(inputData, category);
            const pattern = this.learningData.get(patternId);

            if (!pattern || pattern.confidence < 0.7) {
                return null;
            }

            // Apply learned correction
            const improvedOutput = this.applyCorrection(inputData, pattern.correction);
            
            logger.debug('ADAPTIVE_LEARNING', 'Applied learned pattern', {
                patternId,
                confidence: pattern.confidence,
                frequency: pattern.frequency
            });

            return improvedOutput;

        } catch (error) {
            logger.error('ADAPTIVE_LEARNING', 'Failed to apply learning', error);
            return null;
        }
    }

    /**
     * Get learning metrics
     */
    getLearningMetrics(): LearningMetrics {
        const patterns = Array.from(this.learningData.values());
        const categoryAccuracy: { [key: string]: number } = {};
        
        // Calculate category accuracy
        const categories = [...new Set(patterns.map(p => p.category))];
        categories.forEach(category => {
            const categoryPatterns = patterns.filter(p => p.category === category);
            const avgConfidence = categoryPatterns.reduce((sum, p) => sum + p.confidence, 0) / categoryPatterns.length;
            categoryAccuracy[category] = avgConfidence || 0;
        });

        // Calculate overall accuracy improvement
        const recentPatterns = patterns
            .filter(p => p.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

        const accuracyImprovement = this.calculateAccuracyImprovement(patterns);

        return {
            totalCorrections: patterns.length,
            accuracyImprovement,
            patternCount: patterns.length,
            categoryAccuracy,
            recentImprovements: recentPatterns
        };
    }

    /**
     * Generate suggestions for improvement
     */
    generateSuggestions(inputData: any, category: string = 'general'): string[] {
        const suggestions: string[] = [];
        const patterns = Array.from(this.learningData.values())
            .filter(p => p.category === category)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);

        if (patterns.length === 0) {
            suggestions.push('No learning patterns available for this category yet.');
            return suggestions;
        }

        // Generate suggestions based on patterns
        patterns.forEach(pattern => {
            if (pattern.confidence > 0.8) {
                suggestions.push(`High-confidence pattern detected: ${pattern.correction.type || 'correction'}`);
            }
        });

        // Add general suggestions
        const categoryAccuracy = this.getLearningMetrics().categoryAccuracy[category] || 0;
        if (categoryAccuracy < 0.7) {
            suggestions.push('Consider providing more corrections for this category to improve accuracy.');
        }

        if (patterns.length < 3) {
            suggestions.push('More learning data would help improve accuracy for this category.');
        }

        return suggestions;
    }

    /**
     * Reset learning data
     */
    async resetLearningData(): Promise<void> {
        this.learningData.clear();
        this.patterns.clear();
        await this.saveLearningData();
        
        logger.info('ADAPTIVE_LEARNING', 'Learning data reset');
    }

    /**
     * Enable/disable learning
     */
    setLearningEnabled(enabled: boolean): void {
        this.isLearningEnabled = enabled;
        logger.info('ADAPTIVE_LEARNING', `Learning ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Generate pattern ID from input data
     */
    private generatePatternId(inputData: any, category: string): string {
        const normalized = this.normalizeInput(inputData);
        const hash = this.simpleHash(JSON.stringify(normalized) + category);
        return `${category}_${hash}`;
    }

    /**
     * Normalize input data for pattern matching
     */
    private normalizeInput(inputData: any): any {
        if (!inputData || typeof inputData !== 'object') {
            return inputData;
        }

        const normalized: any = {};
        
        // Extract key features
        if (inputData.lineItems) {
            normalized.lineItemCount = inputData.lineItems.length;
            normalized.hasLineItems = true;
        }
        
        if (inputData.totals) {
            normalized.hasTotals = true;
            normalized.totalAmount = inputData.totals.net_total || inputData.totals.total;
        }
        
        if (inputData.metadata) {
            normalized.hasMetadata = true;
        }

        return normalized;
    }

    /**
     * Calculate pattern confidence
     */
    private calculateConfidence(pattern: LearningPattern): number {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence with frequency
        confidence += Math.min(pattern.frequency * 0.1, 0.3);
        
        // Increase confidence with recency
        const daysSinceLastUpdate = (Date.now() - pattern.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUpdate < 7) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Apply correction to input data
     */
    private applyCorrection(inputData: any, correction: any): any {
        if (!correction || typeof correction !== 'object') {
            return inputData;
        }

        const corrected = { ...inputData };
        
        // Apply corrections based on type
        if (correction.categories) {
            corrected.categories = correction.categories;
        }
        
        if (correction.analysis) {
            corrected.analysis = { ...corrected.analysis, ...correction.analysis };
        }
        
        if (correction.insights) {
            corrected.insights = [...(corrected.insights || []), ...correction.insights];
        }

        return corrected;
    }

    /**
     * Update patterns based on learning data
     */
    private async updatePatterns(): Promise<void> {
        const patterns = Array.from(this.learningData.values());
        
        // Group patterns by category
        const categoryPatterns: { [key: string]: LearningPattern[] } = {};
        patterns.forEach(pattern => {
            if (!categoryPatterns[pattern.category]) {
                categoryPatterns[pattern.category] = [];
            }
            categoryPatterns[pattern.category].push(pattern);
        });

        // Update patterns for each category
        Object.keys(categoryPatterns).forEach(category => {
            const categoryPatternsList = categoryPatterns[category];
            const highConfidencePatterns = categoryPatternsList
                .filter(p => p.confidence > 0.7)
                .sort((a, b) => b.frequency - a.frequency);

            this.patterns.set(category, {
                patterns: highConfidencePatterns,
                lastUpdated: new Date(),
                accuracy: this.calculateCategoryAccuracy(categoryPatternsList)
            });
        });
    }

    /**
     * Calculate accuracy improvement over time
     */
    private calculateAccuracyImprovement(patterns: LearningPattern[]): number {
        if (patterns.length < 2) return 0;

        // Sort by timestamp
        const sortedPatterns = patterns.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Calculate average confidence for first half vs second half
        const midPoint = Math.floor(sortedPatterns.length / 2);
        const firstHalf = sortedPatterns.slice(0, midPoint);
        const secondHalf = sortedPatterns.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.confidence, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.confidence, 0) / secondHalf.length;

        return secondHalfAvg - firstHalfAvg;
    }

    /**
     * Calculate category accuracy
     */
    private calculateCategoryAccuracy(patterns: LearningPattern[]): number {
        if (patterns.length === 0) return 0;
        return patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    }

    /**
     * Simple hash function
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Load learning data from file
     */
    private async loadLearningData(): Promise<void> {
        try {
            if (!fs.existsSync(this.learningFile)) {
                // Create directory if it doesn't exist
                const dir = path.dirname(this.learningFile);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                return;
            }

            const data = fs.readFileSync(this.learningFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert timestamps back to Date objects
            Object.entries(parsed).forEach(([key, pattern]: [string, any]) => {
                if (pattern.timestamp) {
                    pattern.timestamp = new Date(pattern.timestamp);
                }
                this.learningData.set(key, pattern);
            });

            logger.info('ADAPTIVE_LEARNING', 'Loaded learning data', {
                patternCount: this.learningData.size
            });

        } catch (error) {
            logger.error('ADAPTIVE_LEARNING', 'Failed to load learning data', error);
        }
    }

    /**
     * Save learning data to file
     */
    private async saveLearningData(): Promise<void> {
        try {
            const data = Object.fromEntries(this.learningData);
            fs.writeFileSync(this.learningFile, JSON.stringify(data, null, 2));
            
            logger.debug('ADAPTIVE_LEARNING', 'Saved learning data', {
                patternCount: this.learningData.size
            });

        } catch (error) {
            logger.error('ADAPTIVE_LEARNING', 'Failed to save learning data', error);
        }
    }

    /**
     * Initialize default patterns
     */
    private initializePatterns(): void {
        // Initialize with some default patterns for common scenarios
        const defaultPatterns = [
            {
                id: 'office_rent_pattern',
                inputPattern: { hasLineItems: true, lineItemCount: 1, hasTotals: true },
                expectedOutput: { category: 'Operating Expenses', subcategory: 'Rent' },
                actualOutput: { category: 'General Expenses' },
                correction: { category: 'Operating Expenses', subcategory: 'Rent' },
                confidence: 0.9,
                timestamp: new Date(),
                category: 'expense_categorization',
                frequency: 1
            }
        ];

        defaultPatterns.forEach(pattern => {
            if (!this.learningData.has(pattern.id)) {
                this.learningData.set(pattern.id, pattern);
            }
        });
    }
}


