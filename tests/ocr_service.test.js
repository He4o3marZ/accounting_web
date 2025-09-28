const fs = require('fs');
const path = require('path');
const OCRService = require('../services/ocrService');

function existsClean(dir, pattern) {
  if (!fs.existsSync(dir)) return true;
  const files = fs.readdirSync(dir).filter(f => pattern.test(f));
  return files.length === 0;
}

describe('OCRService - Hybrid PDF/OCR', () => {
  const ocr = new OCRService();
  const samples = {
    csv: path.join(process.cwd(), 'sample_data.csv'),
    cleanPdf: path.join(process.cwd(), 'sample-invoice.pdf'),
    arabicPdf: path.join(process.cwd(), 'Invoices (1)_compressed.pdf'),
  };

  test('Clean PDF via pdf-parse should have high confidence and consistent shape', async () => {
    if (!fs.existsSync(samples.cleanPdf)) return; // skip if not present
    const buf = fs.readFileSync(samples.cleanPdf);
    const res = await ocr.processPDF(buf, 'sample-invoice.pdf');
    expect(typeof res.text).toBe('string');
    expect(typeof res.confidence).toBe('number');
    expect(typeof res.pages).toBe('number');
    expect(typeof res.isArabic).toBe('boolean');
    expect(typeof res.method).toBe('string');
    expect(res.confidence).toBeGreaterThanOrEqual(70);
  }, 60000);

  test('Arabic scanned PDF returns consistent shape and pageDetails when OCR used', async () => {
    if (!fs.existsSync(samples.arabicPdf)) return; // skip if not present
    const buf = fs.readFileSync(samples.arabicPdf);
    const res = await ocr.processPDF(buf, 'Invoices (1)_compressed.pdf');
    expect(typeof res.text).toBe('string');
    expect(typeof res.confidence).toBe('number');
    expect(typeof res.pages).toBe('number');
    expect(typeof res.isArabic).toBe('boolean');
    expect(typeof res.method).toBe('string');
    if (res.method !== 'pdf-parse' && res.method !== 'pdf-parse-fallback') {
      expect(Array.isArray(res.pageDetails)).toBe(true);
      if (res.pageDetails.length > 0) {
        const p = res.pageDetails[0];
        expect(typeof p.page).toBe('number');
        expect(typeof p.text).toBe('string');
        expect(typeof p.confidence).toBe('number');
      }
    }
  }, 120000);

  test('Corrupted PDF returns guidance/error and consistent shape', async () => {
    // Create a fake corrupted PDF buffer
    const corrupted = Buffer.from('%PDF-1.7\n%����\n1 0 obj\n<<<BROKEN>>>', 'utf8');
    const res = await ocr.processPDF(corrupted, 'corrupted.pdf');
    expect(typeof res.text).toBe('string');
    expect(typeof res.confidence).toBe('number');
    expect(typeof res.pages).toBe('number');
    expect(typeof res.isArabic).toBe('boolean');
    expect(typeof res.method).toBe('string');
    // Should either be pdf-parse-error / pdf-lib-error / ocr-guidance with error field
    if (res.method.endsWith('error')) {
      expect(typeof res.error).toBe('string');
    }
  }, 30000);

  test('Temp files cleaned up after OCR', async () => {
    const tmpDir = ocr.tempDir;
    if (!fs.existsSync(samples.arabicPdf)) return; // skip if not present
    const before = fs.readdirSync(tmpDir);
    const buf = fs.readFileSync(samples.arabicPdf);
    await ocr.processPDF(buf, 'Invoices (1)_compressed.pdf');
    const after = fs.readdirSync(tmpDir);
    // No excessive growth of temp images (rotated_*.png or page*.png)
    const beforeImgs = before.filter(f => /^(rotated_|page)/.test(f)).length;
    const afterImgs = after.filter(f => /^(rotated_|page)/.test(f)).length;
    expect(afterImgs).toBeLessThanOrEqual(beforeImgs + 1); // allow tiny fluctuation
  }, 60000);
});





