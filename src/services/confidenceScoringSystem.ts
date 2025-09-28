import { logger } from './logger';

interface ConfidenceWeights {
    dataCompleteness: number;
    logicalConsistency: number;
    patternMatch: number;
    historicalAccuracy: number;
    crossValidation: number;
}

interface ConfidenceScores {
    dataCompleteness: number;
    logicalConsistency: number;
    patternMatch: number;
    historicalAccuracy: number;
    crossValidation: number;
}

interface ConfidenceAssessment {
    overallScore: number;
    confidenceLevel: string;
    scores: ConfidenceScores;
    recommendations: string[];
}

interface ProcessingContext {
    userId: string;
    dataComplexity: number;
    validationResults?: any[];
}

/**
 * Confidence Scoring System for AI-processed financial data
 */
export class ConfidenceScoringSystem {
    private weights: ConfidenceWeights;
    private historicalData: Map<string, any[]>;
    private patternLibrary: Map<string, any>;

    constructor() {
        this.weights = {
            dataCompleteness: 0.25,
            logicalConsistency: 0.30,
            patternMatch: 0.20,
            historicalAccuracy: 0.15,
            crossValidation: 0.10
        };
        
        this.historicalData = new Map();
        this.patternLibrary = new Map();
    }

    /**
     * Calculate overall confidence score for processed financial data
     */
    calculateConfidence(result: any, context: ProcessingContext): ConfidenceAssessment {
        logger.debug('CONFIDENCE_SCORER', 'Calculating confidence score', { context });

        const scores: ConfidenceScores = {
            dataCompleteness: this.scoreDataCompleteness(result),
            logicalConsistency: this.scoreLogicalConsistency(result),
            patternMatch: this.scorePatternMatch(result, context),
            historicalAccuracy: this.scoreHistoricalAccuracy(result, context),
            crossValidation: this.scoreCrossValidation(result, context)
        };

        const overallScore = this.calculateWeightedAverage(scores, this.weights);
        const confidenceLevel = this.getConfidenceLevel(overallScore);
        const recommendations = this.generateRecommendations(scores, overallScore);

        const assessment: ConfidenceAssessment = {
            overallScore: parseFloat(overallScore.toFixed(3)),
            confidenceLevel,
            scores,
            recommendations
        };

        logger.info('CONFIDENCE_SCORER', 'Confidence assessment completed', {
            overallScore: assessment.overallScore,
            confidenceLevel: assessment.confidenceLevel,
            recommendationsCount: recommendations.length
        });

        // Store for historical accuracy
        this.addHistoricalData(result, context.userId);

        return assessment;
    }

    /**
     * Score data completeness based on presence and validity of key fields
     */
    private scoreDataCompleteness(result: any): number {
        let completedFields = 0;
        let totalFields = 0;

        // Check top-level fields
        const topLevelFields = ['transactions', 'totals', 'alerts', 'highlights', 'aiInsights'];
        topLevelFields.forEach(field => {
            totalFields++;
            if (result[field] !== undefined && result[field] !== null &&
                (Array.isArray(result[field]) ? result[field].length > 0 : Object.keys(result[field]).length > 0)) {
                completedFields++;
            }
        });

        // Check transaction completeness
        if (result.transactions && Array.isArray(result.transactions)) {
            const transactionFields = ['date', 'description', 'amount', 'category'];
            result.transactions.forEach((transaction: any) => {
                transactionFields.forEach(field => {
                    totalFields++;
                    if (transaction[field] !== undefined && transaction[field] !== null) {
                        completedFields++;
                    }
                });
            });
        }

        // Check totals completeness
        if (result.totals) {
            const totalFieldNames = ['totalIncome', 'totalExpenses', 'netCashflow'];
            totalFieldNames.forEach(field => {
                totalFields++;
                if (typeof result.totals[field] === 'number' && !isNaN(result.totals[field])) {
                    completedFields++;
                }
            });
        }

        const score = totalFields > 0 ? completedFields / totalFields : 0;
        
        logger.debug('CONFIDENCE_SCORER', `Data completeness score: ${score}`, {
            completedFields,
            totalFields
        });
        return score;
    }

    /**
     * Score logical consistency of financial data
     */
    private scoreLogicalConsistency(result: any): number {
        let consistentChecks = 0;
        let totalChecks = 0;

        // Check totals consistency
        if (result.totals) {
            totalChecks++;
            const { totalIncome = 0, totalExpenses = 0, netCashflow = 0 } = result.totals;
            const calculatedNet = totalIncome - totalExpenses;
            const netDifference = Math.abs(calculatedNet - netCashflow);
            
            if (netDifference < 0.01) { // Allow for floating point inaccuracies
                consistentChecks++;
            } else {
                logger.warn('CONFIDENCE_SCORER', `Net cashflow inconsistency: calculated ${calculatedNet} vs reported ${netCashflow}`);
            }
        }

        // Check transaction amounts consistency
        if (result.transactions && Array.isArray(result.transactions)) {
            totalChecks++;
            const incomeFromTransactions = result.transactions
                .filter((t: any) => t.amount > 0)
                .reduce((sum: number, t: any) => sum + t.amount, 0);
            
            const expensesFromTransactions = result.transactions
                .filter((t: any) => t.amount < 0)
                .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

            if (result.totals) {
                const incomeDifference = Math.abs(incomeFromTransactions - result.totals.totalIncome);
                const expenseDifference = Math.abs(expensesFromTransactions - result.totals.totalExpenses);
                
                if (incomeDifference < 0.01 && expenseDifference < 0.01) {
                    consistentChecks++;
                } else {
                    logger.warn('CONFIDENCE_SCORER', `Transaction totals inconsistency: income diff ${incomeDifference}, expense diff ${expenseDifference}`);
                }
            } else {
                // If no totals, can't compare, but still count as a check
                consistentChecks++;
            }
        }

        // Check for unrealistic values
        if (result.totals) {
            totalChecks++;
            const { totalIncome = 0, totalExpenses = 0 } = result.totals;
            
            if (totalIncome < 0 || totalExpenses < 0) { // Income/expenses should not be negative
                logger.warn('CONFIDENCE_SCORER', 'Unrealistic negative income or expenses detected');
            } else {
                consistentChecks++;
            }
        }

        const score = totalChecks > 0 ? consistentChecks / totalChecks : 0;
        logger.debug('CONFIDENCE_SCORER', `Logical consistency score: ${score}`, {
            consistentChecks,
            totalChecks
        });
        return score;
    }

    /**
     * Score how well the data matches expected financial patterns
     */
    private scorePatternMatch(result: any, context: ProcessingContext): number {
        let matchedPatterns = 0;
        let totalPatterns = 0;

        // Check for expected financial patterns
        if (result.transactions && Array.isArray(result.transactions)) {
            const transactions = result.transactions;
            
            // Pattern: Mix of income and expenses
            totalPatterns++;
            const hasIncome = transactions.some((t: any) => t.amount > 0);
            const hasExpenses = transactions.some((t: any) => t.amount < 0);
            
            if (hasIncome && hasExpenses) {
                matchedPatterns++;
            }

            // Pattern: Reasonable transaction amounts
            totalPatterns++;
            const amounts = transactions.map((t: any) => Math.abs(t.amount));
            const avgAmount = amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length;
            
            if (avgAmount > 0 && avgAmount < 100000) { // Example range
                matchedPatterns++;
            }

            // Pattern: Good categorization
            totalPatterns++;
            const categories = transactions.map((t: any) => t.category).filter((c: any) => c && c !== 'Other');
            const uniqueCategories = new Set(categories).size;
            
            if (uniqueCategories > 1) { // More than just 'Other' category
                matchedPatterns++;
            }
        }

        // Check for expected alert patterns
        if (result.alerts && Array.isArray(result.alerts)) {
            totalPatterns++;
            const hasHighSeverity = result.alerts.some((a: any) => a.severity === 'high');
            const hasMediumSeverity = result.alerts.some((a: any) => a.severity === 'medium');
            
            if (hasHighSeverity || hasMediumSeverity) {
                matchedPatterns++;
            }
        }

        const score = totalPatterns > 0 ? matchedPatterns / totalPatterns : 0;
        logger.debug('CONFIDENCE_SCORER', `Pattern match score: ${score}`, {
            matchedPatterns,
            totalPatterns
        });
        return score;
    }

    /**
     * Score accuracy based on historical data for the user
     */
    private scoreHistoricalAccuracy(result: any, context: ProcessingContext): number {
        const userId = context.userId;
        if (!userId || !this.historicalData.has(userId)) {
            logger.debug('CONFIDENCE_SCORER', 'No historical data for user', { userId });
            return 0.5; // Neutral score if no history
        }

        const userHistory = this.historicalData.get(userId);
        let score = 0.5;
        let comparisons = 0;

        // Compare with similar historical results
        userHistory.forEach((historicalResult: any) => {
            const similarity = this.calculateResultSimilarity(result, historicalResult);
            
            if (similarity > 0.7) { // If sufficiently similar
                // Assume historical data is 'correct' for scoring purposes
                // This is a simplified model; real systems would use ground truth
                score += similarity * 0.2; // Boost score based on similarity
                comparisons++;
            }
        });

        if (comparisons > 0) {
            score = Math.min(1, score); // Cap at 1
        } else if (userHistory.length > 0) {
            score = 0.6; // Slight boost if history exists but no strong match
        }
        
        logger.debug('CONFIDENCE_SCORER', `Historical accuracy score: ${score}`, {
            userId,
            comparisons,
            historyCount: userHistory.length
        });
        return score;
    }

    /**
     * Score based on cross-validation with other methods
     */
    private scoreCrossValidation(result: any, context: ProcessingContext): number {
        let score = 0.5; // Neutral starting point

        // If we have multiple validation methods, compare results
        if (context.validationResults && Array.isArray(context.validationResults)) {
            const validationScores = context.validationResults.map((v: any) => v.confidence || 0.5);
            const avgValidationScore = validationScores.reduce((sum: number, s: number) => sum + s, 0) / validationScores.length;
            
            score = avgValidationScore;
        }

        // Check for internal cross-validation
        if (result.transactions && result.totals) {
            const transactionTotals = this.calculateTransactionTotals(result.transactions);
            const totalsMatch = this.compareTotals(transactionTotals, result.totals);
            
            if (totalsMatch) {
                score = Math.min(1, score + 0.2); // Boost if internal totals match
            } else {
                score = Math.max(0, score - 0.2); // Penalize if internal totals mismatch
            }
        }
        
        logger.debug('CONFIDENCE_SCORER', `Cross-validation score: ${score}`);
        return score;
    }

    /**
     * Calculate weighted average of scores
     */
    private calculateWeightedAverage(scores: ConfidenceScores, weights: ConfidenceWeights): number {
        let weightedSum = 0;
        let totalWeight = 0;

        Object.keys(scores).forEach(key => {
            const score = scores[key as keyof ConfidenceScores];
            const weight = weights[key as keyof ConfidenceWeights] || 0;
            weightedSum += score * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Determine confidence level based on overall score
     */
    private getConfidenceLevel(score: number): string {
        if (score >= 0.9) return 'very high';
        if (score >= 0.8) return 'high';
        if (score >= 0.6) return 'medium';
        if (score >= 0.4) return 'low';
        return 'very low';
    }

    /**
     * Generate recommendations based on individual scores
     */
    private generateRecommendations(scores: ConfidenceScores, overallScore: number): string[] {
        const recommendations: string[] = [];
        
        if (overallScore < 0.6) {
            recommendations.push('Review raw data for potential errors or incompleteness.');
        }
        if (scores.dataCompleteness < 0.7) {
            recommendations.push('Ensure all relevant fields are present in the input data.');
        }
        if (scores.logicalConsistency < 0.7) {
            recommendations.push('Verify financial calculations and consistency (e.g., income - expenses = net cashflow).');
        }
        if (scores.patternMatch < 0.7) {
            recommendations.push('Check for unusual patterns or outliers in the financial transactions.');
        }
        if (scores.historicalAccuracy < 0.7) {
            recommendations.push('Provide more historical data for better trend analysis.');
        }
        if (scores.crossValidation < 0.7) {
            recommendations.push('Consider using additional validation methods or external benchmarks.');
        }
        
        return recommendations;
    }

    /**
     * Add a result to the historical data for a user
     */
    private addHistoricalData(result: any, userId: string): void {
        if (!userId) return;
        
        if (!this.historicalData.has(userId)) {
            this.historicalData.set(userId, []);
        }
        
        const userHistory = this.historicalData.get(userId)!;
        userHistory.push({
            ...result,
            timestamp: new Date().toISOString()
        });
        
        // Keep history size manageable
        if (userHistory.length > 100) {
            userHistory.shift();
        }
    }

    /**
     * Calculate similarity between two financial results
     */
    private calculateResultSimilarity(result1: any, result2: any): number {
        let similarity = 0;
        let comparisons = 0;

        // Compare transaction counts
        if (result1.transactions && result2.transactions) {
            const count1 = result1.transactions.length;
            const count2 = result2.transactions.length;
            const countSimilarity = 1 - Math.abs(count1 - count2) / Math.max(count1, count2, 1);
            similarity += countSimilarity * 0.3;
            comparisons++;
        }

        // Compare totals
        if (result1.totals && result2.totals) {
            const totalSimilarity = this.compareTotals(result1.totals, result2.totals);
            similarity += totalSimilarity * 0.4;
            comparisons++;
        }

        // Compare alert patterns
        if (result1.alerts && result2.alerts) {
            const alertSimilarity = this.compareAlerts(result1.alerts, result2.alerts);
            similarity += alertSimilarity * 0.3;
            comparisons++;
        }

        return comparisons > 0 ? similarity / comparisons : 0;
    }

    /**
     * Compare two sets of totals for similarity
     */
    private compareTotals(totals1: any, totals2: any): number {
        const fields = ['totalIncome', 'totalExpenses', 'netCashflow'];
        let similarity = 0;

        fields.forEach(field => {
            const val1 = totals1[field] || 0;
            const val2 = totals2[field] || 0;
            const maxVal = Math.max(Math.abs(val1), Math.abs(val2), 1);
            const diff = Math.abs(val1 - val2) / maxVal;
            similarity += 1 - diff;
        });

        return similarity / fields.length;
    }

    /**
     * Compare two sets of alerts for similarity
     */
    private compareAlerts(alerts1: any[], alerts2: any[]): number {
        if (alerts1.length === 0 && alerts2.length === 0) return 1; // Both empty, perfect match
        if (alerts1.length === 0 || alerts2.length === 0) return 0;

        const types1 = new Set(alerts1.map((a: any) => a.type));
        const types2 = new Set(alerts2.map((a: any) => a.type));
        
        const intersection = new Set([...types1].filter(x => types2.has(x)));
        const union = new Set([...types1, ...types2]);
        
        return intersection.size / union.size;
    }

    /**
     * Calculate total income and expenses from a list of transactions
     */
    private calculateTransactionTotals(transactions: any[]): any {
        const income = transactions
            .filter((t: any) => t.amount > 0)
            .reduce((sum: number, t: any) => sum + t.amount, 0);
        
        const expenses = transactions
            .filter((t: any) => t.amount < 0)
            .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

        return { totalIncome: income, totalExpenses: expenses, netCashflow: income - expenses };
    }
}


