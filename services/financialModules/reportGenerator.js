const logger = require('../logger');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
    constructor() {
        this.reports = [];
        this.templates = {};
        this.outputDir = './reports';
        this.currency = '€';
    }

    /**
     * Initialize report generator
     * @param {string} outputDir - Output directory for reports
     * @param {string} currency - Default currency
     */
    initialize(outputDir = './reports', currency = '€') {
        this.outputDir = outputDir;
        this.currency = currency;

        // Create output directory if it doesn't exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        logger.info('REPORT_GENERATOR', 'Report generator initialized', {
            outputDir: this.outputDir,
            currency: this.currency
        });
    }

    /**
     * Generate comprehensive financial report
     * @param {Object} financialData - Complete financial data
     * @param {string} reportType - Type of report (daily, weekly, monthly, yearly)
     * @param {Object} options - Report options
     * @returns {Object} Generated report
     */
    generateReport(financialData, reportType = 'monthly', options = {}) {
        try {
            // Deep clone financial data to prevent circular references
            const safeFinancialData = this.deepClone(financialData);
            
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const reportDate = new Date();
            const period = this.getReportPeriod(reportType, reportDate);

            // Generate report sections
            const executiveSummary = this.generateExecutiveSummary(safeFinancialData, period);
            const cashflowAnalysis = this.generateCashflowAnalysis(safeFinancialData.cashflow, period);
            const budgetAnalysis = this.generateBudgetAnalysis(safeFinancialData.budget, period);
            const assetsLiabilities = this.generateAssetsLiabilitiesAnalysis(safeFinancialData.assetsLiabilities, period);
            const debtsLoans = this.generateDebtsLoansAnalysis(safeFinancialData.debtsLoans, period);
            const taxesVAT = this.generateTaxesVATAnalysis(safeFinancialData.taxesVAT, period);
            const forecasting = this.generateForecastingAnalysis(safeFinancialData.forecasting, period);
            const recommendations = this.generateRecommendations(safeFinancialData, period);

            const report = {
                id: reportId,
                type: reportType,
                period: period,
                generatedAt: reportDate.toISOString(),
                currency: this.currency,
                sections: {
                    executiveSummary,
                    cashflowAnalysis,
                    budgetAnalysis,
                    assetsLiabilities,
                    debtsLoans,
                    taxesVAT,
                    forecasting,
                    recommendations
                },
                metadata: {
                    dataSources: this.getDataSources(financialData),
                    confidence: this.calculateReportConfidence(financialData),
                    version: '1.0.0'
                }
            };

            // Save report
            this.saveReport(report, options);

            logger.info('REPORT_GENERATOR', 'Report generated successfully', {
                reportId,
                type: reportType,
                period: period
            });

            return report;
        } catch (error) {
            logger.error('REPORT_GENERATOR', 'Error generating report', error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    /**
     * Get report period based on type
     */
    getReportPeriod(reportType, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        switch (reportType) {
            case 'daily':
                return {
                    start: new Date(year, month, day).toISOString().split('T')[0],
                    end: new Date(year, month, day).toISOString().split('T')[0],
                    label: `${day}/${month + 1}/${year}`
                };
            case 'weekly':
                const weekStart = new Date(year, month, day - day + 1);
                const weekEnd = new Date(year, month, day - day + 7);
                return {
                    start: weekStart.toISOString().split('T')[0],
                    end: weekEnd.toISOString().split('T')[0],
                    label: `Week of ${weekStart.getDate()}/${weekStart.getMonth() + 1}/${year}`
                };
            case 'monthly':
                const monthStart = new Date(year, month, 1);
                const monthEnd = new Date(year, month + 1, 0);
                return {
                    start: monthStart.toISOString().split('T')[0],
                    end: monthEnd.toISOString().split('T')[0],
                    label: `${monthStart.toLocaleString('default', { month: 'long' })} ${year}`
                };
            case 'yearly':
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31);
                return {
                    start: yearStart.toISOString().split('T')[0],
                    end: yearEnd.toISOString().split('T')[0],
                    label: year.toString()
                };
            default:
                throw new Error(`Invalid report type: ${reportType}`);
        }
    }

    /**
     * Generate executive summary
     */
    generateExecutiveSummary(financialData, period) {
        const summary = {
            title: 'Executive Summary',
            period: period.label,
            keyMetrics: {},
            highlights: [],
            concerns: [],
            overallHealth: 'unknown'
        };

        // Calculate key metrics
        if (financialData.cashflow) {
            summary.keyMetrics.cashflow = {
                totalInflow: financialData.cashflow.totals?.totalInflow || 0,
                totalOutflow: financialData.cashflow.totals?.totalOutflow || 0,
                netCashflow: financialData.cashflow.totals?.netCashflow || 0
            };
        }

        if (financialData.budget) {
            summary.keyMetrics.budget = {
                totalBudget: financialData.budget.analysis?.overall?.totals?.budget || 0,
                totalActual: financialData.budget.analysis?.overall?.totals?.actual || 0,
                variance: financialData.budget.analysis?.overall?.totals?.variance || 0
            };
        }

        if (financialData.assetsLiabilities) {
            summary.keyMetrics.netWorth = {
                totalAssets: financialData.assetsLiabilities.totals?.totalAssets || 0,
                totalLiabilities: financialData.assetsLiabilities.totals?.totalLiabilities || 0,
                netWorth: financialData.assetsLiabilities.totals?.netWorth || 0
            };
        }

        // Collect highlights and concerns
        if (financialData.cashflow?.highlights) {
            summary.highlights.push(...financialData.cashflow.highlights);
        }
        if (financialData.budget?.highlights) {
            summary.highlights.push(...financialData.budget.highlights);
        }
        if (financialData.assetsLiabilities?.highlights) {
            summary.highlights.push(...financialData.assetsLiabilities.highlights);
        }

        if (financialData.cashflow?.alerts) {
            summary.concerns.push(...financialData.cashflow.alerts);
        }
        if (financialData.budget?.alerts) {
            summary.concerns.push(...financialData.budget.alerts);
        }
        if (financialData.assetsLiabilities?.alerts) {
            summary.concerns.push(...financialData.assetsLiabilities.alerts);
        }

        // Determine overall health
        const criticalAlerts = summary.concerns.filter(alert => alert.severity === 'high').length;
        const positiveHighlights = summary.highlights.filter(highlight => highlight.type.includes('positive')).length;

        if (criticalAlerts === 0 && positiveHighlights > 0) {
            summary.overallHealth = 'excellent';
        } else if (criticalAlerts <= 1 && positiveHighlights > 0) {
            summary.overallHealth = 'good';
        } else if (criticalAlerts <= 2) {
            summary.overallHealth = 'fair';
        } else {
            summary.overallHealth = 'poor';
        }

        return summary;
    }

    /**
     * Generate cashflow analysis
     */
    generateCashflowAnalysis(cashflowData, period) {
        if (!cashflowData) {
            return { title: 'Cashflow Analysis', message: 'No cashflow data available' };
        }

        return {
            title: 'Cashflow Analysis',
            period: period.label,
            summary: {
                totalInflow: cashflowData.totals?.totalInflow || 0,
                totalOutflow: cashflowData.totals?.totalOutflow || 0,
                netCashflow: cashflowData.totals?.netCashflow || 0,
                transactionCount: cashflowData.totals?.transactionCount || 0
            },
            trends: cashflowData.trends || {},
            dailySummary: cashflowData.dailySummary || [],
            weeklySummary: cashflowData.weeklySummary || [],
            monthlySummary: cashflowData.monthlySummary || [],
            alerts: cashflowData.alerts || [],
            highlights: cashflowData.highlights || []
        };
    }

    /**
     * Generate budget analysis
     */
    generateBudgetAnalysis(budgetData, period) {
        if (!budgetData) {
            return { title: 'Budget Analysis', message: 'No budget data available' };
        }

        return {
            title: 'Budget Analysis',
            period: period.label,
            overall: budgetData.analysis?.overall || {},
            monthly: budgetData.analysis?.monthly || {},
            category: budgetData.analysis?.category || [],
            recommendations: budgetData.recommendations || [],
            alerts: budgetData.alerts || [],
            highlights: budgetData.highlights || []
        };
    }

    /**
     * Generate assets and liabilities analysis
     */
    generateAssetsLiabilitiesAnalysis(assetsLiabilitiesData, period) {
        if (!assetsLiabilitiesData) {
            return { title: 'Assets & Liabilities Analysis', message: 'No assets and liabilities data available' };
        }

        return {
            title: 'Assets & Liabilities Analysis',
            period: period.label,
            summary: {
                totalAssets: assetsLiabilitiesData.totals?.totalAssets || 0,
                totalLiabilities: assetsLiabilitiesData.totals?.totalLiabilities || 0,
                netWorth: assetsLiabilitiesData.totals?.netWorth || 0,
                debtToAssetRatio: assetsLiabilitiesData.totals?.debtToAssetRatio || 0
            },
            breakdown: assetsLiabilitiesData.breakdown || {},
            alerts: assetsLiabilitiesData.alerts || [],
            highlights: assetsLiabilitiesData.highlights || []
        };
    }

    /**
     * Generate debts and loans analysis
     */
    generateDebtsLoansAnalysis(debtsLoansData, period) {
        if (!debtsLoansData) {
            return { title: 'Debts & Loans Analysis', message: 'No debts and loans data available' };
        }

        return {
            title: 'Debts & Loans Analysis',
            period: period.label,
            summary: {
                totalDebts: debtsLoansData.totals?.totalDebts || 0,
                totalLoans: debtsLoansData.totals?.totalLoans || 0,
                netDebt: debtsLoansData.totals?.netDebt || 0,
                avgDebtInterestRate: debtsLoansData.metrics?.avgDebtInterestRate || 0,
                avgLoanInterestRate: debtsLoansData.metrics?.avgLoanInterestRate || 0
            },
            paymentSchedules: debtsLoansData.paymentSchedules || {},
            alerts: debtsLoansData.alerts || [],
            highlights: debtsLoansData.highlights || []
        };
    }

    /**
     * Generate taxes and VAT analysis
     */
    generateTaxesVATAnalysis(taxesVATData, period) {
        if (!taxesVATData) {
            return { title: 'Taxes & VAT Analysis', message: 'No taxes and VAT data available' };
        }

        return {
            title: 'Taxes & VAT Analysis',
            period: period.label,
            summary: {
                totalTaxes: taxesVATData.totals?.totalTaxes || 0,
                totalVAT: taxesVATData.totals?.totalVAT || 0,
                totalNetAmount: taxesVATData.totals?.totalNetAmount || 0,
                effectiveTaxRate: taxesVATData.totals?.effectiveTaxRate || 0,
                effectiveVATRate: taxesVATData.totals?.effectiveVATRate || 0
            },
            calendar: taxesVATData.calendar || {},
            alerts: taxesVATData.alerts || [],
            highlights: taxesVATData.highlights || []
        };
    }

    /**
     * Generate forecasting analysis
     */
    generateForecastingAnalysis(forecastingData, period) {
        if (!forecastingData) {
            return { title: 'Forecasting Analysis', message: 'No forecasting data available' };
        }

        return {
            title: 'Forecasting Analysis',
            period: period.label,
            forecasts: forecastingData.forecasts || {},
            analysis: forecastingData.analysis || {},
            recommendations: forecastingData.recommendations || [],
            alerts: forecastingData.alerts || [],
            highlights: forecastingData.highlights || []
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(financialData, period) {
        const recommendations = [];

        // Collect recommendations from all modules
        if (financialData.budget?.recommendations) {
            recommendations.push(...financialData.budget.recommendations);
        }
        if (financialData.forecasting?.recommendations) {
            recommendations.push(...financialData.forecasting.recommendations);
        }

        // Generate additional recommendations based on overall analysis
        if (financialData.cashflow?.totals?.netCashflow < 0) {
            recommendations.push({
                type: 'cashflow_improvement',
                priority: 'high',
                message: 'Focus on improving cashflow by increasing revenue or reducing expenses',
                category: 'Cashflow'
            });
        }

        if (financialData.assetsLiabilities?.totals?.debtToAssetRatio > 0.8) {
            recommendations.push({
                type: 'debt_reduction',
                priority: 'high',
                message: 'Consider reducing debt to improve financial health',
                category: 'Debt Management'
            });
        }

        return {
            title: 'Recommendations',
            period: period.label,
            recommendations: recommendations.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            })
        };
    }

    /**
     * Get data sources
     */
    getDataSources(financialData) {
        const sources = [];
        
        if (financialData.cashflow) sources.push('Cashflow Manager');
        if (financialData.budget) sources.push('Budgeting Tool');
        if (financialData.assetsLiabilities) sources.push('Assets & Liabilities Manager');
        if (financialData.debtsLoans) sources.push('Debts & Loans Manager');
        if (financialData.taxesVAT) sources.push('Taxes & VAT Manager');
        if (financialData.forecasting) sources.push('Forecasting Tool');
        if (financialData.multiCurrency) sources.push('Multi-Currency Manager');

        return sources;
    }

    /**
     * Calculate report confidence
     */
    calculateReportConfidence(financialData) {
        let totalConfidence = 0;
        let moduleCount = 0;

        // Calculate confidence from each module
        if (financialData.cashflow) {
            totalConfidence += 0.8; // Default confidence
            moduleCount++;
        }
        if (financialData.budget) {
            totalConfidence += 0.7;
            moduleCount++;
        }
        if (financialData.assetsLiabilities) {
            totalConfidence += 0.6;
            moduleCount++;
        }
        if (financialData.debtsLoans) {
            totalConfidence += 0.7;
            moduleCount++;
        }
        if (financialData.taxesVAT) {
            totalConfidence += 0.8;
            moduleCount++;
        }
        if (financialData.forecasting) {
            totalConfidence += 0.5; // Lower confidence for forecasting
            moduleCount++;
        }

        return moduleCount > 0 ? Math.round((totalConfidence / moduleCount) * 100) : 0;
    }

    /**
     * Save report to file
     */
    saveReport(report, options = {}) {
        try {
            const filename = `${report.type}_report_${report.period.start}_${report.period.end}.json`;
            const filepath = path.join(this.outputDir, filename);
            
            // Save JSON report
            fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
            
            // Generate additional formats if requested
            if (options.generateCSV) {
                this.generateCSVReport(report, options);
            }
            
            if (options.generatePDF) {
                this.generatePDFReport(report, options);
            }

            // Store report metadata
            this.reports.push({
                id: report.id,
                type: report.type,
                period: report.period,
                filename: filename,
                generatedAt: report.generatedAt,
                filepath: filepath
            });

            logger.info('REPORT_GENERATOR', 'Report saved successfully', {
                reportId: report.id,
                filename: filename,
                filepath: filepath
            });
        } catch (error) {
            logger.error('REPORT_GENERATOR', 'Error saving report', error);
            throw new Error(`Report saving failed: ${error.message}`);
        }
    }

    /**
     * Generate CSV report
     */
    generateCSVReport(report, options = {}) {
        try {
            const csvFilename = `${report.type}_report_${report.period.start}_${report.period.end}.csv`;
            const csvFilepath = path.join(this.outputDir, csvFilename);
            
            let csvContent = 'Section,Field,Value\n';
            
            // Add executive summary
            csvContent += 'Executive Summary,Overall Health,' + report.sections.executiveSummary.overallHealth + '\n';
            csvContent += 'Executive Summary,Period,' + report.period.label + '\n';
            
            // Add key metrics
            if (report.sections.executiveSummary.keyMetrics.cashflow) {
                csvContent += 'Cashflow,Total Inflow,' + report.sections.executiveSummary.keyMetrics.cashflow.totalInflow + '\n';
                csvContent += 'Cashflow,Total Outflow,' + report.sections.executiveSummary.keyMetrics.cashflow.totalOutflow + '\n';
                csvContent += 'Cashflow,Net Cashflow,' + report.sections.executiveSummary.keyMetrics.cashflow.netCashflow + '\n';
            }
            
            // Add more sections as needed...
            
            fs.writeFileSync(csvFilepath, csvContent);
            
            logger.info('REPORT_GENERATOR', 'CSV report generated', {
                filename: csvFilename,
                filepath: csvFilepath
            });
        } catch (error) {
            logger.error('REPORT_GENERATOR', 'Error generating CSV report', error);
        }
    }

    /**
     * Generate PDF report (placeholder)
     */
    generatePDFReport(report, options = {}) {
        // This would typically use a PDF generation library like puppeteer or jsPDF
        logger.info('REPORT_GENERATOR', 'PDF report generation not implemented yet', {
            reportId: report.id
        });
    }

    /**
     * Get all reports
     */
    getAllReports() {
        return this.reports;
    }

    /**
     * Get report by ID
     */
    getReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (report && fs.existsSync(report.filepath)) {
            return JSON.parse(fs.readFileSync(report.filepath, 'utf8'));
        }
        return null;
    }

    /**
     * Delete report
     */
    deleteReport(reportId) {
        const reportIndex = this.reports.findIndex(r => r.id === reportId);
        if (reportIndex !== -1) {
            const report = this.reports[reportIndex];
            if (fs.existsSync(report.filepath)) {
                fs.unlinkSync(report.filepath);
            }
            this.reports.splice(reportIndex, 1);
            return true;
        }
        return false;
    }

    /**
     * Deep clone function to prevent circular references
     */
    deepClone(obj, seen = new WeakSet()) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (seen.has(obj)) {
            return '[Circular Reference]';
        }
        
        seen.add(obj);
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item, seen));
        }
        
        const result = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = this.deepClone(obj[key], seen);
            }
        }
        
        return result;
    }
}

module.exports = ReportGenerator;



