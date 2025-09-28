const BudgetingTool = require('../services/financialModules/budgetingTool');

describe('BudgetingTool', () => {
    let budgetingTool;
    let mockTransactions;
    let mockBudgetCategories;

    beforeEach(() => {
        budgetingTool = new BudgetingTool();
        mockTransactions = [
            {
                date: '2024-01-01',
                description: 'Office Supplies',
                amount: -150.00,
                category: 'Office'
            },
            {
                date: '2024-01-02',
                description: 'Software License',
                amount: -99.00,
                category: 'Software'
            },
            {
                date: '2024-01-03',
                description: 'Internet Service',
                amount: -89.99,
                category: 'Utilities'
            },
            {
                date: '2024-01-04',
                description: 'Marketing Campaign',
                amount: -500.00,
                category: 'Marketing'
            },
            {
                date: '2024-01-05',
                description: 'Professional Services',
                amount: -300.00,
                category: 'Professional'
            }
        ];

        mockBudgetCategories = [
            {
                id: 'office_supplies',
                category: 'Office',
                monthlyBudget: 200,
                yearlyBudget: 2400,
                currency: '€',
                month: '2024-01',
                year: 2024,
                priority: 'medium'
            },
            {
                id: 'software_licenses',
                category: 'Software',
                monthlyBudget: 150,
                yearlyBudget: 1800,
                currency: '€',
                month: '2024-01',
                year: 2024,
                priority: 'high'
            },
            {
                id: 'utilities',
                category: 'Utilities',
                monthlyBudget: 100,
                yearlyBudget: 1200,
                currency: '€',
                month: '2024-01',
                year: 2024,
                priority: 'high'
            },
            {
                id: 'marketing',
                category: 'Marketing',
                monthlyBudget: 600,
                yearlyBudget: 7200,
                currency: '€',
                month: '2024-01',
                year: 2024,
                priority: 'medium'
            },
            {
                id: 'professional_services',
                category: 'Professional',
                monthlyBudget: 400,
                yearlyBudget: 4800,
                currency: '€',
                month: '2024-01',
                year: 2024,
                priority: 'medium'
            }
        ];
    });

    describe('processBudget', () => {
        test('should process budget with provided categories', () => {
            const result = budgetingTool.processBudget(mockTransactions, mockBudgetCategories, '€');

            expect(result).toBeDefined();
            expect(result.budgets).toHaveLength(5);
            expect(result.actuals).toHaveLength(5);
            expect(result.analysis).toBeDefined();
            expect(result.alerts).toBeDefined();
            expect(result.highlights).toBeDefined();
            expect(result.recommendations).toBeDefined();
        });

        test('should create default budgets when none provided', () => {
            const result = budgetingTool.processBudget(mockTransactions, [], '€');

            expect(result).toBeDefined();
            expect(result.budgets).toHaveLength(8); // Default budget categories
            expect(result.actuals).toHaveLength(5);
        });

        test('should calculate correct budget analysis', () => {
            const result = budgetingTool.processBudget(mockTransactions, mockBudgetCategories, '€');

            expect(result.analysis.overall).toBeDefined();
            expect(result.analysis.overall.totals).toBeDefined();
            expect(result.analysis.overall.categories).toHaveLength(5);
            expect(result.analysis.overall.status).toBeDefined();
        });

        test('should handle empty transactions array', () => {
            const result = budgetingTool.processBudget([], mockBudgetCategories, '€');

            expect(result).toBeDefined();
            expect(result.actuals).toHaveLength(0);
            expect(result.analysis.overall.totals.actual).toBe(0);
        });

        test('should filter out positive amounts (income)', () => {
            const mixedTransactions = [
                { date: '2024-01-01', description: 'Expense', amount: -100, category: 'Office' },
                { date: '2024-01-02', description: 'Income', amount: 1000, category: 'Income' }
            ];

            const result = budgetingTool.processBudget(mixedTransactions, mockBudgetCategories, '€');

            expect(result.actuals).toHaveLength(1);
            expect(result.actuals[0].amount).toBe(100);
        });
    });

    describe('setBudget', () => {
        test('should set budget for a category', () => {
            const budget = budgetingTool.setBudget('Office', 500, 6000, 'high');

            expect(budget).toBeDefined();
            expect(budget.category).toBe('Office');
            expect(budget.monthlyBudget).toBe(500);
            expect(budget.yearlyBudget).toBe(6000);
            expect(budget.priority).toBe('high');
        });

        test('should replace existing budget for same category and month', () => {
            budgetingTool.setBudget('Office', 500, 6000, 'high');
            const newBudget = budgetingTool.setBudget('Office', 600, 7200, 'medium');

            expect(newBudget.monthlyBudget).toBe(600);
            expect(newBudget.yearlyBudget).toBe(7200);
            expect(newBudget.priority).toBe('medium');
        });
    });

    describe('updateBudget', () => {
        test('should update existing budget', () => {
            budgetingTool.setBudget('Office', 500, 6000, 'high');
            const updated = budgetingTool.updateBudget('Office', { monthlyBudget: 600, priority: 'medium' });

            expect(updated).toBeDefined();
            expect(updated.monthlyBudget).toBe(600);
            expect(updated.priority).toBe('medium');
        });

        test('should return null for non-existent budget', () => {
            const updated = budgetingTool.updateBudget('NonExistent', { monthlyBudget: 600 });

            expect(updated).toBeNull();
        });
    });

    describe('getBudgetSummary', () => {
        test('should get budget summary for specific month', () => {
            budgetingTool.setBudget('Office', 500, 6000, 'high');
            budgetingTool.setBudget('Software', 200, 2400, 'medium');

            const summary = budgetingTool.getBudgetSummary(1, 2024);

            expect(summary).toBeDefined();
            expect(summary.month).toBe('2024-01');
            expect(summary.budget).toBe(700); // 500 + 200
            expect(summary.actual).toBe(0); // No actuals yet
            expect(summary.variance).toBe(-700);
        });
    });

    describe('forecastSpending', () => {
        test('should forecast future spending', () => {
            const result = budgetingTool.processBudget(mockTransactions, mockBudgetCategories, '€');
            const forecast = budgetingTool.forecastSpending(3);

            expect(forecast).toBeDefined();
            expect(forecast.forecast).toHaveLength(3);
            expect(forecast.historicalData).toBeDefined();
            expect(forecast.average).toBeDefined();
            expect(forecast.trend).toBeDefined();
        });

        test('should handle empty historical data', () => {
            const forecast = budgetingTool.forecastSpending(3);

            expect(forecast).toBeDefined();
            expect(forecast.forecast).toHaveLength(3);
        });
    });

    describe('budget status calculation', () => {
        test('should calculate correct budget status', () => {
            const result = budgetingTool.processBudget(mockTransactions, mockBudgetCategories, '€');

            result.analysis.overall.categories.forEach(category => {
                expect(category.status).toBeDefined();
                expect(['critical', 'warning', 'healthy', 'underutilized']).toContain(category.status);
            });
        });
    });

    describe('alert generation', () => {
        test('should generate alerts for budget exceeded', () => {
            const overBudgetTransactions = [
                { date: '2024-01-01', description: 'Office', amount: -300, category: 'Office' }
            ];
            const overBudgetCategories = [
                { id: 'office', category: 'Office', monthlyBudget: 200, yearlyBudget: 2400, currency: '€', month: '2024-01', year: 2024, priority: 'medium' }
            ];

            const result = budgetingTool.processBudget(overBudgetTransactions, overBudgetCategories, '€');

            expect(result.alerts).toBeDefined();
            expect(result.alerts.length).toBeGreaterThan(0);
            expect(result.alerts.some(alert => alert.type === 'budget_exceeded')).toBe(true);
        });

        test('should generate highlights for under budget', () => {
            const underBudgetTransactions = [
                { date: '2024-01-01', description: 'Office', amount: -50, category: 'Office' }
            ];
            const underBudgetCategories = [
                { id: 'office', category: 'Office', monthlyBudget: 200, yearlyBudget: 2400, currency: '€', month: '2024-01', year: 2024, priority: 'medium' }
            ];

            const result = budgetingTool.processBudget(underBudgetTransactions, underBudgetCategories, '€');

            expect(result.highlights).toBeDefined();
            expect(result.highlights.length).toBeGreaterThan(0);
        });
    });

    describe('recommendation generation', () => {
        test('should generate recommendations based on budget analysis', () => {
            const result = budgetingTool.processBudget(mockTransactions, mockBudgetCategories, '€');

            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });
    });

    describe('error handling', () => {
        test('should handle invalid transactions gracefully', () => {
            const invalidTransactions = [
                { date: 'invalid-date', description: 'Test', amount: 'invalid', category: 'Office' }
            ];

            expect(() => {
                budgetingTool.processBudget(invalidTransactions, mockBudgetCategories, '€');
            }).not.toThrow();
        });

        test('should handle processing errors gracefully', () => {
            expect(() => {
                budgetingTool.processBudget(null, mockBudgetCategories, '€');
            }).toThrow();
        });
    });
});




