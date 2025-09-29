"""
Invoice Schema Definitions with Evidence Tracking
Schema-guarded models for deterministic extraction pipeline
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class Evidence(BaseModel):
    """Evidence for a field value with bounding box and page information"""
    page: int = Field(..., description="Page number (0-indexed)")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2] in pixels")
    text: str = Field(..., description="Raw text from OCR")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence for this text")


class FieldValue(BaseModel):
    """A field value with confidence and evidence"""
    value: Optional[Union[str, int, float, Decimal, date, datetime]] = None
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score [0,1]")
    evidence: List[Evidence] = Field(default_factory=list, description="Supporting evidence")
    
    @validator('confidence')
    def confidence_range(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence must be between 0.0 and 1.0')
        return v


class CurrencyCode(str, Enum):
    """ISO 4217 currency codes"""
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    JPY = "JPY"
    SAR = "SAR"
    AED = "AED"
    EGP = "EGP"
    QAR = "QAR"
    KWD = "KWD"
    BHD = "BHD"


class Vendor(BaseModel):
    """Vendor information with evidence tracking"""
    name: FieldValue = Field(..., description="Vendor/company name")
    address: Optional[FieldValue] = None
    tax_id: Optional[FieldValue] = None
    phone: Optional[FieldValue] = None
    email: Optional[FieldValue] = None
    
    # Vendor fingerprinting for layout caching
    layout_hash: Optional[str] = Field(None, description="Hash of top-15 text blocks for layout recognition")


class Amounts(BaseModel):
    """Financial amounts with evidence tracking"""
    subtotal: Optional[FieldValue] = None
    tax_amount: Optional[FieldValue] = None
    tax_rate: Optional[FieldValue] = None
    discount: Optional[FieldValue] = None
    shipping: Optional[FieldValue] = None
    grand_total: FieldValue = Field(..., description="Total amount (required)")
    currency: FieldValue = Field(..., description="Currency code")
    
    @validator('grand_total')
    def grand_total_required(cls, v):
        if v.value is None:
            raise ValueError('Grand total is required')
        return v
    
    @validator('currency')
    def currency_required(cls, v):
        if v.value is None:
            raise ValueError('Currency is required')
        return v


class LineItem(BaseModel):
    """Individual line item with evidence tracking"""
    description: FieldValue = Field(..., description="Item description")
    quantity: Optional[FieldValue] = None
    unit_price: Optional[FieldValue] = None
    total: Optional[FieldValue] = None
    tax_amount: Optional[FieldValue] = None
    tax_rate: Optional[FieldValue] = None
    
    # ML Classification results
    category: Optional[str] = Field(None, description="GL category from ML model")
    category_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="ML confidence")
    
    @validator('description')
    def description_required(cls, v):
        if v.value is None or str(v.value).strip() == "":
            raise ValueError('Line item description is required')
        return v


class Invoice(BaseModel):
    """Complete invoice with evidence tracking and provenance"""
    # Core identifiers
    invoice_number: FieldValue = Field(..., description="Invoice number (required)")
    invoice_date: FieldValue = Field(..., description="Invoice date (required)")
    due_date: Optional[FieldValue] = None
    
    # Vendor information
    vendor: Vendor = Field(..., description="Vendor information")
    
    # Financial information
    amounts: Amounts = Field(..., description="Financial amounts")
    
    # Line items
    line_items: List[LineItem] = Field(default_factory=list, description="Line items")
    
    # Additional fields
    notes: Optional[FieldValue] = None
    payment_terms: Optional[FieldValue] = None
    po_number: Optional[FieldValue] = None
    
    # Processing metadata
    processing_id: str = Field(..., description="Unique processing ID")
    created_at: datetime = Field(default_factory=datetime.now, description="Processing timestamp")
    source_file: str = Field(..., description="Source file name")
    
    # Pipeline stage tracking
    extraction_method: str = Field(..., description="Method used for extraction")
    llm_patch_applied: bool = Field(default=False, description="Whether LLM patch was applied")
    human_reviewed: bool = Field(default=False, description="Whether human reviewed")
    
    # Duplicate detection
    duplicate_hash: Optional[str] = Field(None, description="Hash for duplicate detection")
    
    @validator('invoice_number')
    def invoice_number_required(cls, v):
        if v.value is None or str(v.value).strip() == "":
            raise ValueError('Invoice number is required')
        return v
    
    @validator('invoice_date')
    def invoice_date_required(cls, v):
        if v.value is None:
            raise ValueError('Invoice date is required')
        return v
    
    @validator('vendor')
    def vendor_required(cls, v):
        if v.name.value is None or str(v.name.value).strip() == "":
            raise ValueError('Vendor name is required')
        return v
    
    @validator('amounts')
    def amounts_required(cls, v):
        if v.grand_total.value is None:
            raise ValueError('Grand total is required')
        if v.currency.value is None:
            raise ValueError('Currency is required')
        return v


class RuleReport(BaseModel):
    """Report of rule validation results"""
    passed: bool = Field(..., description="Whether all rules passed")
    failures: List[Dict[str, Any]] = Field(default_factory=list, description="Failed rules")
    warnings: List[Dict[str, Any]] = Field(default_factory=list, description="Rule warnings")
    
    def ok(self) -> bool:
        """Check if all rules passed"""
        return self.passed and len(self.failures) == 0


class JsonPatch(BaseModel):
    """JSON Patch operation with rationale and evidence citations"""
    op: str = Field(..., description="Operation: add, remove, replace, move, copy, test")
    path: str = Field(..., description="JSON Pointer path")
    value: Any = Field(..., description="New value")
    rationale: str = Field(..., description="Human-readable explanation")
    cites_bbox: List[str] = Field(default_factory=list, description="Evidence bbox IDs")


class ProcessingResult(BaseModel):
    """Complete processing result with audit trail"""
    invoice: Invoice = Field(..., description="Processed invoice")
    rule_report: RuleReport = Field(..., description="Rule validation results")
    llm_patch: Optional[List[JsonPatch]] = Field(None, description="LLM patch if applied")
    final_json: Dict[str, Any] = Field(..., description="Final invoice JSON")
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list, description="Full processing log")
    status: str = Field(..., description="Processing status: auto_posted, needs_review, failed")


class Token(BaseModel):
    """OCR token with bounding box and confidence"""
    text: str = Field(..., description="Extracted text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence")
    page: int = Field(..., description="Page number (0-indexed)")
    bbox: List[float] = Field(..., description="Bounding box [x1, y1, x2, y2]")
    
    @validator('bbox')
    def bbox_format(cls, v):
        if len(v) != 4:
            raise ValueError('Bbox must have exactly 4 coordinates [x1, y1, x2, y2]')
        if v[0] >= v[2] or v[1] >= v[3]:
            raise ValueError('Invalid bbox coordinates: x1 < x2 and y1 < y2')
        return v


class EvidenceSnippet(BaseModel):
    """Evidence snippet for LLM fallback with context"""
    bbox_id: str = Field(..., description="Unique bbox identifier")
    text: str = Field(..., description="Text content")
    context: str = Field(..., description="Surrounding context")
    page: int = Field(..., description="Page number")
    bbox: List[float] = Field(..., description="Bounding box coordinates")


# Configuration models
class ProcessingThresholds(BaseModel):
    """Configuration thresholds for processing decisions"""
    field_confidence_threshold: float = Field(default=0.82, ge=0.0, le=1.0)
    category_confidence_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    arithmetic_tolerance: float = Field(default=0.02, ge=0.0, le=1.0)  # 2% relative tolerance
    rounding_decimal_places: int = Field(default=2, ge=0)
    duplicate_hash_window_days: int = Field(default=180, ge=1)
    
    @validator('field_confidence_threshold', 'category_confidence_threshold')
    def confidence_range(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence thresholds must be between 0.0 and 1.0')
        return v


# Export models
class ExportRow(BaseModel):
    """Row for CSV/Excel export with provenance"""
    field_name: str = Field(..., description="Field name")
    field_value: Any = Field(..., description="Field value")
    confidence: float = Field(..., description="Field confidence")
    evidence_page: Optional[int] = Field(None, description="Evidence page")
    evidence_bbox: Optional[List[float]] = Field(None, description="Evidence bbox")
    extraction_method: str = Field(..., description="How field was extracted")
    human_reviewed: bool = Field(default=False, description="Whether human reviewed")







