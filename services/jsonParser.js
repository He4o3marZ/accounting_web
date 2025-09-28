/**
 * Robust JSON Parser for AI Responses
 * Handles malformed JSON, incomplete responses, and various AI output formats
 */

class JSONParser {
    constructor() {
        this.maxRetries = 3;
        this.commonPatterns = [
            /```json\s*([\s\S]*?)\s*```/g,
            /```\s*([\s\S]*?)\s*```/g,
            /\[[\s\S]*\]/g,
            /\{[\s\S]*\}/g
        ];
    }

    /**
     * Parse AI response with multiple fallback strategies
     */
    parseAIResponse(response, context = "AI Response") {
        if (!response) {
            throw new Error(`${context}: Empty or null response`);
        }

        // Strategy 1: Direct JSON parse
        try {
            const parsed = JSON.parse(response);
            return { success: true, data: parsed, method: "direct" };
        } catch (error) {
            console.log(`Direct JSON parse failed for ${context}: ${error.message}`);
        }

        // Strategy 2: Extract JSON from markdown code blocks
        try {
            const extracted = this.extractFromMarkdown(response);
            if (extracted) {
                const parsed = JSON.parse(extracted);
                return { success: true, data: parsed, method: "markdown_extraction" };
            }
        } catch (error) {
            console.log(`Markdown extraction failed for ${context}: ${error.message}`);
        }

        // Strategy 3: Fix common JSON issues
        try {
            const fixed = this.fixCommonIssues(response);
            if (fixed) {
                const parsed = JSON.parse(fixed);
                return { success: true, data: parsed, method: "json_fix" };
            }
        } catch (error) {
            console.log(`JSON fix failed for ${context}: ${error.message}`);
        }

        // Strategy 4: Extract and reconstruct JSON
        try {
            const reconstructed = this.reconstructJSON(response);
            if (reconstructed) {
                const parsed = JSON.parse(reconstructed);
                return { success: true, data: parsed, method: "reconstruction" };
            }
        } catch (error) {
            console.log(`JSON reconstruction failed for ${context}: ${error.message}`);
        }

        // Strategy 5: Return safe fallback
        return this.createSafeFallback(response, context);
    }

    /**
     * Extract JSON from markdown code blocks
     */
    extractFromMarkdown(text) {
        for (const pattern of this.commonPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const cleaned = match.replace(/```json|```/g, '').trim();
                    if (this.isValidJSON(cleaned)) {
                        return cleaned;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Fix common JSON issues
     */
    fixCommonIssues(jsonString) {
        let fixed = jsonString.trim();

        // Remove leading/trailing text
        const jsonStart = Math.max(
            fixed.indexOf('['),
            fixed.indexOf('{')
        );
        if (jsonStart > 0) {
            fixed = fixed.substring(jsonStart);
        }

        // Fix unterminated strings
        fixed = this.fixUnterminatedStrings(fixed);

        // Fix incomplete arrays/objects
        fixed = this.fixIncompleteStructures(fixed);

        // Fix trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

        // Fix missing quotes around keys
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        return this.isValidJSON(fixed) ? fixed : null;
    }

    /**
     * Fix unterminated strings in JSON
     */
    fixUnterminatedStrings(jsonString) {
        let fixed = jsonString;
        let inString = false;
        let escapeNext = false;
        let i = 0;

        while (i < fixed.length) {
            const char = fixed[i];
            
            if (escapeNext) {
                escapeNext = false;
            } else if (char === '\\') {
                escapeNext = true;
            } else if (char === '"' && !escapeNext) {
                inString = !inString;
            } else if (char === '\n' && inString) {
                // Replace newline with space in string
                fixed = fixed.substring(0, i) + ' ' + fixed.substring(i + 1);
            }
            i++;
        }

        // If we're still in a string at the end, close it
        if (inString) {
            fixed += '"';
        }

        return fixed;
    }

    /**
     * Fix incomplete JSON structures
     */
    fixIncompleteStructures(jsonString) {
        let fixed = jsonString;
        
        // Count brackets and braces
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;

        // Add missing closing brackets
        const missingBrackets = openBrackets - closeBrackets;
        if (missingBrackets > 0) {
            fixed += ']'.repeat(missingBrackets);
        }

        // Add missing closing braces
        const missingBraces = openBraces - closeBraces;
        if (missingBraces > 0) {
            fixed += '}'.repeat(missingBraces);
        }

        return fixed;
    }

    /**
     * Reconstruct JSON from partial data
     */
    reconstructJSON(text) {
        // Try to extract key-value pairs
        const pairs = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes(':') && trimmed.includes('"')) {
                pairs.push(trimmed);
            }
        }

        if (pairs.length === 0) {
            return null;
        }

        // Try to reconstruct as object
        try {
            const objString = '{' + pairs.join(',') + '}';
            if (this.isValidJSON(objString)) {
                return objString;
            }
        } catch (error) {
            // Try as array
            try {
                const arrString = '[' + pairs.join(',') + ']';
                if (this.isValidJSON(arrString)) {
                    return arrString;
                }
            } catch (error) {
                return null;
            }
        }

        return null;
    }

    /**
     * Check if string is valid JSON
     */
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create safe fallback when all parsing fails
     */
    createSafeFallback(response, context) {
        console.error(`All JSON parsing strategies failed for ${context}`);
        console.log('Raw response:', response.substring(0, 200) + '...');
        
        // Return empty structure based on context
        if (context.includes('categorize') || context.includes('transaction')) {
            return {
                success: false,
                data: [],
                method: "fallback_empty_array",
                error: "Failed to parse transaction categorization"
            };
        }
        
        if (context.includes('insight') || context.includes('analysis')) {
            return {
                success: false,
                data: {
                    insights: { financialHealth: "Analysis unavailable due to parsing error" },
                    alerts: []
                },
                method: "fallback_default_insights",
                error: "Failed to parse AI insights"
            };
        }

        return {
            success: false,
            data: null,
            method: "fallback_null",
            error: "All parsing strategies failed"
        };
    }

    /**
     * Parse with retry logic
     */
    async parseWithRetry(response, context = "AI Response", maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = this.parseAIResponse(response, context);
                if (result.success) {
                    return result;
                }
                lastError = new Error(result.error || "Parsing failed");
            } catch (error) {
                lastError = error;
            }
            
            if (attempt < maxRetries) {
                console.log(`Retry ${attempt}/${maxRetries} for ${context}`);
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
        
        throw lastError;
    }
}

module.exports = JSONParser;














