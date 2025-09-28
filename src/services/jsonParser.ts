import { logger } from './logger';

interface ParseResult {
    success: boolean;
    data?: any;
    error?: string;
    method?: string;
}

/**
 * Enhanced JSON parser with retry mechanisms
 */
export class JSONParser {
    private maxRetries: number;

    constructor() {
        this.maxRetries = 3;
    }

    /**
     * Parse JSON with retry and error correction
     */
    async parseWithRetry(jsonString: string, context: string = 'JSON parsing'): Promise<ParseResult> {
        logger.debug('JSON_PARSER', `Starting JSON parsing for ${context}`);

        // Try direct parsing first
        try {
            const result = JSON.parse(jsonString);
            logger.debug('JSON_PARSER', `Direct parsing successful for ${context}`);
            return { success: true, data: result, method: 'direct' };
        } catch (error) {
            logger.debug('JSON_PARSER', `Direct parsing failed for ${context}, trying corrections`);
        }

        // Try various correction methods
        const correctionMethods = [
            this.fixCommonJsonIssues,
            this.extractJsonFromMarkdown,
            this.fixTrailingCommas,
            this.fixUnescapedQuotes,
            this.extractJsonFromText
        ];

        for (let i = 0; i < correctionMethods.length; i++) {
            try {
                const corrected = correctionMethods[i](jsonString);
                const result = JSON.parse(corrected);
                logger.debug('JSON_PARSER', `Parsing successful with method ${i + 1} for ${context}`);
                return { success: true, data: result, method: `correction_${i + 1}` };
            } catch (error) {
                logger.debug('JSON_PARSER', `Correction method ${i + 1} failed for ${context}`);
            }
        }

        logger.error('JSON_PARSER', `All parsing methods failed for ${context}`, {
            originalLength: jsonString.length,
            preview: jsonString.substring(0, 100)
        });

        return {
            success: false,
            error: 'All parsing methods failed',
            method: 'all_failed'
        };
    }

    /**
     * Fix common JSON issues
     */
    private fixCommonJsonIssues(jsonString: string): string {
        let fixed = jsonString.trim();

        // Remove BOM if present
        if (fixed.charCodeAt(0) === 0xFEFF) {
            fixed = fixed.slice(1);
        }

        // Fix single quotes to double quotes
        fixed = fixed.replace(/'/g, '"');

        // Fix unquoted keys
        fixed = fixed.replace(/(\w+):/g, '"$1":');

        // Fix trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

        return fixed;
    }

    /**
     * Extract JSON from markdown code blocks
     */
    private extractJsonFromMarkdown(jsonString: string): string {
        const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }
        return jsonString;
    }

    /**
     * Fix trailing commas
     */
    private fixTrailingCommas(jsonString: string): string {
        return jsonString.replace(/,(\s*[}\]])/g, '$1');
    }

    /**
     * Fix unescaped quotes
     */
    private fixUnescapedQuotes(jsonString: string): string {
        // This is a simplified approach - in production, you'd want more sophisticated quote handling
        return jsonString.replace(/([^\\])"/g, '$1\\"');
    }

    /**
     * Extract JSON from surrounding text
     */
    private extractJsonFromText(jsonString: string): string {
        // Look for JSON-like structures in the text
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        return jsonString;
    }

    /**
     * Validate JSON structure
     */
    validateJsonStructure(data: any, expectedStructure: any): boolean {
        if (typeof data !== typeof expectedStructure) {
            return false;
        }

        if (typeof data === 'object' && data !== null) {
            for (const key in expectedStructure) {
                if (!(key in data)) {
                    return false;
                }
                if (typeof expectedStructure[key] === 'object' && expectedStructure[key] !== null) {
                    if (!this.validateJsonStructure(data[key], expectedStructure[key])) {
                        return false;
                    }
                }
            }
        }

        return true;
    }
}

export const jsonParser = new JSONParser();
