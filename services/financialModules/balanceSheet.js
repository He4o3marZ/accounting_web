/**
 * Balance Sheet Module
 * Generates balance sheet with assets, liabilities, and equity
 */

class BalanceSheetManager {
    constructor() {
        this.name = 'Balance Sheet';
    }

    async process(transactions, existingData = {}) {
        try {
            console.log('📊 Processing Balance Sheet...');
            
            const balanceSheet = this.generateBalanceSheet(transactions, existingData);
            
            return {
                balanceSheet: balanceSheet,
                alerts: this.generateAlerts(balanceSheet),
                highlights: this.generateHighlights(balanceSheet)
            };
        } catch (error) {
            console.error('Error in Balance Sheet processing:', error);
            return {
                balanceSheet: null,
                alerts: [{ type: 'balance_sheet_error', severity: 'high', message: 'Failed to generate balance sheet' }],
                highlights: []
            };
        }
    }

    generateBalanceSheet(transactions, existingData) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Calculate current assets
        const currentAssets = this.calculateCurrentAssets(transactions, existingData);
        
        // Calculate fixed assets
        const fixedAssets = this.calculateFixedAssets(transactions, existingData);
        
        // Calculate current liabilities
        const currentLiabilities = this.calculateCurrentLiabilities(transactions, existingData);
        
        // Calculate long-term liabilities
        const longTermLiabilities = this.calculateLongTermLiabilities(transactions, existingData);
        
        // Calculate equity
        const equity = this.calculateEquity(transactions, existingData);
        
        const totalAssets = currentAssets.total + fixedAssets.total;
        const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;
        const totalEquity = equity.total;
        
        return {
            asOfDate: currentDate.toISOString().split('T')[0],
            period: `${currentYear}`,
            currency: '€',
            assets: {
                current: currentAssets,
                fixed: fixedAssets,
                total: totalAssets
            },
            liabilities: {
                current: currentLiabilities,
                longTerm: longTermLiabilities,
                total: totalLiabilities
            },
            equity: {
                ...equity,
                total: totalEquity
            },
            totals: {
                totalAssets: totalAssets,
                totalLiabilities: totalLiabilities,
                totalEquity: totalEquity,
                balanceCheck: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
            },
            ratios: this.calculateRatios(totalAssets, totalLiabilities, totalEquity),
            metadata: {
                generatedAt: new Date().toISOString(),
                transactionCount: transactions.length,
                confidence: this.calculateConfidence(transactions)
            }
        };
    }

    calculateCurrentAssets(transactions, existingData) {
        // Use actual transaction data instead of synthetic calculations
        const netCashflow = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        
        // Cash = actual net cashflow (simplified for demo)
        const cash = Math.max(0, netCashflow);
        
        // Accounts receivable = 0 (no outstanding receivables in transaction data)
        const accountsReceivable = 0;
        
        // Inventory = 0 (no inventory transactions in the data)
        const inventory = 0;
        
        // Prepaid expenses = 0 (no prepaid expenses in transaction data)
        const prepaidExpenses = 0;
        
        return {
            cash: cash,
            accountsReceivable: accountsReceivable,
            inventory: inventory,
            prepaidExpenses: prepaidExpenses,
            total: cash + accountsReceivable + inventory + prepaidExpenses,
            breakdown: {
                cash: { amount: cash, description: 'Cash and bank accounts' },
                accountsReceivable: { amount: accountsReceivable, description: 'Money owed by customers' },
                inventory: { amount: inventory, description: 'Goods and materials on hand' },
                prepaidExpenses: { amount: prepaidExpenses, description: 'Expenses paid in advance' }
            }
        };
    }

    calculateFixedAssets(transactions, existingData) {
        // Use actual transaction data for fixed assets
        const equipment = this.calculateEquipment(transactions);
        const furniture = this.calculateFurniture(transactions);
        const computerSoftware = this.calculateComputerSoftware(transactions);
        
        // No depreciation for simplicity in demo
        const accumulatedDepreciation = 0;
        
        const totalFixedAssets = equipment + furniture + computerSoftware - accumulatedDepreciation;
        
        return {
            equipment: equipment,
            furniture: furniture,
            computerSoftware: computerSoftware,
            accumulatedDepreciation: accumulatedDepreciation,
            total: totalFixedAssets,
            breakdown: {
                equipment: { amount: equipment, description: 'Machinery and equipment' },
                furniture: { amount: furniture, description: 'Office furniture and fixtures' },
                computerSoftware: { amount: computerSoftware, description: 'Computers and software licenses' },
                accumulatedDepreciation: { amount: -accumulatedDepreciation, description: 'Depreciation accumulated over time' }
            }
        };
    }

    calculateCurrentLiabilities(transactions, existingData) {
        // Use actual transaction data - no liabilities in the transaction data
        const accountsPayable = 0;
        const accruedExpenses = 0;
        const shortTermDebt = 0;
        const taxesPayable = 0;
        
        return {
            accountsPayable: accountsPayable,
            accruedExpenses: accruedExpenses,
            shortTermDebt: shortTermDebt,
            taxesPayable: taxesPayable,
            total: accountsPayable + accruedExpenses + shortTermDebt + taxesPayable,
            breakdown: {
                accountsPayable: { amount: accountsPayable, description: 'Money owed to suppliers' },
                accruedExpenses: { amount: accruedExpenses, description: 'Expenses incurred but not yet paid' },
                shortTermDebt: { amount: shortTermDebt, description: 'Debts due within one year' },
                taxesPayable: { amount: taxesPayable, description: 'Taxes owed to government' }
            }
        };
    }

    calculateLongTermLiabilities(transactions, existingData) {
        // No long-term liabilities in transaction data
        const longTermDebt = 0;
        const deferredTaxLiabilities = 0;
        
        return {
            longTermDebt: longTermDebt,
            deferredTaxLiabilities: deferredTaxLiabilities,
            total: longTermDebt + deferredTaxLiabilities,
            breakdown: {
                longTermDebt: { amount: longTermDebt, description: 'Debts due after one year' },
                deferredTaxLiabilities: { amount: deferredTaxLiabilities, description: 'Taxes deferred to future periods' }
            }
        };
    }

    calculateEquity(transactions, existingData) {
        // Use actual net income as retained earnings
        const netIncome = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const retainedEarnings = Math.max(0, netIncome);
        
        // No separate owner's equity in transaction data
        const ownersEquity = 0;
        
        return {
            retainedEarnings: retainedEarnings,
            ownersEquity: ownersEquity,
            total: retainedEarnings + ownersEquity,
            breakdown: {
                retainedEarnings: { amount: retainedEarnings, description: 'Profits kept in the business' },
                ownersEquity: { amount: ownersEquity, description: 'Owner\'s investment in the business' }
            }
        };
    }

    // Helper calculation methods
    calculateCash(transactions) {
        const netCashflow = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        return Math.max(0, netCashflow * 0.1); // Assume 10% of net cashflow is kept as cash
    }

    calculateAccountsReceivable(transactions) {
        const recentIncome = transactions
            .filter(t => t.amount > 0 && t.category === 'Income')
            .slice(-30) // Last 30 transactions
            .reduce((sum, t) => sum + t.amount, 0);
        return recentIncome * 0.2; // Assume 20% of recent income is outstanding
    }

    calculateInventory(transactions) {
        const recentExpenses = transactions
            .filter(t => t.amount < 0 && ['Office', 'Equipment', 'Software'].includes(t.category))
            .slice(-30)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return recentExpenses * 0.3; // Assume 30% of recent expenses are inventory
    }

    calculatePrepaidExpenses(transactions) {
        const monthlyExpenses = transactions
            .filter(t => t.amount < 0 && ['Rent', 'Insurance', 'Software'].includes(t.category))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return monthlyExpenses * 0.5; // Assume 50% of monthly expenses are prepaid
    }

    calculateEquipment(transactions) {
        return transactions
            .filter(t => t.amount < 0 && t.category === 'Equipment')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }

    calculateFurniture(transactions) {
        return transactions
            .filter(t => t.amount < 0 && t.description.toLowerCase().includes('furniture'))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }

    calculateComputerSoftware(transactions) {
        return transactions
            .filter(t => t.amount < 0 && t.category === 'Software')
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    }

    calculateAccumulatedDepreciation(transactions) {
        const totalFixedAssets = this.calculateEquipment(transactions) + 
                                this.calculateFurniture(transactions) + 
                                this.calculateComputerSoftware(transactions);
        return totalFixedAssets * 0.3; // Assume 30% depreciation
    }

    calculateAccountsPayable(transactions) {
        const recentExpenses = transactions
            .filter(t => t.amount < 0)
            .slice(-30)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return recentExpenses * 0.15; // Assume 15% of recent expenses are payable
    }

    calculateAccruedExpenses(transactions) {
        const monthlyExpenses = transactions
            .filter(t => t.amount < 0 && ['Rent', 'Utilities', 'Professional'].includes(t.category))
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return monthlyExpenses * 0.1; // Assume 10% of monthly expenses are accrued
    }

    calculateShortTermDebt(transactions) {
        return 0; // No short-term debt in this example
    }

    calculateTaxesPayable(transactions) {
        const netIncome = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        return Math.max(0, netIncome * 0.2); // Assume 20% tax rate
    }

    calculateLongTermDebt(transactions) {
        return 0; // No long-term debt in this example
    }

    calculateDeferredTaxLiabilities(transactions) {
        return 0; // No deferred tax liabilities in this example
    }

    calculateRetainedEarnings(transactions) {
        const netIncome = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        return Math.max(0, netIncome * 0.8); // Assume 80% of net income is retained
    }

    calculateOwnersEquity(transactions) {
        const totalIncome = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        return totalIncome * 0.1; // Assume 10% of total income is owner's equity
    }

    calculateRatios(totalAssets, totalLiabilities, totalEquity) {
        return {
            currentRatio: totalAssets > 0 ? (totalAssets * 0.4) / (totalLiabilities * 0.6) : 0,
            debtToEquityRatio: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
            debtToAssetRatio: totalAssets > 0 ? totalLiabilities / totalAssets : 0,
            equityRatio: totalAssets > 0 ? totalEquity / totalAssets : 0
        };
    }

    calculateConfidence(transactions) {
        if (transactions.length < 10) return 60;
        if (transactions.length < 50) return 75;
        if (transactions.length < 100) return 85;
        return 95;
    }

    generateAlerts(balanceSheet) {
        const alerts = [];
        
        if (balanceSheet.ratios.currentRatio < 1) {
            alerts.push({
                type: 'low_current_ratio',
                severity: 'high',
                message: '⚠️ Low current ratio: May have difficulty meeting short-term obligations',
                amount: balanceSheet.ratios.currentRatio,
                category: 'Liquidity'
            });
        }
        
        if (balanceSheet.ratios.debtToEquityRatio > 2) {
            alerts.push({
                type: 'high_debt_to_equity',
                severity: 'medium',
                message: '⚠️ High debt-to-equity ratio: High financial leverage',
                amount: balanceSheet.ratios.debtToEquityRatio,
                category: 'Leverage'
            });
        }
        
        if (!balanceSheet.totals.balanceCheck) {
            alerts.push({
                type: 'balance_sheet_imbalance',
                severity: 'high',
                message: '⚠️ Balance sheet does not balance: Assets ≠ Liabilities + Equity',
                amount: Math.abs(balanceSheet.totals.totalAssets - (balanceSheet.totals.totalLiabilities + balanceSheet.totals.totalEquity)),
                category: 'Accuracy'
            });
        }
        
        return alerts;
    }

    generateHighlights(balanceSheet) {
        const highlights = [];
        
        if (balanceSheet.ratios.currentRatio > 2) {
            highlights.push({
                type: 'strong_liquidity',
                message: '✅ Strong liquidity position with high current ratio',
                timestamp: new Date().toISOString()
            });
        }
        
        if (balanceSheet.ratios.equityRatio > 0.5) {
            highlights.push({
                type: 'strong_equity_position',
                message: '✅ Strong equity position with good ownership ratio',
                timestamp: new Date().toISOString()
            });
        }
        
        if (balanceSheet.totals.balanceCheck) {
            highlights.push({
                type: 'balanced_sheet',
                message: '✅ Balance sheet is properly balanced',
                timestamp: new Date().toISOString()
            });
        }
        
        return highlights;
    }
}

module.exports = BalanceSheetManager;




