/**
 * Ledger Accounts Module
 * Manages general ledger accounts with debits, credits, and balances
 */

class LedgerAccountsManager {
    constructor() {
        this.name = 'Ledger Accounts';
    }

    async process(transactions, existingData = {}) {
        try {
            console.log('📊 Processing Ledger Accounts...');
            
            const ledgerAccounts = this.generateLedgerAccounts(transactions, existingData);
            
            return {
                ledgerAccounts: ledgerAccounts,
                alerts: this.generateAlerts(ledgerAccounts),
                highlights: this.generateHighlights(ledgerAccounts)
            };
        } catch (error) {
            console.error('Error in Ledger Accounts processing:', error);
            return {
                ledgerAccounts: null,
                alerts: [{ type: 'ledger_error', severity: 'high', message: 'Failed to generate ledger accounts' }],
                highlights: []
            };
        }
    }

    generateLedgerAccounts(transactions, existingData) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Define chart of accounts
        const chartOfAccounts = this.getChartOfAccounts();
        
        // Process transactions into ledger entries
        const ledgerEntries = this.processTransactions(transactions, chartOfAccounts);
        
        // Calculate account balances
        const accountBalances = this.calculateAccountBalances(ledgerEntries, chartOfAccounts);
        
        // Generate trial balance
        const trialBalance = this.generateTrialBalance(accountBalances);
        
        // Generate general ledger
        const generalLedger = this.generateGeneralLedger(ledgerEntries, accountBalances);
        
        return {
            period: `${currentYear}`,
            currency: '€',
            chartOfAccounts: chartOfAccounts,
            ledgerEntries: ledgerEntries,
            accountBalances: accountBalances,
            trialBalance: trialBalance,
            generalLedger: generalLedger,
            totals: {
                totalDebits: trialBalance.totalDebits,
                totalCredits: trialBalance.totalCredits,
                balanceCheck: Math.abs(trialBalance.totalDebits - trialBalance.totalCredits) < 0.01
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                transactionCount: transactions.length,
                accountCount: Object.keys(accountBalances).length,
                confidence: this.calculateConfidence(transactions)
            }
        };
    }

    getChartOfAccounts() {
        return {
            assets: {
                '1000': { name: 'Cash', type: 'Asset', normalBalance: 'Debit' },
                '1100': { name: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit' },
                '1200': { name: 'Inventory', type: 'Asset', normalBalance: 'Debit' },
                '1300': { name: 'Prepaid Expenses', type: 'Asset', normalBalance: 'Debit' },
                '1500': { name: 'Equipment', type: 'Asset', normalBalance: 'Debit' },
                '1600': { name: 'Furniture', type: 'Asset', normalBalance: 'Debit' },
                '1700': { name: 'Computer & Software', type: 'Asset', normalBalance: 'Debit' },
                '1800': { name: 'Accumulated Depreciation', type: 'Asset', normalBalance: 'Credit' }
            },
            liabilities: {
                '2000': { name: 'Accounts Payable', type: 'Liability', normalBalance: 'Credit' },
                '2100': { name: 'Accrued Expenses', type: 'Liability', normalBalance: 'Credit' },
                '2200': { name: 'Short-term Debt', type: 'Liability', normalBalance: 'Credit' },
                '2300': { name: 'Taxes Payable', type: 'Liability', normalBalance: 'Credit' },
                '2500': { name: 'Long-term Debt', type: 'Liability', normalBalance: 'Credit' }
            },
            equity: {
                '3000': { name: 'Owner\'s Equity', type: 'Equity', normalBalance: 'Credit' },
                '3100': { name: 'Retained Earnings', type: 'Equity', normalBalance: 'Credit' }
            },
            revenue: {
                '4000': { name: 'Sales Revenue', type: 'Revenue', normalBalance: 'Credit' },
                '4100': { name: 'Service Revenue', type: 'Revenue', normalBalance: 'Credit' },
                '4200': { name: 'Other Revenue', type: 'Revenue', normalBalance: 'Credit' }
            },
            expenses: {
                '5000': { name: 'Cost of Goods Sold', type: 'Expense', normalBalance: 'Debit' },
                '5100': { name: 'Salaries & Wages', type: 'Expense', normalBalance: 'Debit' },
                '5200': { name: 'Rent Expense', type: 'Expense', normalBalance: 'Debit' },
                '5300': { name: 'Utilities Expense', type: 'Expense', normalBalance: 'Debit' },
                '5400': { name: 'Marketing Expense', type: 'Expense', normalBalance: 'Debit' },
                '5500': { name: 'Professional Services', type: 'Expense', normalBalance: 'Debit' },
                '5600': { name: 'Travel Expense', type: 'Expense', normalBalance: 'Debit' },
                '5700': { name: 'Office Supplies', type: 'Expense', normalBalance: 'Debit' },
                '5800': { name: 'Insurance Expense', type: 'Expense', normalBalance: 'Debit' },
                '5900': { name: 'Other Expenses', type: 'Expense', normalBalance: 'Debit' }
            }
        };
    }

    processTransactions(transactions, chartOfAccounts) {
        const ledgerEntries = [];
        
        transactions.forEach((transaction, index) => {
            const entry = {
                id: `LE-${Date.now()}-${index}`,
                date: transaction.date,
                description: transaction.description,
                reference: transaction.vendor || 'Unknown',
                entries: []
            };
            
            if (transaction.amount > 0) {
                // Revenue transaction
                const revenueAccount = this.getRevenueAccount(transaction);
                entry.entries.push({
                    account: revenueAccount,
                    debit: 0,
                    credit: transaction.amount,
                    description: 'Revenue recognition'
                });
                
                // Cash account (assuming cash received)
                entry.entries.push({
                    account: '1000',
                    debit: transaction.amount,
                    credit: 0,
                    description: 'Cash received'
                });
            } else {
                // Expense transaction
                const expenseAccount = this.getExpenseAccount(transaction);
                entry.entries.push({
                    account: expenseAccount,
                    debit: Math.abs(transaction.amount),
                    credit: 0,
                    description: 'Expense recognition'
                });
                
                // Cash account (assuming cash paid)
                entry.entries.push({
                    account: '1000',
                    debit: 0,
                    credit: Math.abs(transaction.amount),
                    description: 'Cash paid'
                });
            }
            
            ledgerEntries.push(entry);
        });
        
        return ledgerEntries;
    }

    getRevenueAccount(transaction) {
        if (transaction.description.toLowerCase().includes('service')) {
            return '4100'; // Service Revenue
        } else if (transaction.category === 'Income') {
            return '4000'; // Sales Revenue
        } else {
            return '4200'; // Other Revenue
        }
    }

    getExpenseAccount(transaction) {
        const category = transaction.category;
        const description = transaction.description.toLowerCase();
        
        switch (category) {
            case 'Office':
                return '5700'; // Office Supplies
            case 'Rent':
                return '5200'; // Rent Expense
            case 'Utilities':
                return '5300'; // Utilities Expense
            case 'Marketing':
                return '5400'; // Marketing Expense
            case 'Professional':
                return '5500'; // Professional Services
            case 'Travel':
                return '5600'; // Travel Expense
            case 'Insurance':
                return '5800'; // Insurance Expense
            case 'Equipment':
                return '1500'; // Equipment (Asset)
            case 'Software':
                return '1700'; // Computer & Software (Asset)
            default:
                return '5900'; // Other Expenses
        }
    }

    calculateAccountBalances(ledgerEntries, chartOfAccounts) {
        const balances = {};
        
        // Initialize all accounts with zero balances
        Object.values(chartOfAccounts).forEach(accountGroup => {
            Object.keys(accountGroup).forEach(accountCode => {
                balances[accountCode] = {
                    code: accountCode,
                    name: accountGroup[accountCode].name,
                    type: accountGroup[accountCode].type,
                    normalBalance: accountGroup[accountCode].normalBalance,
                    debitTotal: 0,
                    creditTotal: 0,
                    balance: 0
                };
            });
        });
        
        // Process all ledger entries
        ledgerEntries.forEach(entry => {
            entry.entries.forEach(ledgerEntry => {
                const accountCode = ledgerEntry.account;
                if (balances[accountCode]) {
                    balances[accountCode].debitTotal += ledgerEntry.debit;
                    balances[accountCode].creditTotal += ledgerEntry.credit;
                }
            });
        });
        
        // Calculate balances
        Object.keys(balances).forEach(accountCode => {
            const account = balances[accountCode];
            if (account.normalBalance === 'Debit') {
                account.balance = account.debitTotal - account.creditTotal;
            } else {
                account.balance = account.creditTotal - account.debitTotal;
            }
        });
        
        return balances;
    }

    generateTrialBalance(accountBalances) {
        const trialBalance = {
            accounts: [],
            totalDebits: 0,
            totalCredits: 0
        };
        
        Object.values(accountBalances).forEach(account => {
            if (account.debitTotal > 0 || account.creditTotal > 0) {
                trialBalance.accounts.push({
                    code: account.code,
                    name: account.name,
                    type: account.type,
                    debitBalance: account.normalBalance === 'Debit' ? account.balance : 0,
                    creditBalance: account.normalBalance === 'Credit' ? account.balance : 0
                });
                
                if (account.normalBalance === 'Debit') {
                    trialBalance.totalDebits += account.balance;
                } else {
                    trialBalance.totalCredits += account.balance;
                }
            }
        });
        
        return trialBalance;
    }

    generateGeneralLedger(ledgerEntries, accountBalances) {
        const generalLedger = {};
        
        // Group entries by account
        ledgerEntries.forEach(entry => {
            entry.entries.forEach(ledgerEntry => {
                const accountCode = ledgerEntry.account;
                if (!generalLedger[accountCode]) {
                    generalLedger[accountCode] = {
                        account: accountBalances[accountCode],
                        entries: []
                    };
                }
                
                generalLedger[accountCode].entries.push({
                    date: entry.date,
                    description: entry.description,
                    reference: entry.reference,
                    debit: ledgerEntry.debit,
                    credit: ledgerEntry.credit,
                    balance: 0 // Will be calculated
                });
            });
        });
        
        // Calculate running balances
        Object.keys(generalLedger).forEach(accountCode => {
            let runningBalance = 0;
            const account = accountBalances[accountCode];
            
            generalLedger[accountCode].entries.forEach(entry => {
                if (account.normalBalance === 'Debit') {
                    runningBalance += entry.debit - entry.credit;
                } else {
                    runningBalance += entry.credit - entry.debit;
                }
                entry.balance = runningBalance;
            });
        });
        
        return generalLedger;
    }

    calculateConfidence(transactions) {
        if (transactions.length < 10) return 60;
        if (transactions.length < 50) return 75;
        if (transactions.length < 100) return 85;
        return 95;
    }

    generateAlerts(ledgerAccounts) {
        const alerts = [];
        
        if (!ledgerAccounts.totals.balanceCheck) {
            alerts.push({
                type: 'trial_balance_error',
                severity: 'high',
                message: '⚠️ Trial balance does not balance: Debits ≠ Credits',
                amount: Math.abs(ledgerAccounts.totals.totalDebits - ledgerAccounts.totals.totalCredits),
                category: 'Accuracy'
            });
        }
        
        // Check for unusual account balances
        Object.values(ledgerAccounts.accountBalances).forEach(account => {
            if (account.balance < 0 && account.normalBalance === 'Debit') {
                alerts.push({
                    type: 'negative_asset_balance',
                    severity: 'medium',
                    message: `⚠️ Negative balance in ${account.name} account`,
                    amount: Math.abs(account.balance),
                    category: 'Balance'
                });
            }
            
            if (account.balance > 0 && account.normalBalance === 'Credit' && account.type === 'Liability') {
                alerts.push({
                    type: 'negative_liability_balance',
                    severity: 'medium',
                    message: `⚠️ Negative balance in ${account.name} account`,
                    amount: Math.abs(account.balance),
                    category: 'Balance'
                });
            }
        });
        
        return alerts;
    }

    generateHighlights(ledgerAccounts) {
        const highlights = [];
        
        if (ledgerAccounts.totals.balanceCheck) {
            highlights.push({
                type: 'balanced_ledger',
                message: '✅ Ledger accounts are properly balanced',
                timestamp: new Date().toISOString()
            });
        }
        
        const activeAccounts = Object.values(ledgerAccounts.accountBalances).filter(account => 
            account.debitTotal > 0 || account.creditTotal > 0
        ).length;
        
        highlights.push({
            type: 'active_accounts',
            message: `✅ ${activeAccounts} active accounts in the ledger`,
            timestamp: new Date().toISOString()
        });
        
        const totalTransactions = ledgerAccounts.ledgerEntries.length;
        if (totalTransactions > 50) {
            highlights.push({
                type: 'comprehensive_ledger',
                message: `✅ Comprehensive ledger with ${totalTransactions} transactions`,
                timestamp: new Date().toISOString()
            });
        }
        
        return highlights;
    }
}

module.exports = LedgerAccountsManager;




