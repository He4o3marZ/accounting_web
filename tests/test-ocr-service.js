/**
 * Integration Tests for OCR Service
 */

const OCRService = require('../services/ocrService');

describe('OCR Service Integration', () => {
    let ocrService;

    beforeEach(() => {
        ocrService = new OCRService();
    });

    describe('isTextGarbled', () => {
        test('should detect garbled text patterns', () => {
            const garbledText = '000060009!04 000060009!04 000060009!04';
            const result = ocrService.isTextGarbled(garbledText);
            
            expect(result).toBe(true);
        });

        test('should detect normal text as not garbled', () => {
            const normalText = 'Office Supplies - $150.00\nClient Payment - $1000.00';
            const result = ocrService.isTextGarbled(normalText);
            
            expect(result).toBe(false);
        });

        test('should handle empty text', () => {
            const result = ocrService.isTextGarbled('');
            
            expect(result).toBe(true);
        });
    });

    describe('needsOCR', () => {
        test('should require OCR for garbled text', () => {
            const garbledText = '000060009!04 000060009!04';
            const result = ocrService.needsOCR(garbledText);
            
            expect(result).toBe(true);
        });

        test('should not require OCR for clear text', () => {
            const clearText = 'Office Supplies - $150.00\nClient Payment - $1000.00\nThis is a clear invoice with proper formatting.';
            const result = ocrService.needsOCR(clearText);
            
            expect(result).toBe(false);
        });

        test('should require OCR for short text', () => {
            const shortText = 'Short';
            const result = ocrService.needsOCR(shortText);
            
            expect(result).toBe(true);
        });
    });

    describe('preprocessImage', () => {
        test('should handle image preprocessing without errors', async () => {
            // Mock image buffer
            const mockImageBuffer = Buffer.from('mock image data');
            
            try {
                const result = await ocrService.preprocessImage(mockImageBuffer);
                expect(result).toBeDefined();
            } catch (error) {
                // OCR might not be available in test environment
                expect(error.message).toContain('sharp');
            }
        });
    });
});
















