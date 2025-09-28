const logger = require('../logger');

class TaxesVATManager {
    constructor() {
        this.taxData = [];
        this.vatData = [];
        this.currency = '€';
        this.defaultVATRate = 0.19; // 19% default VAT rate
    }

    /**
     * Process and categorize tax and VAT data from transactions
     * @param {Array} transactions - Array of transaction objects
     * @param {string} currency - Currency code
     * @param {number} defaultVATRate - Default VAT rate (0.19 for 19%)
     * @returns {Object} Processed tax and VAT data
     */
    processTaxesVAT(transactions, currency = '€', defaultVATRate = 0.19) {
        try {
            this.currency = currency;
            this.defaultVATRate = defaultVATRate;
            this.taxData = [];
            this.vatData = [];

            // Categorize transactions for tax and VAT
            transactions.forEach((transaction, index) => {
                const amount = parseFloat(transaction.amount || transaction.Amount || 0);
                const description = transaction.description || transaction.Description || `Transaction ${index + 1}`;
                const category = transaction.category || transaction.Category || 'Other';
                const date = new Date(transaction.date || transaction.Date || new Date());

                if (isNaN(amount) || amount === 0) {
                    logger.warn('TAXES_VAT', 'Skipping invalid transaction', { description, amount });
                    return;
                }

                // Check if this is a tax-related transaction
                const taxClassification = this.classifyTaxTransaction(description, amount, category);
                
                if (taxClassification && (taxClassification.type === 'tax' || taxClassification.type === 'vat')) {
                    const entry = {
                        id: `entry_${index}_${Date.now()}`,
                        description,
                        amount: Math.abs(amount),
                        category,
                        date: date.toISOString().split('T')[0],
                        currency: this.currency,
                        type: taxClassification.type,
                        subcategory: taxClassification.subcategory,
                        rate: taxClassification.rate,
                        netAmount: taxClassification.netAmount,
                        taxAmount: taxClassification.taxAmount,
                        dueDate: taxClassification.dueDate,
                        status: taxClassification.status
                    };

                    if (taxClassification.type === 'tax') {
                        this.taxData.push(entry);
                    } else {
                        this.vatData.push(entry);
                    }
                }
            });

            // Calculate totals and metrics
            const totalTaxes = this.taxData.reduce((sum, tax) => sum + tax.taxAmount, 0);
            const totalVAT = this.vatData.reduce((sum, vat) => sum + vat.taxAmount, 0);
            const totalNetAmount = this.taxData.reduce((sum, tax) => sum + tax.netAmount, 0) + 
                                 this.vatData.reduce((sum, vat) => sum + vat.netAmount, 0);

            // Calculate effective tax rates
            const effectiveTaxRate = totalNetAmount > 0 ? totalTaxes / totalNetAmount : 0;
            const effectiveVATRate = totalNetAmount > 0 ? totalVAT / totalNetAmount : 0;

            // Generate tax calendar
            const taxCalendar = this.generateTaxCalendar();
            const vatCalendar = this.generateVATCalendar();

            // Generate alerts and highlights
            const alerts = this.generateTaxVATAlerts(totalTaxes, totalVAT, effectiveTaxRate, effectiveVATRate);
            const highlights = this.generateTaxVATHighlights(totalTaxes, totalVAT, effectiveTaxRate, effectiveVATRate);

            const result = {
                taxes: this.taxData,
                vat: this.vatData,
                totals: {
                    totalTaxes,
                    totalVAT,
                    totalNetAmount,
                    effectiveTaxRate,
                    effectiveVATRate,
                    currency: this.currency
                },
                calendar: {
                    taxes: taxCalendar,
                    vat: vatCalendar
                },
                alerts,
                highlights
            };

            logger.info('TAXES_VAT', 'Taxes and VAT processed successfully', {
                taxCount: this.taxData.length,
                vatCount: this.vatData.length,
                totalTaxes,
                totalVAT
            });

            return result;
        } catch (error) {
            logger.error('TAXES_VAT', 'Error processing taxes and VAT', error);
            throw new Error(`Taxes and VAT processing failed: ${error.message}`);
        }
    }

    /**
     * Classify a transaction as tax or VAT
     */
    classifyTaxTransaction(description, amount, category) {
        const desc = description.toLowerCase();
        const isPositive = amount > 0;

        // VAT classifications
        if (desc.includes('vat') || desc.includes('value added tax') || desc.includes('gst')) {
            const rate = this.extractVATRate(description) || this.defaultVATRate;
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: 'vat',
                subcategory: 'VAT',
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculateVATDueDate(),
                status: 'pending'
            };
        }

        // Income tax classifications
        if (desc.includes('income tax') || desc.includes('paye') || desc.includes('withholding')) {
            const rate = this.extractTaxRate(description) || 0.20; // Default 20%
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: 'tax',
                subcategory: 'Income Tax',
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculateIncomeTaxDueDate(),
                status: 'pending'
            };
        }

        // Corporate tax classifications
        if (desc.includes('corporate tax') || desc.includes('corporation tax') || desc.includes('company tax')) {
            const rate = this.extractTaxRate(description) || 0.25; // Default 25%
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: 'tax',
                subcategory: 'Corporate Tax',
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculateCorporateTaxDueDate(),
                status: 'pending'
            };
        }

        // Property tax classifications
        if (desc.includes('property tax') || desc.includes('council tax') || desc.includes('rates')) {
            const rate = this.extractTaxRate(description) || 0.05; // Default 5%
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: 'tax',
                subcategory: 'Property Tax',
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculatePropertyTaxDueDate(),
                status: 'pending'
            };
        }

        // Social security classifications
        if (desc.includes('social security') || desc.includes('national insurance') || desc.includes('ni')) {
            const rate = this.extractTaxRate(description) || 0.12; // Default 12%
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: 'tax',
                subcategory: 'Social Security',
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculateSocialSecurityDueDate(),
                status: 'pending'
            };
        }

        // Default classification based on category
        if (category === 'Tax' || category === 'VAT') {
            const rate = category === 'VAT' ? this.defaultVATRate : 0.20;
            const netAmount = Math.abs(amount) / (1 + rate);
            const taxAmount = Math.abs(amount) - netAmount;

            return {
                type: category === 'VAT' ? 'vat' : 'tax',
                subcategory: category,
                rate: rate,
                netAmount: netAmount,
                taxAmount: taxAmount,
                dueDate: this.calculateDefaultDueDate(),
                status: 'pending'
            };
        }

        return null; // Not a tax-related transaction
    }

    /**
     * Extract VAT rate from description
     */
    extractVATRate(description) {
        const rateMatch = description.match(/(\d+(?:\.\d+)?)%/);
        if (rateMatch) {
            return parseFloat(rateMatch[1]) / 100;
        }
        return null;
    }

    /**
     * Extract tax rate from description
     */
    extractTaxRate(description) {
        const rateMatch = description.match(/(\d+(?:\.\d+)?)%/);
        if (rateMatch) {
            return parseFloat(rateMatch[1]) / 100;
        }
        return null;
    }

    /**
     * Calculate VAT due date (typically end of next month)
     */
    calculateVATDueDate() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return nextMonth.toISOString().split('T')[0];
    }

    /**
     * Calculate income tax due date (typically end of tax year)
     */
    calculateIncomeTaxDueDate() {
        const now = new Date();
        const taxYearEnd = new Date(now.getFullYear(), 3, 5); // April 5th
        if (now > taxYearEnd) {
            taxYearEnd.setFullYear(taxYearEnd.getFullYear() + 1);
        }
        return taxYearEnd.toISOString().split('T')[0];
    }

    /**
     * Calculate corporate tax due date (typically 9 months after year end)
     */
    calculateCorporateTaxDueDate() {
        const now = new Date();
        const yearEnd = new Date(now.getFullYear(), 11, 31); // December 31st
        const dueDate = new Date(yearEnd.getFullYear() + 1, 8, 30); // September 30th
        return dueDate.toISOString().split('T')[0];
    }

    /**
     * Calculate property tax due date (typically quarterly)
     */
    calculatePropertyTaxDueDate() {
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        const nextQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
        return nextQuarter.toISOString().split('T')[0];
    }

    /**
     * Calculate social security due date (typically monthly)
     */
    calculateSocialSecurityDueDate() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.toISOString().split('T')[0];
    }

    /**
     * Calculate default due date (30 days from now)
     */
    calculateDefaultDueDate() {
        const now = new Date();
        now.setDate(now.getDate() + 30);
        return now.toISOString().split('T')[0];
    }

    /**
     * Generate tax calendar
     */
    generateTaxCalendar() {
        const calendar = [];
        const now = new Date();

        // Add all tax entries to calendar
        this.taxData.forEach(tax => {
            calendar.push({
                id: tax.id,
                description: tax.description,
                amount: tax.taxAmount,
                dueDate: tax.dueDate,
                type: 'tax',
                subcategory: tax.subcategory,
                status: tax.status,
                currency: this.currency
            });
        });

        // Add recurring tax reminders
        const recurringTaxes = this.getRecurringTaxReminders();
        calendar.push(...recurringTaxes);

        return calendar.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    /**
     * Generate VAT calendar
     */
    generateVATCalendar() {
        const calendar = [];
        const now = new Date();

        // Add all VAT entries to calendar
        this.vatData.forEach(vat => {
            calendar.push({
                id: vat.id,
                description: vat.description,
                amount: vat.taxAmount,
                dueDate: vat.dueDate,
                type: 'vat',
                subcategory: vat.subcategory,
                status: vat.status,
                currency: this.currency
            });
        });

        // Add recurring VAT reminders
        const recurringVAT = this.getRecurringVATReminders();
        calendar.push(...recurringVAT);

        return calendar.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }

    /**
     * Get recurring tax reminders
     */
    getRecurringTaxReminders() {
        const reminders = [];
        const now = new Date();

        // Quarterly income tax reminders
        for (let quarter = 0; quarter < 4; quarter++) {
            const dueDate = new Date(now.getFullYear(), quarter * 3 + 2, 31);
            if (dueDate > now) {
                reminders.push({
                    id: `income_tax_q${quarter + 1}_${now.getFullYear()}`,
                    description: `Income Tax Q${quarter + 1} ${now.getFullYear()}`,
                    amount: 0,
                    dueDate: dueDate.toISOString().split('T')[0],
                    type: 'tax',
                    subcategory: 'Income Tax',
                    status: 'pending',
                    currency: this.currency
                });
            }
        }

        return reminders;
    }

    /**
     * Get recurring VAT reminders
     */
    getRecurringVATReminders() {
        const reminders = [];
        const now = new Date();

        // Monthly VAT reminders
        for (let month = 0; month < 12; month++) {
            const dueDate = new Date(now.getFullYear(), month + 1, 0);
            if (dueDate > now) {
                reminders.push({
                    id: `vat_${now.getFullYear()}_${month + 1}`,
                    description: `VAT Return ${now.getFullYear()}-${(month + 1).toString().padStart(2, '0')}`,
                    amount: 0,
                    dueDate: dueDate.toISOString().split('T')[0],
                    type: 'vat',
                    subcategory: 'VAT',
                    status: 'pending',
                    currency: this.currency
                });
            }
        }

        return reminders;
    }

    /**
     * Generate alerts for taxes and VAT
     */
    generateTaxVATAlerts(totalTaxes, totalVAT, effectiveTaxRate, effectiveVATRate) {
        const alerts = [];

        // High tax burden
        if (effectiveTaxRate > 0.30) {
            alerts.push({
                type: 'high_tax_burden',
                severity: 'high',
                message: `⚠️ High: High tax burden: ${(effectiveTaxRate * 100).toFixed(1)}% of net amount`,
                amount: totalTaxes,
                category: 'Tax',
                timestamp: new Date().toISOString()
            });
        }

        // Upcoming tax deadlines
        const upcomingDeadlines = this.getUpcomingDeadlines(30);
        if (upcomingDeadlines.length > 0) {
            const totalUpcoming = upcomingDeadlines.reduce((sum, deadline) => sum + deadline.amount, 0);
            alerts.push({
                type: 'upcoming_tax_deadlines',
                severity: 'medium',
                message: `⚠️ Medium: ${upcomingDeadlines.length} tax deadlines in the next 30 days (${totalUpcoming.toFixed(2)} ${this.currency})`,
                amount: totalUpcoming,
                category: 'Deadlines',
                timestamp: new Date().toISOString()
            });
        }

        // Overdue tax payments
        const overduePayments = this.getOverduePayments();
        if (overduePayments.length > 0) {
            alerts.push({
                type: 'overdue_tax_payments',
                severity: 'high',
                message: `⚠️ High: ${overduePayments.length} overdue tax payments`,
                amount: 0,
                category: 'Overdue',
                timestamp: new Date().toISOString()
            });
        }

        // VAT registration threshold
        if (totalVAT > 85000) { // UK VAT threshold
            alerts.push({
                type: 'vat_registration_threshold',
                severity: 'medium',
                message: `⚠️ Medium: VAT turnover approaching registration threshold`,
                amount: totalVAT,
                category: 'VAT',
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * Generate highlights for taxes and VAT
     */
    generateTaxVATHighlights(totalTaxes, totalVAT, effectiveTaxRate, effectiveVATRate) {
        const highlights = [];

        // Low tax burden
        if (effectiveTaxRate < 0.15) {
            highlights.push({
                type: 'low_tax_burden',
                severity: 'low',
                message: `✅ Low tax burden: ${(effectiveTaxRate * 100).toFixed(1)}% of net amount`,
                timestamp: new Date().toISOString()
            });
        }

        // No overdue payments
        const overduePayments = this.getOverduePayments();
        if (overduePayments.length === 0) {
            highlights.push({
                type: 'no_overdue_tax_payments',
                severity: 'low',
                message: `✅ No overdue tax payments`,
                timestamp: new Date().toISOString()
            });
        }

        // Good VAT compliance
        if (this.vatData.length > 0) {
            const vatCompliance = this.vatData.filter(vat => vat.status === 'paid').length / this.vatData.length;
            if (vatCompliance > 0.9) {
                highlights.push({
                    type: 'good_vat_compliance',
                    severity: 'low',
                    message: `✅ Good VAT compliance: ${(vatCompliance * 100).toFixed(1)}% paid on time`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return highlights;
    }

    /**
     * Get upcoming tax deadlines
     */
    getUpcomingDeadlines(days = 30) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);

        const allDeadlines = [...this.taxData, ...this.vatData];
        return allDeadlines
            .filter(deadline => {
                const dueDate = new Date(deadline.dueDate);
                return dueDate <= endDate && dueDate >= new Date();
            })
            .map(deadline => ({
                id: deadline.id,
                description: deadline.description,
                amount: deadline.taxAmount,
                dueDate: deadline.dueDate,
                type: deadline.type,
                subcategory: deadline.subcategory,
                currency: this.currency
            }));
    }

    /**
     * Get overdue tax payments
     */
    getOverduePayments() {
        const today = new Date().toISOString().split('T')[0];
        const allDeadlines = [...this.taxData, ...this.vatData];

        return allDeadlines
            .filter(deadline => deadline.dueDate < today && deadline.status !== 'paid')
            .map(deadline => ({
                id: deadline.id,
                description: deadline.description,
                amount: deadline.taxAmount,
                dueDate: deadline.dueDate,
                daysOverdue: Math.ceil((new Date() - new Date(deadline.dueDate)) / (1000 * 60 * 60 * 24)),
                type: deadline.type,
                subcategory: deadline.subcategory,
                currency: this.currency
            }));
    }

    /**
     * Mark a tax payment as paid
     */
    markAsPaid(id, paymentDate = new Date().toISOString().split('T')[0]) {
        let entry = this.taxData.find(item => item.id === id) || this.vatData.find(item => item.id === id);
        
        if (entry) {
            entry.status = 'paid';
            entry.paymentDate = paymentDate;
            return { success: true, entry };
        }

        return { success: false, error: 'Entry not found' };
    }

    /**
     * Calculate tax liability for a given period
     */
    calculateTaxLiability(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const periodTaxes = this.taxData.filter(tax => {
            const taxDate = new Date(tax.date);
            return taxDate >= start && taxDate <= end;
        });

        const periodVAT = this.vatData.filter(vat => {
            const vatDate = new Date(vat.date);
            return vatDate >= start && vatDate <= end;
        });

        const totalTaxLiability = periodTaxes.reduce((sum, tax) => sum + tax.taxAmount, 0);
        const totalVATLiability = periodVAT.reduce((sum, vat) => sum + vat.taxAmount, 0);

        return {
            period: { startDate, endDate },
            taxes: {
                count: periodTaxes.length,
                total: totalTaxLiability
            },
            vat: {
                count: periodVAT.length,
                total: totalVATLiability
            },
            total: totalTaxLiability + totalVATLiability,
            currency: this.currency
        };
    }
}

module.exports = TaxesVATManager;
