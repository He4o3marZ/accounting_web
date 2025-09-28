const CashflowManager = require('../services/financialModules/cashflowManager');

describe('CashflowManager', () => {
    let cashflowManager;
    let mockTransactions;

    beforeEach(() => {
        cashflowManager = new CashflowManager();
        mockTransactions = [
            {
                date: '2024-01-01',
                description: 'Office Supplies',
                amount: -150.00,
                category: 'Office'
            },
            {
                date: '2024-01-02',
                description: 'Client Payment - ABC Corp',
                amount: 2500.00,
                category: 'Income'
            },
            {
                date: '2024-01-03',
                description: 'Software License',
                amount: -99.00,
                category: 'Software'
            },
            {
                date: '2024-01-04',
                description: 'Internet Service',
                amount: -89.99,
                category: 'Utilities'
            },
            {
                date: '2024-01-05',
                description: 'Client Payment - XYZ Ltd',
                amount: 1800.00,
                category: 'Income'
            }
        ];
    });

    describe('processCashflow', () => {
        test('should process transactions and generate cashflow data', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');

            expect(result).toBeDefined();
            expect(result.transactions).toHaveLength(5);
            expect(result.totals).toBeDefined();
            expect(result.dailySummary).toBeDefined();
            expect(result.weeklySummary).toBeDefined();
            expect(result.monthlySummary).toBeDefined();
            expect(result.trends).toBeDefined();
            expect(result.alerts).toBeDefined();
            expect(result.highlights).toBeDefined();
        });

        test('should calculate correct totals', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');

            expect(result.totals.totalInflow).toBe(4300.00);
            expect(result.totals.totalOutflow).toBe(338.99);
            expect(result.totals.netCashflow).toBe(3961.01);
            expect(result.totals.transactionCount).toBe(5);
            expect(result.totals.currency).toBe('€');
        });

        test('should generate daily summary', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');

            expect(result.dailySummary).toHaveLength(5);
            expect(result.dailySummary[0]).toHaveProperty('date');
            expect(result.dailySummary[0]).toHaveProperty('inflow');
            expect(result.dailySummary[0]).toHaveProperty('outflow');
            expect(result.dailySummary[0]).toHaveProperty('netFlow');
            expect(result.dailySummary[0]).toHaveProperty('transactions');
        });

        test('should handle empty transactions array', () => {
            const result = cashflowManager.processCashflow([], '€');

            expect(result.transactions).toHaveLength(0);
            expect(result.totals.totalInflow).toBe(0);
            expect(result.totals.totalOutflow).toBe(0);
            expect(result.totals.netCashflow).toBe(0);
        });

        test('should handle invalid transactions', () => {
            const invalidTransactions = [
                { date: '2024-01-01', description: 'Invalid', amount: 0 },
                { date: '2024-01-02', description: 'Valid', amount: 100 },
                { date: '2024-01-03', description: 'Invalid', amount: 'invalid' }
            ];

            const result = cashflowManager.processCashflow(invalidTransactions, '€');

            expect(result.transactions).toHaveLength(1);
            expect(result.totals.totalInflow).toBe(100);
        });
    });

    describe('getPeriodSummary', () => {
        test('should get today summary', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const todaySummary = cashflowManager.getPeriodSummary('today');

            expect(todaySummary).toBeDefined();
            expect(todaySummary.period).toBe('today');
            expect(todaySummary).toHaveProperty('totalInflow');
            expect(todaySummary).toHaveProperty('totalOutflow');
            expect(todaySummary).toHaveProperty('netCashflow');
        });

        test('should get week summary', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const weekSummary = cashflowManager.getPeriodSummary('week');

            expect(weekSummary).toBeDefined();
            expect(weekSummary.period).toBe('week');
        });

        test('should get month summary', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const monthSummary = cashflowManager.getPeriodSummary('month');

            expect(monthSummary).toBeDefined();
            expect(monthSummary.period).toBe('month');
        });

        test('should get year summary', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const yearSummary = cashflowManager.getPeriodSummary('year');

            expect(yearSummary).toBeDefined();
            expect(yearSummary.period).toBe('year');
        });

        test('should throw error for invalid period', () => {
            expect(() => {
                cashflowManager.getPeriodSummary('invalid');
            }).toThrow('Invalid period: invalid');
        });
    });

    describe('getCashflowByDateRange', () => {
        test('should get cashflow for date range', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const dateRangeData = cashflowManager.getCashflowByDateRange('2024-01-01', '2024-01-03');

            expect(dateRangeData).toBeDefined();
            expect(dateRangeData.length).toBeGreaterThan(0);
        });

        test('should return empty array for invalid date range', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');
            const dateRangeData = cashflowManager.getCashflowByDateRange('2025-01-01', '2025-01-03');

            expect(dateRangeData).toHaveLength(0);
        });
    });

    describe('trend calculation', () => {
        test('should calculate trends correctly', () => {
            const result = cashflowManager.processCashflow(mockTransactions, '€');

            expect(result.trends).toBeDefined();
            expect(result.trends.daily).toBeDefined();
            expect(result.trends.weekly).toBeDefined();
            expect(result.trends.monthly).toBeDefined();
        });
    });

    describe('alert generation', () => {
        test('should generate alerts for negative cashflow', () => {
            const negativeTransactions = [
                { date: '2024-01-01', description: 'Expense', amount: -1000 },
                { date: '2024-01-02', description: 'Income', amount: 500 }
            ];

            const result = cashflowManager.processCashflow(negativeTransactions, '€');

            expect(result.alerts).toBeDefined();
            expect(result.alerts.length).toBeGreaterThan(0);
            expect(result.alerts.some(alert => alert.type === 'negative_cashflow')).toBe(true);
        });

        test('should generate highlights for positive trends', () => {
            const positiveTransactions = [
                { date: '2024-01-01', description: 'Income', amount: 1000 },
                { date: '2024-01-02', description: 'Income', amount: 1200 },
                { date: '2024-01-03', description: 'Income', amount: 1400 }
            ];

            const result = cashflowManager.processCashflow(positiveTransactions, '€');

            expect(result.highlights).toBeDefined();
            expect(result.highlights.length).toBeGreaterThan(0);
        });
    });

    describe('error handling', () => {
        test('should handle processing errors gracefully', () => {
            const invalidTransactions = [
                { date: 'invalid-date', description: 'Test', amount: 'invalid' }
            ];

            expect(() => {
                cashflowManager.processCashflow(invalidTransactions, '€');
            }).not.toThrow();
        });
    });
});




