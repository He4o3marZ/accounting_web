/**
 * Unit Tests for Validator Module
 */

const Validator = require('../services/validator');

describe('Validator Module', () => {
    describe('validateFinancialData', () => {
        test('should validate correct financial data', () => {
            const data = {
                transactions: [
                    { amount: 1000, description: 'Income' },
                    { amount: -200, description: 'Expense' }
                ],
                totals: {
                    totalIncome: 1000,
                    totalExpenses: 200,
                    netCashflow: 800
                }
            };

            const result = Validator.validateFinancialData(data);
            
            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
            expect(result.correctedData.totals.totalIncome).toBe(1000);
        });

        test('should detect and correct expense mismatch', () => {
            const data = {
                transactions: [
                    { amount: 1000, description: 'Income' },
                    { amount: -200, description: 'Expense' }
                ],
                totals: {
                    totalIncome: 1000,
                    totalExpenses: 500, // Wrong!
                    netCashflow: 500
                }
            };

            const result = Validator.validateFinancialData(data);
            
            expect(result.isValid).toBe(false);
            expect(result.issues).toHaveLength(2); // Expense mismatch + net cashflow mismatch
            expect(result.issues[0].type).toBe('error');
            expect(result.issues[0].field).toBe('totalExpenses');
            expect(result.correctedData.totals.totalExpenses).toBe(200);
        });

        test('should detect income contradiction', () => {
            const data = {
                transactions: [
                    { amount: 1000, description: 'Income' },
                    { amount: -200, description: 'Expense' }
                ],
                totals: {
                    totalIncome: 0, // Wrong!
                    totalExpenses: 200,
                    netCashflow: -200
                }
            };

            const result = Validator.validateFinancialData(data);
            
            expect(result.isValid).toBe(false);
            expect(result.issues.some(i => i.field === 'totalIncome')).toBe(true);
            expect(result.correctedData.totals.totalIncome).toBe(1000);
        });

        test('should handle empty transactions', () => {
            const data = {
                transactions: [],
                totals: {}
            };

            const result = Validator.validateFinancialData(data);
            
            expect(result.isValid).toBe(true);
            expect(result.correctedData.totals.totalIncome).toBe(0);
            expect(result.correctedData.totals.totalExpenses).toBe(0);
        });

        test('should detect sustainability risk', () => {
            const data = {
                transactions: [
                    { amount: -200, description: 'Expense' }
                ],
                totals: {
                    totalIncome: 0,
                    totalExpenses: 200,
                    netCashflow: -200
                }
            };

            const result = Validator.validateFinancialData(data);
            
            expect(result.issues.some(i => i.field === 'sustainability')).toBe(true);
            expect(result.issues.find(i => i.field === 'sustainability').type).toBe('warning');
        });
    });

    describe('checkConsistency', () => {
        test('should detect narrative contradictions', () => {
            const report = {
                totalIncome: 1000,
                totalExpenses: 200,
                netCashflow: 800,
                financialHealth: "Healthy due to zero expenses and positive net cashflow",
                alerts: []
            };

            const result = Validator.checkConsistency(report);
            
            expect(result.isConsistent).toBe(false);
            expect(result.issues.some(i => i.field === 'expense_contradiction')).toBe(true);
        });

        test('should detect alert contradictions', () => {
            const report = {
                totalIncome: 1000,
                totalExpenses: 200,
                netCashflow: 800,
                financialHealth: "Healthy",
                alerts: [
                    { message: "No expenses recorded — this may indicate missing data" }
                ]
            };

            const result = Validator.checkConsistency(report);
            
            expect(result.isConsistent).toBe(false);
            expect(result.issues.some(i => i.field === 'alert_0')).toBe(true);
        });

        test('should validate correct report', () => {
            const report = {
                totalIncome: 1000,
                totalExpenses: 200,
                netCashflow: 800,
                financialHealth: "Healthy due to strong positive net cashflow",
                alerts: [
                    { message: "Strong income performance" }
                ]
            };

            const result = Validator.checkConsistency(report);
            
            expect(result.isConsistent).toBe(true);
            expect(result.issues).toHaveLength(0);
        });
    });

    describe('calculateConfidence', () => {
        test('should calculate high confidence for good data', () => {
            const data = {
                transactions: [
                    { amount: 1000, description: 'Income' },
                    { amount: -200, description: 'Expense' }
                ],
                validationIssues: [],
                consistencyIssues: []
            };

            const aiResults = {
                insights: { financialHealth: "Healthy" }
            };

            const result = Validator.calculateConfidence(data, aiResults);
            
            expect(result.score).toBeGreaterThan(80);
            expect(result.factors).toBeDefined();
        });

        test('should reduce confidence for validation errors', () => {
            const data = {
                transactions: [],
                validationIssues: [
                    { type: 'error', field: 'totalIncome' }
                ],
                consistencyIssues: []
            };

            const aiResults = {
                insights: { financialHealth: "Unknown" }
            };

            const result = Validator.calculateConfidence(data, aiResults);
            
            expect(result.score).toBeLessThan(50);
        });
    });
});














