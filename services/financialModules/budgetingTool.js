const logger = require('../logger');

class BudgetingTool {
    constructor() {
        this.budgets = [];
        this.actuals = [];
        this.currency = '€';
        this.alertThresholds = {
            warning: 0.8, // 80% of budget
            critical: 0.95 // 95% of budget
        };
    }

    /**
     * Process and analyze budget data
     * @param {Array} transactions - Array of transaction objects
     * @param {Array} budgetCategories - Array of budget category objects
     * @param {string} currency - Currency code
     * @returns {Object} Processed budget analysis
     */
    processBudget(transactions, budgetCategories = [], currency = '€') {
        try {
            this.currency = currency;
            this.actuals = [];
            this.budgets = budgetCategories;
            this.referenceMonth = null; // YYYY-MM of the most recent transaction

            // Process transactions into actual spending
            transactions.forEach((transaction, index) => {
                const amount = parseFloat(transaction.amount || transaction.Amount || 0);
                const description = transaction.description || transaction.Description || `Transaction ${index + 1}`;
                const category = transaction.category || transaction.Category || 'Other';
                const date = new Date(transaction.date || transaction.Date || new Date());

                if (isNaN(amount) || amount === 0) {
                    logger.warn('BUDGETING', 'Skipping invalid transaction', { description, amount });
                    return;
                }

                // Only process expenses (negative amounts)
                if (amount < 0) {
                    const actual = {
                        id: `actual_${index}_${Date.now()}`,
                        description,
                        amount: Math.abs(amount),
                        category,
                        date: date.toISOString().split('T')[0],
                        currency: this.currency,
                        month: date.toISOString().substring(0, 7), // YYYY-MM
                        year: date.getFullYear()
                    };

                    this.actuals.push(actual);
                }
            });

            // Determine reference month from actuals (latest month in the dataset)
            if (this.actuals.length > 0) {
                this.referenceMonth = this.actuals
                    .map(a => a.month)
                    .sort((a, b) => a.localeCompare(b))
                    .slice(-1)[0];
            } else {
                this.referenceMonth = new Date().toISOString().substring(0, 7);
            }

            // Create default budgets if none provided (aligned to reference month)
            if (this.budgets.length === 0) {
                this.budgets = this.createDefaultBudgets(this.referenceMonth);
            } else {
                // Ensure provided budgets are aligned to reference month for analysis
                this.budgets = this.budgets.map(b => ({
                    ...b,
                    month: b.month || this.referenceMonth,
                    year: b.year || parseInt(this.referenceMonth.split('-')[0], 10)
                }));
            }

            // Analyze budget performance
            const budgetAnalysis = this.analyzeBudgetPerformance();
            const monthlyAnalysis = this.analyzeMonthlyPerformance();
            const categoryAnalysis = this.analyzeCategoryPerformance();

            // Generate alerts and highlights
            const alerts = this.generateBudgetAlerts(budgetAnalysis);
            const highlights = this.generateBudgetHighlights(budgetAnalysis);

            const result = {
                budgets: this.budgets,
                actuals: this.actuals,
                analysis: {
                    overall: budgetAnalysis,
                    monthly: monthlyAnalysis,
                    category: categoryAnalysis
                },
                alerts,
                highlights,
                recommendations: this.generateBudgetRecommendations(budgetAnalysis)
            };

            logger.info('BUDGETING', 'Budget analysis completed successfully', {
                budgetCategories: this.budgets.length,
                actualTransactions: this.actuals.length,
                totalActualSpending: this.actuals.reduce((sum, actual) => sum + actual.amount, 0)
            });

            return result;
        } catch (error) {
            logger.error('BUDGETING', 'Error processing budget', error);
            throw new Error(`Budget processing failed: ${error.message}`);
        }
    }

    /**
     * Create default budget categories
     */
    createDefaultBudgets(monthOverride = null) {
        const currentMonth = monthOverride || new Date().toISOString().substring(0, 7);
        const currentYear = parseInt(currentMonth.split('-')[0], 10);

        return [
            {
                id: 'office_supplies',
                category: 'Office',
                monthlyBudget: 500,
                yearlyBudget: 6000,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'medium'
            },
            {
                id: 'software_licenses',
                category: 'Software',
                monthlyBudget: 200,
                yearlyBudget: 2400,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'high'
            },
            {
                id: 'utilities',
                category: 'Utilities',
                monthlyBudget: 300,
                yearlyBudget: 3600,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'high'
            },
            {
                id: 'marketing',
                category: 'Marketing',
                monthlyBudget: 1000,
                yearlyBudget: 12000,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'medium'
            },
            {
                id: 'professional_services',
                category: 'Professional',
                monthlyBudget: 800,
                yearlyBudget: 9600,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'medium'
            },
            {
                id: 'equipment',
                category: 'Equipment',
                monthlyBudget: 400,
                yearlyBudget: 4800,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'low'
            },
            {
                id: 'travel',
                category: 'Travel',
                monthlyBudget: 600,
                yearlyBudget: 7200,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'low'
            },
            {
                id: 'other',
                category: 'Other',
                monthlyBudget: 300,
                yearlyBudget: 3600,
                currency: this.currency,
                month: currentMonth,
                year: currentYear,
                priority: 'low'
            }
        ];
    }

    /**
     * Analyze overall budget performance
     */
    analyzeBudgetPerformance() {
        const currentMonth = this.referenceMonth || new Date().toISOString().substring(0, 7);
        const currentYear = parseInt(currentMonth.split('-')[0], 10);

        // Calculate monthly totals; if no actuals this month, fall back to the most recent
        // month that contains any actual expenses
        let monthlyActuals = this.actuals.filter(actual => actual.month === currentMonth);
        let selectedMonth = currentMonth;
        if (monthlyActuals.length === 0 && this.actuals.length > 0) {
            const totalsByMonth = this.actuals.reduce((map, a) => {
                map[a.month] = (map[a.month] || 0) + a.amount;
                return map;
            }, {});
            // pick month with highest spend (or latest if tie)
            selectedMonth = Object.keys(totalsByMonth)
                .sort((a, b) => totalsByMonth[b] - totalsByMonth[a] || a.localeCompare(b))
                [0] || currentMonth;
            monthlyActuals = this.actuals.filter(a => a.month === selectedMonth);
        }

        // Align budgets to the selected month for analysis
        const monthlyBudgets = this.budgets.map(b => ({ ...b, month: selectedMonth }));

        const totalActual = monthlyActuals.reduce((sum, actual) => sum + actual.amount, 0);
        const totalBudget = monthlyBudgets.reduce((sum, budget) => sum + budget.monthlyBudget, 0);

        // Calculate category-wise performance
        const categoryPerformance = monthlyBudgets.map(budget => {
            const categoryActuals = monthlyActuals.filter(actual => actual.category === budget.category);
            const actualAmount = categoryActuals.reduce((sum, actual) => sum + actual.amount, 0);
            const budgetAmount = budget.monthlyBudget;
            const variance = actualAmount - budgetAmount;
            const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
            const utilizationRate = budgetAmount > 0 ? actualAmount / budgetAmount : 0;

            return {
                category: budget.category,
                budget: budgetAmount,
                actual: actualAmount,
                variance: variance,
                variancePercentage: variancePercentage,
                utilizationRate: utilizationRate,
                status: this.getBudgetStatus(utilizationRate),
                priority: budget.priority
            };
        });

        return {
            period: { month: selectedMonth, year: parseInt(selectedMonth.split('-')[0], 10) },
            totals: {
                budget: totalBudget,
                actual: totalActual,
                variance: totalActual - totalBudget,
                variancePercentage: totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0,
                utilizationRate: totalBudget > 0 ? totalActual / totalBudget : 0
            },
            categories: categoryPerformance,
            status: this.getOverallBudgetStatus(totalActual, totalBudget)
        };
    }

    /**
     * Analyze monthly performance trends
     */
    analyzeMonthlyPerformance() {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();

        // Group actuals by month
        this.actuals.forEach(actual => {
            if (actual.year === currentYear) {
                if (!monthlyData[actual.month]) {
                    monthlyData[actual.month] = {
                        month: actual.month,
                        total: 0,
                        categories: {}
                    };
                }
                monthlyData[actual.month].total += actual.amount;
                
                if (!monthlyData[actual.month].categories[actual.category]) {
                    monthlyData[actual.month].categories[actual.category] = 0;
                }
                monthlyData[actual.month].categories[actual.category] += actual.amount;
            }
        });

        // Calculate trends
        const monthlyTrends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
        const trend = this.calculateTrend(monthlyTrends.map(m => m.total));

        return {
            monthlyData: monthlyTrends,
            trend: trend,
            averageMonthlySpending: monthlyTrends.reduce((sum, m) => sum + m.total, 0) / monthlyTrends.length
        };
    }

    /**
     * Analyze category performance
     */
    analyzeCategoryPerformance() {
        const categoryData = {};

        // Group actuals by category
        this.actuals.forEach(actual => {
            if (!categoryData[actual.category]) {
                categoryData[actual.category] = {
                    category: actual.category,
                    total: 0,
                    count: 0,
                    average: 0,
                    months: new Set()
                };
            }
            categoryData[actual.category].total += actual.amount;
            categoryData[actual.category].count++;
            categoryData[actual.category].months.add(actual.month);
        });

        // Calculate averages and trends
        Object.values(categoryData).forEach(category => {
            category.average = category.total / category.count;
            category.monthCount = category.months.size;
        });

        return Object.values(categoryData).sort((a, b) => b.total - a.total);
    }

    /**
     * Get budget status based on utilization rate
     */
    getBudgetStatus(utilizationRate) {
        if (utilizationRate >= this.alertThresholds.critical) {
            return 'critical';
        } else if (utilizationRate >= this.alertThresholds.warning) {
            return 'warning';
        } else if (utilizationRate <= 0.5) {
            return 'underutilized';
        } else {
            return 'healthy';
        }
    }

    /**
     * Get overall budget status
     */
    getOverallBudgetStatus(actual, budget) {
        const utilizationRate = budget > 0 ? actual / budget : 0;
        return this.getBudgetStatus(utilizationRate);
    }

    /**
     * Calculate trend for a dataset
     */
    calculateTrend(data) {
        if (data.length < 2) return { direction: 'stable', percentage: 0 };

        const recent = data.slice(-2);
        const current = recent[1];
        const previous = recent[0];

        if (previous === 0) return { direction: 'stable', percentage: 0 };

        const percentage = ((current - previous) / Math.abs(previous)) * 100;
        const direction = percentage > 5 ? 'increasing' : percentage < -5 ? 'decreasing' : 'stable';

        return { direction, percentage: Math.round(percentage * 100) / 100 };
    }

    /**
     * Generate budget alerts
     */
    generateBudgetAlerts(analysis) {
        const alerts = [];

        // Overall budget alerts
        if (analysis.totals.utilizationRate >= this.alertThresholds.critical) {
            alerts.push({
                type: 'budget_exceeded',
                severity: 'high',
                message: `⚠️ High: Monthly budget exceeded by ${Math.abs(analysis.totals.variance).toFixed(2)} ${this.currency} (${Math.abs(analysis.totals.variancePercentage).toFixed(1)}%)`,
                amount: Math.abs(analysis.totals.variance),
                category: 'Budget',
                timestamp: new Date().toISOString()
            });
        }

        // Category-specific alerts
        analysis.categories.forEach(category => {
            if (category.status === 'critical') {
                alerts.push({
                    type: 'category_budget_exceeded',
                    severity: 'high',
                    message: `⚠️ High: ${category.category} budget exceeded by ${Math.abs(category.variance).toFixed(2)} ${this.currency}`,
                    amount: Math.abs(category.variance),
                    category: category.category,
                    timestamp: new Date().toISOString()
                });
            } else if (category.status === 'warning') {
                alerts.push({
                    type: 'category_budget_warning',
                    severity: 'medium',
                    message: `⚠️ Medium: ${category.category} budget at ${(category.utilizationRate * 100).toFixed(1)}%`,
                    amount: category.actual,
                    category: category.category,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Trend alerts
        if (analysis.totals.utilizationRate > 0.8 && analysis.totals.variancePercentage > 20) {
            alerts.push({
                type: 'spending_trend_warning',
                severity: 'medium',
                message: `⚠️ Medium: Spending trend shows significant increase`,
                amount: 0,
                category: 'Trends',
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * Generate budget highlights
     */
    generateBudgetHighlights(analysis) {
        const highlights = [];

        // Under budget performance
        if (analysis.totals.utilizationRate < 0.8) {
            highlights.push({
                type: 'under_budget',
                severity: 'low',
                message: `✅ Under budget: ${(analysis.totals.variancePercentage * -1).toFixed(1)}% below budget`,
                timestamp: new Date().toISOString()
            });
        }

        // Well-managed categories
        const wellManagedCategories = analysis.categories.filter(cat => cat.status === 'healthy' || cat.status === 'underutilized');
        if (wellManagedCategories.length > 0) {
            highlights.push({
                type: 'well_managed_categories',
                severity: 'low',
                message: `✅ ${wellManagedCategories.length} categories well-managed`,
                timestamp: new Date().toISOString()
            });
        }

        // Consistent spending
        if (analysis.totals.utilizationRate >= 0.7 && analysis.totals.utilizationRate <= 0.9) {
            highlights.push({
                type: 'consistent_spending',
                severity: 'low',
                message: `✅ Consistent spending within budget range`,
                timestamp: new Date().toISOString()
            });
        }

        return highlights;
    }

    /**
     * Generate budget recommendations
     */
    generateBudgetRecommendations(analysis) {
        const recommendations = [];

        // Overall budget recommendations
        if (analysis.totals.utilizationRate > 1) {
            recommendations.push({
                type: 'reduce_spending',
                priority: 'high',
                message: 'Consider reducing discretionary spending to stay within budget',
                category: 'Overall'
            });
        }

        // Category-specific recommendations
        analysis.categories.forEach(category => {
            if (category.status === 'critical') {
                recommendations.push({
                    type: 'category_reduction',
                    priority: 'high',
                    message: `Reduce ${category.category} spending by ${Math.abs(category.variance).toFixed(2)} ${this.currency}`,
                    category: category.category
                });
            } else if (category.status === 'underutilized') {
                recommendations.push({
                    type: 'category_reallocation',
                    priority: 'low',
                    message: `Consider reallocating unused ${category.category} budget to other categories`,
                    category: category.category
                });
            }
        });

        // Trend-based recommendations
        if (analysis.totals.variancePercentage > 20) {
            recommendations.push({
                type: 'trend_analysis',
                priority: 'medium',
                message: 'Analyze spending trends to identify areas for improvement',
                category: 'Trends'
            });
        }

        return recommendations;
    }

    /**
     * Set budget for a category
     */
    setBudget(category, monthlyBudget, yearlyBudget, priority = 'medium') {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const currentYear = new Date().getFullYear();

        const budget = {
            id: `budget_${category}_${currentMonth}`,
            category,
            monthlyBudget,
            yearlyBudget,
            currency: this.currency,
            month: currentMonth,
            year: currentYear,
            priority
        };

        // Remove existing budget for this category and month
        this.budgets = this.budgets.filter(b => !(b.category === category && b.month === currentMonth));
        this.budgets.push(budget);

        return budget;
    }

    /**
     * Update budget for a category
     */
    updateBudget(category, updates) {
        const currentMonth = this.referenceMonth || new Date().toISOString().substring(0, 7);
        const budget = this.budgets.find(b => b.category === category && b.month === currentMonth);
        
        if (budget) {
            Object.assign(budget, updates);
            return budget;
        }

        return null;
    }

    /**
     * Get budget summary for a specific period
     */
    getBudgetSummary(month, year) {
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const monthBudgets = this.budgets.filter(b => b.month === monthStr);
        const monthActuals = this.actuals.filter(a => a.month === monthStr);

        const totalBudget = monthBudgets.reduce((sum, b) => sum + b.monthlyBudget, 0);
        const totalActual = monthActuals.reduce((sum, a) => sum + a.amount, 0);

        return {
            month: monthStr,
            budget: totalBudget,
            actual: totalActual,
            variance: totalActual - totalBudget,
            utilizationRate: totalBudget > 0 ? totalActual / totalBudget : 0,
            categories: monthBudgets.map(budget => {
                const categoryActuals = monthActuals.filter(a => a.category === budget.category);
                const actualAmount = categoryActuals.reduce((sum, a) => sum + a.amount, 0);
                return {
                    category: budget.category,
                    budget: budget.monthlyBudget,
                    actual: actualAmount,
                    variance: actualAmount - budget.monthlyBudget
                };
            })
        };
    }

    /**
     * Forecast future spending based on historical data
     */
    forecastSpending(months = 3) {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const currentYear = new Date().getFullYear();
        
        // Get historical data for the last 6 months
        const historicalData = [];
        for (let i = 6; i >= 1; i--) {
            const month = new Date(currentYear, new Date().getMonth() - i, 1);
            const monthStr = month.toISOString().substring(0, 7);
            const monthActuals = this.actuals.filter(a => a.month === monthStr);
            const total = monthActuals.reduce((sum, a) => sum + a.amount, 0);
            historicalData.push({ month: monthStr, total });
        }

        // Calculate average and trend
        const average = historicalData.reduce((sum, d) => sum + d.total, 0) / historicalData.length;
        const trend = this.calculateTrend(historicalData.map(d => d.total));

        // Generate forecast
        const forecast = [];
        for (let i = 1; i <= months; i++) {
            const forecastMonth = new Date(currentYear, new Date().getMonth() + i, 1);
            const monthStr = forecastMonth.toISOString().substring(0, 7);
            const forecastAmount = average * (1 + (trend.percentage / 100) * i);
            
            forecast.push({
                month: monthStr,
                forecast: forecastAmount,
                confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence over time
            });
        }

        return {
            historicalData,
            average,
            trend,
            forecast
        };
    }
}

module.exports = BudgetingTool;
