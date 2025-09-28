function validateFinancialSummary(summary) {
	const recalculatedNet = (summary.totalIncome || 0) - (summary.totalExpenses || 0);
	if ((summary.netCashflow || 0) !== recalculatedNet) {
		console.log(`⚠️ Correcting NetCashflow: was ${summary.netCashflow}, fixing to ${recalculatedNet}`);
		summary.netCashflow = recalculatedNet;
	}

	const txCount = Array.isArray(summary.transactions) ? summary.transactions.length : 0;
	if ((summary.totalIncome === 0 && summary.totalExpenses === 0) && txCount > 0) {
		summary.needsReview = true;
		console.log("⚠️ Transactions exist but totals = 0 → flagged for review.");
	}

	return summary;
}

/**
 * Centralized Validator Module for AI Automation System
 * Handles all validation, error reporting, and data correction
 */

class Validator {
    constructor() {
        this.validationRules = {
            tolerance: {
                financial: 0.01,
                percentage: 0.5,
                confidence: 5
            },
            thresholds: {
                minConfidence: 60,
                maxConfidence: 95,
                minTransactions: 1,
                maxTransactionAmount: 1000000
            }
        };
    }

    /**
     * Comprehensive financial data validation
     */
    static validateFinancialData(processedData) {
        const issues = [];
        const correctedData = { ...processedData };
        const tolerance = 0.01;

        try {
            // Extract actual values from transactions
            const transactions = processedData.transactions || [];
            const actualExpenses = transactions
                .filter(tx => tx.amount < 0)
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            const actualIncome = transactions
                .filter(tx => tx.amount > 0)
                .reduce((sum, tx) => sum + tx.amount, 0);
            const actualNetCashflow = actualIncome - actualExpenses;

            // Ensure totals exist
            if (!correctedData.totals) {
                correctedData.totals = {};
            }

            // 1. Totals validation with proper tolerance
            if (processedData.totals) {
                const reportedExpenses = processedData.totals.totalExpenses || 0;
                const reportedIncome = processedData.totals.totalIncome || 0;
                const reportedNetCashflow = processedData.totals.netCashflow || 0;

                if (Math.abs(reportedExpenses - actualExpenses) > tolerance) {
                    issues.push({
                        type: "error",
                        field: "totalExpenses",
                        message: `Expense mismatch: reported ${reportedExpenses.toFixed(2)}, actual ${actualExpenses.toFixed(2)}`,
                        expected: actualExpenses,
                        actual: reportedExpenses,
                        severity: "high"
                    });
                    correctedData.totals.totalExpenses = actualExpenses;
                }

                if (Math.abs(reportedIncome - actualIncome) > tolerance) {
                    issues.push({
                        type: "error",
                        field: "totalIncome",
                        message: `Income mismatch: reported ${reportedIncome.toFixed(2)}, actual ${actualIncome.toFixed(2)}`,
                        expected: actualIncome,
                        actual: reportedIncome,
                        severity: "high"
                    });
                    correctedData.totals.totalIncome = actualIncome;
                }

                if (Math.abs(reportedNetCashflow - actualNetCashflow) > tolerance) {
                    issues.push({
                        type: "error",
                        field: "netCashflow",
                        message: `Net cashflow mismatch: reported ${reportedNetCashflow.toFixed(2)}, actual ${actualNetCashflow.toFixed(2)}`,
                        expected: actualNetCashflow,
                        actual: reportedNetCashflow,
                        severity: "high"
                    });
                    correctedData.totals.netCashflow = actualNetCashflow;
                }
            }

            // Set corrected totals
            correctedData.totals.totalExpenses = actualExpenses;
            correctedData.totals.totalIncome = actualIncome;
            correctedData.totals.netCashflow = actualNetCashflow;

            // 2. Business logic validation
            if (actualExpenses > 0 && actualIncome === 0) {
                issues.push({
                    type: "warning",
                    field: "sustainability",
                    message: "Business has expenses but no income - sustainability risk",
                    severity: "medium"
                });
            }

            if (actualIncome > 0 && actualExpenses === 0) {
                issues.push({
                    type: "warning",
                    field: "data_completeness",
                    message: "Business has income but no expenses - verify data completeness",
                    severity: "medium"
                });
            }

            // 3. Transaction validation
            const invalidTransactions = transactions.filter(tx => 
                isNaN(tx.amount) || 
                Math.abs(tx.amount) > 1000000 ||
                tx.amount === 0
            );

            if (invalidTransactions.length > 0) {
                issues.push({
                    type: "warning",
                    field: "transaction_quality",
                    message: `Found ${invalidTransactions.length} invalid transactions`,
                    severity: "low",
                    details: invalidTransactions
                });
            }

            return {
                isValid: issues.filter(i => i.type === "error").length === 0,
                issues,
                correctedData,
                summary: {
                    totalIssues: issues.length,
                    errors: issues.filter(i => i.type === "error").length,
                    warnings: issues.filter(i => i.type === "warning").length
                }
            };

        } catch (error) {
            return {
                isValid: false,
                issues: [{
                    type: "error",
                    field: "validation_error",
                    message: `Validation failed: ${error.message}`,
                    severity: "critical"
                }],
                correctedData: processedData,
                summary: { totalIssues: 1, errors: 1, warnings: 0 }
            };
        }
    }

    /**
     * Comprehensive consistency checker for AI outputs
     */
    static checkConsistency(report) {
        const issues = [];
        const tolerance = 0.01;

        try {
            // 1. Totals consistency check
            const expectedCashflow = report.totalIncome - report.totalExpenses;
            if (Math.abs(expectedCashflow - report.netCashflow) > tolerance) {
                issues.push({
                    type: "error",
                    field: "netCashflow",
                    message: `Net cashflow mismatch. Expected ${expectedCashflow.toFixed(2)}, got ${report.netCashflow.toFixed(2)}`,
                    expected: expectedCashflow,
                    actual: report.netCashflow,
                    severity: "high"
                });
            }

            // 2. Profit margin consistency
            if (report.profitMargin !== undefined) {
                const expectedMargin = report.totalIncome > 0 
                    ? (expectedCashflow / report.totalIncome) * 100 
                    : 0;
                if (Math.abs(expectedMargin - report.profitMargin) > 0.5) {
                    issues.push({
                        type: "warning",
                        field: "profitMargin",
                        message: `Profit margin inconsistent. Expected ~${expectedMargin.toFixed(1)}%, got ${report.profitMargin.toFixed(1)}%`,
                        expected: expectedMargin,
                        actual: report.profitMargin,
                        severity: "medium"
                    });
                }
            }

            // 3. Narrative contradiction checks
            const financialHealth = report.financialHealth || "";
            const alerts = report.alerts || [];

            // Check for income contradictions
            if (report.totalIncome > 0) {
                const incomeContradictions = [
                    "no income", "zero income", "cannot be confirmed as no income",
                    "no revenue", "zero revenue", "missing income"
                ];
                
                const hasContradiction = incomeContradictions.some(phrase => 
                    financialHealth.toLowerCase().includes(phrase)
                );

                if (hasContradiction) {
                    issues.push({
                        type: "error",
                        field: "income_contradiction",
                        message: "Contradiction: income is recorded but narrative says otherwise",
                        expected: "Income should be acknowledged",
                        actual: "Narrative denies income",
                        severity: "high"
                    });
                }
            }

            // Check for expense contradictions
            if (report.totalExpenses > 0) {
                const expenseContradictions = [
                    "no expenses", "zero expenses", "absence of expenses",
                    "no costs", "zero costs", "missing expenses"
                ];
                
                const hasContradiction = expenseContradictions.some(phrase => 
                    financialHealth.toLowerCase().includes(phrase)
                );

                if (hasContradiction) {
                    issues.push({
                        type: "error",
                        field: "expense_contradiction",
                        message: "Contradiction: expenses are recorded but narrative says otherwise",
                        expected: "Expenses should be acknowledged",
                        actual: "Narrative denies expenses",
                        severity: "high"
                    });
                }
            }

            // 4. Alert validation
            alerts.forEach((alert, index) => {
                if (alert.message) {
                    // Check for "no expenses" alert when expenses exist
                    if (alert.message.includes("No expenses recorded") && report.totalExpenses > 0) {
                        issues.push({
                            type: "error",
                            field: `alert_${index}`,
                            message: "Alert contradiction: 'No expenses recorded' but expenses exist",
                            expected: "Alert should reflect actual expenses",
                            actual: "Alert denies expenses",
                            severity: "high"
                        });
                    }

                    // Check for "no income" alert when income exists
                    if (alert.message.includes("No income recorded") && report.totalIncome > 0) {
                        issues.push({
                            type: "error",
                            field: `alert_${index}`,
                            message: "Alert contradiction: 'No income recorded' but income exists",
                            expected: "Alert should reflect actual income",
                            actual: "Alert denies income",
                            severity: "high"
                        });
                    }
                }
            });

            return {
                isConsistent: issues.filter(i => i.type === "error").length === 0,
                issues,
                hasErrors: issues.filter(i => i.type === "error").length > 0,
                hasWarnings: issues.filter(i => i.type === "warning").length > 0,
                summary: {
                    totalIssues: issues.length,
                    errors: issues.filter(i => i.type === "error").length,
                    warnings: issues.filter(i => i.type === "warning").length
                }
            };

        } catch (error) {
            return {
                isConsistent: false,
                issues: [{
                    type: "error",
                    field: "consistency_check_error",
                    message: `Consistency check failed: ${error.message}`,
                    severity: "critical"
                }],
                hasErrors: true,
                hasWarnings: false,
                summary: { totalIssues: 1, errors: 1, warnings: 0 }
            };
        }
    }

    /**
     * Validate AI JSON responses
     */
    static validateAIResponse(response, context = "AI Response") {
        const issues = [];
        
        try {
            if (!response) {
                issues.push({
                    type: "error",
                    field: "response",
                    message: "AI returned null or undefined response",
                    severity: "high"
                });
                return { isValid: false, issues, correctedResponse: null };
            }

            if (typeof response === 'string') {
                // Try to parse JSON
                try {
                    const parsed = JSON.parse(response);
                    return { isValid: true, issues, correctedResponse: parsed };
                } catch (parseError) {
                    issues.push({
                        type: "error",
                        field: "json_parsing",
                        message: `Invalid JSON response: ${parseError.message}`,
                        severity: "high"
                    });
                    return { isValid: false, issues, correctedResponse: null };
                }
            }

            if (Array.isArray(response)) {
                // Validate array structure
                if (response.length === 0) {
                    issues.push({
                        type: "warning",
                        field: "empty_array",
                        message: "AI returned empty array",
                        severity: "medium"
                    });
                }
            }

            return { isValid: true, issues, correctedResponse: response };

        } catch (error) {
            return {
                isValid: false,
                issues: [{
                    type: "error",
                    field: "validation_error",
                    message: `Validation failed: ${error.message}`,
                    severity: "critical"
                }],
                correctedResponse: null
            };
        }
    }

    /**
     * Calculate intelligent confidence score based on data completeness
     */
    static calculateConfidence(data, aiResults) {
        let confidence = 100;
        const factors = [];

        try {
            const totalIncome = data.totals?.totalIncome || 0;
            const totalExpenses = data.totals?.totalExpenses || 0;
            const totalTransactions = data.transactions?.length || 0;

            // Factor 1: Data completeness (most important)
            if (totalIncome > 0 && totalExpenses > 0) {
                // Both income and expenses present - highest confidence
                confidence = 95;
                factors.push({ factor: "Complete financial data (income + expenses)", impact: 0 });
            } else if (totalIncome > 0 || totalExpenses > 0) {
                // Only one type present - medium confidence
                confidence = 75;
                factors.push({ factor: "Partial financial data (income or expenses only)", impact: -20 });
            } else {
                // No financial data - low confidence
                confidence = 50;
                factors.push({ factor: "No financial data recorded", impact: -45 });
            }

            // Factor 2: Transaction count
            if (totalTransactions === 0) {
                confidence -= 20;
                factors.push({ factor: "No transactions", impact: -20 });
            } else if (totalTransactions < 5) {
                confidence -= 5;
                factors.push({ factor: "Low transaction count", impact: -5 });
            } else if (totalTransactions > 50) {
                confidence += 5;
                factors.push({ factor: "High transaction count", impact: +5 });
            }

            // Factor 3: Data quality
            const invalidTransactions = (data.transactions || []).filter(tx => 
                isNaN(tx.amount) || tx.amount === 0
            ).length;
            
            if (invalidTransactions > 0) {
                const qualityPenalty = Math.min(invalidTransactions * 2, 15);
                confidence -= qualityPenalty;
                factors.push({ factor: `Invalid transactions (${invalidTransactions})`, impact: -qualityPenalty });
            }

            // Factor 4: AI availability
            if (!aiResults || !aiResults.insights) {
                confidence -= 15;
                factors.push({ factor: "AI processing failed", impact: -15 });
            }

            // Factor 5: Validation issues
            const validationIssues = data.validationIssues || [];
            const errorCount = validationIssues.filter(i => i.type === "error").length;
            if (errorCount > 0) {
                const validationPenalty = Math.min(errorCount * 3, 20);
                confidence -= validationPenalty;
                factors.push({ factor: `Validation errors (${errorCount})`, impact: -validationPenalty });
            }

            // Factor 6: Consistency issues
            const consistencyIssues = data.consistencyIssues || [];
            const consistencyErrorCount = consistencyIssues.filter(i => i.type === "error").length;
            if (consistencyErrorCount > 0) {
                const consistencyPenalty = Math.min(consistencyErrorCount * 2, 15);
                confidence -= consistencyPenalty;
                factors.push({ factor: `Consistency errors (${consistencyErrorCount})`, impact: -consistencyPenalty });
            }

            // Factor 7: OCR quality (if applicable)
            if (data.ocrConfidence !== undefined) {
                if (data.ocrConfidence < 40) {
                    confidence -= 20;
                    factors.push({ factor: "Poor OCR quality", impact: -20 });
                } else if (data.ocrConfidence < 60) {
                    confidence -= 10;
                    factors.push({ factor: "Low OCR quality", impact: -10 });
                }
            }

            // Cap confidence between 0 and 95
            confidence = Math.max(0, Math.min(95, confidence));

            return {
                score: Math.round(confidence),
                factors,
                explanation: this.generateConfidenceExplanation(confidence, factors),
                dataCompleteness: this.assessDataCompleteness(totalIncome, totalExpenses, totalTransactions)
            };

        } catch (error) {
            return {
                score: 0,
                factors: [{ factor: "Calculation error", impact: -100 }],
                explanation: `Confidence calculation failed: ${error.message}`,
                dataCompleteness: "unknown"
            };
        }
    }

    /**
     * Assess data completeness level
     */
    static assessDataCompleteness(income, expenses, transactionCount) {
        if (income > 0 && expenses > 0 && transactionCount > 0) {
            return "complete";
        } else if ((income > 0 || expenses > 0) && transactionCount > 0) {
            return "partial";
        } else if (transactionCount > 0) {
            return "minimal";
        } else {
            return "incomplete";
        }
    }

    /**
     * Generate human-readable confidence explanation
     */
    static generateConfidenceExplanation(score, factors) {
        if (score >= 90) {
            return "High confidence - data is complete and consistent";
        } else if (score >= 75) {
            return "Good confidence - minor issues detected";
        } else if (score >= 60) {
            return "Moderate confidence - some validation issues";
        } else if (score >= 40) {
            return "Low confidence - significant issues detected";
        } else {
            return "Very low confidence - major data or processing issues";
        }
    }

    /**
     * Log validation results in structured format
     */
    static logValidationResults(validation, context = "Validation") {
        console.log(`\n🔍 ${context} Results:`);
        
        if (validation.issues.length === 0) {
            console.log("✅ No issues found");
            return;
        }

        validation.issues.forEach(issue => {
            const icon = issue.type === "error" ? "❌" : "⚠️";
            const severity = issue.severity ? ` [${issue.severity}]` : "";
            console.log(`${icon} ${issue.type.toUpperCase()}${severity}: ${issue.message}`);
            
            if (issue.expected && issue.actual) {
                console.log(`   Expected: ${issue.expected}`);
                console.log(`   Actual: ${issue.actual}`);
            }
        });

        if (validation.summary) {
            console.log(`📊 Summary: ${validation.summary.totalIssues} issues (${validation.summary.errors} errors, ${validation.summary.warnings} warnings)`);
        }
    }
}

module.exports = Validator;
// Also expose validateFinancialSummary as a named property for destructuring imports
module.exports.validateFinancialSummary = validateFinancialSummary;
