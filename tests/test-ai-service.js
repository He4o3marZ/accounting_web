/**
 * Integration Tests for AI Service
 */

const AIService = require('../services/aiService');
const Validator = require('../services/validator');

describe('AI Service Integration', () => {
    let aiService;

    beforeEach(() => {
        aiService = new AIService();
    });

    describe('processAccountingData', () => {
        test('should handle valid CSV data', async () => {
            const mockData = {
                lineItems: [
                    { description: 'Office Supplies', total: -150, quantity: 1, unit_price: -150 },
                    { description: 'Client Payment', total: 1000, quantity: 1, unit_price: 1000 }
                ],
                totals: { net: 0, vat: 0, gross: 0 },
                currency: '€',
                date: '2025-01-01'
            };

            const result = await aiService.processAccountingData(mockData);
            
            expect(result).toBeDefined();
            expect(result.processed).toBeDefined();
            expect(result.processed.totalIncome).toBe(1000);
            expect(result.processed.totalExpenses).toBe(150);
        });

        test('should handle empty data gracefully', async () => {
            const mockData = {
                lineItems: [],
                totals: { net: 0, vat: 0, gross: 0 },
                currency: '€',
                date: '2025-01-01'
            };

            const result = await aiService.processAccountingData(mockData);
            
            expect(result).toBeDefined();
            expect(result.processed.totalIncome).toBe(0);
            expect(result.processed.totalExpenses).toBe(0);
        });
    });

    describe('aiExtractRawData', () => {
        test('should extract transactions correctly', async () => {
            const mockData = {
                lineItems: [
                    { description: 'Office Supplies', total: -150, quantity: 1, unit_price: -150 },
                    { description: 'Client Payment', total: 1000, quantity: 1, unit_price: 1000 }
                ],
                totals: { net: 0, vat: 0, gross: 0 },
                currency: '€',
                date: '2025-01-01'
            };

            const result = await aiService.aiExtractRawData(mockData);
            
            expect(result.rawTransactions).toHaveLength(2);
            expect(result.totals.totalIncome).toBe(1000);
            expect(result.totals.totalExpenses).toBe(150);
            expect(result.totals.netCashflow).toBe(850);
        });

        test('should filter out invalid transactions', async () => {
            const mockData = {
                lineItems: [
                    { description: 'Valid Transaction', total: -150, quantity: 1, unit_price: -150 },
                    { description: 'Invalid Transaction', total: 0, quantity: 1, unit_price: 0 }
                ],
                totals: { net: 0, vat: 0, gross: 0 },
                currency: '€',
                date: '2025-01-01'
            };

            const result = await aiService.aiExtractRawData(mockData);
            
            expect(result.rawTransactions).toHaveLength(1);
            expect(result.discardedItems).toHaveLength(1);
        });
    });

    describe('fallbackCategorizeTransactions', () => {
        test('should categorize transactions correctly', () => {
            const rawTransactions = [
                { description: 'Office Supplies', amount: -150 },
                { description: 'Client Payment', amount: 1000 }
            ];

            const result = aiService.fallbackCategorizeTransactions(rawTransactions);
            
            expect(result.transactions).toHaveLength(2);
            expect(result.expenses).toHaveLength(1);
            expect(result.income).toHaveLength(1);
            expect(result.totals).toBeDefined();
            expect(result.totals.totalIncome).toBe(1000);
            expect(result.totals.totalExpenses).toBe(150);
        });
    });

    describe('analyzeFinancials', () => {
        test('should analyze healthy financials', () => {
            const result = aiService.analyzeFinancials(1000, 200, 800);
            
            expect(result.financialHealth).toContain('Healthy');
            expect(result.alerts).toBeDefined();
        });

        test('should detect sustainability risk', () => {
            const result = aiService.analyzeFinancials(0, 200, -200);
            
            expect(result.financialHealth).toContain('Unhealthy');
            expect(result.alerts.some(a => a.type === 'income_missing')).toBe(true);
        });

        test('should detect data completeness issues', () => {
            const result = aiService.analyzeFinancials(1000, 0, 1000);
            
            expect(result.financialHealth).toContain('zero expenses');
            expect(result.alerts.some(a => a.type === 'expense_missing')).toBe(true);
        });
    });
});
















