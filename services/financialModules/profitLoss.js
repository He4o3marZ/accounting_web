/**
 * Profit & Loss Statement Module
 * Generates P&L statement with revenue, expenses, and profit calculations
 */

class ProfitLossManager {
    constructor() {
        this.name = 'Profit & Loss';
    }

    async process(transactions, existingData = {}) {
        try {
            console.log('📊 Processing Profit & Loss Statement...');
            
            const profitLoss = this.generateProfitLossStatement(transactions, existingData);
            
            return {
                profitLoss: profitLoss,
                alerts: this.generateAlerts(profitLoss),
                highlights: this.generateHighlights(profitLoss)
            };
        } catch (error) {
            console.error('Error in Profit & Loss processing:', error);
            return {
                profitLoss: null,
                alerts: [{ type: 'profit_loss_error', severity: 'high', message: 'Failed to generate profit & loss statement' }],
                highlights: []
            };
        }
    }

    generateProfitLossStatement(transactions, existingData) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Calculate revenue
        const revenue = this.calculateRevenue(transactions);
        
        // Calculate cost of goods sold
        const costOfGoodsSold = this.calculateCostOfGoodsSold(transactions);
        
        // Calculate gross profit
        const grossProfit = revenue.total - costOfGoodsSold.total;
        
        // Calculate operating expenses
        const operatingExpenses = this.calculateOperatingExpenses(transactions);
        
        // Calculate operating income
        const operatingIncome = grossProfit - operatingExpenses.total;
        
        // Calculate other income/expenses
        const otherIncome = this.calculateOtherIncome(transactions);
        const otherExpenses = this.calculateOtherExpenses(transactions);
        
        // Calculate net income before taxes
        const netIncomeBeforeTaxes = operatingIncome + otherIncome.total - otherExpenses.total;
        
        // Calculate taxes
        const taxes = this.calculateTaxes(netIncomeBeforeTaxes);
        
        // Calculate net income
        const netIncome = netIncomeBeforeTaxes - taxes;
        
        return {
            period: `${currentYear}-${currentMonth.toString().padStart(2, '0')}`,
            currency: '€',
            revenue: {
                ...revenue,
                total: revenue.total
            },
            costOfGoodsSold: {
                ...costOfGoodsSold,
                total: costOfGoodsSold.total
            },
            grossProfit: {
                amount: grossProfit,
                margin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0
            },
            operatingExpenses: {
                ...operatingExpenses,
                total: operatingExpenses.total
            },
            operatingIncome: {
                amount: operatingIncome,
                margin: revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0
            },
            otherIncome: {
                ...otherIncome,
                total: otherIncome.total
            },
            otherExpenses: {
                ...otherExpenses,
                total: otherExpenses.total
            },
            netIncomeBeforeTaxes: {
                amount: netIncomeBeforeTaxes,
                margin: revenue.total > 0 ? (netIncomeBeforeTaxes / revenue.total) * 100 : 0
            },
            taxes: {
                amount: taxes,
                rate: netIncomeBeforeTaxes > 0 ? (taxes / netIncomeBeforeTaxes) * 100 : 0
            },
            netIncome: {
                amount: netIncome,
                margin: revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0
            },
            ratios: this.calculateRatios(revenue.total, grossProfit, operatingIncome, netIncome),
            metadata: {
                generatedAt: new Date().toISOString(),
                transactionCount: transactions.length,
                confidence: this.calculateConfidence(transactions)
            }
        };
    }

    calculateRevenue(transactions) {
        // Use actual income transactions
        const totalIncome = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            sales: totalIncome,
            services: 0,
            other: 0,
            total: totalIncome,
            breakdown: {
                sales: { amount: totalIncome, description: 'Revenue from all income sources' },
                services: { amount: 0, description: 'Revenue from services provided' },
                other: { amount: 0, description: 'Other revenue sources' }
            }
        };
    }

    calculateCostOfGoodsSold(transactions) {
        // Use actual expense transactions for COGS
        const totalExpenses = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        // For simplicity, treat all expenses as COGS in this demo
        return {
            materials: totalExpenses,
            labor: 0,
            overhead: 0,
            total: totalExpenses,
            breakdown: {
                materials: { amount: totalExpenses, description: 'All business expenses' },
                labor: { amount: 0, description: 'Direct labor costs' },
                overhead: { amount: 0, description: 'Manufacturing overhead' }
            }
        };
    }

    calculateOperatingExpenses(transactions) {
        // No separate operating expenses in this simplified demo
        // All expenses are treated as COGS above
        return {
            salaries: 0,
            rent: 0,
            utilities: 0,
            marketing: 0,
            professional: 0,
            travel: 0,
            other: 0,
            total: 0,
            breakdown: {
                salaries: { amount: 0, description: 'Employee salaries and benefits' },
                rent: { amount: 0, description: 'Office rent and facilities' },
                utilities: { amount: 0, description: 'Electricity, water, internet' },
                marketing: { amount: 0, description: 'Advertising and promotion' },
                professional: { amount: 0, description: 'Legal, accounting, consulting' },
                travel: { amount: 0, description: 'Business travel expenses' },
                other: { amount: 0, description: 'Other operating expenses' }
            }
        };
    }

    calculateOtherIncome(transactions) {
        // No other income in transaction data
        return {
            interest: 0,
            dividends: 0,
            other: 0,
            total: 0,
            breakdown: {
                interest: { amount: 0, description: 'Interest earned on investments' },
                dividends: { amount: 0, description: 'Dividends received' },
                other: { amount: 0, description: 'Other non-operating income' }
            }
        };
    }

    calculateOtherExpenses(transactions) {
        // No other expenses in transaction data
        return {
            interest: 0,
            depreciation: 0,
            other: 0,
            total: 0,
            breakdown: {
                interest: { amount: 0, description: 'Interest paid on debt' },
                depreciation: { amount: 0, description: 'Depreciation expense' },
                other: { amount: 0, description: 'Other non-operating expenses' }
            }
        };
    }

    calculateTaxes(netIncomeBeforeTaxes) {
        if (netIncomeBeforeTaxes <= 0) return 0;
        
        // Simple tax calculation (20% rate)
        return netIncomeBeforeTaxes * 0.2;
    }

    calculateRatios(revenue, grossProfit, operatingIncome, netIncome) {
        return {
            grossProfitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
            operatingProfitMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
            netProfitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
            expenseRatio: revenue > 0 ? ((revenue - netIncome) / revenue) * 100 : 0
        };
    }

    calculateConfidence(transactions) {
        if (transactions.length < 10) return 60;
        if (transactions.length < 50) return 75;
        if (transactions.length < 100) return 85;
        return 95;
    }

    generateAlerts(profitLoss) {
        const alerts = [];
        
        if (profitLoss.netIncome.amount < 0) {
            alerts.push({
                type: 'net_loss',
                severity: 'high',
                message: '⚠️ Net loss detected: Business is losing money',
                amount: Math.abs(profitLoss.netIncome.amount),
                category: 'Profitability'
            });
        }
        
        if (profitLoss.grossProfit.margin < 20) {
            alerts.push({
                type: 'low_gross_margin',
                severity: 'medium',
                message: '⚠️ Low gross profit margin: May need to increase prices or reduce costs',
                amount: profitLoss.grossProfit.margin,
                category: 'Profitability'
            });
        }
        
        if (profitLoss.operatingIncome.amount < 0) {
            alerts.push({
                type: 'operating_loss',
                severity: 'high',
                message: '⚠️ Operating loss: Core business operations are unprofitable',
                amount: Math.abs(profitLoss.operatingIncome.amount),
                category: 'Operations'
            });
        }
        
        if (profitLoss.ratios.expenseRatio > 90) {
            alerts.push({
                type: 'high_expense_ratio',
                severity: 'medium',
                message: '⚠️ High expense ratio: Expenses are consuming most of revenue',
                amount: profitLoss.ratios.expenseRatio,
                category: 'Efficiency'
            });
        }
        
        return alerts;
    }

    generateHighlights(profitLoss) {
        const highlights = [];
        
        if (profitLoss.netIncome.amount > 0) {
            highlights.push({
                type: 'profitable_business',
                message: `✅ Profitable business with €${profitLoss.netIncome.amount.toLocaleString()} net income`,
                timestamp: new Date().toISOString()
            });
        }
        
        if (profitLoss.grossProfit.margin > 50) {
            highlights.push({
                type: 'strong_gross_margin',
                message: `✅ Strong gross profit margin: ${profitLoss.grossProfit.margin.toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }
        
        if (profitLoss.operatingIncome.amount > 0) {
            highlights.push({
                type: 'profitable_operations',
                message: `✅ Profitable operations with €${profitLoss.operatingIncome.amount.toLocaleString()} operating income`,
                timestamp: new Date().toISOString()
            });
        }
        
        if (profitLoss.ratios.netProfitMargin > 10) {
            highlights.push({
                type: 'healthy_profit_margin',
                message: `✅ Healthy net profit margin: ${profitLoss.ratios.netProfitMargin.toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }
        
        return highlights;
    }
}

module.exports = ProfitLossManager;




