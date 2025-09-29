# 🌐 Google Cloud Vision OCR Setup Guide

## Why Google Cloud Vision?

Google Cloud Vision is the **perfect solution** for your accounting system because:

- ✅ **Solves Windows dependency issues** - No local compilation required
- ✅ **Superior Arabic text recognition** - Google's ML models excel at Arabic/English mixed documents
- ✅ **Professional-grade accuracy** - Much better than local Tesseract
- ✅ **Handles complex PDFs** - Better at processing scanned invoices and financial documents
- ✅ **Cost-effective** - Free tier + pay-per-use pricing
- ✅ **Reliable** - Enterprise-grade uptime and performance

## Quick Setup (5 minutes)

### Option 1: API Key Setup (Recommended for development)

1. **Get Google Cloud API Key:**
   ```bash
   # Visit: https://console.cloud.google.com/
   # 1. Create/select project
   # 2. Enable Vision API
   # 3. Create API key
   # 4. Restrict to Vision API only
   ```

2. **Run setup script:**
   ```bash
   node setup-google-cloud-vision.js
   # Choose option 2 (API Key)
   # Enter your API key when prompted
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Test the setup:**
   ```bash
   npm start
   # Upload a PDF to test OCR
   ```

### Option 2: Service Account (Recommended for production)

1. **Create Service Account:**
   ```bash
   # Visit: https://console.cloud.google.com/
   # 1. Create/select project
   # 2. Enable Vision API
   # 3. Create Service Account
   # 4. Download JSON key file
   ```

2. **Run setup script:**
   ```bash
   node setup-google-cloud-vision.js
   # Choose option 1 (Service Account)
   # Enter project ID and key file path
   ```

## Manual Setup

If you prefer manual setup, add these to your `.env` file:

```env
# Option 1: API Key (simpler)
GOOGLE_VISION_KEY=your_api_key_here

# Option 2: Service Account (more secure)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## How It Works

### OCR Processing Flow

1. **PDF Upload** → System receives PDF
2. **Text Extraction** → Try `pdf-parse` first
3. **Quality Check** → Detect if text is garbled/Arabic
4. **Google Cloud Vision** → Process with GCP if needed
5. **Text Normalization** → Convert Arabic digits to Western
6. **Financial Analysis** → Extract invoice data

### Priority Order

```
1. pdf-parse (fast, for text-based PDFs)
2. Google Cloud Vision (best accuracy, for scanned PDFs)
3. Other cloud OCR services (fallback)
4. Local OCR (if available)
```

## Cost Analysis

### Google Cloud Vision Pricing

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Text Detection** | 1,000 requests/month | $1.50 per 1,000 requests |
| **Document Text Detection** | 1,000 requests/month | $1.50 per 1,000 requests |

### Your Usage Estimate

- **Small business**: ~100 PDFs/month = **FREE** (within free tier)
- **Medium business**: ~500 PDFs/month = **$0.60/month** (500 × $1.50/1000)
- **Large business**: ~2,000 PDFs/month = **$1.50/month** (2000 × $1.50/1000)

**Much cheaper than maintaining local OCR infrastructure!**

## Testing Your Setup

### 1. Test with Sample PDFs

```bash
# Start the application
npm start

# Upload a PDF through the web interface
# Check console logs for:
# "🌐 Processing PDF with Google Cloud Vision..."
# "✅ Google Cloud Vision successful (XX% confidence)"
```

### 2. Test Arabic Text Recognition

Upload a PDF with Arabic text and verify:
- Arabic digits are converted to Western digits
- Arabic text is properly recognized
- Mixed Arabic/English content is handled correctly

### 3. Test Complex PDFs

Try uploading:
- Scanned invoices
- Multi-page documents
- PDFs with complex layouts
- Low-quality scanned documents

## Troubleshooting

### Common Issues

#### 1. "Google Cloud Vision not available"
```bash
# Check your .env file has the correct variables
cat .env | grep GOOGLE

# Verify API key is valid
node setup-google-cloud-vision.js
```

#### 2. "API key not valid"
- Check if Vision API is enabled in Google Cloud Console
- Verify API key restrictions
- Ensure billing is enabled

#### 3. "Service account not found"
- Check file path in `GOOGLE_APPLICATION_CREDENTIALS`
- Verify JSON key file is valid
- Ensure service account has Vision API permissions

### Debug Mode

Enable detailed logging:

```javascript
// Add to your .env file
DEBUG=google-cloud-vision
```

## Performance Comparison

| OCR Method | Arabic Accuracy | Speed | Setup Complexity | Cost |
|------------|----------------|-------|------------------|------|
| **Google Cloud Vision** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Local Tesseract | ⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Other Cloud APIs | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

## Migration from Local OCR

Your current system will automatically:

1. **Detect** if Google Cloud Vision is configured
2. **Prioritize** GCP over local OCR
3. **Fallback** to local OCR if GCP fails
4. **Maintain** all existing functionality

**No code changes needed** - just run the setup script!

## Security Best Practices

### API Key Security
- Restrict API key to Vision API only
- Set up IP restrictions if needed
- Rotate keys regularly
- Monitor usage in Google Cloud Console

### Service Account Security
- Use least privilege principle
- Store key file securely
- Don't commit keys to version control
- Use environment variables

## Support

### Google Cloud Vision Documentation
- [Official Documentation](https://cloud.google.com/vision/docs)
- [API Reference](https://cloud.google.com/vision/docs/reference/rest)
- [Pricing Information](https://cloud.google.com/vision/pricing)

### Your System
- Check console logs for detailed error messages
- Use the test connection feature in setup script
- Verify PDF file format and size limits

## Next Steps

1. **Run setup script**: `node setup-google-cloud-vision.js`
2. **Install dependencies**: `npm install`
3. **Test with sample PDFs**
4. **Monitor performance** in Google Cloud Console
5. **Scale as needed** based on usage

---

**Ready to get started?** Run `node setup-google-cloud-vision.js` now! 🚀









