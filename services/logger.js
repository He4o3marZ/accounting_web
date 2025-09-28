/**
 * Enhanced Logging Service
 * Provides structured logging with different levels and contexts
 */

class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.levels.INFO;
    }

    setLevel(level) {
        this.currentLevel = this.levels[level] || this.levels.INFO;
    }

    formatMessage(level, context, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context,
            message,
            ...(data && { data })
        };

        return JSON.stringify(logEntry, null, 2);
    }

    error(context, message, data = null) {
        if (this.currentLevel >= this.levels.ERROR) {
            console.error(this.formatMessage('ERROR', context, message, data));
        }
    }

    warn(context, message, data = null) {
        if (this.currentLevel >= this.levels.WARN) {
            console.warn(this.formatMessage('WARN', context, message, data));
        }
    }

    info(context, message, data = null) {
        if (this.currentLevel >= this.levels.INFO) {
            console.log(this.formatMessage('INFO', context, message, data));
        }
    }

    debug(context, message, data = null) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.log(this.formatMessage('DEBUG', context, message, data));
        }
    }

    // Specialized logging methods for different contexts
    aiError(operation, error, input = null) {
        this.error('AI_SERVICE', `AI operation failed: ${operation}`, {
            error: error.message,
            stack: error.stack,
            input: input ? JSON.stringify(input).substring(0, 200) : null
        });
    }

    validationError(validator, issues, data = null) {
        this.error('VALIDATION', `Validation failed in ${validator}`, {
            issues: issues.map(i => ({
                type: i.type,
                field: i.field,
                message: i.message,
                severity: i.severity
            })),
            dataSummary: data ? this.summarizeData(data) : null
        });
    }

    processingStart(operation, context) {
        this.info('PROCESSING', `Starting ${operation}`, { context });
    }

    processingEnd(operation, duration, result = null) {
        this.info('PROCESSING', `Completed ${operation} in ${duration}ms`, {
            success: result !== null,
            resultSummary: result ? this.summarizeResult(result) : null
        });
    }

    summarizeData(data) {
        if (!data) return null;
        
        return {
            type: typeof data,
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : Object.keys(data).length,
            keys: typeof data === 'object' ? Object.keys(data).slice(0, 5) : null
        };
    }

    summarizeResult(result) {
        if (!result) return null;
        
        return {
            hasInsights: !!result.insights,
            hasAlerts: !!result.alerts,
            alertCount: result.alerts ? result.alerts.length : 0,
            confidence: result.insights?.confidence || 'unknown'
        };
    }
}

module.exports = new Logger();














