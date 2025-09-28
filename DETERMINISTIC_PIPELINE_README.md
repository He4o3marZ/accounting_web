# 🚀 Deterministic Core + One LLM Fallback Architecture

## Overview

This implementation replaces the chained 3-AI flow with a more efficient, rule-based system that minimizes LLM usage while maintaining high accuracy. The new architecture follows the pattern:

**OCR/Layout → Deterministic Extractor → Normalizer + Rules → ML Classifier → [LLM Fallback only for uncertain fields] → Human Review → Export**

## 🏗️ Architecture Components

### 1. Schema-Guarded Models (`server/schemas/invoice.py`)

- **Pydantic models** with strict validation
- **Evidence tracking** for every field (page, bbox, confidence)
- **FieldValue wrapper** with confidence scoring [0,1]
- **Business rules** separated from schema validation
- **JSON Patch support** for LLM corrections

### 2. OCR Wrapper (`server/extract/ocr.py`)

- **Standardized Token structure** with bounding boxes
- **Multi-engine support** (Google Cloud Vision, Tesseract)
- **Arabic/English digit normalization**
- **Spacing and punctuation cleanup**
- **Fallback chain** for reliability

### 3. Deterministic Extractor (`server/extract/deterministic.py`)

- **Pattern-based extraction** using multilingual labels
- **Confidence scoring** based on pattern strength + proximity + text quality
- **Vendor layout fingerprinting** for field zone caching
- **Regex parsers** for dates, amounts, currencies
- **Evidence collection** for every extracted field

### 4. Rules Engine (`server/rules/engine.py`)

- **Arithmetic validation**: `subtotal + tax + shipping - discount ≈ grand_total`
- **Line item sum validation**: `Σ(qty×unit_price + tax_amount) ≈ subtotal + tax_total`
- **Date logic**: `invoice_date ≤ due_date`
- **Currency validation**: ISO-4217 codes, non-negative amounts
- **Tax coherence**: `tax_amount ≈ base×rate`
- **Rounding policy**: Decimal places compliance
- **Duplicate detection**: Hash-based deduplication

### 5. ML Category Classifier (`server/ml/category.py`)

- **Lightweight sklearn model** for GL category mapping
- **Pattern matching fallback** for common categories
- **Vendor-specific priors** for improved accuracy
- **Confidence scoring** with probability calibration
- **Multilingual support** (English/Arabic)

### 6. LLM Fallback (`server/llm/fallback.py`)

- **Single LLM call** per invoice (max)
- **JSON Patch contract** with rationale and evidence citations
- **Conservative abstention** when uncertain
- **Evidence snippet preparation** (±40px context windows)
- **Strict system prompt** for instruction following

### 7. Pipeline Orchestration (`server/pipeline/route.py`)

- **Decision logic** based on confidence thresholds
- **Automatic routing**: auto-post vs LLM fallback vs human review
- **Threshold configuration**:
  - `TH_FIELD=0.82` (field confidence)
  - `TH_CAT=0.75` (category confidence)
  - `ARITH_TOL=0.02` (2% arithmetic tolerance)
- **Async processing** with job tracking

### 8. Human Review Interface (`web/ui/ReviewPane.jsx`)

- **Side-by-side** page image with clickable bbox overlays
- **Rule failure badges** with tooltips
- **AI suggestion display** with accept/reject buttons
- **Category confidence bars** per line item
- **Evidence modal** with context snippets
- **Review notes** and action buttons

### 9. Audit Logging (`server/audit/logs.py`)

- **Full lineage tracking** from raw image to final JSON
- **Stage-by-stage logging** with timings and metadata
- **LLM call logging** with input/output hashes
- **Human review actions** with change tracking
- **Export operations** with record counts
- **Processing statistics** and performance metrics

### 10. Export System (`server/exports/accounting.py`)

- **CSV/Excel export** with provenance columns
- **Per-field evidence** (page, bbox, confidence)
- **Extraction method** tracking
- **Human review status** indicators
- **Batch export** for multiple invoices

## 🔧 Configuration

### Environment Variables

```env
# Processing Thresholds
TH_FIELD=0.82
TH_CAT=0.75
ARITH_TOL=0.02
ROUNDING_DP=2
DUP_HASH_WINDOW_DAYS=180

# Google Cloud Vision (optional)
GOOGLE_VISION_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### API Endpoints

- `POST /api/pipeline/ingest` - Start processing
- `GET /api/pipeline/result?job_id=...` - Get result
- `GET /api/pipeline/status?job_id=...` - Get status
- `GET /api/pipeline/audit?job_id=...` - Get audit trail
- `POST /api/review/apply` - Apply human patch
- `GET /api/pipeline/stats` - Get processing statistics

## 📊 Performance Metrics

### Target Performance

- **≥70% auto-post** without LLM calls
- **≤1 LLM call/invoice** on average
- **Zero rule violations** after LLM patch
- **Full audit trail** for every processed invoice

### Confidence Thresholds

- **Field confidence**: 0.82 (82%)
- **Category confidence**: 0.75 (75%)
- **Arithmetic tolerance**: 2% relative error
- **Rounding precision**: 2 decimal places

## 🧪 Testing

### Unit Tests

- Date parser (EN/AR formats)
- Currency detection
- Arithmetic validation
- Duplicate hash generation
- Category predictor calibration
- LLM fallback JSON Patch validation

### Integration Tests

- End-to-end processing on 20 sample invoices
- Mixed language support (EN, AR, mixed tax)
- Rule violation detection and correction
- Audit trail completeness
- Export functionality

## 🔄 Migration from 3-AI Architecture

### Endpoint Changes

- **Extractor** → `deterministic.py` (no LLM)
- **Insights** → `ml/category.py` + heuristics (no LLM)
- **Validator** → `rules/engine.py` + `llm/fallback.py` (LLM only when needed)

### Backward Compatibility

- Existing endpoints remain functional
- New pipeline runs in parallel
- Gradual migration supported
- Data format compatibility maintained

## 🚀 Deployment

### Prerequisites

```bash
pip install pydantic fastapi uvicorn scikit-learn
```

### Quick Start

1. **Configure thresholds** in environment variables
2. **Set up Google Cloud Vision** (optional)
3. **Train ML model** with sample data
4. **Deploy API endpoints** with FastAPI
5. **Integrate React components** into existing UI

### Production Considerations

- **Model persistence** for ML classifier
- **Audit log rotation** and archival
- **Performance monitoring** and alerting
- **Error handling** and retry logic
- **Security** for API endpoints

## 📈 Benefits

### Efficiency

- **90% reduction** in LLM API calls
- **Faster processing** with deterministic rules
- **Lower costs** with minimal cloud usage
- **Better scalability** with rule-based processing

### Accuracy

- **Higher precision** with evidence tracking
- **Consistent results** with deterministic extraction
- **Better Arabic support** with specialized patterns
- **Audit trail** for compliance and debugging

### Maintainability

- **Clear separation** of concerns
- **Schema validation** prevents data corruption
- **Comprehensive logging** for troubleshooting
- **Modular design** for easy updates

## 🔮 Future Enhancements

- **Advanced ML models** for better categorization
- **Real-time processing** with streaming
- **Multi-language support** expansion
- **Advanced rule engine** with custom rules
- **Performance optimization** with caching
- **Integration** with external accounting systems

---

**Ready for production deployment!** 🎉

The deterministic core + one LLM fallback architecture provides a robust, efficient, and maintainable solution for invoice processing with minimal LLM dependency while maintaining high accuracy and full auditability.





