const logger = require('./logger');

/**
 * Confidence Scoring System
 * Multi-dimensional confidence assessment for AI outputs
 */
class ConfidenceScoringSystem {
    constructor(options = {}) {
        this.weights = {
            dataCompleteness: options.dataCompletenessWeight || 0.25,
            logicalConsistency: options.logicalConsistencyWeight || 0.30,
            patternMatch: options.patternMatchWeight || 0.20,
            historicalAccuracy: options.historicalAccuracyWeight || 0.15,
            crossValidation: options.crossValidationWeight || 0.10
        };
        
        this.thresholds = {
            high: 0.85,
            medium: 0.70,
            low: 0.50
        };
        
        this.historicalData = new Map();
    }

    /**
     * Calculate overall confidence score for a result
     * @param {Object} result - The AI processing result
     * @param {Object} context - Additional context for scoring
     * @returns {Object} Confidence assessment with scores and recommendations
     */
    calculateConfidence(result, context = {}) {
        logger.debug('CONFIDENCE_SCORER', 'Calculating confidence score', {
            resultKeys: Object.keys(result),
            contextKeys: Object.keys(context)
        });

        const scores = {
            dataCompleteness: this.scoreCompleteness(result),
            logicalConsistency: this.scoreConsistency(result),
            patternMatch: this.scorePatternMatch(result, context),
            historicalAccuracy: this.scoreHistoricalAccuracy(result, context),
            crossValidation: this.scoreCrossValidation(result, context)
        };

        const overallScore = this.calculateWeightedAverage(scores, this.weights);
        const confidenceLevel = this.getConfidenceLevel(overallScore);
        const recommendations = this.generateRecommendations(scores, overallScore);

        const assessment = {
            overallScore: Math.round(overallScore * 1000) / 1000,
            confidenceLevel,
            scores,
            recommendations,
            timestamp: new Date().toISOString()
        };

        logger.info('CONFIDENCE_SCORER', `Confidence assessment completed`, {
            overallScore: assessment.overallScore,
            confidenceLevel,
            recommendationsCount: recommendations.length
        });

        return assessment;
    }

    /**
     * Score data completeness (0-1)
     */
    scoreCompleteness(result) {
        let score = 0;
        let totalFields = 0;
        let completedFields = 0;

        // Check required fields
        const requiredFields = ['transactions', 'totals', 'alerts', 'highlights'];
        requiredFields.forEach(field => {
            totalFields++;
            if (result[field] && (Array.isArray(result[field]) ? result[field].length > 0 : true)) {
                completedFields++;
            }
        });

        // Check transaction completeness
        if (result.transactions && Array.isArray(result.transactions)) {
            const transactionFields = ['date', 'description', 'amount', 'category'];
            result.transactions.forEach(transaction => {
                transactionFields.forEach(field => {
                    totalFields++;
                    if (transaction[field] !== undefined && transaction[field] !== null && transaction[field] !== '') {
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

        score = totalFields > 0 ? completedFields / totalFields : 0;
        
        logger.debug('CONFIDENCE_SCORER', `Data completeness score: ${score}`, {
            completedFields,
            totalFields
        });

        return score;
    }

    /**
     * Score logical consistency (0-1)
     */
    scoreConsistency(result) {
        let score = 1.0;
        let issues = 0;

        // Check totals consistency
        if (result.totals) {
            const { totalIncome = 0, totalExpenses = 0, netCashflow = 0 } = result.totals;
            const calculatedNet = totalIncome - totalExpenses;
            const netDifference = Math.abs(calculatedNet - netCashflow);
            
            if (netDifference > 0.01) {
                issues++;
                score -= 0.3; // Major inconsistency
            }
        }

        // Check transaction amounts consistency
        if (result.transactions && Array.isArray(result.transactions)) {
            const incomeFromTransactions = result.transactions
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
            
            const expensesFromTransactions = result.transactions
                .filter(t => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            if (result.totals) {
                const incomeDifference = Math.abs(incomeFromTransactions - result.totals.totalIncome);
                const expenseDifference = Math.abs(expensesFromTransactions - result.totals.totalExpenses);
                
                if (incomeDifference > 0.01) {
                    issues++;
                    score -= 0.2;
                }
                
                if (expenseDifference > 0.01) {
                    issues++;
                    score -= 0.2;
                }
            }
        }

        // Check for unrealistic values
        if (result.totals) {
            const { totalIncome = 0, totalExpenses = 0 } = result.totals;
            
            if (totalIncome < 0 || totalExpenses < 0) {
                issues++;
                score -= 0.4; // Negative values are illogical
            }
            
            if (totalIncome > 10000000 || totalExpenses > 10000000) {
                issues++;
                score -= 0.1; // Unrealistically high values
            }
        }

        score = Math.max(0, score);
        
        logger.debug('CONFIDENCE_SCORER', `Logical consistency score: ${score}`, {
            issues
        });

        return score;
    }

    /**
     * Score pattern matching (0-1)
     */
    scorePatternMatch(result, context) {
        let score = 0.5; // Base score

        // Check for expected financial patterns
        if (result.transactions && Array.isArray(result.transactions)) {
            const transactions = result.transactions;
            
            // Pattern: Mix of income and expenses
            const hasIncome = transactions.some(t => t.amount > 0);
            const hasExpenses = transactions.some(t => t.amount < 0);
            
            if (hasIncome && hasExpenses) {
                score += 0.2;
            } else if (hasIncome || hasExpenses) {
                score += 0.1;
            }

            // Pattern: Reasonable transaction amounts
            const amounts = transactions.map(t => Math.abs(t.amount));
            const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
            
            if (avgAmount > 0 && avgAmount < 100000) {
                score += 0.1;
            }

            // Pattern: Good categorization
            const categories = transactions.map(t => t.category).filter(c => c && c !== 'Other');
            const uniqueCategories = new Set(categories).size;
            
            if (uniqueCategories > 1) {
                score += 0.1;
            }
        }

        // Check for expected alert patterns
        if (result.alerts && Array.isArray(result.alerts)) {
            const hasHighSeverity = result.alerts.some(a => a.severity === 'high');
            const hasMediumSeverity = result.alerts.some(a => a.severity === 'medium');
            
            if (hasHighSeverity || hasMediumSeverity) {
                score += 0.1;
            }
        }

        score = Math.min(1.0, score);
        
        logger.debug('CONFIDENCE_SCORER', `Pattern match score: ${score}`);
        
        return score;
    }

    /**
     * Score historical accuracy (0-1)
     */
    scoreHistoricalAccuracy(result, context) {
        if (!context.userId || !this.historicalData.has(context.userId)) {
            return 0.5; // Neutral score for new users
        }

        const userHistory = this.historicalData.get(context.userId);
        let score = 0.5;
        let comparisons = 0;

        // Compare with similar historical results
        userHistory.forEach(historicalResult => {
            const similarity = this.calculateResultSimilarity(result, historicalResult);
            
            if (similarity > 0.7) {
                // Use historical accuracy if available
                if (historicalResult.accuracy) {
                    score += historicalResult.accuracy * 0.3;
                    comparisons++;
                }
            }
        });

        if (comparisons > 0) {
            score = score / comparisons;
        }

        logger.debug('CONFIDENCE_SCORER', `Historical accuracy score: ${score}`, {
            comparisons,
            userId: context.userId
        });

        return Math.min(1.0, score);
    }

    /**
     * Score cross-validation (0-1)
     */
    scoreCrossValidation(result, context) {
        let score = 0.5; // Base score

        // If we have multiple validation methods, compare results
        if (context.validationResults && Array.isArray(context.validationResults)) {
            const validationScores = context.validationResults.map(v => v.confidence || 0.5);
            const avgValidationScore = validationScores.reduce((sum, s) => sum + s, 0) / validationScores.length;
            
            score = avgValidationScore;
        }

        // Check for internal cross-validation
        if (result.transactions && result.totals) {
            const transactionTotals = this.calculateTransactionTotals(result.transactions);
            const totalsMatch = this.compareTotals(transactionTotals, result.totals);
            
            if (totalsMatch) {
                score += 0.2;
            }
        }

        logger.debug('CONFIDENCE_SCORER', `Cross-validation score: ${score}`);

        return Math.min(1.0, score);
    }

    /**
     * Calculate weighted average of scores
     */
    calculateWeightedAverage(scores, weights) {
        let weightedSum = 0;
        let totalWeight = 0;

        Object.keys(scores).forEach(key => {
            const score = scores[key];
            const weight = weights[key] || 0;
            weightedSum += score * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Get confidence level based on score
     */
    getConfidenceLevel(score) {
        if (score >= this.thresholds.high) return 'high';
        if (score >= this.thresholds.medium) return 'medium';
        if (score >= this.thresholds.low) return 'low';
        return 'very_low';
    }

    /**
     * Generate recommendations based on scores
     */
    generateRecommendations(scores, overallScore) {
        const recommendations = [];

        if (scores.dataCompleteness < 0.7) {
            recommendations.push({
                type: 'completeness',
                priority: 'high',
                message: 'Improve data completeness by ensuring all required fields are populated'
            });
        }

        if (scores.logicalConsistency < 0.8) {
            recommendations.push({
                type: 'consistency',
                priority: 'high',
                message: 'Review calculations for logical consistency, especially totals and transaction amounts'
            });
        }

        if (scores.patternMatch < 0.6) {
            recommendations.push({
                type: 'pattern',
                priority: 'medium',
                message: 'Improve pattern matching by enhancing categorization and transaction analysis'
            });
        }

        if (overallScore < 0.5) {
            recommendations.push({
                type: 'overall',
                priority: 'critical',
                message: 'Overall confidence is very low. Consider manual review or reprocessing'
            });
        }

        return recommendations;
    }

    /**
     * Calculate similarity between two results
     */
    calculateResultSimilarity(result1, result2) {
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
     * Compare two totals objects
     */
    compareTotals(totals1, totals2) {
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
     * Compare two alert arrays
     */
    compareAlerts(alerts1, alerts2) {
        if (alerts1.length === 0 && alerts2.length === 0) return 1;
        if (alerts1.length === 0 || alerts2.length === 0) return 0;

        const types1 = new Set(alerts1.map(a => a.type));
        const types2 = new Set(alerts2.map(a => a.type));
        
        const intersection = new Set([...types1].filter(x => types2.has(x)));
        const union = new Set([...types1, ...types2]);
        
        return intersection.size / union.size;
    }

    /**
     * Calculate transaction totals
     */
    calculateTransactionTotals(transactions) {
        const income = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        return {
            totalIncome: income,
            totalExpenses: expenses,
            netCashflow: income - expenses
        };
    }

    /**
     * Record historical accuracy for learning
     */
    recordHistoricalAccuracy(userId, result, actualAccuracy) {
        if (!this.historicalData.has(userId)) {
            this.historicalData.set(userId, []);
        }

        const userHistory = this.historicalData.get(userId);
        userHistory.push({
            ...result,
            accuracy: actualAccuracy,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 results per user
        if (userHistory.length > 100) {
            userHistory.splice(0, userHistory.length - 100);
        }

        logger.debug('CONFIDENCE_SCORER', `Recorded historical accuracy for user ${userId}`, {
            accuracy: actualAccuracy,
            historySize: userHistory.length
        });
    }
}

module.exports = ConfidenceScoringSystem;
