/**
 * Cloud OCR Service - Alternative to local OCR processing
 * Provides guidance and integration points for cloud OCR services
 */

class CloudOCRService {
    constructor() {
        this.supportedServices = [
            'google-drive',
            'microsoft-azure',
            'amazon-textract',
            'online-ocr'
        ];
    }

    /**
     * Process PDF with cloud OCR guidance
     */
    async processPDF(pdfBuffer, filename) {
        console.log('🌐 Processing PDF with cloud OCR guidance...');
        
        // Try basic pdf-parse first
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(pdfBuffer);
        const extractedText = pdfData.text.trim();
        
        // Check if text is usable
        if (extractedText.length > 50 && !this.isTextGarbled(extractedText)) {
            console.log('✅ PDF has readable text, using pdf-parse result');
            return {
                text: extractedText,
                confidence: 85,
                pages: pdfData.numpages || 1,
                method: 'pdf-parse',
                needsCloudOCR: false
            };
        }
        
        // Text is garbled or empty, provide cloud OCR guidance
        console.log('⚠️ PDF requires cloud OCR processing');
        return {
            text: this.generateCloudOCRGuidance(extractedText, filename, pdfBuffer.length),
            confidence: 0,
            pages: pdfData.numpages || 1,
            method: 'cloud-ocr-guidance',
            needsCloudOCR: true,
            guidance: this.getCloudOCRInstructions()
        };
    }

    /**
     * Generate comprehensive cloud OCR guidance
     */
    generateCloudOCRGuidance(originalText, filename, fileSize) {
        return `This PDF requires advanced OCR processing that local tools cannot handle effectively.

**File Information:**
- Filename: ${filename}
- Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB
- Original text length: ${originalText.length} characters
- Status: Garbled or image-based content

**Recommended Cloud OCR Solutions:**

## 1. Google Drive OCR (Free & Best for Arabic) 🌟
**Steps:**
1. Upload PDF to Google Drive
2. Right-click → "Open with Google Docs"
3. Google will automatically OCR the text
4. Copy the clean text and save as new PDF
5. Re-upload to this system

**Advantages:**
- Free to use
- Excellent Arabic text recognition
- Handles complex layouts
- No API keys required

## 2. Microsoft Azure Computer Vision (Professional)
**Steps:**
1. Sign up at azure.microsoft.com
2. Create Computer Vision resource
3. Use the API endpoint
4. Supports 100+ languages including Arabic

**API Example:**
\`\`\`javascript
const response = await fetch('https://your-region.api.cognitive.microsoft.com/vision/v3.2/read/analyze', {
    method: 'POST',
    headers: {
        'Ocp-Apim-Subscription-Key': 'your-key',
        'Content-Type': 'application/octet-stream'
    },
    body: pdfBuffer
});
\`\`\`

## 3. Amazon Textract (Enterprise)
**Steps:**
1. AWS Textract service
2. Excellent for complex documents
3. Handles tables and forms well
4. Professional-grade processing

## 4. Online OCR Services
**Free Options:**
- SmallPDF.com OCR
- ILovePDF.com OCR
- OnlineOCR.net
- ILovePDF.com OCR

**Paid Options:**
- Adobe Acrobat Pro
- ABBYY FineReader
- Readiris

## 5. Manual Data Entry Interface
If OCR is not feasible, use the manual entry form:
1. Click "Manual Entry" button
2. Fill in invoice details
3. Submit for processing

**Why Cloud OCR?**
- Better Arabic text recognition
- Handles complex layouts
- Higher accuracy for scanned documents
- Professional-grade processing
- No local dependency issues

**Next Steps:**
1. Choose your preferred OCR method
2. Process the PDF to extract clean text
3. Re-upload the processed file to this system
4. The system will then provide full financial analysis

**Support:**
If you need help with any of these methods, please contact support or refer to the documentation.`;
    }

    /**
     * Get detailed cloud OCR instructions
     */
    getCloudOCRInstructions() {
        return {
            googleDrive: {
                name: 'Google Drive OCR',
                difficulty: 'Easy',
                cost: 'Free',
                steps: [
                    'Upload PDF to Google Drive',
                    'Right-click → "Open with Google Docs"',
                    'Wait for automatic OCR processing',
                    'Copy the clean text',
                    'Save as new PDF or text file',
                    'Re-upload to this system'
                ],
                advantages: [
                    'Free to use',
                    'Excellent Arabic support',
                    'No API keys required',
                    'Handles complex layouts'
                ]
            },
            microsoftAzure: {
                name: 'Microsoft Azure Computer Vision',
                difficulty: 'Medium',
                cost: 'Pay-per-use',
                steps: [
                    'Sign up at azure.microsoft.com',
                    'Create Computer Vision resource',
                    'Get API key and endpoint',
                    'Use the API to process PDF',
                    'Extract text from response'
                ],
                advantages: [
                    'Professional grade',
                    '100+ languages supported',
                    'High accuracy',
                    'Scalable'
                ]
            },
            amazonTextract: {
                name: 'Amazon Textract',
                difficulty: 'Medium',
                cost: 'Pay-per-use',
                steps: [
                    'Sign up for AWS',
                    'Enable Textract service',
                    'Upload PDF to S3',
                    'Call Textract API',
                    'Process the results'
                ],
                advantages: [
                    'Enterprise grade',
                    'Handles tables and forms',
                    'High accuracy',
                    'Scalable'
                ]
            },
            onlineOCR: {
                name: 'Online OCR Services',
                difficulty: 'Easy',
                cost: 'Free/Paid',
                steps: [
                    'Visit online OCR website',
                    'Upload your PDF',
                    'Select language (Arabic/English)',
                    'Download processed text',
                    'Re-upload to this system'
                ],
                advantages: [
                    'No installation required',
                    'Easy to use',
                    'Multiple options available',
                    'Good for occasional use'
                ]
            }
        };
    }

    /**
     * Check if text is garbled
     */
    isTextGarbled(text) {
        const garbledPatterns = [
            /000[0-9]{6,}/g, // Patterns like 000060009!04
            /[0-9]{3,}[!@#$%^&*()_+=\[\]{}|;':",./<>?~`][0-9]{3,}/g, // Mixed numbers and symbols
            /[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g // Non-printable chars
        ];
        
        let garbledScore = 0;
        garbledPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                garbledScore += matches.length;
            }
        });
        
        const garbledRatio = garbledScore / text.length;
        return garbledRatio > 0.05; // 5% threshold for garbled text
    }

    /**
     * Generate manual entry form data
     */
    generateManualEntryTemplate() {
        return {
            invoiceNumber: '',
            date: '',
            vendor: '',
            totalAmount: '',
            currency: '€',
            lineItems: [
                {
                    description: '',
                    quantity: 1,
                    unitPrice: '',
                    total: ''
                }
            ],
            taxes: {
                vat: 0,
                total: 0
            },
            notes: ''
        };
    }
}

module.exports = CloudOCRService;


