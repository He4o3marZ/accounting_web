const logger = require('../logger');

class MultiCurrencyManager {
    constructor() {
        this.exchangeRates = {};
        this.baseCurrency = 'EUR';
        this.supportedCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
        this.lastUpdated = null;
        this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Initialize exchange rates
     * @param {Object} rates - Exchange rates object
     * @param {string} baseCurrency - Base currency code
     */
    initialize(rates = {}, baseCurrency = 'EUR') {
        this.baseCurrency = baseCurrency;
        this.exchangeRates = rates;
        this.lastUpdated = new Date();

        // Set base currency rate to 1
        this.exchangeRates[baseCurrency] = 1;

        logger.info('MULTI_CURRENCY', 'Multi-currency manager initialized', {
            baseCurrency,
            supportedCurrencies: this.supportedCurrencies.length,
            ratesCount: Object.keys(this.exchangeRates).length
        });
    }

    /**
     * Update exchange rates from external API
     * @param {Function} fetchRates - Function to fetch rates from API
     */
    async updateExchangeRates(fetchRates) {
        try {
            if (typeof fetchRates === 'function') {
                const newRates = await fetchRates();
                this.exchangeRates = { ...this.exchangeRates, ...newRates };
                this.lastUpdated = new Date();
                
                logger.info('MULTI_CURRENCY', 'Exchange rates updated', {
                    ratesCount: Object.keys(this.exchangeRates).length,
                    lastUpdated: this.lastUpdated
                });
            }
        } catch (error) {
            logger.error('MULTI_CURRENCY', 'Failed to update exchange rates', error);
        }
    }

    /**
     * Convert amount from one currency to another
     * @param {number} amount - Amount to convert
     * @param {string} fromCurrency - Source currency
     * @param {string} toCurrency - Target currency
     * @param {Date} date - Date for historical rates (optional)
     * @returns {Object} Conversion result
     */
    convert(amount, fromCurrency, toCurrency, date = null) {
        try {
            if (fromCurrency === toCurrency) {
                return {
                    amount,
                    fromCurrency,
                    toCurrency,
                    rate: 1,
                    convertedAmount: amount,
                    date: date || new Date().toISOString().split('T')[0]
                };
            }

            // Get exchange rates
            const fromRate = this.getExchangeRate(fromCurrency, date);
            const toRate = this.getExchangeRate(toCurrency, date);

            if (!fromRate || !toRate) {
                throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
            }

            // Convert to base currency first, then to target currency
            const baseAmount = amount / fromRate;
            const convertedAmount = baseAmount * toRate;
            const rate = toRate / fromRate;

            return {
                amount,
                fromCurrency,
                toCurrency,
                rate,
                convertedAmount: Math.round(convertedAmount * 100) / 100,
                date: date || new Date().toISOString().split('T')[0]
            };
        } catch (error) {
            logger.error('MULTI_CURRENCY', 'Currency conversion failed', error);
            throw new Error(`Currency conversion failed: ${error.message}`);
        }
    }

    /**
     * Get exchange rate for a currency
     * @param {string} currency - Currency code
     * @param {Date} date - Date for historical rates (optional)
     * @returns {number} Exchange rate
     */
    getExchangeRate(currency, date = null) {
        if (currency === this.baseCurrency) {
            return 1;
        }

        // For now, return current rate (in real implementation, would fetch historical rates)
        return this.exchangeRates[currency] || null;
    }

    /**
     * Process transactions with currency conversion
     * @param {Array} transactions - Array of transaction objects
     * @param {string} targetCurrency - Target currency for conversion
     * @returns {Object} Processed transactions with currency conversion
     */
    processTransactions(transactions, targetCurrency = 'EUR') {
        try {
            const processedTransactions = [];
            const conversionSummary = {
                totalConversions: 0,
                currencies: new Set(),
                totalOriginalAmount: 0,
                totalConvertedAmount: 0
            };

            transactions.forEach((transaction, index) => {
                const amount = parseFloat(transaction.amount || transaction.Amount || 0);
                const currency = transaction.currency || transaction.Currency || this.baseCurrency;
                const description = transaction.description || transaction.Description || `Transaction ${index + 1}`;
                const date = new Date(transaction.date || transaction.Date || new Date());

                if (isNaN(amount) || amount === 0) {
                    logger.warn('MULTI_CURRENCY', 'Skipping invalid transaction', { description, amount });
                    return;
                }

                // Convert currency if needed
                let convertedAmount = amount;
                let conversionRate = 1;
                let conversionInfo = null;

                if (currency !== targetCurrency) {
                    try {
                        const conversion = this.convert(amount, currency, targetCurrency, date);
                        convertedAmount = conversion.convertedAmount;
                        conversionRate = conversion.rate;
                        conversionInfo = conversion;
                        conversionSummary.totalConversions++;
                    } catch (error) {
                        logger.warn('MULTI_CURRENCY', 'Currency conversion failed, using original amount', {
                            transaction: description,
                            error: error.message
                        });
                    }
                }

                const processedTransaction = {
                    id: `tx_${index}_${Date.now()}`,
                    originalAmount: amount,
                    originalCurrency: currency,
                    convertedAmount: convertedAmount,
                    targetCurrency: targetCurrency,
                    conversionRate: conversionRate,
                    description,
                    date: date.toISOString().split('T')[0],
                    category: transaction.category || transaction.Category || 'Other',
                    type: amount > 0 ? 'income' : 'expense',
                    conversionInfo
                };

                processedTransactions.push(processedTransaction);
                conversionSummary.currencies.add(currency);
                conversionSummary.totalOriginalAmount += amount;
                conversionSummary.totalConvertedAmount += convertedAmount;
            });

            // Calculate currency distribution
            const currencyDistribution = {};
            conversionSummary.currencies.forEach(currency => {
                const currencyTransactions = processedTransactions.filter(tx => tx.originalCurrency === currency);
                currencyDistribution[currency] = {
                    count: currencyTransactions.length,
                    totalOriginal: currencyTransactions.reduce((sum, tx) => sum + tx.originalAmount, 0),
                    totalConverted: currencyTransactions.reduce((sum, tx) => sum + tx.convertedAmount, 0)
                };
            });

            const result = {
                transactions: processedTransactions,
                summary: {
                    ...conversionSummary,
                    currencies: Array.from(conversionSummary.currencies),
                    currencyDistribution,
                    targetCurrency,
                    baseCurrency: this.baseCurrency,
                    exchangeRates: this.exchangeRates,
                    lastUpdated: this.lastUpdated
                }
            };

            logger.info('MULTI_CURRENCY', 'Transactions processed with currency conversion', {
                transactionCount: processedTransactions.length,
                conversions: conversionSummary.totalConversions,
                currencies: conversionSummary.currencies.size
            });

            return result;
        } catch (error) {
            logger.error('MULTI_CURRENCY', 'Error processing transactions with currency conversion', error);
            throw new Error(`Multi-currency processing failed: ${error.message}`);
        }
    }

    /**
     * Analyze currency exposure
     * @param {Array} transactions - Array of transaction objects
     * @returns {Object} Currency exposure analysis
     */
    analyzeCurrencyExposure(transactions) {
        try {
            const exposure = {};
            const totalAmount = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount || tx.Amount || 0), 0);

            // Group by currency
            transactions.forEach(transaction => {
                const amount = Math.abs(transaction.amount || transaction.Amount || 0);
                const currency = transaction.currency || transaction.Currency || this.baseCurrency;

                if (!exposure[currency]) {
                    exposure[currency] = {
                        currency,
                        totalAmount: 0,
                        transactionCount: 0,
                        percentage: 0,
                        averageAmount: 0
                    };
                }

                exposure[currency].totalAmount += amount;
                exposure[currency].transactionCount++;
            });

            // Calculate percentages and averages
            Object.values(exposure).forEach(currency => {
                currency.percentage = totalAmount > 0 ? (currency.totalAmount / totalAmount) * 100 : 0;
                currency.averageAmount = currency.transactionCount > 0 ? currency.totalAmount / currency.transactionCount : 0;
            });

            // Sort by total amount
            const sortedExposure = Object.values(exposure).sort((a, b) => b.totalAmount - a.totalAmount);

            // Calculate currency risk metrics
            const riskMetrics = this.calculateCurrencyRisk(sortedExposure);

            return {
                exposure: sortedExposure,
                riskMetrics,
                totalAmount,
                currencyCount: sortedExposure.length,
                baseCurrency: this.baseCurrency
            };
        } catch (error) {
            logger.error('MULTI_CURRENCY', 'Error analyzing currency exposure', error);
            throw new Error(`Currency exposure analysis failed: ${error.message}`);
        }
    }

    /**
     * Calculate currency risk metrics
     * @param {Array} exposure - Currency exposure data
     * @returns {Object} Risk metrics
     */
    calculateCurrencyRisk(exposure) {
        const riskMetrics = {
            concentrationRisk: 0,
            diversificationScore: 0,
            volatilityRisk: 'low',
            recommendations: []
        };

        if (exposure.length === 0) return riskMetrics;

        // Calculate concentration risk (Herfindahl-Hirschman Index)
        const hhi = exposure.reduce((sum, currency) => {
            const percentage = currency.percentage / 100;
            return sum + (percentage * percentage);
        }, 0);

        riskMetrics.concentrationRisk = hhi;
        riskMetrics.diversificationScore = 1 - hhi; // Higher is better

        // Determine volatility risk based on currency distribution
        if (exposure.length === 1) {
            riskMetrics.volatilityRisk = 'high';
            riskMetrics.recommendations.push('Consider diversifying across multiple currencies');
        } else if (exposure.length >= 3) {
            riskMetrics.volatilityRisk = 'low';
        } else {
            riskMetrics.volatilityRisk = 'medium';
            riskMetrics.recommendations.push('Consider adding more currency diversification');
        }

        // Check for over-concentration in single currency
        if (exposure[0] && exposure[0].percentage > 80) {
            riskMetrics.recommendations.push(`High concentration in ${exposure[0].currency} (${exposure[0].percentage.toFixed(1)}%)`);
        }

        return riskMetrics;
    }

    /**
     * Generate currency alerts
     * @param {Object} exposure - Currency exposure analysis
     * @returns {Array} Currency alerts
     */
    generateCurrencyAlerts(exposure) {
        const alerts = [];

        // High concentration risk
        if (exposure.riskMetrics.concentrationRisk > 0.5) {
            alerts.push({
                type: 'high_concentration_risk',
                severity: 'high',
                message: `⚠️ High: High currency concentration risk (${(exposure.riskMetrics.concentrationRisk * 100).toFixed(1)}%)`,
                amount: 0,
                category: 'Currency Risk',
                timestamp: new Date().toISOString()
            });
        }

        // Low diversification
        if (exposure.riskMetrics.diversificationScore < 0.3) {
            alerts.push({
                type: 'low_diversification',
                severity: 'medium',
                message: `⚠️ Medium: Low currency diversification (${(exposure.riskMetrics.diversificationScore * 100).toFixed(1)}%)`,
                amount: 0,
                category: 'Diversification',
                timestamp: new Date().toISOString()
            });
        }

        // High volatility risk
        if (exposure.riskMetrics.volatilityRisk === 'high') {
            alerts.push({
                type: 'high_volatility_risk',
                severity: 'high',
                message: `⚠️ High: High currency volatility risk - single currency exposure`,
                amount: 0,
                category: 'Volatility',
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * Generate currency highlights
     * @param {Object} exposure - Currency exposure analysis
     * @returns {Array} Currency highlights
     */
    generateCurrencyHighlights(exposure) {
        const highlights = [];

        // Good diversification
        if (exposure.riskMetrics.diversificationScore > 0.7) {
            highlights.push({
                type: 'good_diversification',
                severity: 'low',
                message: `✅ Good currency diversification (${(exposure.riskMetrics.diversificationScore * 100).toFixed(1)}%)`,
                timestamp: new Date().toISOString()
            });
        }

        // Low volatility risk
        if (exposure.riskMetrics.volatilityRisk === 'low') {
            highlights.push({
                type: 'low_volatility_risk',
                severity: 'low',
                message: `✅ Low currency volatility risk`,
                timestamp: new Date().toISOString()
            });
        }

        // Multiple currencies
        if (exposure.currencyCount >= 3) {
            highlights.push({
                type: 'multiple_currencies',
                severity: 'low',
                message: `✅ Transactions in ${exposure.currencyCount} different currencies`,
                timestamp: new Date().toISOString()
            });
        }

        return highlights;
    }

    /**
     * Get currency performance over time
     * @param {string} currency - Currency code
     * @param {number} days - Number of days to analyze
     * @returns {Object} Currency performance data
     */
    getCurrencyPerformance(currency, days = 30) {
        try {
            // This would typically fetch historical exchange rates
            // For now, return mock data
            const performance = {
                currency,
                period: days,
                currentRate: this.getExchangeRate(currency),
                performance: {
                    change: 0,
                    changePercentage: 0,
                    volatility: 'low',
                    trend: 'stable'
                },
                historicalRates: []
            };

            // Generate mock historical rates
            const baseRate = this.getExchangeRate(currency) || 1;
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const rate = baseRate * (1 + (Math.random() - 0.5) * 0.02); // ±1% daily variation
                performance.historicalRates.push({
                    date: date.toISOString().split('T')[0],
                    rate: Math.round(rate * 10000) / 10000
                });
            }

            return performance;
        } catch (error) {
            logger.error('MULTI_CURRENCY', 'Error getting currency performance', error);
            throw new Error(`Currency performance analysis failed: ${error.message}`);
        }
    }

    /**
     * Check if exchange rates need updating
     * @returns {boolean} True if rates need updating
     */
    needsUpdate() {
        if (!this.lastUpdated) return true;
        const now = new Date();
        const timeSinceUpdate = now.getTime() - this.lastUpdated.getTime();
        return timeSinceUpdate > this.updateInterval;
    }

    /**
     * Get supported currencies
     * @returns {Array} List of supported currencies
     */
    getSupportedCurrencies() {
        return this.supportedCurrencies;
    }

    /**
     * Add a new currency
     * @param {string} currency - Currency code
     * @param {number} rate - Exchange rate
     */
    addCurrency(currency, rate) {
        this.supportedCurrencies.push(currency);
        this.exchangeRates[currency] = rate;
        this.lastUpdated = new Date();
    }

    /**
     * Remove a currency
     * @param {string} currency - Currency code
     */
    removeCurrency(currency) {
        this.supportedCurrencies = this.supportedCurrencies.filter(c => c !== currency);
        delete this.exchangeRates[currency];
    }
}

module.exports = MultiCurrencyManager;



