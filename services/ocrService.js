// Note: OCR dependencies are optional and will be loaded dynamically
let Tesseract, sharp, pdf2pic;
let ocrAvailable = false;

try {
    Tesseract = require('tesseract.js');
    sharp = require('sharp');
    pdf2pic = require('pdf2pic');
    ocrAvailable = true;
    console.log('✅ OCR dependencies loaded successfully');
} catch (error) {
    console.error("OCR dependencies failed to load:", error);
    ocrAvailable = false;
}

// Import cloud OCR services
const CloudOCRService = require('./cloudOCRService');
const CloudOCRAPIService = require('./cloudOCRAPI');
const GoogleCloudVisionService = require('./googleCloudVision');

const fs = require('fs');
const path = require('path');
const os = require('os');

class OCRService {
    constructor() {
        this.tempDir = path.join(os.tmpdir(), 'joautomation-ocr');
        this.cloudOCR = new CloudOCRService();
        this.cloudAPI = new CloudOCRAPIService();
        this.googleCloudVision = new GoogleCloudVisionService();
        this.ensureTempDir();
    }

    // Normalize Arabic-Indic and Persian digits to Western digits
    normalizeDigits(text) {
        if (!text) return '';
        
        // Extended mapping for all Arabic/Persian digit variants
        const map = {
            // Arabic-Indic digits
            '٠': '0','١': '1','٢': '2','٣': '3','٤': '4',
            '٥': '5','٦': '6','٧': '7','٨': '8','٩': '9',
            // Persian digits
            '۰': '0','۱': '1','۲': '2','۳': '3','۴': '4',
            '۵': '5','۶': '6','۷': '7','۸': '8','۹': '9',
            // Additional variants
            '٠': '0','١': '1','٢': '2','٣': '3','٤': '4',
            '٥': '5','٦': '6','٧': '7','٨': '8','٩': '9'
        };
    
        return text
            .replace(/[٠-٩۰-۹]/g, ch => map[ch] || ch)
            .replace(/٬|،/g, ',') // Arabic comma to standard
            .replace(/٫/g, '.') // Arabic decimal point to standard
            .replace(/\s+/g, ' ') // collapse whitespace
            .replace(/(?<=\d),(?=\d{3}\b)/g, '') // remove thousand commas
            .replace(/(\d+)\s*,\s*(\d+)/g, '$1.$2') // fix decimal commas
            .replace(/(\d+)\s*\.\s*(\d+)\s*\.\s*(\d+)/g, '$1,$2.$3') // fix mixed separators
            .trim();
    }
    

    // Public alias matching requested name
    normalizeArabicDigits(text) {
        return this.normalizeDigits(text);
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Hybrid PDF processing approach
     * 1. Try pdf-parse first (even if garbled)
     * 2. If garbled/empty → OCR pipeline
     * 3. If OCR confidence < 40% → suggest cloud OCR
     */
    async processPDF(pdfBuffer, filename) {
        console.log("🔄 Starting hybrid PDF processing...");
        
        // Step 1: Always try pdf-parse first
        console.log("📄 Step 1: Extracting text with pdf-parse...");
        let pdfData;
        let extractedText = '';
        try {
            const pdfParse = require('pdf-parse');
            pdfData = await pdfParse(pdfBuffer);
            extractedText = (pdfData.text || '').trim();
        } catch (err) {
            const message = (err && err.message) || '';
            const lower = message.toLowerCase();
            const isCorrupted = lower.includes('xref') || lower.includes('unexpected') || lower.includes('corrupt') || lower.includes('eof');
            const isLocked = lower.includes('password') || lower.includes('encrypt');
            const type = isLocked ? 'password_protected' : (isCorrupted ? 'corrupted' : 'unreadable');
            return {
                text: '',
                confidence: 0,
                pages: 0,
                isArabic: false,
                method: 'pdf-parse-error',
                error: isLocked ? 'PDF is password protected' : (isCorrupted ? 'PDF is locked or corrupted' : 'PDF is unreadable'),
                filename,
                type
            };
        }
        
        console.log(`📄 Extracted ${extractedText.length} characters`);
        
        // Step 2: Check if text is usable (not garbled/empty)
        const normalizedExtracted = this.normalizeDigits(extractedText);
        if (normalizedExtracted.length > 50 && !this.isTextGarbled(normalizedExtracted)) {
            console.log("✅ Text appears clean, using pdf-parse result");
            
            // Check for invoice-like keywords to determine confidence
            const hasInvoiceKeywords = ['invoice', 'total', 'vat', 'amount', '€', '$', '£', '¥']
                .some(k => normalizedExtracted.toLowerCase().includes(k));
            const confidence = hasInvoiceKeywords ? 75 : 40;
            
            const finalText = this.normalizeDigits(normalizedExtracted);
            return {
                text: finalText,
                confidence: confidence,
                pages: pdfData.numpages || 1,
                isArabic: this.detectArabicText(finalText),
                method: 'pdf-parse'
            };
        }
        
        // Step 2.1: If text contains Arabic or garbled characters, try Google Cloud Vision first
        if (extractedText.length > 50 && (this.detectArabicText(extractedText) || this.isTextGarbled(extractedText))) {
            console.log("🔄 Text contains Arabic or garbled characters, trying Google Cloud Vision...");
            try {
                // Try Google Cloud Vision first (best for Arabic)
                if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_VISION_KEY) {
                    const gcpResult = await this.googleCloudVision.processPDF(pdfBuffer, filename);
                    if (gcpResult.confidence > 0) {
                        console.log(`✅ Google Cloud Vision successful (${gcpResult.confidence}% confidence)`);
                        const gcpText = this.normalizeDigits(gcpResult.text || '');
                        const finalText = this.normalizeDigits(gcpText);
                        return {
                            text: finalText,
                            confidence: gcpResult.confidence || 0,
                            pages: gcpResult.pages || 1,
                            isArabic: this.detectArabicText(finalText),
                            method: gcpResult.method || 'google-cloud-vision',
                            pageDetails: gcpResult.pageDetails
                        };
                    }
                }
                
                // Fallback to other cloud OCR services
                const cloudResult = await this.cloudAPI.processPDF(pdfBuffer, filename);
                if (cloudResult.confidence > 0) {
                    console.log(`✅ Cloud OCR successful (${cloudResult.confidence}% confidence)`);
                    const cloudText = this.normalizeDigits(cloudResult.text || '');
                    const finalText = this.normalizeDigits(cloudText);
                    return {
                        text: finalText,
                        confidence: cloudResult.confidence || 0,
                        pages: cloudResult.pages || 1,
                        isArabic: this.detectArabicText(finalText),
                        method: cloudResult.method || 'cloud-ocr',
                        pageDetails: cloudResult.pageDetails
                    };
                } else if (!cloudResult.needsCloudOCR) {
                    // Cloud OCR failed but doesn't need cloud OCR (file too large), use original text
                    console.log("⚠️ Cloud OCR failed due to file size, using original pdf-parse text");
                    const finalText = this.normalizeDigits(normalizedExtracted);
                    return {
                        text: finalText,
                        confidence: 40, // Lower confidence but still usable
                        pages: (pdfData && pdfData.numpages) || 1,
                        isArabic: this.detectArabicText(finalText),
                        method: 'pdf-parse-fallback'
                    };
                }
            } catch (error) {
                console.log("⚠️ Cloud OCR failed, using pdf-parse result:", error.message);
            }
        }
        
        // Step 2.5: If text is clean but might need better OCR, try cloud OCR anyway for complex PDFs
        if (normalizedExtracted.length > 50 && !this.isTextGarbled(normalizedExtracted) && (filename.includes('Invoices') || filename.includes('invoice') || filename.includes('Invoice'))) {
            console.log("🔄 Text appears clean but trying cloud OCR for better accuracy on complex PDFs...");
            try {
                const cloudResult = await this.cloudAPI.processPDF(pdfBuffer, filename);
                if (cloudResult.confidence > 0) {
                    console.log(`✅ Cloud OCR successful (${cloudResult.confidence}% confidence)`);
                    const cloudText = this.normalizeDigits(cloudResult.text || '');
                    const finalText = this.normalizeDigits(cloudText);
                    return {
                        text: finalText,
                        confidence: cloudResult.confidence || 0,
                        pages: cloudResult.pages || 1,
                        isArabic: this.detectArabicText(finalText),
                        method: cloudResult.method || 'cloud-ocr',
                        pageDetails: cloudResult.pageDetails
                    };
                }
            } catch (error) {
                console.log("⚠️ Cloud OCR failed, using pdf-parse result:", error.message);
            }
        }
        
        // Step 3: Text is garbled/empty, try Google Cloud Vision first
        console.log("🖼️ Step 2: Text is garbled/empty, trying Google Cloud Vision first...");
        try {
            // Try Google Cloud Vision first (best for Arabic and complex documents)
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_VISION_KEY) {
                console.log("🌐 Trying Google Cloud Vision...");
                const gcpResult = await this.googleCloudVision.processPDF(pdfBuffer, filename);
                
                if (gcpResult.confidence > 0) {
                    console.log(`✅ Google Cloud Vision successful (${gcpResult.confidence}% confidence)`);
                    const gcpText = this.normalizeDigits(gcpResult.text || '');
                    return {
                        text: gcpText,
                        confidence: gcpResult.confidence || 0,
                        pages: gcpResult.pages || 1,
                        isArabic: this.detectArabicText(gcpText),
                        method: gcpResult.method || 'google-cloud-vision',
                        pageDetails: gcpResult.pageDetails
                    };
                }
            }
            
            // Fallback to other cloud OCR services
            console.log("🔄 Google Cloud Vision not available, trying other cloud OCR...");
            const cloudResult = await this.cloudAPI.processPDF(pdfBuffer, filename);
            
            if (cloudResult.confidence > 0) {
                console.log(`✅ Cloud OCR successful (${cloudResult.confidence}% confidence)`);
                const cloudText = this.normalizeDigits(cloudResult.text || '');
                return {
                    text: cloudText,
                    confidence: cloudResult.confidence || 0,
                    pages: cloudResult.pages || 1,
                    isArabic: this.detectArabicText(cloudText),
                    method: cloudResult.method || 'cloud-ocr',
                    pageDetails: cloudResult.pageDetails
                };
            }
            
            // Fallback to local OCR if available
            if (ocrAvailable) {
                console.log("🔄 Cloud OCR failed, trying local OCR...");
                const ocrResult = await this.processPDFWithOCR(pdfBuffer, filename);
                
                if (ocrResult.confidence >= 40) {
                    console.log(`✅ Local OCR successful (${ocrResult.confidence}% confidence)`);
                    return {
                        ...ocrResult,
                        method: 'local-ocr'
                    };
                }
            }
            
            // If all OCR methods fail, use the original pdf-parse text
            console.log("❌ All OCR methods failed, using original pdf-parse text");
            const finalText = this.normalizeDigits(normalizedExtracted);
            return {
                text: finalText,
                confidence: 40, // Lower confidence but still usable
                pages: (pdfData && pdfData.numpages) || 1,
                isArabic: this.detectArabicText(finalText),
                method: 'pdf-parse-fallback'
            };
            
        } catch (error) {
            console.log("❌ OCR processing failed, using original pdf-parse text");
            const finalText = this.normalizeDigits(normalizedExtracted);
            return {
                text: finalText,
                confidence: 40, // Lower confidence but still usable
                pages: (pdfData && pdfData.numpages) || 1,
                isArabic: this.detectArabicText(finalText),
                method: 'pdf-parse-fallback'
            };
        }
    }

    /**
     * Generate guidance for cloud OCR services
     */
    getCloudOCRGuidance(originalText, ocrText) {
        return `This PDF requires advanced OCR processing that local tools cannot handle effectively.

**Original text extraction:** ${originalText.length} characters (garbled)
**Local OCR result:** ${ocrText.length} characters (low confidence)

**Recommended Cloud OCR Solutions:**

1. **Google Drive OCR** (Free & Best for Arabic):
   - Upload PDF to Google Drive
   - Right-click → "Open with Google Docs"
   - Google will automatically OCR the text
   - Copy the clean text and save as new PDF

2. **Microsoft Azure Computer Vision** (Professional):
   - Sign up at azure.microsoft.com
   - Use Computer Vision API
   - Supports 100+ languages including Arabic

3. **Amazon Textract** (Enterprise):
   - AWS Textract service
   - Excellent for complex documents
   - Handles tables and forms well

4. **Online OCR Services**:
   - SmallPDF.com OCR
   - ILovePDF.com OCR
   - OnlineOCR.net

**Why Cloud OCR?**
- Better Arabic text recognition
- Handles complex layouts
- Higher accuracy for scanned documents
- Professional-grade processing

After using cloud OCR, upload the clean text or new PDF to this system for analysis.`;
    }

    /**
     * Process PDF as images only - skip pdf-parse entirely
     * Uses the existing OCR pipeline but forces image-based processing
     */
    async processPDFAsImagesOnly(pdfBuffer, filename, progressCallback = null) {
        if (!ocrAvailable) {
            console.log('⚠️ OCR not available, cannot process PDF as images');
            return {
                text: '',
                confidence: 0,
                pages: 0,
                isArabic: false,
                method: 'images-only-ocr-error',
                error: 'OCR dependencies not available',
                pageDetails: []
            };
        }

        try {
            console.log('🖼️ Starting images-only OCR processing...');
            if (progressCallback) progressCallback(10, '🖼️ Starting images-only OCR processing...');
            
            // Force the PDF to be treated as needing OCR (skip pdf-parse)
            console.log('📄 Forcing image-based OCR processing...');
            if (progressCallback) progressCallback(15, '📄 Forcing image-based OCR processing...');
            
            // Use the existing processPDFWithOCR method which now includes orientation correction
            const ocrResult = await this.processPDFWithOCR(pdfBuffer, filename, progressCallback);
            
            if (ocrResult.error) {
                return {
                    text: '',
                    confidence: 0,
                    pages: 0,
                    isArabic: false,
                    method: 'images-only-ocr-error',
                    error: ocrResult.error,
                    pageDetails: []
                };
            }
            
            // Enhance the result with additional Arabic-specific processing
            let enhancedText = ocrResult.text;
            let enhancedConfidence = ocrResult.confidence;
            
            // If we have page details, enhance each page with Arabic-specific processing
            if (ocrResult.pageDetails && ocrResult.pageDetails.length > 0) {
                console.log('🔍 Enhancing Arabic text processing...');
                
                const enhancedPageDetails = [];
                let totalConfidence = 0;
                let validPages = 0;
                
                for (const pageDetail of ocrResult.pageDetails) {
                    let pageText = pageDetail.text || '';
                    let pageConfidence = pageDetail.confidence || 0;
                    
                    // Try Arabic-only OCR if confidence is low
                    if (pageConfidence < 50 && pageText.length > 0) {
                        console.log(`🔍 Re-processing page ${pageDetail.page} with Arabic-only OCR...`);
                        // Note: We can't re-process individual pages here without the original images
                        // But we can enhance the text processing
                    }
                    
                    // Normalize Arabic digits
                    pageText = this.normalizeDigits(pageText);
                    
                    enhancedPageDetails.push({
                        page: pageDetail.page,
                        text: pageText,
                        confidence: pageConfidence,
                        debugLogs: pageDetail.debugLogs || []
                    });
                    
                    if (pageText.trim().length > 0) {
                        totalConfidence += pageConfidence;
                        validPages++;
                    }
                }
                
                // Recalculate average confidence
                enhancedConfidence = validPages > 0 ? Math.round(totalConfidence / validPages) : 0;
                
                // Combine all page texts
                enhancedText = enhancedPageDetails.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n');
                
                console.log(`✅ Enhanced Arabic processing completed: ${validPages} pages, ${enhancedConfidence}% avg confidence`);
                
                return {
                    text: enhancedText,
                    confidence: enhancedConfidence,
                    pages: ocrResult.pages,
                    isArabic: this.detectArabicText(enhancedText),
                    method: 'images-only-ocr-orientation',
                    pageDetails: enhancedPageDetails,
                    rawText: enhancedText // Always include raw text for debugging
                };
            }
            
            // Fallback: just normalize the text and return
            enhancedText = this.normalizeDigits(enhancedText);
            
            return {
                text: enhancedText,
                confidence: enhancedConfidence,
                pages: ocrResult.pages,
                isArabic: this.detectArabicText(enhancedText),
                method: 'images-only-ocr-orientation',
                pageDetails: ocrResult.pageDetails || [],
                rawText: enhancedText // Always include raw text for debugging
            };
            
        } catch (error) {
            console.error('❌ Images-only OCR failed:', error);
            return {
                text: '',
                confidence: 0,
                pages: 0,
                isArabic: false,
                method: 'images-only-ocr-error',
                error: error.message,
                pageDetails: []
            };
        }
    }

    /**
     * Process PDF with OCR - handles Arabic text and orientation detection
     */
    async processPDFWithOCR(pdfBuffer, filename, progressCallback = null) {
        if (!ocrAvailable) {
            console.log('⚠️ OCR not available, using fallback text extraction...');
            return this.fallbackTextExtraction(pdfBuffer, filename);
        }

        try {
            console.log('🔍 Starting OCR processing for image-based PDF...');
            if (progressCallback) progressCallback(20, '🔍 Starting OCR processing for image-based PDF...');
            
            // Step 1: Try multiple DPI levels and pick the best result
            const dpiLevels = [300, 200, 400]; // Default, lower, higher
            let bestResult = null;
            let bestConfidence = 0;
            const debugLogs = [];

            for (const dpi of dpiLevels) {
                try {
                    console.log(`📄 Converting PDF to images with DPI ${dpi}...`);
                    if (progressCallback) progressCallback(25, `📄 Converting PDF to images with DPI ${dpi}...`);
                    const images = await this.convertPDFToImagesWithDPI(pdfBuffer, filename, dpi);
                    console.log(`📄 Converted PDF to ${images.length} images at DPI ${dpi}`);
                    if (progressCallback) progressCallback(30, `📄 Converted PDF to ${images.length} images at DPI ${dpi}`);

                    // Process each image with orientation correction (parallel)
                    if (progressCallback) progressCallback(35, `🔄 Processing ${images.length} pages with orientation correction...`);
                    const ocrResults = await Promise.all(
                        images.map((imgPath, i) => {
                            console.log(`🔍 Processing page ${i + 1}/${images.length} at DPI ${dpi} with orientation correction...`);
                            if (progressCallback) progressCallback(35 + (i * 10 / images.length), `🔍 Processing page ${i + 1}/${images.length} with orientation correction...`);
                            return this.processImageWithOrientationCorrection(imgPath, i);
                        })
                    );

                    // Calculate average confidence for this DPI
                    const avgConfidence = this.calculateAverageConfidence(ocrResults);
                    const combinedText = this.normalizeDigits(ocrResults.map(r => r.text).join('\n\n--- PAGE BREAK ---\n\n'));
                    
                    debugLogs.push({
                        dpi,
                        confidence: avgConfidence,
                        pages: ocrResults.length,
                        textLength: combinedText.length
                    });

                    console.log(`📊 DPI ${dpi} result: ${avgConfidence}% confidence, ${combinedText.length} chars`);

                    // Keep the best result
                    if (avgConfidence > bestConfidence) {
                        bestConfidence = avgConfidence;
                        bestResult = {
                            text: combinedText,
                            confidence: avgConfidence,
                            pages: ocrResults.length,
                            isArabic: this.detectArabicText(combinedText),
                            method: 'image-ocr-orientation',
                            pageDetails: ocrResults.map((r, idx) => ({ 
                                page: idx + 1, 
                                text: this.normalizeDigits(r.text), 
                                confidence: r.confidence,
                                orientation: r.orientation || 0,
                                method: r.method || 'local-ocr'
                            })),
                            debugLogs: [...debugLogs]
                        };
                        console.log(`✅ New best result: DPI ${dpi} with ${avgConfidence}% confidence`);
                    }

                    // Clean up temp files for this DPI
                    this.cleanupTempFiles(images);

                    // If we found a good result (>= 50%), we can stop trying other DPIs
                    if (avgConfidence >= 50) {
                        console.log(`🎯 Good confidence achieved with DPI ${dpi}, stopping DPI trials`);
                        break;
                    }

                } catch (dpiError) {
                    console.warn(`⚠️ DPI ${dpi} failed:`, dpiError.message);
                    debugLogs.push({
                        dpi,
                        confidence: 0,
                        pages: 0,
                        textLength: 0,
                        error: dpiError.message
                    });
                }
            }

            if (bestResult) {
                console.log(`✅ OCR processing completed with best DPI result: ${bestResult.confidence}% confidence`);
                return bestResult;
            } else {
                console.log('❌ All DPI attempts failed, using fallback');
                return this.fallbackTextExtraction(pdfBuffer, filename);
            }

        } catch (error) {
            console.error('OCR processing error:', error);
            console.log('🔄 Falling back to basic text extraction...');
            const fb = await this.fallbackTextExtraction(pdfBuffer, filename);
            // Ensure standardized shape
            return {
                text: fb.text || '',
                confidence: typeof fb.confidence === 'number' ? fb.confidence : 0,
                pages: typeof fb.pages === 'number' ? fb.pages : 0,
                isArabic: !!fb.isArabic,
                method: fb.method || 'fallback',
                pageDetails: fb.pageDetails
            };
        }
    }

    /**
     * Fallback text extraction when OCR is not available
     */
    async fallbackTextExtraction(pdfBuffer, filename) {
        return await this.enhancedFallbackExtraction(pdfBuffer, filename);
    }

    /**
     * Alternative PDF to image conversion using pdf-lib (without canvas)
     */
    async convertPDFToImagesAlternative(pdfBuffer, filename) {
        try {
            console.log('🔄 Trying alternative PDF conversion with pdf-lib...');
            const { PDFDocument } = require('pdf-lib');
            
            let pdfDoc;
            try {
                pdfDoc = await PDFDocument.load(pdfBuffer);
            } catch (e) {
                const lower = (e.message || '').toLowerCase();
                const isLocked = lower.includes('password') || lower.includes('encrypt');
                const isCorrupted = lower.includes('xref') || lower.includes('unexpected') || lower.includes('corrupt') || lower.includes('eof');
                return {
                    text: '',
                    confidence: 0,
                    pages: 0,
                    isArabic: false,
                    method: 'pdf-lib-error',
                    error: isLocked ? 'PDF is password protected' : (isCorrupted ? 'PDF is locked or corrupted' : 'PDF is unreadable'),
                    filename,
                    type: isLocked ? 'password_protected' : (isCorrupted ? 'corrupted' : 'unreadable')
                };
            }
            const pageCount = pdfDoc.getPageCount();
            
            console.log(`📄 PDF has ${pageCount} pages, but canvas is not available for image conversion`);
            console.log('⚠️ Canvas module requires Visual Studio C++ build tools on Windows');
            console.log('💡 Consider using cloud OCR services for better results');
            
            // Return empty array since we can't convert without canvas
            return [];
        } catch (error) {
            console.log('❌ Alternative PDF conversion failed:', error.message);
            throw error;
        }
    }

    /**
     * Convert PDF to images with specific DPI using pdf2pic
     */
    async convertPDFToImagesWithDPI(pdfBuffer, filename, dpi = 300) {
        if (!ocrAvailable) {
            throw new Error('OCR dependencies not available');
        }

        const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}_dpi${dpi}.pdf`);
        
        try {
            // Write PDF buffer to temp file
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            console.log(`📄 Written PDF to temp file: ${tempPdfPath}`);

            // Conversion options with specific DPI
            const conversionOptions = {
                density: dpi,
                saveFilename: "page",
                savePath: this.tempDir,
                format: "png",
                width: Math.round(2000 * dpi / 300), // Scale width with DPI
                height: Math.round(2000 * dpi / 300) // Scale height with DPI
            };

            console.log(`🔄 Converting PDF to images with DPI ${dpi}...`);
            const convert = pdf2pic.fromPath(tempPdfPath, conversionOptions);
            const result = await convert.bulk(-1, { responseType: "image" });
            
            if (!result || result.length === 0) {
                throw new Error('No images generated from PDF');
            }

            const images = result.map((img, index) => {
                const imagePath = path.join(this.tempDir, `page.${index + 1}.png`);
                return imagePath;
            });

            console.log(`📄 Converted PDF to ${images.length} images with DPI ${dpi}`);
            return images;
            
        } catch (error) {
            console.error(`PDF conversion error at DPI ${dpi}:`, error);
            throw error;
        } finally {
            // Clean up temp PDF file
            if (fs.existsSync(tempPdfPath)) {
                try {
                    fs.unlinkSync(tempPdfPath);
                } catch (cleanupError) {
                    console.warn('Failed to clean up temp PDF:', cleanupError.message);
                }
            }
        }
    }

    /**
     * Convert PDF to images using pdf2pic with better error handling
     */
    async convertPDFToImages(pdfBuffer, filename) {
        if (!ocrAvailable) {
            throw new Error('OCR dependencies not available');
        }

        const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
        
        try {
            // Write PDF buffer to temp file
            fs.writeFileSync(tempPdfPath, pdfBuffer);
            console.log(`📄 Written PDF to temp file: ${tempPdfPath}`);

            // Try different conversion options
            const conversionOptions = [
                {
                    density: 300, // High DPI for better OCR
                    saveFilename: "page",
                    savePath: this.tempDir,
                    format: "png",
                    width: 2000,
                    height: 2000
                },
                {
                    density: 200, // Lower DPI fallback
                    saveFilename: "page",
                    savePath: this.tempDir,
                    format: "png",
                    width: 1000,
                    height: 1000
                },
                {
                    density: 100, // Minimal DPI
                    saveFilename: "page",
                    savePath: this.tempDir,
                    format: "png",
                    width: 800,
                    height: 800
                }
            ];

            let lastError;
            for (let i = 0; i < conversionOptions.length; i++) {
                try {
                    console.log(`🔄 Trying conversion option ${i + 1}/${conversionOptions.length}...`);
                    
                    // Fixed pdf2pic usage - fromPath returns a function
                    const { fromPath } = pdf2pic;
                    const convert = fromPath(tempPdfPath, conversionOptions[i]);
                    const results = await convert.bulk(-1); // Convert all pages
                    
                    // Fixed path mapping - use .path when available, fallback to .name
                    const imagePaths = results.map(r => r.path || path.join(this.tempDir, r.name));
                    
                    console.log(`✅ Successfully converted PDF to ${imagePaths.length} images`);
                    
                    // Clean up temp PDF
                    fs.unlinkSync(tempPdfPath);
                    
                    return imagePaths;
                } catch (error) {
                    console.log(`❌ Conversion option ${i + 1} failed:`, error.message);
                    lastError = error;
                    continue;
                }
            }
            
            // If all options failed, throw the last error
            // Try alternative conversion method as last resort
            try {
                console.log('🔄 Trying alternative PDF conversion method...');
                return await this.convertPDFToImagesAlternative(pdfBuffer, filename);
            } catch (altError) {
                console.log('❌ Alternative conversion also failed:', altError.message);
                throw lastError || new Error('All PDF conversion methods failed');
            }
            
        } catch (error) {
            console.error('PDF conversion error:', error);
            
            // Provide more helpful error message
            if (error.code === 'EOF' || error.message.includes('EOF')) {
                throw new Error(`PDF conversion failed - the PDF may be corrupted, password-protected, or in an unsupported format. File: ${filename}`);
            }
            
            throw error;
        } finally {
            // Ensure temp PDF is always cleaned up
            if (fs.existsSync(tempPdfPath)) {
                try {
                    fs.unlinkSync(tempPdfPath);
                } catch (cleanupError) {
                    console.warn('Failed to cleanup temp PDF:', cleanupError.message);
                }
            }
        }
    }

    /**
     * Preprocess image for better OCR results
     */
    async preprocessImage(imagePath) {
        if (!ocrAvailable) {
            return imagePath;
        }

        try {
            const preprocessedPath = imagePath.replace(/\.png$/, "_clean.png");
            
            // Enhanced preprocessing for Arabic text
            await sharp(imagePath)
                .resize(3000, null, { 
                    kernel: sharp.kernel.lanczos3,  // Better quality upscaling
                    withoutEnlargement: false 
                })
                .grayscale()
                .normalize({ 
                    lower: 10,    // More aggressive normalization
                    upper: 100 
                })
                .threshold(140, { grayscale: true })  // Lower threshold for better Arabic text
                .sharpen({ 
                    sigma: 1.5,   // Stronger sharpening
                    m1: 0.5, 
                    m2: 2.0, 
                    x1: 2, 
                    y2: 10 
                })
                .modulate({
                    brightness: 1.1,  // Slight brightness boost
                    contrast: 1.2     // Higher contrast for Arabic text
                })
                .toFile(preprocessedPath);
            
            console.log(`🔧 Enhanced preprocessing for Arabic text: ${preprocessedPath}`);
            return preprocessedPath;
        } catch (error) {
            console.warn('Image preprocessing failed, using original:', error.message);
            return imagePath;
        }
    }

    /**
     * Process single image with comprehensive orientation correction
     * Tests 0°, 90°, 180°, 270° orientations and selects the best result
     */
    async processImageWithOrientationCorrection(imagePath, pageIndex, progressCallback = null) {
        if (!ocrAvailable) {
            return { text: '', confidence: 0, page: pageIndex + 1, orientation: 0 };
        }

        try {
            console.log(`🔄 Starting enhanced orientation correction for page ${pageIndex + 1}...`);
            if (progressCallback) progressCallback(40, `🔄 Testing orientations for page ${pageIndex + 1}...`);
            
            // Preprocess the original image with enhanced settings for Arabic text
            const cleanImagePath = await this.preprocessImage(imagePath);
            const tempPaths = [cleanImagePath];
            let bestResult = { text: '', confidence: 0, page: pageIndex + 1, orientation: 0 };
            const debugLogs = [];
            const orientations = [
                { angle: 0, name: '0° (original)' },
                { angle: 90, name: '90° clockwise' },
                { angle: 180, name: '180° upside down' },
                { angle: 270, name: '270° counter-clockwise' }
            ];

            // Test each orientation with multiple language combinations
            for (let i = 0; i < orientations.length; i++) {
                const orientation = orientations[i];
                let testImagePath = cleanImagePath;
                
                if (progressCallback) progressCallback(40 + (i * 5), `🔍 Testing ${orientation.name}...`);
                
                // Rotate image if not 0°
                if (orientation.angle !== 0) {
                    testImagePath = await this.rotateImage(cleanImagePath, orientation.angle, pageIndex);
                    tempPaths.push(testImagePath);
                }

                // Test multiple language combinations for each orientation
                const languageTests = ['ara+eng', 'ara', 'eng'];
                let orientationBestResult = { text: '', confidence: 0 };

                for (const language of languageTests) {
                    console.log(`🔍 Testing ${orientation.name} with ${language}...`);
                    if (progressCallback) progressCallback(40 + (i * 5) + 1, `🔍 Testing ${orientation.name} with ${language}...`);
                    const result = await this.performOCR(testImagePath, language, false);
                    result.text = this.normalizeDigits(result.text || '');
                    
                    debugLogs.push({ 
                        orientation: orientation.angle, 
                        language: language,
                        confidence: result.confidence, 
                        textLength: result.text.length 
                    });
                    
                    console.log(`📊 ${orientation.name} (${language}): ${result.confidence}% confidence, ${result.text.length} chars`);

                    // Keep the best result for this orientation
                    if (result.confidence > orientationBestResult.confidence) {
                        orientationBestResult = {
                            text: result.text,
                            confidence: result.confidence,
                            language: language
                        };
                    }
                }

                // Keep the overall best result
                if (orientationBestResult.confidence > bestResult.confidence) {
                    bestResult = {
                        text: orientationBestResult.text,
                        confidence: orientationBestResult.confidence,
                        page: pageIndex + 1,
                        orientation: orientation.angle,
                        language: orientationBestResult.language
                    };
                    console.log(`✅ New best result: ${orientation.name} (${orientationBestResult.language}) with ${orientationBestResult.confidence}% confidence`);
                }
            }

            // If all orientations are below 50% confidence, try cloud OCR
            if (bestResult.confidence < 50) {
                console.log(`⚠️ All orientations < 50% confidence (${bestResult.confidence}%), trying cloud OCR...`);
                
                try {
                    // Try cloud OCR with the best orientation
                    const cloudResult = await this.cloudAPI.processWithOCRSpace(
                        fs.readFileSync(cleanImagePath), 
                        { language: 'ara+eng' }
                    );
                    
                    if (cloudResult && cloudResult.text && cloudResult.confidence > bestResult.confidence) {
                        bestResult = {
                            text: this.normalizeDigits(cloudResult.text),
                            confidence: cloudResult.confidence,
                            page: pageIndex + 1,
                            orientation: bestResult.orientation, // Keep the best orientation
                            language: 'ara+eng',
                            method: 'cloud-ocr'
                        };
                        console.log(`✅ Cloud OCR improved result: ${cloudResult.confidence}% confidence`);
                    }
                } catch (cloudError) {
                    console.log(`⚠️ Cloud OCR failed: ${cloudError.message}`);
                }
            }

            // Cleanup temp files
            tempPaths.forEach(p => { 
                try { 
                    if (p !== imagePath && fs.existsSync(p)) fs.unlinkSync(p); 
                } catch (_) {} 
            });

            return {
                ...bestResult,
                debugLogs,
                rawText: bestResult.text // Include raw text for debugging
            };

        } catch (error) {
            console.error(`❌ Orientation correction failed for page ${pageIndex + 1}:`, error);
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
     * Process single image with OCR, including orientation detection
     */
    async processImageWithOCR(imagePath, pageIndex) {
        if (!ocrAvailable) {
            return { text: '', confidence: 0, page: pageIndex + 1 };
        }

        try {
            // Always preprocess
            const cleanImagePath = await this.preprocessImage(imagePath);
            const rotatedPaths = [];
            let bestResult = { text: '', confidence: 0, page: pageIndex + 1 };
            const debugLogs = [];

            // Step 1: Try ara+eng first (best for mixed Arabic/English)
            console.log(`🔍 Trying ara+eng for page ${pageIndex + 1}...`);
            let result = await this.performOCR(cleanImagePath, 'ara+eng', false);
            result.text = this.normalizeDigits(result.text || '');
            debugLogs.push({ language: 'ara+eng', confidence: result.confidence, rotation: 0 });
            
            if (result.confidence > bestResult.confidence) {
                bestResult = result;
                console.log(`✅ ara+eng: ${result.confidence}% confidence`);
            }

            // Step 2: If confidence < 40, try Arabic-only
            if (result.confidence < 40) {
                console.log(`🔍 Trying Arabic-only for page ${pageIndex + 1}...`);
                const arabicResult = await this.performOCR(cleanImagePath, 'ara', false);
                arabicResult.text = this.normalizeDigits(arabicResult.text || '');
                debugLogs.push({ language: 'ara', confidence: arabicResult.confidence, rotation: 0 });
                
                if (arabicResult.confidence > bestResult.confidence) {
                    bestResult = arabicResult;
                    console.log(`✅ Arabic-only: ${arabicResult.confidence}% confidence`);
                }
            }

            // Step 3: If still < 40, try English-only
            if (bestResult.confidence < 40) {
                console.log(`🔍 Trying English-only for page ${pageIndex + 1}...`);
                const englishResult = await this.performOCR(cleanImagePath, 'eng', false);
                englishResult.text = this.normalizeDigits(englishResult.text || '');
                debugLogs.push({ language: 'eng', confidence: englishResult.confidence, rotation: 0 });
                
                if (englishResult.confidence > bestResult.confidence) {
                    bestResult = englishResult;
                    console.log(`✅ English-only: ${englishResult.confidence}% confidence`);
                }
            }

            // Step 4: If still < 40, try rotations with ara+eng
            if (bestResult.confidence < 40) {
                console.log(`🔄 Trying rotations for page ${pageIndex + 1}...`);
                const orientations = [
                    { angle: 90, name: '90° clockwise' },
                    { angle: 180, name: '180° upside down' },
                    { angle: 270, name: '270° counter-clockwise' }
                ];

                for (const orientation of orientations) {
                    const rotatedPath = await this.rotateImage(cleanImagePath, orientation.angle, pageIndex);
                    rotatedPaths.push(rotatedPath);
                    
                    // Try ara+eng with rotation
                    let rotatedResult = await this.performOCR(rotatedPath, 'ara+eng', false);
                    rotatedResult.text = this.normalizeDigits(rotatedResult.text || '');
                    debugLogs.push({ language: 'ara+eng', confidence: rotatedResult.confidence, rotation: orientation.angle });
                    
                    if (rotatedResult.confidence > bestResult.confidence) {
                        bestResult = rotatedResult;
                        console.log(`✅ ${orientation.name}: ${rotatedResult.confidence}% confidence`);
                    }
                }
            }

            // Cleanup temp files
            try { if (cleanImagePath !== imagePath && fs.existsSync(cleanImagePath)) fs.unlinkSync(cleanImagePath); } catch (_) {}
            rotatedPaths.forEach(p => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {} });

            return { 
                ...bestResult, 
                page: pageIndex + 1,
                debugLogs: debugLogs
            };
        } catch (error) {
            console.error(`OCR error for page ${pageIndex + 1}:`, error);
            return { text: '', confidence: 0, page: pageIndex + 1 };
        }
    }

    /**
     * Rotate image using Sharp
     */
    async rotateImage(imagePath, angle, pageIndex) {
        if (!ocrAvailable) {
            throw new Error('OCR dependencies not available');
        }

        const rotatedPath = path.join(this.tempDir, `rotated_${pageIndex}_${angle}.png`);
        
        await sharp(imagePath)
            .rotate(angle)
            .png()
            .toFile(rotatedPath);
            
        return rotatedPath;
    }

    /**
     * Perform OCR on image with Tesseract
     */
    async performOCR(imagePath, languages = 'ara+eng', useAutoOrientation = false) {
        if (!ocrAvailable) {
            throw new Error('OCR dependencies not available');
        }

        const options = {
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
                }
            }
        };

        // Use PSM 6 by default (block of text). Only use 1 if explicitly requested
        options.tessedit_pageseg_mode = useAutoOrientation ? 1 : 6;

        const { data } = await Tesseract.recognize(imagePath, languages, options);

        return {
            text: this.normalizeDigits(data.text || ''),
            confidence: data.confidence,
            page: 1 // Will be updated by caller
        };
    }

    /**
     * Calculate average confidence across all pages
     */
    calculateAverageConfidence(results) {
        const validResults = results.filter(r => r.confidence > 0);
        if (validResults.length === 0) return 0;
        
        const totalConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0);
        return Math.round(totalConfidence / validResults.length);
    }

    /**
     * Detect if text contains Arabic characters
     */
    detectArabicText(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    isTextGarbled(text) {
        // Check for specific garbled patterns we've seen
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
        
        // Arabic handling: only treat as garbled if lots of Arabic chars and almost no words
        const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
        const arabicRatio = arabicChars / text.length;
        const actualWords = text.match(/\b[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,}\b/g);
        if (arabicRatio > 0.3 && (!actualWords || actualWords.length < 5)) {
            return true;
        }
        
        // Check if text contains invoice-like content (less likely to be garbled)
        const invoiceKeywords = [
            'invoice', 'invoice no', 'amount', 'vat', 'total', 'net', 'gross',
            'rechnung', 'betrag', 'mwst', 'summe', 'netto', 'brutto',
            '€', '$', '£', '¥', 'currency', 'payment', 'terms'
        ];
        
        const hasInvoiceContent = invoiceKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // If it has invoice content and low garbled ratio, it's probably readable
        if (hasInvoiceContent && garbledRatio < 0.1) {
            return false;
        }
        
        return garbledRatio > 0.05; // 5% threshold for garbled text
    }

    /**
     * Clean up temporary files
     */
    cleanupTempFiles(imagePaths) {
        imagePaths.forEach(imagePath => {
            try {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (error) {
                console.warn(`Failed to delete temp file ${imagePath}:`, error.message);
            }
        });
    }

    /**
     * Check if PDF needs OCR (image-based)
     */
    async needsOCR(pdfBuffer) {
        try {
            // Try regular PDF parsing first
            const pdfParse = require('pdf-parse');
            const data = await pdfParse(pdfBuffer);
            
            const textLength = data.text.trim().length;
            console.log(`📄 PDF text length: ${textLength} characters`);
            
            // If text is very short, likely image-based
            if (textLength < 300) {
                console.log('🖼️ PDF appears to be image-based, OCR required');
                return true;
            }
            
            // Check if text is garbled/corrupted (like the Arabic PDF we saw)
            // Be more strict - only count actual words and meaningful characters
            const actualWords = data.text.match(/\b[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,}\b/g);
            const meaningfulChars = data.text.match(/[a-zA-Z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
            const readableRatio = meaningfulChars ? meaningfulChars.length / textLength : 0;
            
            // Also check for actual words vs garbled sequences
            const wordRatio = actualWords ? actualWords.length / (textLength / 10) : 0; // Normalize by text length
            
            // Check for specific garbled patterns that we've seen
            const garbledPatterns = [
                /[0-9]{8,}/g, // Long sequences of numbers (like 000060009!04)
                /[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s.,!?()-]/g, // Non-printable characters
                /[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF.,!?()-]/g, // Non-standard characters
                /[0-9]{6,}[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]/g, // Numbers mixed with special chars
                /[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g // Any non-printable chars
            ];
            
            let garbledScore = 0;
            garbledPatterns.forEach(pattern => {
                const matches = data.text.match(pattern);
                if (matches) {
                    garbledScore += matches.length;
                }
            });
            
            const garbledRatio = garbledScore / textLength;
            
            // Also check for specific patterns we've seen in the corrupted PDF
            const specificGarbledPatterns = [
                /000[0-9]{6,}/g, // Patterns like 000060009!04
                /[0-9]{3,}[!@#$%^&*()_+=\[\]{}|;':",./<>?~`][0-9]{3,}/g, // Mixed numbers and symbols
                /[^\x20-\x7E\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g // Any non-printable chars
            ];
            
            let specificGarbledScore = 0;
            specificGarbledPatterns.forEach(pattern => {
                const matches = data.text.match(pattern);
                if (matches) {
                    specificGarbledScore += matches.length;
                }
            });
            
            const specificGarbledRatio = specificGarbledScore / textLength;
            
            // If text is garbled or has low readability, force OCR
            if (readableRatio < 0.6 || wordRatio < 0.1 || garbledRatio > 0.15 || specificGarbledRatio > 0.1) {
                console.log(`🖼️ PDF text appears garbled (readable: ${(readableRatio * 100).toFixed(1)}%, words: ${(wordRatio * 100).toFixed(1)}%, garbled: ${(garbledRatio * 100).toFixed(1)}%, specific: ${(specificGarbledRatio * 100).toFixed(1)}%), OCR required`);
                return true;
            }
            
            console.log('📄 PDF has sufficient readable text, OCR not needed');
            return false;
        } catch (error) {
            console.log('🖼️ PDF parsing failed, assuming image-based, OCR required');
            return true;
        }
    }

    /**
     * Enhanced fallback for image-based PDFs - tries multiple conversion methods
     */
    async enhancedFallbackExtraction(pdfBuffer, filename) {
        try {
            console.log('🔍 Attempting enhanced fallback extraction for scanned PDF...');
            
            // Method 1: Try pdf-parse first (in case there's any text)
            const pdfParse = require('pdf-parse');
            let data = await pdfParse(pdfBuffer);
            let text = data.text.trim();
            
            if (text.length > 10) {
                console.log(`📄 Found ${text.length} characters with pdf-parse`);
                
                // Check if the text is garbled and provide better guidance
                const isGarbled = this.isTextGarbled(text);
                if (isGarbled) {
                    console.log('⚠️ Text appears garbled, providing user guidance...');
                    return {
                        text: `This PDF contains corrupted or garbled text that cannot be processed automatically.

The extracted text appears to be: ${text.substring(0, 200)}...

To process this PDF properly, please try one of these methods:

1. **Google Drive OCR** (Recommended):
   - Upload to Google Drive
   - Right-click → "Open with Google Docs"
   - Google will automatically OCR the text
   - Copy the text and save as a new PDF

2. **Adobe Acrobat**:
   - Open in Acrobat
   - Tools → "Enhance Scans" → "Recognize Text"

3. **Online OCR Tools**:
   - SmallPDF.com OCR
   - ILovePDF.com OCR
   - OnlineOCR.net

4. **Manual Text Entry**:
   - Type the invoice data directly into the system

The original PDF appears to be a scanned document with corrupted text encoding.`,
                        confidence: 0,
                        pages: data.numpages || 1,
                        isArabic: this.detectArabicText(text),
                        isGarbled: true,
                        method: 'ocr-guidance'
                    };
                }
                
                return {
                    text: this.normalizeDigits(text),
                    confidence: 60,
                    pages: data.numpages || 1,
                    isArabic: this.detectArabicText(text),
                    method: 'pdf-parse'
                };
            }
            
            // Method 2: Try pdf-poppler conversion (more reliable than pdf2pic)
            if (ocrAvailable) {
                console.log('🔄 Trying pdf-poppler conversion...');
                try {
                    const poppler = require('pdf-poppler');
                    const tempPdfPath = path.join(this.tempDir, `temp_poppler_${Date.now()}.pdf`);
                    fs.writeFileSync(tempPdfPath, pdfBuffer);
                    
                    const options = {
                        format: 'png',
                        out_dir: this.tempDir,
                        out_prefix: 'page',
                        page: null // Convert all pages
                    };
                    
                    let images = [];
                    try {
                        const result = await poppler.convert(tempPdfPath, options);
                        console.log(`📄 Poppler conversion result:`);
                        // Handle different return formats
                        if (Array.isArray(result)) {
                            images = result;
                        } else if (result && typeof result === 'object') {
                            images = Object.values(result);
                        }
                    } finally {
                        // Always remove temp poppler PDF
                        try { if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath); } catch (_) {}
                    }
                    
                    console.log(`📄 Converted PDF to ${images.length} images with poppler`);
                    
                    // OCR all images in parallel
                    const perPage = await Promise.all(images.map(async (img, idx) => {
                        try {
                            const imagePath = typeof img === 'string' ? img : img.path || img.name;
                            if (!imagePath || !fs.existsSync(imagePath)) return { page: idx + 1, text: '', confidence: 0 };
                            const cleanImagePath = await this.preprocessImage(imagePath);
                            const ocrResult = await this.performOCR(cleanImagePath, 'ara+eng', false);
                            if (cleanImagePath !== imagePath) {
                                try { if (fs.existsSync(cleanImagePath)) fs.unlinkSync(cleanImagePath); } catch (_) {}
                            }
                            return { page: idx + 1, text: ocrResult.text, confidence: ocrResult.confidence };
                        } catch (e) {
                            console.warn(`Failed to process image ${idx + 1}:`, e.message);
                            return { page: idx + 1, text: '', confidence: 0 };
                        } finally {
                            // Remove original image file
                            const imagePath = typeof img === 'string' ? img : img.path || img.name;
                            try { if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath); } catch (_) {}
                        }
                    }));
                    
                    const combined = perPage.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n');
                    const avgConf = this.calculateAverageConfidence(perPage);
                    if (combined && combined.length > 0) {
                        return {
                            text: this.normalizeDigits(combined),
                            confidence: avgConf,
                            pages: perPage.length,
                            isArabic: this.detectArabicText(combined),
                            method: 'poppler-ocr',
                            pageDetails: perPage
                        };
                    }
                } catch (popplerError) {
                    console.log('Poppler conversion failed:', popplerError.message);
                }
            } else {
                console.log('⚠️ OCR dependencies not available, skipping image conversion');
            }
            
            // Method 3: Try pdf2pic with different settings
            if (ocrAvailable) {
                console.log('🔄 Trying pdf2pic with minimal settings...');
                try {
                    const { fromPath } = pdf2pic;
                    const tempPdfPath = path.join(this.tempDir, `temp_pdf2pic_${Date.now()}.pdf`);
                    fs.writeFileSync(tempPdfPath, pdfBuffer);
                    
                    let imagePaths = [];
                    try {
                        const convert = fromPath(tempPdfPath, {
                            density: 100, // Very low DPI
                            saveFilename: "page",
                            savePath: this.tempDir,
                            format: "png",
                            width: 600,
                            height: 800
                        });
                        const results = await convert.bulk(-1);
                        imagePaths = results.map(r => path.join(this.tempDir, r.name));
                        console.log(`📄 PDF2Pic converted to ${imagePaths.length} images`);
                    } finally {
                        // Always remove temp pdf2pic PDF
                        try { if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath); } catch (_) {}
                    }
                    
                    if (imagePaths.length > 0) {
                        // OCR all images in parallel (first few to limit time)
                        const take = Math.min(imagePaths.length, 3);
                        const subset = imagePaths.slice(0, take);
                        const perPage = await Promise.all(subset.map(async (p, idx) => {
                            try {
                                const clean = await this.preprocessImage(p);
                                const ocrRes = await this.performOCR(clean, 'ara+eng', false);
                                if (clean !== p) { try { if (fs.existsSync(clean)) fs.unlinkSync(clean); } catch (_) {} }
                                return { page: idx + 1, text: ocrRes.text, confidence: ocrRes.confidence };
                            } catch (e) {
                                console.warn(`Failed OCR on pdf2pic image ${idx + 1}:`, e.message);
                                return { page: idx + 1, text: '', confidence: 0 };
                            } finally {
                                try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
                            }
                        }));
                        const combined = perPage.map(p => p.text).join('\n\n--- PAGE BREAK ---\n\n');
                        const avg = this.calculateAverageConfidence(perPage);
                        if (combined && combined.length > 0) {
                            return {
                                text: this.normalizeDigits(combined),
                                confidence: avg,
                                pages: perPage.length,
                                isArabic: this.detectArabicText(combined),
                                method: 'pdf2pic-ocr',
                                pageDetails: perPage
                            };
                        }
                    }
                    
                } catch (pdf2picError) {
                    console.log('PDF2Pic conversion failed:', pdf2picError.message);
                }
            } else {
                console.log('⚠️ OCR dependencies not available, skipping pdf2pic conversion');
            }
            
            // If all methods failed, provide helpful message
            console.log('❌ All OCR methods failed');
            return {
                text: `This PDF is a scanned document (non-searchable) and requires OCR processing.

The PDF could not be processed automatically. To extract text from this scanned PDF:

1. **Google Drive OCR** (Recommended):
   - Upload to Google Drive
   - Right-click → "Open with Google Docs"
   - Google will automatically OCR the text

2. **Adobe Acrobat**:
   - Open in Acrobat
   - Tools → "Enhance Scans" → "Recognize Text"

3. **Online OCR Tools**:
   - SmallPDF.com OCR
   - ILovePDF.com OCR
   - OnlineOCR.net

File: ${filename}
Type: Scanned PDF (Image-based)
Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`,
                confidence: 0,
                pages: 1,
                isArabic: false,
                method: 'ocr-guidance'
            };
            
        } catch (error) {
            console.error('Enhanced fallback extraction error:', error);
            return {
                text: `Unable to process scanned PDF: ${filename}. Please use one of the suggested OCR tools to convert this image-based PDF to text.`,
                confidence: 0,
                pages: 1,
                isArabic: false,
                method: 'ocr-guidance'
            };
        }
    }

    /**
     * Process image files with Google Cloud Vision OCR
     */
    async processImage(imageBuffer, filename) {
        console.log('🖼️ Processing image with Google Cloud Vision OCR...');
        
        try {
            // Try Google Cloud Vision first
            if (this.googleCloudVision) {
                try {
                    const gcpResult = await this.googleCloudVision.processImage(imageBuffer, filename);
                    
                    if (gcpResult.text && gcpResult.text.length > 0) {
                        const normalizedText = this.normalizeDigits(gcpResult.text);
                        
                        console.log('✅ Google Cloud Vision OCR successful');
                        
                        return {
                            text: normalizedText,
                            confidence: gcpResult.confidence,
                            pages: gcpResult.pages,
                            isArabic: this.detectArabicText(normalizedText),
                            method: gcpResult.method,
                            service: gcpResult.service
                        };
                    }
                } catch (gcpError) {
                    console.log('⚠️ Google Cloud Vision failed:', gcpError.message);
                }
            }
            
            // Fallback to local OCR if available
            if (ocrAvailable && Tesseract && sharp) {
                console.log('🔄 Falling back to local OCR...');
                
                try {
                    // Save image to temp file
                    const tempImagePath = path.join(this.tempDir, `temp_image_${Date.now()}.png`);
                    await sharp(imageBuffer)
                        .png()
                        .toFile(tempImagePath);
                    
                    // Preprocess image
                    const processedImagePath = await this.preprocessImage(tempImagePath);
                    
                    // Perform OCR
                    const ocrResult = await this.performOCR(processedImagePath, 'ara+eng', false);
                    
                    // Clean up temp files
                    try {
                        if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
                        if (fs.existsSync(processedImagePath) && processedImagePath !== tempImagePath) {
                            fs.unlinkSync(processedImagePath);
                        }
                    } catch (cleanupError) {
                        console.warn('Cleanup warning:', cleanupError.message);
                    }
                    
                    if (ocrResult.text && ocrResult.text.length > 0) {
                        const normalizedText = this.normalizeDigits(ocrResult.text);
                        
                        console.log('✅ Local OCR successful');
                        
                        return {
                            text: normalizedText,
                            confidence: ocrResult.confidence,
                            pages: 1,
                            isArabic: this.detectArabicText(normalizedText),
                            method: 'local-tesseract',
                            service: 'Tesseract OCR'
                        };
                    }
                } catch (localError) {
                    console.log('⚠️ Local OCR failed:', localError.message);
                }
            }
            
            // If all methods failed, provide guidance
            console.log('❌ All image OCR methods failed');
            return {
                text: `This image could not be processed automatically. 

File: ${filename}
Type: Image file
Size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB

**Recommended solutions:**

1. **Google Drive OCR** (Free & Best):
   - Upload image to Google Drive
   - Right-click → "Open with Google Docs"
   - Google will automatically OCR the text
   - Copy the text and re-upload as PDF

2. **Online OCR Tools**:
   - SmallPDF.com OCR
   - ILovePDF.com OCR
   - OnlineOCR.net
   - ILovePDF.com OCR

3. **Manual Entry**:
   - Use the manual data entry form below
   - Enter invoice details manually

4. **Improve Image Quality**:
   - Ensure image is clear and high resolution
   - Try scanning at higher DPI
   - Ensure good lighting and contrast`,
                confidence: 0,
                pages: 1,
                isArabic: false,
                method: 'ocr-guidance',
                service: 'Guidance'
            };
            
        } catch (error) {
            console.error('❌ Image processing error:', error);
            return {
                text: `Unable to process image: ${filename}. Please try one of the suggested OCR tools or use manual data entry.`,
                confidence: 0,
                pages: 1,
                isArabic: false,
                method: 'error',
                service: 'Error'
            };
        }
    }
}

module.exports = OCRService;
