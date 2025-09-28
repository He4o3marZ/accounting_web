const logger = require('../logger');

class AssetsLiabilitiesManager {
    constructor() {
        this.assets = [];
        this.liabilities = [];
        this.currency = '€';
    }

    /**
     * Process and categorize assets and liabilities from transactions
     * @param {Array} transactions - Array of transaction objects
     * @param {string} currency - Currency code
     * @returns {Object} Processed assets and liabilities data
     */
    processAssetsLiabilities(transactions, currency = '€') {
        try {
            this.currency = currency;
            this.assets = [];
            this.liabilities = [];

            // Categorize transactions as assets or liabilities
            transactions.forEach((transaction, index) => {
                const amount = parseFloat(transaction.amount || transaction.Amount || 0);
                const description = transaction.description || transaction.Description || `Transaction ${index + 1}`;
                const category = transaction.category || transaction.Category || 'Other';
                const date = new Date(transaction.date || transaction.Date || new Date());

                if (isNaN(amount) || amount === 0) {
                    logger.warn('ASSETS_LIABILITIES', 'Skipping invalid transaction', { description, amount });
                    return;
                }

                // Determine if this is an asset or liability
                const classification = this.classifyTransaction(description, amount, category);
                
                const entry = {
                    id: `entry_${index}_${Date.now()}`,
                    description,
                    amount: Math.abs(amount),
                    category,
                    date: date.toISOString().split('T')[0],
                    currency: this.currency,
                    type: classification.type,
                    subcategory: classification.subcategory,
                    value: classification.value
                };

                if (classification.type === 'asset') {
                    this.assets.push(entry);
                } else if (classification.type === 'liability') {
                    this.liabilities.push(entry);
                }
            });

            // Calculate totals and ratios
            const totalAssets = this.assets.reduce((sum, asset) => sum + asset.value, 0);
            const totalLiabilities = this.liabilities.reduce((sum, liability) => sum + liability.value, 0);
            const netWorth = totalAssets - totalLiabilities;
            const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

            // Generate category breakdowns
            const assetBreakdown = this.generateCategoryBreakdown(this.assets);
            const liabilityBreakdown = this.generateCategoryBreakdown(this.liabilities);

            // Generate alerts and highlights
            const alerts = this.generateAssetsLiabilitiesAlerts(totalAssets, totalLiabilities, netWorth, debtToAssetRatio);
            const highlights = this.generateAssetsLiabilitiesHighlights(totalAssets, totalLiabilities, netWorth, debtToAssetRatio);

            const result = {
                assets: this.assets,
                liabilities: this.liabilities,
                totals: {
                    totalAssets,
                    totalLiabilities,
                    netWorth,
                    debtToAssetRatio,
                    currency: this.currency
                },
                breakdown: {
                    assets: assetBreakdown,
                    liabilities: liabilityBreakdown
                },
                alerts,
                highlights
            };

            logger.info('ASSETS_LIABILITIES', 'Assets and liabilities processed successfully', {
                assetCount: this.assets.length,
                liabilityCount: this.liabilities.length,
                totalAssets,
                totalLiabilities,
                netWorth
            });

            return result;
        } catch (error) {
            logger.error('ASSETS_LIABILITIES', 'Error processing assets and liabilities', error);
            throw new Error(`Assets and liabilities processing failed: ${error.message}`);
        }
    }

    /**
     * Classify a transaction as an asset or liability
     */
    classifyTransaction(description, amount, category) {
        const desc = description.toLowerCase();
        const isPositive = amount > 0;

        // Asset classifications
        if (desc.includes('equipment') || desc.includes('computer') || desc.includes('hardware')) {
            return {
                type: 'asset',
                subcategory: 'Equipment',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('office') || desc.includes('furniture') || desc.includes('supplies')) {
            return {
                type: 'asset',
                subcategory: 'Office',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('software') || desc.includes('license') || desc.includes('subscription')) {
            return {
                type: 'asset',
                subcategory: 'Software',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('vehicle') || desc.includes('car') || desc.includes('transport')) {
            return {
                type: 'asset',
                subcategory: 'Vehicle',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('property') || desc.includes('real estate') || desc.includes('building')) {
            return {
                type: 'asset',
                subcategory: 'Property',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('investment') || desc.includes('stock') || desc.includes('bond')) {
            return {
                type: 'asset',
                subcategory: 'Investment',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('cash') || desc.includes('bank') || desc.includes('savings')) {
            return {
                type: 'asset',
                subcategory: 'Cash',
                value: Math.abs(amount)
            };
        }

        // Liability classifications
        if (desc.includes('loan') || desc.includes('debt') || desc.includes('credit')) {
            return {
                type: 'liability',
                subcategory: 'Debt',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('rent') || desc.includes('lease')) {
            return {
                type: 'liability',
                subcategory: 'Rent/Lease',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('tax') || desc.includes('vat') || desc.includes('gst')) {
            return {
                type: 'liability',
                subcategory: 'Tax',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('insurance') || desc.includes('premium')) {
            return {
                type: 'liability',
                subcategory: 'Insurance',
                value: Math.abs(amount)
            };
        }

        if (desc.includes('utility') || desc.includes('electric') || desc.includes('water') || desc.includes('internet')) {
            return {
                type: 'liability',
                subcategory: 'Utilities',
                value: Math.abs(amount)
            };
        }

        // Default classification based on amount and category
        if (isPositive && (category === 'Equipment' || category === 'Software' || category === 'Office')) {
            return {
                type: 'asset',
                subcategory: 'Other',
                value: Math.abs(amount)
            };
        }

        if (!isPositive && (category === 'Debt' || category === 'Tax' || category === 'Utilities')) {
            return {
                type: 'liability',
                subcategory: 'Other',
                value: Math.abs(amount)
            };
        }

        // Default to liability for negative amounts, asset for positive
        return {
            type: isPositive ? 'asset' : 'liability',
            subcategory: 'Other',
            value: Math.abs(amount)
        };
    }

    /**
     * Generate category breakdown for assets or liabilities
     */
    generateCategoryBreakdown(items) {
        const breakdown = {};
        
        items.forEach(item => {
            if (!breakdown[item.subcategory]) {
                breakdown[item.subcategory] = {
                    count: 0,
                    totalValue: 0,
                    items: []
                };
            }
            
            breakdown[item.subcategory].count++;
            breakdown[item.subcategory].totalValue += item.value;
            breakdown[item.subcategory].items.push(item);
        });

        // Convert to array and sort by total value
        return Object.entries(breakdown)
            .map(([category, data]) => ({
                category,
                count: data.count,
                totalValue: data.totalValue,
                percentage: 0 // Will be calculated after we have total
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }

    /**
     * Generate alerts for assets and liabilities
     */
    generateAssetsLiabilitiesAlerts(totalAssets, totalLiabilities, netWorth, debtToAssetRatio) {
        const alerts = [];

        // High debt-to-asset ratio
        if (debtToAssetRatio > 0.8) {
            alerts.push({
                type: 'high_debt_ratio',
                severity: 'high',
                message: `⚠️ High: Debt-to-asset ratio is ${(debtToAssetRatio * 100).toFixed(1)}% - consider reducing debt`,
                amount: totalLiabilities,
                category: 'Debt',
                timestamp: new Date().toISOString()
            });
        }

        // Negative net worth
        if (netWorth < 0) {
            alerts.push({
                type: 'negative_net_worth',
                severity: 'high',
                message: `⚠️ High: Negative net worth of ${netWorth.toFixed(2)} ${this.currency}`,
                amount: Math.abs(netWorth),
                category: 'Net Worth',
                timestamp: new Date().toISOString()
            });
        }

        // Low asset diversity
        const assetCategories = new Set(this.assets.map(asset => asset.subcategory)).size;
        if (assetCategories < 3 && this.assets.length > 5) {
            alerts.push({
                type: 'low_asset_diversity',
                severity: 'medium',
                message: `⚠️ Medium: Low asset diversity - only ${assetCategories} categories`,
                amount: 0,
                category: 'Diversification',
                timestamp: new Date().toISOString()
            });
        }

        // High liability concentration
        const liabilityCategories = new Set(this.liabilities.map(liability => liability.subcategory)).size;
        if (liabilityCategories < 2 && this.liabilities.length > 3) {
            alerts.push({
                type: 'high_liability_concentration',
                severity: 'medium',
                message: `⚠️ Medium: High liability concentration - only ${liabilityCategories} categories`,
                amount: 0,
                category: 'Risk',
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * Generate highlights for assets and liabilities
     */
    generateAssetsLiabilitiesHighlights(totalAssets, totalLiabilities, netWorth, debtToAssetRatio) {
        const highlights = [];

        // Strong net worth
        if (netWorth > totalAssets * 0.5) {
            highlights.push({
                type: 'strong_net_worth',
                severity: 'low',
                message: `✅ Strong net worth: ${netWorth.toFixed(2)} ${this.currency} (${((netWorth / totalAssets) * 100).toFixed(1)}% of assets)`,
                timestamp: new Date().toISOString()
            });
        }

        // Low debt-to-asset ratio
        if (debtToAssetRatio < 0.3) {
            highlights.push({
                type: 'low_debt_ratio',
                severity: 'low',
                message: `✅ Low debt-to-asset ratio: ${(debtToAssetRatio * 100).toFixed(1)}%`,
                timestamp: new Date().toISOString()
            });
        }

        // Good asset diversity
        const assetCategories = new Set(this.assets.map(asset => asset.subcategory)).size;
        if (assetCategories >= 5) {
            highlights.push({
                type: 'good_asset_diversity',
                severity: 'low',
                message: `✅ Good asset diversity: ${assetCategories} categories`,
                timestamp: new Date().toISOString()
            });
        }

        // Positive net worth growth
        if (netWorth > 0 && totalAssets > totalLiabilities * 2) {
            highlights.push({
                type: 'positive_net_worth_growth',
                severity: 'low',
                message: `✅ Positive net worth with strong asset base`,
                timestamp: new Date().toISOString()
            });
        }

        return highlights;
    }

    /**
     * Add a new asset or liability
     */
    addEntry(description, amount, category, subcategory, type) {
        const entry = {
            id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description,
            amount: Math.abs(amount),
            category,
            subcategory,
            date: new Date().toISOString().split('T')[0],
            currency: this.currency,
            type,
            value: Math.abs(amount)
        };

        if (type === 'asset') {
            this.assets.push(entry);
        } else if (type === 'liability') {
            this.liabilities.push(entry);
        }

        return entry;
    }

    /**
     * Update an existing entry
     */
    updateEntry(id, updates) {
        let entry = this.assets.find(item => item.id === id) || this.liabilities.find(item => item.id === id);
        if (entry) {
            Object.assign(entry, updates);
            return entry;
        }
        return null;
    }

    /**
     * Remove an entry
     */
    removeEntry(id) {
        const assetIndex = this.assets.findIndex(item => item.id === id);
        if (assetIndex !== -1) {
            return this.assets.splice(assetIndex, 1)[0];
        }

        const liabilityIndex = this.liabilities.findIndex(item => item.id === id);
        if (liabilityIndex !== -1) {
            return this.liabilities.splice(liabilityIndex, 1)[0];
        }

        return null;
    }

    /**
     * Get net worth trend over time
     */
    getNetWorthTrend(days = 30) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const assetTrend = this.assets
            .filter(asset => new Date(asset.date) >= startDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const liabilityTrend = this.liabilities
            .filter(liability => new Date(liability.date) >= startDate)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            assets: assetTrend,
            liabilities: liabilityTrend,
            period: { startDate, endDate, days }
        };
    }
}

module.exports = AssetsLiabilitiesManager;



