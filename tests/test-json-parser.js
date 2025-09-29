/**
 * Unit Tests for JSON Parser Module
 */

const JSONParser = require('../services/jsonParser');

describe('JSON Parser Module', () => {
    let parser;

    beforeEach(() => {
        parser = new JSONParser();
    });

    describe('parseAIResponse', () => {
        test('should parse valid JSON directly', () => {
            const response = '[{"id": 1, "name": "test"}]';
            const result = parser.parseAIResponse(response, 'test');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual([{ id: 1, name: "test" }]);
            expect(result.method).toBe('direct');
        });

        test('should extract JSON from markdown code blocks', () => {
            const response = 'Here is the data:\n```json\n[{"id": 1, "name": "test"}]\n```\nEnd of response';
            const result = parser.parseAIResponse(response, 'test');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual([{ id: 1, name: "test" }]);
            expect(result.method).toBe('markdown_extraction');
        });

        test('should fix unterminated strings', () => {
            const response = '[{"description": "Office Supplies", "amount": -150, "vendor": "Office Supply Store"}]';
            const result = parser.parseAIResponse(response, 'test');
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        test('should fix incomplete JSON arrays', () => {
            const response = '[{"id": 1, "name": "test"';
            const result = parser.parseAIResponse(response, 'test');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual([{ id: 1, name: "test" }]);
        });

        test('should handle empty response', () => {
            const response = '';
            const result = parser.parseAIResponse(response, 'test');
            
            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
        });

        test('should create fallback for categorization context', () => {
            const response = 'Invalid response';
            const result = parser.parseAIResponse(response, 'categorization');
            
            expect(result.success).toBe(false);
            expect(result.data).toEqual([]);
            expect(result.method).toBe('fallback_empty_array');
        });

        test('should create fallback for insights context', () => {
            const response = 'Invalid response';
            const result = parser.parseAIResponse(response, 'insights');
            
            expect(result.success).toBe(false);
            expect(result.data.insights).toBeDefined();
            expect(result.data.alerts).toBeDefined();
            expect(result.method).toBe('fallback_default_insights');
        });
    });

    describe('extractFromMarkdown', () => {
        test('should extract JSON from code blocks', () => {
            const text = '```json\n[{"id": 1}]\n```';
            const result = parser.extractFromMarkdown(text);
            
            expect(result).toBe('[{"id": 1}]');
        });

        test('should handle multiple code blocks', () => {
            const text = '```\n[{"id": 1}]\n```\n```json\n[{"id": 2}]\n```';
            const result = parser.extractFromMarkdown(text);
            
            expect(result).toBe('[{"id": 1}]');
        });

        test('should return null for no valid JSON', () => {
            const text = 'No JSON here';
            const result = parser.extractFromMarkdown(text);
            
            expect(result).toBeNull();
        });
    });

    describe('fixCommonIssues', () => {
        test('should fix trailing commas', () => {
            const json = '[{"id": 1,},]';
            const result = parser.fixCommonIssues(json);
            
            expect(result).toBe('[{"id": 1}]');
        });

        test('should fix missing quotes around keys', () => {
            const json = '{id: 1, name: "test"}';
            const result = parser.fixCommonIssues(json);
            
            expect(result).toBe('{"id": 1, "name": "test"}');
        });

        test('should remove leading text', () => {
            const json = 'Some text before [{"id": 1}]';
            const result = parser.fixCommonIssues(json);
            
            expect(result).toBe('[{"id": 1}]');
        });
    });

    describe('isValidJSON', () => {
        test('should validate correct JSON', () => {
            expect(parser.isValidJSON('{"id": 1}')).toBe(true);
            expect(parser.isValidJSON('[1, 2, 3]')).toBe(true);
        });

        test('should reject invalid JSON', () => {
            expect(parser.isValidJSON('{id: 1}')).toBe(false);
            expect(parser.isValidJSON('[1, 2,')).toBe(false);
        });
    });
});
















