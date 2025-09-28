const fs = require('fs');
const path = require('path');

class FinancialManager {
    constructor() {
        this.modules = {};
        this.initialized = false;
        this.initializeModules();
    }

    // Initialize method for compatibility with AI service
    async initialize(options = {}) {
        if (!this.initialized) {
            this.currency = options.currency || '€';
            this.reportOutputDir = options.reportOutputDir || './reports';
            this.initialized = true;
            console.log('✅ Financial Manager initialized successfully');
        }
        return this;
    }

    initializeModules() {
        try {
            // Load only the corrected financial modules (skip synthetic data generators)
            this.modules.cashflow = new (require('./financialModules/cashflowManager'))();
            // this.modules.assetsLiabilities = new (require('./financialModules/assetsLiabilitiesManager'))(); // DISABLED - generates synthetic data
            // this.modules.debtsLoans = new (require('./financialModules/debtsLoansManager'))(); // DISABLED - generates synthetic data
            // this.modules.taxesVAT = new (require('./financialModules/taxesVATManager'))(); // DISABLED - generates synthetic data
            this.modules.budgeting = new (require('./financialModules/budgetingTool'))();
            this.modules.forecasting = new (require('./financialModules/forecastingTool'))();
            this.modules.multiCurrency = new (require('./financialModules/multiCurrencyManager'))();
            this.modules.balanceSheet = new (require('./financialModules/balanceSheet'))();
            this.modules.profitLoss = new (require('./financialModules/profitLoss'))();
            this.modules.ledgerAccounts = new (require('./financialModules/ledgerAccounts'))();
            this.modules.reportGenerator = new (require('./financialModules/reportGenerator'))();
            this.modules.accountantAdvisor = new (require('./financialModules/accountantAdvisor'))();
            
            console.log('✅ Financial modules loaded and instantiated successfully');
        } catch (error) {
            console.error('❌ Error loading financial modules:', error);
            this.modules = {};
        }
    }

    // Get all available modules
    getModules() {
        return this.modules;
    }

    // Get a specific module
    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }

    // Check if a module is available
    isModuleAvailable(moduleName) {
        return this.modules[moduleName] !== undefined;
    }

    // Get module status
    getModuleStatus() {
        const status = {};
        for (const [name, module] of Object.entries(this.modules)) {
            status[name] = {
                available: module !== undefined,
                loaded: module !== null
            };
        }
        return status;
    }

    // Process financial data with all modules
    async processFinancialData(transactions, options = {}) {
        try {
            console.log('📊 Processing financial data with all modules...');
            
            const results = {};
            
            // Define module processing methods
            const moduleMethods = {
                cashflow: 'processCashflow',
                assetsLiabilities: 'processAssetsLiabilities',
                debtsLoans: 'processDebtsLoans',
                taxesVAT: 'processTaxesVAT',
                budgeting: 'processBudgeting',
                forecasting: 'processForecasting',
                multiCurrency: 'processMultiCurrency',
                balanceSheet: 'process',
                profitLoss: 'process',
                ledgerAccounts: 'process',
                reportGenerator: 'generateReport',
                accountantAdvisor: 'process'
            };
            
            // Process each module (skip conflicting modules)
            const skipModules = ['assetsLiabilities', 'debtsLoans', 'taxesVAT']; // Skip modules with synthetic data
            for (const [moduleName, module] of Object.entries(this.modules)) {
                if (module && !skipModules.includes(moduleName)) {
                    const methodName = moduleMethods[moduleName];
                    if (methodName && typeof module[methodName] === 'function') {
                        try {
                            console.log(`📊 Processing ${moduleName}...`);
                            let moduleResult;
                            
                            // Special handling for report generator
                            if (moduleName === 'reportGenerator') {
                                moduleResult = await module[methodName](results, 'monthly');
                            } else {
                                // Pass only transactions and currency string to avoid circular references
                                moduleResult = await module[methodName](transactions, this.currency);
                            }
                            
                            results[moduleName] = moduleResult;
                            console.log(`✅ ${moduleName} processed successfully`);
                        } catch (error) {
                            console.error(`❌ Error processing ${moduleName}:`, error.message);
                            results[moduleName] = {
                                error: error.message,
                                data: null
                            };
                        }
                    } else {
                        console.log(`⚠️ Module ${moduleName} method ${methodName} not available`);
                    }
                } else {
                    console.log(`⚠️ Module ${moduleName} not loaded`);
                }
            }
            
            console.log('📊 Financial data processing complete. Results:', Object.keys(results));
            return results;
        } catch (error) {
            console.error('❌ Error processing financial data:', error);
            throw error;
        }
    }

    // Generate comprehensive report
    async generateReport(type = 'monthly', options = {}) {
        try {
            console.log(`📊 Generating ${type} report...`);
            
            const report = {
                type: type,
                generatedAt: new Date().toISOString(),
                modules: this.getModuleStatus(),
                options: options
            };
            
            return report;
        } catch (error) {
            console.error('❌ Error generating report:', error);
            throw error;
        }
    }
}

module.exports = FinancialManager;
