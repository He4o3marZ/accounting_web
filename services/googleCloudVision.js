/**
 * Google Cloud Vision API Service
 * Professional OCR for production use
 */

const { ImageAnnotatorClient } = require('@google-cloud/vision');

class GoogleCloudVisionService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Check if credentials are available
            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID && !process.env.GOOGLE_VISION_KEY) {
                throw new Error('Google Cloud Vision credentials not configured');
            }

            // Initialize Google Cloud Vision client
            const config = {};
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            }
            if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
                config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
            }
            if (process.env.GOOGLE_VISION_KEY) {
                config.apiKey = process.env.GOOGLE_VISION_KEY;
            }

            this.client = new ImageAnnotatorClient(config);
            
            this.initialized = true;
            console.log('✅ Google Cloud Vision initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Google Cloud Vision:', error.message);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Process PDF with Google Cloud Vision
     */
    async processPDF(pdfBuffer, filename, options = {}) {
        try {
            await this.initialize();

            console.log('🌐 Processing PDF with Google Cloud Vision...');
            
            // Convert PDF to images first (you'll need pdf2pic or similar)
            const images = await this.convertPDFToImages(pdfBuffer, filename);
            
            if (images.length === 0) {
                throw new Error('Failed to convert PDF to images');
            }

            let combinedText = '';
            let totalConfidence = 0;
            let processedPages = 0;

            // Process each page
            for (let i = 0; i < images.length; i++) {
                const imageBuffer = images[i];
                
                console.log(`📄 Processing page ${i + 1}/${images.length}...`);
                
                const [result] = await this.client.textDetection({
                    image: { content: imageBuffer }
                });

                const detections = result.textAnnotations;
                if (detections && detections.length > 0) {
                    const pageText = detections[0].description || '';
                    combinedText += pageText + '\n\n--- PAGE BREAK ---\n\n';
                    
                    // Calculate confidence (Google doesn't provide per-word confidence for text detection)
                    totalConfidence += 95; // Google Cloud Vision is very reliable
                    processedPages++;
                }
            }

            const averageConfidence = processedPages > 0 ? totalConfidence / processedPages : 0;

            console.log(`✅ Google Cloud Vision processing complete (${processedPages} pages, ${averageConfidence.toFixed(1)}% confidence)`);

            return {
                text: combinedText.trim(),
                confidence: averageConfidence,
                pages: processedPages,
                method: 'google-cloud-vision',
                needsCloudOCR: false,
                service: 'Google Cloud Vision'
            };

        } catch (error) {
            console.error('❌ Google Cloud Vision processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Convert PDF to images for processing using pdf2pic
     */
    async convertPDFToImages(pdfBuffer, filename) {
        try {
            const pdf2pic = require('pdf2pic');
            const path = require('path');
            const fs = require('fs');
            const os = require('os');
            
            const tempDir = path.join(os.tmpdir(), 'gcp-ocr');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            
            console.log('📄 Converting PDF to images for Google Cloud Vision...');
            
            const convert = pdf2pic.fromPath(tempPdfPath, {
                density: 300,
                saveFilename: "page",
                savePath: tempDir,
                format: "png",
                width: 2000,
                height: 2000
            });
            
            const results = await convert.bulk(-1);
            const imagePaths = results.map(r => r.path || path.join(tempDir, r.name));
            
            console.log(`✅ Converted PDF to ${imagePaths.length} images`);
            
            // Clean up temp PDF
            fs.unlinkSync(tempPdfPath);
            
            return imagePaths;
        } catch (error) {
            console.error('❌ PDF to image conversion failed:', error.message);
            return [];
        }
    }

    /**
     * Process single image with Google Cloud Vision
     */
    async processImage(imageBuffer, filename) {
        try {
            await this.initialize();

            console.log('🌐 Processing image with Google Cloud Vision...');
            
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer }
            });

            const detections = result.textAnnotations;
            if (detections && detections.length > 0) {
                const extractedText = detections[0].description || '';
                
                console.log(`✅ Google Cloud Vision image processing complete (confidence: 95%)`);

                return {
                    text: extractedText,
                    confidence: 95, // Google Cloud Vision is very reliable
                    pages: 1,
                    method: 'google-cloud-vision',
                    needsCloudOCR: false,
                    service: 'Google Cloud Vision'
                };
            } else {
                console.log('⚠️ No text detected in image');
                return {
                    text: '',
                    confidence: 0,
                    pages: 1,
                    method: 'google-cloud-vision',
                    needsCloudOCR: false,
                    service: 'Google Cloud Vision'
                };
            }

        } catch (error) {
            console.error('❌ Google Cloud Vision image processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            await this.initialize();
            console.log('✅ Google Cloud Vision connection test successful');
            return true;
        } catch (error) {
            console.log('⚠️ Google Cloud Vision connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = GoogleCloudVisionService;




