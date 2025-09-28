/**
 * Simple logger for the enhanced AI service
 */
export class Logger {
    private static instance: Logger;
    private logLevel: string;

    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private shouldLog(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    private formatMessage(level: string, component: string, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()} [${component}] ${message}${metaStr}`;
    }

    debug(component: string, message: string, meta?: any): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', component, message, meta));
        }
    }

    info(component: string, message: string, meta?: any): void {
        if (this.shouldLog('info')) {
            console.log(this.formatMessage('info', component, message, meta));
        }
    }

    warn(component: string, message: string, meta?: any): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', component, message, meta));
        }
    }

    error(component: string, message: string, meta?: any): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', component, message, meta));
        }
    }
}

export const logger = Logger.getInstance();


