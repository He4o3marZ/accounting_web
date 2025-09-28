const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const sharp = require('sharp');

// Check if Tesseract is available
let ocrAvailable = false;
try {
    const Tesseract = require('tesseract.js');
    ocrAvailable = true;
} catch (error) {
    console.warn('⚠️ Tesseract.js not available:', error.message);
}

class ImprovedOCRService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'joautomation-ocr');
        this.ensureTempDir();
        this.cloudAPI = require('./cloudOCRAPI');
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Enhanced digit normalization for Arabic-Indic and Persian digits
     */
    normalizeDigits(text) {
        if (!text) return '';
        
        const map = {
            // Arabic-Indic digits
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
            // Persian digits
            '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
            '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
            // Additional variants
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
        };
    
        return text
            .replace(/[٠-٩۰-۹]/g, ch => map[ch] || ch)
            .replace(/٫/g, '.') // Arabic decimal point
            .replace(/(\d+)\s*,\s*(\d+)/g, '$1.$2') // Fix decimal commas
            .replace(/,/g, '') // Remove thousand separators
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Convert PDF to images using multiple methods
     */
    async convertPDFToImages(pdfBuffer, filename) {
        console.log('🔄 Converting PDF to images...');
        
        // Try multiple conversion methods
        const methods = [
            () => this.convertWithPoppler(pdfBuffer, filename),
            () => this.convertWithPdf2pic(pdfBuffer, filename),
            () => this.convertWithSharp(pdfBuffer, filename)
        ];

        for (const method of methods) {
            try {
                const result = await method();
                if (result && result.length > 0) {
                    console.log(`✅ PDF conversion successful with ${result[0].method}`);
                    return result;
                }
            } catch (error) {
                console.log(`⚠️ Conversion method failed: ${error.message}`);
            }
        }

        throw new Error('All PDF conversion methods failed');
    }

    /**
     * Convert PDF using Poppler (pdftoppm)
     */
    async convertWithPoppler(pdfBuffer, filename) {
        return new Promise((resolve, reject) => {
            const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
            const outputPrefix = path.join(this.tempDir, `page_${Date.now()}`);
            
            try {
                fs.writeFileSync(tempPdfPath, pdfBuffer);
                
                const pdftoppm = spawn('pdftoppm', [
                    '-png',
                    '-r', '300', // 300 DPI
                    tempPdfPath,
                    outputPrefix
                ]);

                let errorOutput = '';
                pdftoppm.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                pdftoppm.on('close', (code) => {
                    try {
                        if (code === 0) {
                            const images = this.findGeneratedImages(outputPrefix);
                            if (images.length > 0) {
                                resolve(images.map((img, index) => ({
                                    path: img,
                                    page: index + 1,
                                    method: 'poppler'
                                })));
                            } else {
                                reject(new Error('No images generated'));
                            }
                        } else {
                            reject(new Error(`pdftoppm failed with code ${code}: ${errorOutput}`));
                        }
                    } finally {
                        // Cleanup
                        try {
                            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
                        } catch (e) {}
                    }
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Convert PDF using pdf2pic (fallback)
     */
    async convertWithPdf2pic(pdfBuffer, filename) {
        const pdf2pic = require('pdf2pic');
        const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
        
        try {
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            
            const convert = pdf2pic.fromPath(tempPdfPath, {
                density: 300,
                saveFilename: `page_${Date.now()}`,
                savePath: this.tempDir,
                format: 'png',
                width: 2000,
                height: 2000
            });

            const results = await convert.bulk(-1);
            
            return results.map((result, index) => ({
                path: result.path,
                page: index + 1,
                method: 'pdf2pic'
            }));

        } finally {
            try {
                if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
            } catch (e) {}
        }
    }

    /**
     * Convert PDF using Sharp (basic fallback)
     */
    async convertWithSharp(pdfBuffer, filename) {
        // This is a basic fallback - Sharp doesn't natively support PDF
        // We'll return an empty array to indicate this method isn't available
        throw new Error('Sharp PDF conversion not implemented');
    }

    /**
     * Find generated image files
     */
    findGeneratedImages(prefix) {
        const images = [];
        const files = fs.readdirSync(this.tempDir);
        
        files.forEach(file => {
            if (file.startsWith(path.basename(prefix)) && (file.endsWith('.png') || file.endsWith('.jpg'))) {
                images.push(path.join(this.tempDir, file));
            }
        });

        return images.sort();
    }

    /**
     * Enhanced image preprocessing for Arabic text
     */
    async preprocessImage(imagePath, options = {}) {
        try {
            const { width = 2000, height = 2000, enhance = true } = options;
            const outputPath = path.join(this.tempDir, `preprocessed_${Date.now()}.png`);

            let pipeline = sharp(imagePath)
                .resize(width, height, { 
                    fit: 'inside',
                    withoutEnlargement: false 
                })
                .grayscale()
                .normalize({ lower: 10, upper: 100 });

            if (enhance) {
                pipeline = pipeline
                    .threshold(140, { grayscale: true })
                    .sharpen({ 
                        sigma: 1.5,
                        m1: 0.5,
                        m2: 3.0,
                        x1: 2.0,
                        y2: 10.0
                    })
                    .modulate({ 
                        brightness: 1.1, 
                        contrast: 1.2 
                    });
            }

            await pipeline.png().toFile(outputPath);
            return outputPath;

        } catch (error) {
            console.warn('Image preprocessing failed, using original:', error.message);
            return imagePath;
        }
    }

    /**
     * Perform OCR with retries and downscaling
     */
    async performOCRWithRetries(imagePath, languages = 'ara+eng', maxRetries = 3) {
        if (!ocrAvailable) {
            throw new Error('OCR dependencies not available');
        }

        const Tesseract = require('tesseract.js');
        let bestResult = { text: '', confidence: 0 };
        let currentImagePath = imagePath;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 OCR attempt ${attempt}/${maxRetries}...`);
                
                // Downscale image if confidence was low in previous attempt
                if (attempt > 1) {
                    const scaleFactor = Math.pow(0.8, attempt - 1); // 0.8, 0.64, 0.512
                    const newWidth = Math.max(800, Math.floor(2000 * scaleFactor));
                    const newHeight = Math.max(600, Math.floor(2000 * scaleFactor));
                    
                    currentImagePath = await this.preprocessImage(imagePath, {
                        width: newWidth,
                        height: newHeight,
                        enhance: attempt > 2 // More aggressive enhancement on later attempts
                    });
                }

                const options = {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    },
                    tessedit_pageseg_mode: 6, // Block of text
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹.,€$£¥ '
                };

                const { data } = await Tesseract.recognize(currentImagePath, languages, options);
                
                // Normalize digits immediately
                const normalizedText = this.normalizeDigits(data.text || '');
                const confidence = data.confidence || 0;

                console.log(`📊 Attempt ${attempt}: ${confidence}% confidence, ${normalizedText.length} chars`);

                // Keep the best result
                if (confidence > bestResult.confidence) {
                    bestResult = {
                        text: normalizedText,
                        confidence: confidence,
                        attempt: attempt,
                        imageSize: attempt > 1 ? 'downscaled' : 'original'
                    };
                }

                // If we get good confidence, we can stop
                if (confidence >= 70) {
                    console.log(`✅ Good confidence achieved on attempt ${attempt}`);
                    break;
                }

            } catch (error) {
                console.error(`❌ OCR attempt ${attempt} failed:`, error.message);
            }
        }

        // Cleanup temporary images
        if (currentImagePath !== imagePath) {
            try {
                if (fs.existsSync(currentImagePath)) fs.unlinkSync(currentImagePath);
            } catch (e) {}
        }

        return bestResult;
    }

    /**
     * Process image with orientation detection and auto-rotation
     */
    async processImageWithOrientation(imagePath, pageIndex) {
        if (!ocrAvailable) {
            return { text: '', confidence: 0, page: pageIndex + 1, orientation: 0 };
        }

        try {
            console.log(`🔄 Processing page ${pageIndex + 1} with orientation detection...`);
            
            const orientations = [
                { angle: 0, name: '0° (original)' },
                { angle: 90, name: '90° clockwise' },
                { angle: 180, name: '180° upside down' },
                { angle: 270, name: '270° counter-clockwise' }
            ];

            let bestResult = { text: '', confidence: 0, page: pageIndex + 1, orientation: 0 };
            const tempPaths = [];

            for (const orientation of orientations) {
                let testImagePath = imagePath;
                
                // Rotate image if not 0°
                if (orientation.angle !== 0) {
                    testImagePath = await this.rotateImage(imagePath, orientation.angle, pageIndex);
                    tempPaths.push(testImagePath);
                }

                // Preprocess image
                const preprocessedPath = await this.preprocessImage(testImagePath);
                tempPaths.push(preprocessedPath);

                // Perform OCR with retries
                const result = await this.performOCRWithRetries(preprocessedPath, 'ara+eng');
                
                console.log(`📊 ${orientation.name}: ${result.confidence}% confidence, ${result.text.length} chars`);

                // Keep the best result
                if (result.confidence > bestResult.confidence) {
                    bestResult = {
                        ...result,
                        page: pageIndex + 1,
                        orientation: orientation.angle,
                        orientationName: orientation.name
                    };
                }
            }

            // Cleanup temp files
            tempPaths.forEach(p => {
                try {
                    if (p !== imagePath && fs.existsSync(p)) fs.unlinkSync(p);
                } catch (e) {}
            });

            return bestResult;

        } catch (error) {
            console.error(`❌ Orientation processing failed for page ${pageIndex + 1}:`, error);
            return { 
                text: '', 
                confidence: 0, 
                page: pageIndex + 1, 
                orientation: 0,
                error: error.message 
            };
        }
    }

    /**
     * Rotate image by specified angle
     */
    async rotateImage(imagePath, angle, pageIndex) {
        const outputPath = path.join(this.tempDir, `rotated_${pageIndex}_${angle}_${Date.now()}.png`);
        
        await sharp(imagePath)
            .rotate(angle)
            .png()
            .toFile(outputPath);
            
        return outputPath;
    }

    /**
     * Main processing method
     */
    async processPDF(pdfBuffer, filename) {
        console.log('🔄 Starting improved PDF processing...');
        
        try {
            // Convert PDF to images
            const images = await this.convertPDFToImages(pdfBuffer, filename);
            console.log(`📄 Converted to ${images.length} images`);

            // Process each image with orientation detection
            const results = [];
            for (let i = 0; i < images.length; i++) {
                const result = await this.processImageWithOrientation(images[i].path, i);
                results.push(result);
            }

            // Combine results
            const combinedText = results.map(r => r.text).join('\n\n--- PAGE BREAK ---\n\n');
            const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
            const isArabic = this.detectArabicText(combinedText);

            // Cleanup image files
            images.forEach(img => {
                try {
                    if (fs.existsSync(img.path)) fs.unlinkSync(img.path);
                } catch (e) {}
            });

            return {
                text: combinedText,
                confidence: averageConfidence,
                pages: results.length,
                isArabic: isArabic,
                method: 'improved-ocr',
                pageDetails: results,
                rawText: combinedText // Always include raw text for debugging
            };

        } catch (error) {
            console.error('❌ Improved PDF processing failed:', error);
            
            // Return error with raw text if available
            return {
                text: '',
                confidence: 0,
                pages: 0,
                isArabic: false,
                method: 'error',
                error: error.message,
                rawText: '' // No text available due to error
            };
        }
    }

    /**
     * Detect if text contains Arabic characters
     */
    detectArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }
}

module.exports = ImprovedOCRService;

