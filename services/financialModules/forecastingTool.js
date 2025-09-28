const logger = require('../logger');

class ForecastingTool {
    constructor() {
        this.historicalData = [];
        this.currency = '€';
        this.forecastPeriods = {
            short: 30, // 30 days
            medium: 90, // 3 months
            long: 365 // 1 year
        };
    }

    /**
     * Process and analyze historical data for forecasting
     * @param {Array} transactions - Array of transaction objects
     * @param {string} currency - Currency code
     * @returns {Object} Forecasting analysis and predictions
     */
    processForecasting(transactions, currency = '€') {
        try {
            this.currency = currency;
            this.historicalData = [];

            // Process transactions into historical data
            transactions.forEach((transaction, index) => {
                const amount = parseFloat(transaction.amount || transaction.Amount || 0);
                const description = transaction.description || transaction.Description || `Transaction ${index + 1}`;
                const category = transaction.category || transaction.Category || 'Other';
                const date = new Date(transaction.date || transaction.Date || new Date());

                if (isNaN(amount) || amount === 0) {
                    logger.warn('FORECASTING', 'Skipping invalid transaction', { description, amount });
                    return;
                }

                const dataPoint = {
                    id: `data_${index}_${Date.now()}`,
                    date: date.toISOString().split('T')[0],
                    amount,
                    category,
                    description,
                    type: amount > 0 ? 'income' : 'expense',
                    month: date.toISOString().substring(0, 7), // YYYY-MM
                    year: date.getFullYear(),
                    quarter: Math.ceil((date.getMonth() + 1) / 3),
                    week: this.getWeekNumber(date)
                };

                this.historicalData.push(dataPoint);
            });

            // Sort data by date
            this.historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Anchor forecasting windows to the last available transaction date (not today)
            this.anchorEndDate = this.historicalData.length > 0
                ? new Date(this.historicalData[this.historicalData.length - 1].date)
                : new Date();

            // Generate forecasts for different periods
            // If there is not enough history for a period, gracefully reduce the window
            const shortTermForecast = this.generateShortTermForecast();
            const mediumTermForecast = this.generateMediumTermForecast();
            const longTermForecast = this.generateLongTermForecast();

            // Analyze trends and patterns
            const trends = this.analyzeTrends();
            const seasonality = this.analyzeSeasonality();
            const categoryForecasts = this.generateCategoryForecasts();

            // Generate alerts and highlights
            const alerts = this.generateForecastingAlerts(shortTermForecast, mediumTermForecast, longTermForecast);
            const highlights = this.generateForecastingHighlights(shortTermForecast, mediumTermForecast, longTermForecast);

            const result = {
                historicalData: this.historicalData,
                forecasts: {
                    shortTerm: shortTermForecast,
                    mediumTerm: mediumTermForecast,
                    longTerm: longTermForecast
                },
                analysis: {
                    trends,
                    seasonality,
                    categories: categoryForecasts
                },
                alerts,
                highlights,
                recommendations: this.generateForecastingRecommendations(shortTermForecast, mediumTermForecast, longTermForecast)
            };

            logger.info('FORECASTING', 'Forecasting analysis completed successfully', {
                dataPoints: this.historicalData.length,
                forecastPeriods: Object.keys(this.forecastPeriods).length
            });

            return result;
        } catch (error) {
            logger.error('FORECASTING', 'Error processing forecasting', error);
            throw new Error(`Forecasting processing failed: ${error.message}`);
        }
    }

    /**
     * Generate short-term forecast (30 days)
     */
    generateShortTermForecast() {
        const days = this.forecastPeriods.short;
        const endDate = this.anchorEndDate ? new Date(this.anchorEndDate) : new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get recent data
        const recentData = this.historicalData.filter(d => {
            const dataDate = new Date(d.date);
            return dataDate >= startDate && dataDate <= endDate;
        });

        // Calculate daily averages
        const dailyTotals = {};
        recentData.forEach(data => {
            if (!dailyTotals[data.date]) {
                dailyTotals[data.date] = { income: 0, expense: 0, net: 0 };
            }
            if (data.type === 'income') {
                dailyTotals[data.date].income += data.amount;
            } else {
                dailyTotals[data.date].expense += Math.abs(data.amount);
            }
            dailyTotals[data.date].net += data.amount;
        });

        let dailyValues = Object.values(dailyTotals);
        if (dailyValues.length === 0) {
            // Fallback 1: use overall averages from entire historical dataset
            const overall = this.getOverallDailyAverages();
            dailyValues = [{ income: overall.income, expense: overall.expense, net: overall.net }];
        }
        const avgDailyIncome = dailyValues.reduce((sum, d) => sum + d.income, 0) / dailyValues.length;
        const avgDailyExpense = dailyValues.reduce((sum, d) => sum + d.expense, 0) / dailyValues.length;
        const avgDailyNet = dailyValues.reduce((sum, d) => sum + d.net, 0) / dailyValues.length;

        // Calculate trends
        const incomeTrend = this.calculateTrend(dailyValues.map(d => d.income));
        const expenseTrend = this.calculateTrend(dailyValues.map(d => d.expense));
        const netTrend = this.calculateTrend(dailyValues.map(d => d.net));

        // Generate forecast
        const forecast = [];
        for (let i = 1; i <= days; i++) {
            const forecastDate = new Date(endDate.getTime() + i * 24 * 60 * 60 * 1000);
            const forecastIncome = avgDailyIncome * (1 + (incomeTrend.percentage / 100) * (i / days));
            const forecastExpense = avgDailyExpense * (1 + (expenseTrend.percentage / 100) * (i / days));
            const forecastNet = forecastIncome - forecastExpense;

            forecast.push({
                date: forecastDate.toISOString().split('T')[0],
                income: forecastIncome,
                expense: forecastExpense,
                net: forecastNet,
                confidence: Math.max(0.6, 1 - (i * 0.01)) // Decreasing confidence over time
            });
        }

        return {
            period: 'short',
            days,
            average: {
                dailyIncome: avgDailyIncome,
                dailyExpense: avgDailyExpense,
                dailyNet: avgDailyNet
            },
            trends: {
                income: incomeTrend,
                expense: expenseTrend,
                net: netTrend
            },
            forecast,
            totalForecast: {
                income: forecast.reduce((sum, f) => sum + f.income, 0),
                expense: forecast.reduce((sum, f) => sum + f.expense, 0),
                net: forecast.reduce((sum, f) => sum + f.net, 0)
            }
        };
    }

    /**
     * Generate medium-term forecast (3 months)
     */
    generateMediumTermForecast() {
        const days = this.forecastPeriods.medium;
        const endDate = this.anchorEndDate ? new Date(this.anchorEndDate) : new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get recent data
        const recentData = this.historicalData.filter(d => {
            const dataDate = new Date(d.date);
            return dataDate >= startDate && dataDate <= endDate;
        });

        // Calculate weekly averages
        const weeklyTotals = {};
        recentData.forEach(data => {
            const weekKey = this.getWeekKey(new Date(data.date));
            if (!weeklyTotals[weekKey]) {
                weeklyTotals[weekKey] = { income: 0, expense: 0, net: 0, count: 0 };
            }
            if (data.type === 'income') {
                weeklyTotals[weekKey].income += data.amount;
            } else {
                weeklyTotals[weekKey].expense += Math.abs(data.amount);
            }
            weeklyTotals[weekKey].net += data.amount;
            weeklyTotals[weekKey].count++;
        });

        let weeklyValues = Object.values(weeklyTotals);
        if (weeklyValues.length === 0) {
            const overall = this.getOverallWeeklyAverages();
            weeklyValues = [{ income: overall.income, expense: overall.expense, net: overall.net, count: 1 }];
        }
        const avgWeeklyIncome = weeklyValues.reduce((sum, w) => sum + w.income, 0) / weeklyValues.length;
        const avgWeeklyExpense = weeklyValues.reduce((sum, w) => sum + w.expense, 0) / weeklyValues.length;
        const avgWeeklyNet = weeklyValues.reduce((sum, w) => sum + w.net, 0) / weeklyValues.length;

        // Calculate trends
        const incomeTrend = this.calculateTrend(weeklyValues.map(w => w.income));
        const expenseTrend = this.calculateTrend(weeklyValues.map(w => w.expense));
        const netTrend = this.calculateTrend(weeklyValues.map(w => w.net));

        // Generate forecast
        const forecast = [];
        const weeks = Math.ceil(days / 7);
        for (let i = 1; i <= weeks; i++) {
            const forecastWeek = new Date(endDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            const forecastIncome = avgWeeklyIncome * (1 + (incomeTrend.percentage / 100) * (i / weeks));
            const forecastExpense = avgWeeklyExpense * (1 + (expenseTrend.percentage / 100) * (i / weeks));
            const forecastNet = forecastIncome - forecastExpense;

            forecast.push({
                week: this.getWeekKey(forecastWeek),
                income: forecastIncome,
                expense: forecastExpense,
                net: forecastNet,
                confidence: Math.max(0.4, 1 - (i * 0.05)) // Decreasing confidence over time
            });
        }

        return {
            period: 'medium',
            days,
            weeks,
            average: {
                weeklyIncome: avgWeeklyIncome,
                weeklyExpense: avgWeeklyExpense,
                weeklyNet: avgWeeklyNet
            },
            trends: {
                income: incomeTrend,
                expense: expenseTrend,
                net: netTrend
            },
            forecast,
            totalForecast: {
                income: forecast.reduce((sum, f) => sum + f.income, 0),
                expense: forecast.reduce((sum, f) => sum + f.expense, 0),
                net: forecast.reduce((sum, f) => sum + f.net, 0)
            }
        };
    }

    /**
     * Generate long-term forecast (1 year)
     */
    generateLongTermForecast() {
        const days = this.forecastPeriods.long;
        const endDate = this.anchorEndDate ? new Date(this.anchorEndDate) : new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get historical data
        const historicalData = this.historicalData.filter(d => {
            const dataDate = new Date(d.date);
            return dataDate >= startDate && dataDate <= endDate;
        });

        // Calculate monthly averages
        const monthlyTotals = {};
        historicalData.forEach(data => {
            const monthKey = data.month;
            if (!monthlyTotals[monthKey]) {
                monthlyTotals[monthKey] = { income: 0, expense: 0, net: 0, count: 0 };
            }
            if (data.type === 'income') {
                monthlyTotals[monthKey].income += data.amount;
            } else {
                monthlyTotals[monthKey].expense += Math.abs(data.amount);
            }
            monthlyTotals[monthKey].net += data.amount;
            monthlyTotals[monthKey].count++;
        });

        let monthlyValues = Object.values(monthlyTotals);
        if (monthlyValues.length === 0) {
            const overall = this.getOverallMonthlyAverages();
            monthlyValues = [{ income: overall.income, expense: overall.expense, net: overall.net, count: 1 }];
        }
        const avgMonthlyIncome = monthlyValues.reduce((sum, m) => sum + m.income, 0) / monthlyValues.length;
        const avgMonthlyExpense = monthlyValues.reduce((sum, m) => sum + m.expense, 0) / monthlyValues.length;
        const avgMonthlyNet = monthlyValues.reduce((sum, m) => sum + m.net, 0) / monthlyValues.length;

        // Calculate trends
        const incomeTrend = this.calculateTrend(monthlyValues.map(m => m.income));
        const expenseTrend = this.calculateTrend(monthlyValues.map(m => m.expense));
        const netTrend = this.calculateTrend(monthlyValues.map(m => m.net));

        // Generate forecast
        const forecast = [];
        const months = Math.ceil(days / 30);
        for (let i = 1; i <= months; i++) {
            const forecastMonth = new Date(endDate.getFullYear(), endDate.getMonth() + i, 1);
            const forecastIncome = avgMonthlyIncome * (1 + (incomeTrend.percentage / 100) * (i / months));
            const forecastExpense = avgMonthlyExpense * (1 + (expenseTrend.percentage / 100) * (i / months));
            const forecastNet = forecastIncome - forecastExpense;

            forecast.push({
                month: forecastMonth.toISOString().substring(0, 7),
                income: forecastIncome,
                expense: forecastExpense,
                net: forecastNet,
                confidence: Math.max(0.2, 1 - (i * 0.1)) // Decreasing confidence over time
            });
        }

        return {
            period: 'long',
            days,
            months,
            average: {
                monthlyIncome: avgMonthlyIncome,
                monthlyExpense: avgMonthlyExpense,
                monthlyNet: avgMonthlyNet
            },
            trends: {
                income: incomeTrend,
                expense: expenseTrend,
                net: netTrend
            },
            forecast,
            totalForecast: {
                income: forecast.reduce((sum, f) => sum + f.income, 0),
                expense: forecast.reduce((sum, f) => sum + f.expense, 0),
                net: forecast.reduce((sum, f) => sum + f.net, 0)
            }
        };
    }

    /**
     * Analyze trends in the data
     */
    analyzeTrends() {
        const trends = {
            overall: this.calculateOverallTrend(),
            income: this.calculateIncomeTrend(),
            expense: this.calculateExpenseTrend(),
            categories: this.calculateCategoryTrends()
        };

        return trends;
    }

    /**
     * Calculate overall trend
     */
    calculateOverallTrend() {
        const monthlyTotals = {};
        this.historicalData.forEach(data => {
            if (!monthlyTotals[data.month]) {
                monthlyTotals[data.month] = 0;
            }
            monthlyTotals[data.month] += data.amount;
        });

        const monthlyValues = Object.values(monthlyTotals);
        return this.calculateTrend(monthlyValues);
    }

    /**
     * Calculate income trend
     */
    calculateIncomeTrend() {
        const monthlyIncome = {};
        this.historicalData.forEach(data => {
            if (data.type === 'income') {
                if (!monthlyIncome[data.month]) {
                    monthlyIncome[data.month] = 0;
                }
                monthlyIncome[data.month] += data.amount;
            }
        });

        const monthlyValues = Object.values(monthlyIncome);
        return this.calculateTrend(monthlyValues);
    }

    /**
     * Calculate expense trend
     */
    calculateExpenseTrend() {
        const monthlyExpense = {};
        this.historicalData.forEach(data => {
            if (data.type === 'expense') {
                if (!monthlyExpense[data.month]) {
                    monthlyExpense[data.month] = 0;
                }
                monthlyExpense[data.month] += Math.abs(data.amount);
            }
        });

        const monthlyValues = Object.values(monthlyExpense);
        return this.calculateTrend(monthlyValues);
    }

    /**
     * Calculate category trends
     */
    calculateCategoryTrends() {
        const categoryTrends = {};
        const categories = [...new Set(this.historicalData.map(d => d.category))];

        categories.forEach(category => {
            const categoryData = this.historicalData.filter(d => d.category === category);
            const monthlyTotals = {};
            
            categoryData.forEach(data => {
                if (!monthlyTotals[data.month]) {
                    monthlyTotals[data.month] = 0;
                }
                monthlyTotals[data.month] += Math.abs(data.amount);
            });

            const monthlyValues = Object.values(monthlyTotals);
            categoryTrends[category] = this.calculateTrend(monthlyValues);
        });

        return categoryTrends;
    }

    /**
     * Analyze seasonality in the data
     */
    analyzeSeasonality() {
        const seasonality = {
            monthly: this.analyzeMonthlySeasonality(),
            quarterly: this.analyzeQuarterlySeasonality(),
            weekly: this.analyzeWeeklySeasonality()
        };

        return seasonality;
    }

    /**
     * Analyze monthly seasonality
     */
    analyzeMonthlySeasonality() {
        const monthlyAverages = {};
        const monthlyCounts = {};

        this.historicalData.forEach(data => {
            const month = new Date(data.date).getMonth();
            if (!monthlyAverages[month]) {
                monthlyAverages[month] = 0;
                monthlyCounts[month] = 0;
            }
            monthlyAverages[month] += Math.abs(data.amount);
            monthlyCounts[month]++;
        });

        // Calculate averages
        Object.keys(monthlyAverages).forEach(month => {
            monthlyAverages[month] = monthlyAverages[month] / monthlyCounts[month];
        });

        return monthlyAverages;
    }

    /**
     * Analyze quarterly seasonality
     */
    analyzeQuarterlySeasonality() {
        const quarterlyAverages = {};
        const quarterlyCounts = {};

        this.historicalData.forEach(data => {
            if (!quarterlyAverages[data.quarter]) {
                quarterlyAverages[data.quarter] = 0;
                quarterlyCounts[data.quarter] = 0;
            }
            quarterlyAverages[data.quarter] += Math.abs(data.amount);
            quarterlyCounts[data.quarter]++;
        });

        // Calculate averages
        Object.keys(quarterlyAverages).forEach(quarter => {
            quarterlyAverages[quarter] = quarterlyAverages[quarter] / quarterlyCounts[quarter];
        });

        return quarterlyAverages;
    }

    /**
     * Analyze weekly seasonality
     */
    analyzeWeeklySeasonality() {
        const weeklyAverages = {};
        const weeklyCounts = {};

        this.historicalData.forEach(data => {
            const dayOfWeek = new Date(data.date).getDay();
            if (!weeklyAverages[dayOfWeek]) {
                weeklyAverages[dayOfWeek] = 0;
                weeklyCounts[dayOfWeek] = 0;
            }
            weeklyAverages[dayOfWeek] += Math.abs(data.amount);
            weeklyCounts[dayOfWeek]++;
        });

        // Calculate averages
        Object.keys(weeklyAverages).forEach(day => {
            weeklyAverages[day] = weeklyAverages[day] / weeklyCounts[day];
        });

        return weeklyAverages;
    }

    // Overall average helpers used for fallbacks when a window has no data
    getOverallDailyAverages() {
        if (this.historicalData.length === 0) return { income: 0, expense: 0, net: 0 };
        const totalsByDate = {};
        this.historicalData.forEach(d => {
            if (!totalsByDate[d.date]) totalsByDate[d.date] = { income: 0, expense: 0, net: 0 };
            if (d.type === 'income') totalsByDate[d.date].income += d.amount;
            else totalsByDate[d.date].expense += Math.abs(d.amount);
            totalsByDate[d.date].net += d.amount;
        });
        const values = Object.values(totalsByDate);
        return {
            income: values.reduce((s, v) => s + v.income, 0) / values.length,
            expense: values.reduce((s, v) => s + v.expense, 0) / values.length,
            net: values.reduce((s, v) => s + v.net, 0) / values.length,
        };
    }

    getOverallWeeklyAverages() {
        if (this.historicalData.length === 0) return { income: 0, expense: 0, net: 0 };
        const totals = {};
        this.historicalData.forEach(d => {
            const key = this.getWeekKey(new Date(d.date));
            if (!totals[key]) totals[key] = { income: 0, expense: 0, net: 0 };
            if (d.type === 'income') totals[key].income += d.amount;
            else totals[key].expense += Math.abs(d.amount);
            totals[key].net += d.amount;
        });
        const values = Object.values(totals);
        return {
            income: values.reduce((s, v) => s + v.income, 0) / values.length,
            expense: values.reduce((s, v) => s + v.expense, 0) / values.length,
            net: values.reduce((s, v) => s + v.net, 0) / values.length,
        };
        }

    getOverallMonthlyAverages() {
        if (this.historicalData.length === 0) return { income: 0, expense: 0, net: 0 };
        const totals = {};
        this.historicalData.forEach(d => {
            const key = d.month;
            if (!totals[key]) totals[key] = { income: 0, expense: 0, net: 0 };
            if (d.type === 'income') totals[key].income += d.amount;
            else totals[key].expense += Math.abs(d.amount);
            totals[key].net += d.amount;
        });
        const values = Object.values(totals);
        return {
            income: values.reduce((s, v) => s + v.income, 0) / values.length,
            expense: values.reduce((s, v) => s + v.expense, 0) / values.length,
            net: values.reduce((s, v) => s + v.net, 0) / values.length,
        };
    }

    /**
     * Generate category-specific forecasts
     */
    generateCategoryForecasts() {
        const categories = [...new Set(this.historicalData.map(d => d.category))];
        const categoryForecasts = {};

        categories.forEach(category => {
            const categoryData = this.historicalData.filter(d => d.category === category);
            const monthlyTotals = {};
            
            categoryData.forEach(data => {
                if (!monthlyTotals[data.month]) {
                    monthlyTotals[data.month] = 0;
                }
                monthlyTotals[data.month] += Math.abs(data.amount);
            });

            const monthlyValues = Object.values(monthlyTotals);
            const trend = this.calculateTrend(monthlyValues);
            const average = monthlyValues.reduce((sum, v) => sum + v, 0) / monthlyValues.length;

            categoryForecasts[category] = {
                trend,
                average,
                forecast: average * (1 + trend.percentage / 100),
                confidence: Math.max(0.3, 1 - (monthlyValues.length * 0.05))
            };
        });

        return categoryForecasts;
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
     * Get week number of the year
     */
    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    /**
     * Get week key for grouping (YYYY-WW format)
     */
    getWeekKey(date) {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    /**
     * Generate forecasting alerts
     */
    generateForecastingAlerts(shortTerm, mediumTerm, longTerm) {
        const alerts = [];

        // Negative cashflow forecast
        if (shortTerm.totalForecast.net < 0) {
            alerts.push({
                type: 'negative_cashflow_forecast',
                severity: 'high',
                message: `⚠️ High: Negative cashflow forecast for next 30 days: ${shortTerm.totalForecast.net.toFixed(2)} ${this.currency}`,
                amount: Math.abs(shortTerm.totalForecast.net),
                category: 'Forecast',
                timestamp: new Date().toISOString()
            });
        }

        // Declining trend forecast
        if (shortTerm.trends.net.direction === 'decreasing' && shortTerm.trends.net.percentage < -20) {
            alerts.push({
                type: 'declining_trend_forecast',
                severity: 'medium',
                message: `⚠️ Medium: Declining trend forecast: ${Math.abs(shortTerm.trends.net.percentage)}% decrease`,
                amount: 0,
                category: 'Trends',
                timestamp: new Date().toISOString()
            });
        }

        // High expense growth forecast
        if (shortTerm.trends.expense.direction === 'increasing' && shortTerm.trends.expense.percentage > 30) {
            alerts.push({
                type: 'high_expense_growth_forecast',
                severity: 'medium',
                message: `⚠️ Medium: High expense growth forecast: ${shortTerm.trends.expense.percentage}% increase`,
                amount: 0,
                category: 'Expenses',
                timestamp: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * Generate forecasting highlights
     */
    generateForecastingHighlights(shortTerm, mediumTerm, longTerm) {
        const highlights = [];

        // Positive cashflow forecast
        if (shortTerm.totalForecast.net > 0) {
            highlights.push({
                type: 'positive_cashflow_forecast',
                severity: 'low',
                message: `✅ Positive cashflow forecast for next 30 days: ${shortTerm.totalForecast.net.toFixed(2)} ${this.currency}`,
                timestamp: new Date().toISOString()
            });
        }

        // Stable trend forecast
        if (shortTerm.trends.net.direction === 'stable' && Math.abs(shortTerm.trends.net.percentage) < 10) {
            highlights.push({
                type: 'stable_trend_forecast',
                severity: 'low',
                message: `✅ Stable trend forecast: ${shortTerm.trends.net.percentage}% change`,
                timestamp: new Date().toISOString()
            });
        }

        // Income growth forecast
        if (shortTerm.trends.income.direction === 'increasing' && shortTerm.trends.income.percentage > 10) {
            highlights.push({
                type: 'income_growth_forecast',
                severity: 'low',
                message: `✅ Income growth forecast: ${shortTerm.trends.income.percentage}% increase`,
                timestamp: new Date().toISOString()
            });
        }

        return highlights;
    }

    /**
     * Generate forecasting recommendations
     */
    generateForecastingRecommendations(shortTerm, mediumTerm, longTerm) {
        const recommendations = [];

        // Cashflow recommendations
        if (shortTerm.totalForecast.net < 0) {
            recommendations.push({
                type: 'cashflow_improvement',
                priority: 'high',
                message: 'Focus on increasing revenue or reducing expenses to improve cashflow',
                category: 'Cashflow'
            });
        }

        // Trend recommendations
        if (shortTerm.trends.expense.direction === 'increasing' && shortTerm.trends.expense.percentage > 20) {
            recommendations.push({
                type: 'expense_control',
                priority: 'medium',
                message: 'Implement expense control measures to manage growing costs',
                category: 'Expenses'
            });
        }

        // Growth recommendations
        if (shortTerm.trends.income.direction === 'increasing' && shortTerm.trends.income.percentage > 15) {
            recommendations.push({
                type: 'growth_management',
                priority: 'low',
                message: 'Consider scaling operations to support growing revenue',
                category: 'Growth'
            });
        }

        return recommendations;
    }
}

module.exports = ForecastingTool;
