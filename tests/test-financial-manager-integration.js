const FinancialManager = require('../services/financialManager');

describe('FinancialManager Integration Tests', () => {
    let financialManager;
    let mockTransactions;

    beforeEach(() => {
        financialManager = new FinancialManager();
        mockTransactions = [
            // Income transactions
            {
                date: '2024-01-01',
                description: 'Client Payment - ABC Corp',
                amount: 2500.00,
                category: 'Income',
                currency: '€'
            },
            {
                date: '2024-01-15',
                description: 'Client Payment - XYZ Ltd',
                amount: 1800.00,
                category: 'Income',
                currency: '€'
            },
            {
                date: '2024-01-30',
                description: 'Client Payment - DEF Inc',
                amount: 3200.00,
                category: 'Income',
                currency: '€'
            },
            // Expense transactions
            {
                date: '2024-01-02',
                description: 'Office Supplies',
                amount: -150.00,
                category: 'Office',
                currency: '€'
            },
            {
                date: '2024-01-03',
                description: 'Software License',
                amount: -99.00,
                category: 'Software',
                currency: '€'
            },
            {
                date: '2024-01-04',
                description: 'Internet Service',
                amount: -89.99,
                category: 'Utilities',
                currency: '€'
            },
            {
                date: '2024-01-05',
                description: 'Marketing Campaign',
                amount: -500.00,
                category: 'Marketing',
                currency: '€'
            },
            {
                date: '2024-01-06',
                description: 'Professional Services',
                amount: -300.00,
                category: 'Professional',
                currency: '€'
            },
            {
                date: '2024-01-07',
                description: 'Equipment Purchase',
                amount: -750.00,
                category: 'Equipment',
                currency: '€'
            },
            {
                date: '2024-01-08',
                description: 'Travel Expenses',
                amount: -400.00,
                category: 'Travel',
                currency: '€'
            },
            {
                date: '2024-01-09',
                description: 'Insurance Premium',
                amount: -200.00,
                category: 'Insurance',
                currency: '€'
            },
            {
                date: '2024-01-10',
                description: 'VAT Payment',
                amount: -150.00,
                category: 'Tax',
                currency: '€'
            },
            {
                date: '2024-01-11',
                description: 'Bank Loan Payment',
                amount: -500.00,
                category: 'Debt',
                currency: '€'
            },
            {
                date: '2024-01-12',
                description: 'Credit Card Payment',
                amount: -300.00,
                category: 'Debt',
                currency: '€'
            }
        ];
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            await expect(financialManager.initialize({ currency: '€' })).resolves.not.toThrow();
        });

        test('should initialize with custom options', async () => {
            const options = {
                currency: 'USD',
                reportOutputDir: './custom-reports',
                exchangeRates: { USD: 1, EUR: 0.85 }
            };

            await expect(financialManager.initialize(options)).resolves.not.toThrow();
        });
    });

    describe('Comprehensive Financial Data Processing', () => {
        beforeEach(async () => {
            await financialManager.initialize({ currency: '€' });
        });

        test('should process all financial modules', async () => {
            const result = await financialManager.processFinancialData(mockTransactions);

            expect(result).toBeDefined();
            expect(result.cashflow).toBeDefined();
            expect(result.assetsLiabilities).toBeDefined();
            expect(result.debtsLoans).toBeDefined();
            expect(result.taxesVAT).toBeDefined();
            expect(result.budget).toBeDefined();
            expect(result.forecasting).toBeDefined();
            expect(result.multiCurrency).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.alerts).toBeDefined();
            expect(result.highlights).toBeDefined();
            expect(result.recommendations).toBeDefined();
        });

        test('should calculate correct overall metrics', async () => {
            const result = await financialManager.processFinancialData(mockTransactions);

            // Check cashflow totals
            expect(result.cashflow.totals.totalInflow).toBe(7500.00);
            expect(result.cashflow.totals.totalOutflow).toBe(3339.99);
            expect(result.cashflow.totals.netCashflow).toBe(4160.01);

            // Check budget analysis
            expect(result.budget.analysis.overall.totals.actual).toBe(3339.99);
            expect(result.budget.analysis.overall.totals.budget).toBeGreaterThan(0);

            // Check assets and liabilities
            expect(result.assetsLiabilities.totals.totalAssets).toBeGreaterThan(0);
            expect(result.assetsLiabilities.totals.totalLiabilities).toBeGreaterThan(0);
            expect(result.assetsLiabilities.totals.netWorth).toBeDefined();

            // Check debts and loans
            expect(result.debtsLoans.totals.totalDebts).toBeGreaterThan(0);
            expect(result.debtsLoans.totals.totalLoans).toBeGreaterThanOrEqual(0);

            // Check taxes and VAT
            expect(result.taxesVAT.totals.totalTaxes).toBeGreaterThan(0);
            expect(result.taxesVAT.totals.totalVAT).toBeGreaterThan(0);
        });

        test('should generate appropriate alerts and highlights', async () => {
            const result = await financialManager.processFinancialData(mockTransactions);

            expect(result.alerts).toBeDefined();
            expect(Array.isArray(result.alerts)).toBe(true);
            expect(result.highlights).toBeDefined();
            expect(Array.isArray(result.highlights)).toBe(true);
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });

        test('should handle processing with specific options', async () => {
            const options = {
                includeCashflow: true,
                includeBudgeting: true,
                includeForecasting: false,
                targetCurrency: 'USD',
                budgetCategories: [
                    {
                        id: 'office',
                        category: 'Office',
                        monthlyBudget: 200,
                        yearlyBudget: 2400,
                        currency: '€',
                        month: '2024-01',
                        year: 2024,
                        priority: 'medium'
                    }
                ]
            };

            const result = await financialManager.processFinancialData(mockTransactions, options);

            expect(result.cashflow).toBeDefined();
            expect(result.budget).toBeDefined();
            expect(result.forecasting).toBeUndefined();
        });

        test('should handle empty transactions array', async () => {
            const result = await financialManager.processFinancialData([]);

            expect(result).toBeDefined();
            expect(result.cashflow.totals.totalInflow).toBe(0);
            expect(result.cashflow.totals.totalOutflow).toBe(0);
            expect(result.cashflow.totals.netCashflow).toBe(0);
        });
    });

    describe('Report Generation', () => {
        beforeEach(async () => {
            await financialManager.initialize({ currency: '€' });
            await financialManager.processFinancialData(mockTransactions);
        });

        test('should generate monthly report', async () => {
            const report = await financialManager.generateReport('monthly');

            expect(report).toBeDefined();
            expect(report.type).toBe('monthly');
            expect(report.sections).toBeDefined();
            expect(report.sections.executiveSummary).toBeDefined();
            expect(report.sections.cashflowAnalysis).toBeDefined();
            expect(report.sections.budgetAnalysis).toBeDefined();
            expect(report.metadata).toBeDefined();
        });

        test('should generate weekly report', async () => {
            const report = await financialManager.generateReport('weekly');

            expect(report).toBeDefined();
            expect(report.type).toBe('weekly');
        });

        test('should generate daily report', async () => {
            const report = await financialManager.generateReport('daily');

            expect(report).toBeDefined();
            expect(report.type).toBe('daily');
        });

        test('should generate yearly report', async () => {
            const report = await financialManager.generateReport('yearly');

            expect(report).toBeDefined();
            expect(report.type).toBe('yearly');
        });

        test('should throw error when no data is processed', async () => {
            const newManager = new FinancialManager();
            await newManager.initialize({ currency: '€' });

            await expect(newManager.generateReport('monthly')).rejects.toThrow('No financial data available');
        });
    });

    describe('Accountant Advisor', () => {
        beforeEach(async () => {
            await financialManager.initialize({ currency: '€' });
            await financialManager.processFinancialData(mockTransactions);
        });

        test('should provide financial advice', async () => {
            const advice = await financialManager.getAccountantAdvice('How can I improve my cashflow?');

            expect(advice).toBeDefined();
            expect(advice.query).toBe('How can I improve my cashflow?');
            expect(advice.response).toBeDefined();
            expect(advice.confidence).toBeDefined();
            expect(advice.sources).toBeDefined();
            expect(advice.followUpQuestions).toBeDefined();
        });

        test('should handle budget-related questions', async () => {
            const advice = await financialManager.getAccountantAdvice('Am I over budget this month?');

            expect(advice).toBeDefined();
            expect(advice.response).toContain('budget');
        });

        test('should handle debt-related questions', async () => {
            const advice = await financialManager.getAccountantAdvice('How can I reduce my debt?');

            expect(advice).toBeDefined();
            expect(advice.response).toContain('debt');
        });

        test('should throw error when no data is processed', async () => {
            const newManager = new FinancialManager();
            await newManager.initialize({ currency: '€' });

            await expect(newManager.getAccountantAdvice('Test question')).rejects.toThrow('No financial data available');
        });
    });

    describe('Module Data Access', () => {
        beforeEach(async () => {
            await financialManager.initialize({ currency: '€' });
            await financialManager.processFinancialData(mockTransactions);
        });

        test('should get cashflow module data', () => {
            const cashflowData = financialManager.getModuleData('cashflow');

            expect(cashflowData).toBeDefined();
            expect(cashflowData.totals).toBeDefined();
            expect(cashflowData.transactions).toBeDefined();
        });

        test('should get budget module data', () => {
            const budgetData = financialManager.getModuleData('budget');

            expect(budgetData).toBeDefined();
            expect(budgetData.analysis).toBeDefined();
            expect(budgetData.budgets).toBeDefined();
        });

        test('should throw error for non-existent module', () => {
            expect(() => {
                financialManager.getModuleData('nonExistent');
            }).toThrow("Module 'nonExistent' not found");
        });

        test('should throw error when no data is processed', () => {
            const newManager = new FinancialManager();
            expect(() => {
                newManager.getModuleData('cashflow');
            }).toThrow('No financial data available');
        });
    });

    describe('Utility Methods', () => {
        beforeEach(async () => {
            await financialManager.initialize({ currency: '€' });
            await financialManager.processFinancialData(mockTransactions);
        });

        test('should get available modules', () => {
            const modules = financialManager.getAvailableModules();

            expect(modules).toBeDefined();
            expect(Array.isArray(modules)).toBe(true);
            expect(modules.length).toBeGreaterThan(0);
        });

        test('should get data summary', () => {
            const summary = financialManager.getDataSummary();

            expect(summary).toBeDefined();
            expect(summary.lastProcessed).toBeDefined();
            expect(summary.currency).toBe('€');
            expect(summary.modules).toBeDefined();
            expect(summary.alertCount).toBeDefined();
            expect(summary.highlightCount).toBeDefined();
            expect(summary.overallHealth).toBeDefined();
        });

        test('should get quick tips', () => {
            const tips = financialManager.getQuickTips();

            expect(tips).toBeDefined();
            expect(Array.isArray(tips)).toBe(true);
        });

        test('should get available topics', () => {
            const topics = financialManager.getAvailableTopics();

            expect(topics).toBeDefined();
            expect(Array.isArray(topics)).toBe(true);
            expect(topics.length).toBeGreaterThan(0);
        });

        test('should clear data', () => {
            financialManager.clearData();

            expect(financialManager.processedData).toBeNull();
            expect(financialManager.lastProcessed).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors', async () => {
            const invalidOptions = {
                currency: null,
                reportOutputDir: '/invalid/path'
            };

            await expect(financialManager.initialize(invalidOptions)).rejects.toThrow();
        });

        test('should handle processing errors', async () => {
            await financialManager.initialize({ currency: '€' });

            await expect(financialManager.processFinancialData(null)).rejects.toThrow();
        });

        test('should handle report generation errors', async () => {
            await financialManager.initialize({ currency: '€' });

            await expect(financialManager.generateReport('invalid')).rejects.toThrow();
        });
    });

    describe('Multi-Currency Support', () => {
        test('should process transactions with currency conversion', async () => {
            await financialManager.initialize({ 
                currency: '€',
                exchangeRates: { USD: 1, EUR: 0.85, GBP: 0.73 }
            });

            const usdTransactions = mockTransactions.map(tx => ({
                ...tx,
                currency: 'USD',
                amount: tx.amount * 1.18 // Convert to USD
            }));

            const result = await financialManager.processFinancialData(usdTransactions, {
                targetCurrency: 'EUR'
            });

            expect(result).toBeDefined();
            expect(result.cashflow.totals.currency).toBe('EUR');
        });
    });
});




