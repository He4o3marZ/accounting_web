import { logger } from './logger';

interface ValidationResult {
    isValid: boolean;
    confidence: number;
    issues: string[];
    correctedData?: any;
}

/**
 * Enhanced validation system for financial data
 */
export class Validator {
    constructor() {}

    /**
     * Validate financial data structure and content
     */
    validateFinancialData(data: any): ValidationResult {
        const issues: string[] = [];
        let confidence = 1.0;
        let correctedData: any = { ...data };

        logger.debug('VALIDATOR', 'Starting financial data validation');

        // Validate transactions
        if (data.transactions && Array.isArray(data.transactions)) {
            const transactionValidation = this.validateTransactions(data.transactions);
            issues.push(...transactionValidation.issues);
            confidence = Math.min(confidence, transactionValidation.confidence);
            correctedData.transactions = transactionValidation.correctedData || data.transactions;
        } else {
            issues.push('Missing or invalid transactions array');
            confidence -= 0.3;
        }

        // Validate totals
        if (data.totals) {
            const totalsValidation = this.validateTotals(data.totals);
            issues.push(...totalsValidation.issues);
            confidence = Math.min(confidence, totalsValidation.confidence);
            correctedData.totals = totalsValidation.correctedData || data.totals;
        } else {
            issues.push('Missing totals object');
            confidence -= 0.2;
        }

        // Validate alerts
        if (data.alerts && Array.isArray(data.alerts)) {
            const alertsValidation = this.validateAlerts(data.alerts);
            issues.push(...alertsValidation.issues);
            confidence = Math.min(confidence, alertsValidation.confidence);
        }

        // Validate highlights
        if (data.highlights && Array.isArray(data.highlights)) {
            const highlightsValidation = this.validateHighlights(data.highlights);
            issues.push(...highlightsValidation.issues);
            confidence = Math.min(confidence, highlightsValidation.confidence);
        }

        const result: ValidationResult = {
            isValid: issues.length === 0,
            confidence: Math.max(0, confidence),
            issues,
            correctedData: issues.length > 0 ? correctedData : undefined
        };

        logger.info('VALIDATOR', 'Validation completed', {
            isValid: result.isValid,
            confidence: result.confidence,
            issuesCount: issues.length
        });

        return result;
    }

    /**
     * Validate transaction array
     */
    private validateTransactions(transactions: any[]): ValidationResult {
        const issues: string[] = [];
        let confidence = 1.0;
        const correctedData: any[] = [];

        transactions.forEach((transaction, index) => {
            const transactionIssues: string[] = [];
            const correctedTransaction: any = { ...transaction };

            // Check required fields
            if (!transaction.date) {
                transactionIssues.push(`Transaction ${index}: Missing date`);
                correctedTransaction.date = new Date().toISOString().split('T')[0];
                confidence -= 0.1;
            }

            if (!transaction.description) {
                transactionIssues.push(`Transaction ${index}: Missing description`);
                correctedTransaction.description = `Transaction ${index + 1}`;
                confidence -= 0.1;
            }

            if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
                transactionIssues.push(`Transaction ${index}: Invalid amount`);
                correctedTransaction.amount = 0;
                confidence -= 0.2;
            }

            if (!transaction.category) {
                transactionIssues.push(`Transaction ${index}: Missing category`);
                correctedTransaction.category = 'Other';
                confidence -= 0.05;
            }

            issues.push(...transactionIssues);
            correctedData.push(correctedTransaction);
        });

        return {
            isValid: issues.length === 0,
            confidence: Math.max(0, confidence),
            issues,
            correctedData
        };
    }

    /**
     * Validate totals object
     */
    private validateTotals(totals: any): ValidationResult {
        const issues: string[] = [];
        let confidence = 1.0;
        const correctedData: any = { ...totals };

        const requiredFields = ['totalIncome', 'totalExpenses', 'netCashflow'];
        
        requiredFields.forEach(field => {
            if (typeof totals[field] !== 'number' || isNaN(totals[field])) {
                issues.push(`Missing or invalid ${field}`);
                correctedData[field] = 0;
                confidence -= 0.2;
            }
        });

        // Validate logical consistency
        if (totals.totalIncome !== undefined && totals.totalExpenses !== undefined && totals.netCashflow !== undefined) {
            const calculatedNet = totals.totalIncome - totals.totalExpenses;
            const difference = Math.abs(calculatedNet - totals.netCashflow);
            
            if (difference > 0.01) {
                issues.push(`Net cashflow inconsistency: calculated ${calculatedNet} vs reported ${totals.netCashflow}`);
                correctedData.netCashflow = calculatedNet;
                confidence -= 0.3;
            }
        }

        return {
            isValid: issues.length === 0,
            confidence: Math.max(0, confidence),
            issues,
            correctedData
        };
    }

    /**
     * Validate alerts array
     */
    private validateAlerts(alerts: any[]): ValidationResult {
        const issues: string[] = [];
        let confidence = 1.0;

        alerts.forEach((alert, index) => {
            if (!alert.type) {
                issues.push(`Alert ${index}: Missing type`);
                confidence -= 0.1;
            }

            if (!alert.message) {
                issues.push(`Alert ${index}: Missing message`);
                confidence -= 0.1;
            }

            if (!alert.severity || !['low', 'medium', 'high'].includes(alert.severity)) {
                issues.push(`Alert ${index}: Invalid severity`);
                confidence -= 0.05;
            }
        });

        return {
            isValid: issues.length === 0,
            confidence: Math.max(0, confidence),
            issues
        };
    }

    /**
     * Validate highlights array
     */
    private validateHighlights(highlights: any[]): ValidationResult {
        const issues: string[] = [];
        let confidence = 1.0;

        highlights.forEach((highlight, index) => {
            if (!highlight.message) {
                issues.push(`Highlight ${index}: Missing message`);
                confidence -= 0.1;
            }

            if (!highlight.type) {
                issues.push(`Highlight ${index}: Missing type`);
                confidence -= 0.05;
            }
        });

        return {
            isValid: issues.length === 0,
            confidence: Math.max(0, confidence),
            issues
        };
    }
}

export const validator = new Validator();
