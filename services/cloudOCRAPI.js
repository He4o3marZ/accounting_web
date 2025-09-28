/**
 * Cloud OCR API Service - Professional OCR without local dependencies
 * Integrates with multiple cloud OCR services for automatic PDF processing
 */

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

class CloudOCRAPIService {
    constructor() {
        this.services = {
            // Free tier available
            ocrSpace: {
                name: 'OCR.space',
                url: 'https://api.ocr.space/parse/image',
                free: true,
                dailyLimit: 500,
                languages: ['eng', 'ara', 'eng+ara']
            },
            // Microsoft Azure (requires API key)
            azure: {
                name: 'Microsoft Azure Computer Vision',
                url: 'https://your-region.api.cognitive.microsoft.com/vision/v3.2/read/analyze',
                free: false,
                dailyLimit: 5000,
                languages: ['en', 'ar', 'en,ar']
            },
            // Google Cloud Vision (requires API key)
            google: {
                name: 'Google Cloud Vision',
                url: 'https://vision.googleapis.com/v1/images:annotate',
                free: false,
                dailyLimit: 1000,
                languages: ['en', 'ar']
            }
        };
        
        this.currentService = 'ocrSpace'; // Default to free service
    }

    /**
     * Process PDF with cloud OCR API
     */
    async processPDF(pdfBuffer, filename, options = {}) {
        console.log('🌐 Processing PDF with cloud OCR API...');
        
        try {
            // Try OCR.space first (free tier)
            const result = await this.processWithOCRSpace(pdfBuffer, filename, options);
            
            if (result.success) {
                console.log('✅ OCR.space processing successful');
                return {
                    text: result.text,
                    confidence: result.confidence,
                    pages: result.pages || 1,
                    method: 'ocr-space-api',
                    needsCloudOCR: false,
                    service: 'OCR.space'
                };
            }
            
            // Fallback to other services if configured
            if (process.env.AZURE_VISION_KEY) {
                return await this.processWithAzure(pdfBuffer, filename, options);
            }
            
            if (process.env.GOOGLE_VISION_KEY) {
                return await this.processWithGoogle(pdfBuffer, filename, options);
            }
            
            // If all APIs fail, return guidance
            return this.generateAPIGuidance(pdfBuffer, filename);
            
        } catch (error) {
            console.error('Cloud OCR API error:', error);
            return this.generateAPIGuidance(pdfBuffer, filename);
        }
    }

    /**
     * Compress PDF using pdf-lib
     */
    async compressPDF(buffer) {
        try {
            const { PDFDocument } = require('pdf-lib');
            
            // Load the PDF
            const pdfDoc = await PDFDocument.load(buffer);
            
            // Get all pages
            const pages = pdfDoc.getPages();
            
            // If PDF has many pages, try to reduce by taking only first page
            if (pages.length > 1) {
                console.log(`📄 PDF has ${pages.length} pages, reducing to first page for compression`);
                
                // Create new PDF with only first page
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [0]);
                newPdf.addPage(copiedPage);
                
                // Try multiple compression levels
                let compressedBytes = await newPdf.save({
                    useObjectStreams: false,
                    addDefaultPage: false,
                    objectsPerTick: 50
                });
                
                let compressedBuffer = Buffer.from(compressedBytes);
                let originalSize = buffer.length / (1024 * 1024);
                let compressedSize = compressedBuffer.length / (1024 * 1024);
                
                console.log(`📊 Compression attempt 1: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`);
                
                // If still too large, try more aggressive compression
                if (compressedSize > 0.8) {
                    console.log('🔄 Trying more aggressive compression...');
                    compressedBytes = await newPdf.save({
                        useObjectStreams: false,
                        addDefaultPage: false,
                        objectsPerTick: 10
                    });
                    compressedBuffer = Buffer.from(compressedBytes);
                    compressedSize = compressedBuffer.length / (1024 * 1024);
                    console.log(`📊 Compression attempt 2: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`);
                }
                
                return compressedBuffer;
            } else {
                // For PDFs with few pages, try to optimize
                const optimizedBytes = await pdfDoc.save({
                    useObjectStreams: true,
                    addDefaultPage: false
                });
                
                const compressedBuffer = Buffer.from(optimizedBytes);
                const originalSize = buffer.length / (1024 * 1024);
                const compressedSize = compressedBuffer.length / (1024 * 1024);
                
                console.log(`📊 Optimization: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`);
                
                return compressedBuffer;
            }
        } catch (error) {
            console.error('PDF compression failed:', error);
            return null;
        }
    }

    /**
     * Process with OCR.space (free tier)
     */
    async processWithOCRSpace(pdfBuffer, filename, options = {}) {
        try {
            // Ensure pdfBuffer is a Buffer
            let buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
            
            // Check file size (OCR.space free tier limit is 1MB)
            let fileSizeMB = buffer.length / (1024 * 1024);
            console.log(`📊 Original file size: ${fileSizeMB.toFixed(2)}MB`);
            
            // If file is too large, try to compress it (with retries)
            if (fileSizeMB > 1) {
                console.log('🔄 File exceeds 1MB limit, attempting compression...');
                const compressedBuffer = await this.compressPDF(buffer);
                let effective = compressedBuffer || buffer;
                // Additional retries
                for (let i = 0; i < 3 && (effective.length / 1024 / 1024) > 1; i++) {
                    const next = await this.compressPDF(effective);
                    if (next && next.length < effective.length) effective = next; else break;
                }
                const compressedSizeMB = effective.length / (1024 * 1024);
                console.log(`📊 Compressed file size: ${compressedSizeMB.toFixed(2)}MB`);
                if (compressedSizeMB <= 1) {
                    console.log('✅ Compression successful, using compressed file');
                    buffer = effective;
                    fileSizeMB = compressedSizeMB;
                } else {
                    console.warn('⛔ File exceeds OCR.space free tier. Please upgrade or switch to Azure/Google.');
                    return {
                        success: false,
                        error: 'FILE_TOO_LARGE',
                        message: 'File exceeds OCR.space free tier. Please upgrade or switch to Azure/Google.',
                        text: '',
                        confidence: 0,
                        pages: 0,
                        method: 'ocr-space',
                        service: 'OCR.space',
                        needsCloudOCR: false
                    };
                }
            }
            
            // Create form data manually
            const boundary = '----formdata-' + Math.random().toString(36);
            let body = '';
            
            // Add file
            body += `--${boundary}\r\n`;
            body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
            body += `Content-Type: application/pdf\r\n\r\n`;
            body += buffer.toString('binary');
            body += `\r\n--${boundary}\r\n`;
            
            // Build language candidates and API key
            const apiKey = process.env.OCR_SPACE_KEY || process.env.OCRSPACE_API_KEY || '';
            if (!apiKey) {
                console.warn('⚠️ OCR_SPACE_KEY not set in environment. Cloud OCR will be skipped.');
                return { success: false, error: 'MISSING_API_KEY', message: 'OCR_SPACE_KEY missing', needsCloudOCR: true };
            }
            const languageCandidates = options.language ? [options.language] : ['ara+eng', 'ara', 'eng'];

            for (const language of languageCandidates) {
                console.log(`📡 Sending request to OCR.space with language='${language}'...`);
                let formBody = '';
                formBody += `--${boundary}\r\n`;
                formBody += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
                formBody += `Content-Type: application/pdf\r\n\r\n`;
                formBody += buffer.toString('binary');
                formBody += `\r\n--${boundary}\r\n`;
                const ocrOptions = {
                    apikey: apiKey,
                    language,
                    isOverlayRequired: false,
                    filetype: 'pdf',
                    detectOrientation: true,
                    isTable: true,
                    OCREngine: 2
                };
                Object.keys(ocrOptions).forEach(key => {
                    formBody += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
                    formBody += ocrOptions[key];
                    formBody += `\r\n--${boundary}\r\n`;
                });
                formBody += '--';

                try {
                    const response = await axios.post(this.services.ocrSpace.url, formBody, {
                        headers: {
                            'Content-Type': `multipart/form-data; boundary=${boundary}`,
                            'apikey': apiKey
                        },
                        timeout: 60000
                    });
                    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
                        const parsedResults = response.data.ParsedResults;
                        const combinedText = parsedResults.map(result => result.ParsedText).join('\n\n--- PAGE BREAK ---\n\n');
                        const confidences = [];
                        parsedResults.forEach(result => {
                            try {
                                const words = (result.TextOverlay && result.TextOverlay.Lines && result.TextOverlay.Lines[0] && result.TextOverlay.Lines[0].Words) || [];
                                if (words[0] && typeof words[0].Confidence === 'number') confidences.push(words[0].Confidence);
                            } catch(_) {}
                        });
                        const avgConf = confidences.length ? Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length) : 70;
                        return { success: true, text: combinedText, confidence: avgConf, pages: parsedResults.length, rawResponse: response.data };
                    }
                    if (response.data && response.data.IsErroredOnProcessing) {
                        console.warn(`⚠️ OCR.space error for language='${language}':`, response.data.ErrorMessage || response.data.ErrorDetails);
                        continue;
                    }
                    console.log('❌ OCR.space returned no results');
                    continue;
                } catch (e) {
                    console.warn(`⚠️ OCR.space request failed for language='${language}':`, e.response?.data || e.message);
                    continue;
                }
            }

            return { success: false, error: 'NO_TEXT_EXTRACTED', message: 'OCR.space returned no text for tried languages', needsCloudOCR: true };
            
        } catch (error) {
            console.error('OCR.space API error:', error.response?.data || error.message);
            return { success: false, error: 'API_ERROR', message: error.message, needsCloudOCR: true };
        }
    }

    /**
     * Process with Microsoft Azure Computer Vision
     */
    async processWithAzure(pdfBuffer, filename, options = {}) {
        try {
            console.log('📡 Sending request to Azure Computer Vision...');
            
            // Step 1: Submit for analysis
            const submitResponse = await axios.post(
                this.services.azure.url,
                pdfBuffer,
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );
            
            const operationLocation = submitResponse.headers['operation-location'];
            if (!operationLocation) {
                throw new Error('No operation location returned');
            }
            
            // Step 2: Poll for results
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                
                const resultResponse = await axios.get(operationLocation, {
                    headers: {
                        'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY
                    }
                });
                
                if (resultResponse.data.status === 'succeeded') {
                    const readResults = resultResponse.data.analyzeResult.readResults;
                    const combinedText = readResults.map(page => 
                        page.lines.map(line => line.text).join('\n')
                    ).join('\n\n--- PAGE BREAK ---\n\n');
                    
                    return {
                        success: true,
                        text: combinedText,
                        confidence: 95, // Azure typically has high confidence
                        pages: readResults.length,
                        service: 'Azure Computer Vision'
                    };
                }
                
                attempts++;
            }
            
            throw new Error('Azure OCR timeout');
            
        } catch (error) {
            console.error('Azure API error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process with Google Cloud Vision
     */
    async processWithGoogle(pdfBuffer, filename, options = {}) {
        try {
            console.log('📡 Sending request to Google Cloud Vision...');
            
            const requestBody = {
                requests: [{
                    image: {
                        content: pdfBuffer.toString('base64')
                    },
                    features: [{
                        type: 'TEXT_DETECTION',
                        maxResults: 1
                    }],
                    imageContext: {
                        languageHints: options.language ? [options.language] : ['en', 'ar']
                    }
                }]
            };
            
            const response = await axios.post(
                `${this.services.google.url}?key=${process.env.GOOGLE_VISION_KEY}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.responses && response.data.responses[0].fullTextAnnotation) {
                const text = response.data.responses[0].fullTextAnnotation.text;
                const confidence = response.data.responses[0].fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0]?.confidence || 95;
                
                return {
                    success: true,
                    text: text,
                    confidence: Math.round(confidence * 100),
                    pages: 1,
                    service: 'Google Cloud Vision'
                };
            } else {
                return { success: false, error: 'No text detected' };
            }
            
        } catch (error) {
            console.error('Google API error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate API setup guidance
     */
    generateAPIGuidance(pdfBuffer, filename) {
        return {
            text: `This PDF requires cloud OCR processing. The system is configured to use cloud APIs automatically.

**Current Status:**
- File: ${filename}
- Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB
- OCR Service: ${this.services[this.currentService].name}
- Status: API key not configured

**To enable automatic OCR processing:**

## Option 1: OCR.space (Free - Recommended)
1. Get free API key from https://ocr.space/ocrapi/freekey
2. Set environment variable: OCR_SPACE_KEY=your_key_here
3. Restart the application

## Option 2: Microsoft Azure (Professional)
1. Create Azure Computer Vision resource
2. Get API key and region
3. Set environment variables:
   - AZURE_VISION_KEY=your_key_here
   - AZURE_VISION_REGION=your_region
4. Restart the application

## Option 3: Google Cloud Vision (Professional)
1. Enable Vision API in Google Cloud Console
2. Create API key
3. Set environment variable: GOOGLE_VISION_KEY=your_key_here
4. Restart the application

**After configuration, the system will automatically process PDFs without manual intervention.**

**Temporary Solution:**
For immediate processing, you can use the manual entry form or upload a text version of the PDF.`,
            confidence: 0,
            pages: 1,
            method: 'api-guidance',
            needsCloudOCR: true,
            guidance: this.getAPISetupInstructions()
        };
    }

    /**
     * Get detailed API setup instructions
     */
    getAPISetupInstructions() {
        return {
            ocrSpace: {
                name: 'OCR.space (Free)',
                steps: [
                    'Visit https://ocr.space/ocrapi/freekey',
                    'Register for free account',
                    'Get your API key',
                    'Set environment variable: OCR_SPACE_KEY=your_key',
                    'Restart the application'
                ],
                advantages: [
                    'Free tier: 500 requests/day',
                    'No credit card required',
                    'Supports Arabic and English',
                    'Easy setup'
                ],
                cost: 'Free'
            },
            azure: {
                name: 'Microsoft Azure Computer Vision',
                steps: [
                    'Create Azure account',
                    'Create Computer Vision resource',
                    'Get API key and endpoint',
                    'Set environment variables',
                    'Restart the application'
                ],
                advantages: [
                    'Professional grade',
                    'High accuracy',
                    'Supports 100+ languages',
                    'Scalable'
                ],
                cost: 'Pay-per-use'
            },
            google: {
                name: 'Google Cloud Vision',
                steps: [
                    'Create Google Cloud account',
                    'Enable Vision API',
                    'Create API key',
                    'Set environment variable',
                    'Restart the application'
                ],
                advantages: [
                    'Google quality',
                    'Excellent text detection',
                    'Multi-language support',
                    'Reliable'
                ],
                cost: 'Pay-per-use'
            }
        };
    }

    /**
     * Test API connectivity
     */
    async testAPIConnectivity() {
        const results = {};
        
        // Test OCR.space
        try {
            const testResult = await this.processWithOCRSpace(
                Buffer.from('test'), 
                'test.pdf'
            );
            results.ocrSpace = {
                available: true,
                error: testResult.error || null
            };
        } catch (error) {
            results.ocrSpace = {
                available: false,
                error: error.message
            };
        }
        
        return results;
    }
}

module.exports = CloudOCRAPIService;
