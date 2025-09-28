"""
Deterministic Invoice Extractor
Rule-based extraction with confidence scoring and evidence tracking
"""

import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from ..schemas.invoice import (
    Invoice, Vendor, Amounts, LineItem, FieldValue, Evidence, 
    CurrencyCode, Token, ProcessingThresholds
)
import logging

logger = logging.getLogger(__name__)


class DeterministicExtractor:
    """Deterministic invoice extractor using pattern matching and rules"""
    
    def __init__(self, thresholds: ProcessingThresholds = None):
        self.thresholds = thresholds or ProcessingThresholds()
        self.label_patterns = self._build_label_patterns()
        self.date_patterns = self._build_date_patterns()
        self.currency_patterns = self._build_currency_patterns()
        self.vendor_cache = {}  # Cache for vendor layout fingerprints
    
    def _build_label_patterns(self) -> Dict[str, List[str]]:
        """Build multilingual label patterns for key fields"""
        return {
            'total': [
                # English
                'total', 'grand total', 'amount due', 'net total', 'final total',
                'amount', 'sum', 'subtotal', 'total amount', 'invoice total',
                # Arabic
                'الإجمالي', 'المجموع', 'المبلغ الإجمالي', 'المبلغ المستحق',
                'المبلغ النهائي', 'المبلغ الصافي', 'إجمالي الفاتورة'
            ],
            'tax': [
                # English
                'tax', 'vat', 'gst', 'sales tax', 'tax amount', 'tax total',
                'value added tax', 'taxable amount', 'tax rate',
                # Arabic
                'ضريبة', 'ضريبة القيمة المضافة', 'ضريبة المبيعات', 'مبلغ الضريبة',
                'إجمالي الضريبة', 'نسبة الضريبة', 'المبلغ الخاضع للضريبة'
            ],
            'discount': [
                # English
                'discount', 'deduction', 'rebate', 'discount amount', 'discount total',
                'reduction', 'off', 'less', 'minus',
                # Arabic
                'خصم', 'تخفيض', 'خصم المبلغ', 'إجمالي الخصم', 'ناقص', 'أقل'
            ],
            'shipping': [
                # English
                'shipping', 'delivery', 'freight', 'transport', 'shipping cost',
                'delivery fee', 'freight charge', 'shipping fee',
                # Arabic
                'الشحن', 'التوصيل', 'الشحن والتوصيل', 'رسوم الشحن', 'تكلفة الشحن'
            ],
            'invoice_number': [
                # English
                'invoice', 'invoice no', 'invoice number', 'inv no', 'inv number',
                'bill', 'bill no', 'bill number', 'receipt', 'receipt no',
                # Arabic
                'فاتورة', 'رقم الفاتورة', 'فاتورة رقم', 'فاتورة رقم', 'إيصال', 'رقم الإيصال'
            ],
            'date': [
                # English
                'date', 'invoice date', 'issue date', 'billing date', 'created',
                'due date', 'payment due', 'expiry', 'valid until',
                # Arabic
                'تاريخ', 'تاريخ الفاتورة', 'تاريخ الإصدار', 'تاريخ الاستحقاق',
                'تاريخ الدفع', 'صالح حتى', 'تاريخ الانتهاء'
            ],
            'vendor': [
                # English
                'from', 'vendor', 'supplier', 'company', 'business', 'seller',
                'merchant', 'provider', 'contractor',
                # Arabic
                'من', 'المورد', 'المزود', 'الشركة', 'التاجر', 'المقاول'
            ]
        }
    
    def _build_date_patterns(self) -> List[Tuple[str, str]]:
        """Build date parsing patterns"""
        return [
            # ISO format
            (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),
            # DD/MM/YYYY
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%d/%m/%Y'),
            # MM/DD/YYYY
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%m/%d/%Y'),
            # DD-MM-YYYY
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', '%d-%m-%Y'),
            # MM-DD-YYYY
            (r'(\d{1,2})-(\d{1,2})-(\d{4})', '%m-%d-%Y'),
            # DD.MM.YYYY
            (r'(\d{1,2})\.(\d{1,2})\.(\d{4})', '%d.%m.%Y'),
            # MM.DD.YYYY
            (r'(\d{1,2})\.(\d{1,2})\.(\d{4})', '%m.%d.%Y'),
            # Arabic date patterns (if needed)
            (r'(\d{1,2})/(\d{1,2})/(\d{4})', '%d/%m/%Y'),  # Same as DD/MM/YYYY
        ]
    
    def _build_currency_patterns(self) -> Dict[str, List[str]]:
        """Build currency detection patterns"""
        return {
            'EUR': ['€', 'EUR', 'euro', 'euros', 'يورو'],
            'USD': ['$', 'USD', 'dollar', 'dollars', 'دولار'],
            'GBP': ['£', 'GBP', 'pound', 'pounds', 'جنيه'],
            'JPY': ['¥', 'JPY', 'yen', 'ين'],
            'SAR': ['SAR', 'riyal', 'ريال'],
            'AED': ['AED', 'dirham', 'درهم'],
            'EGP': ['EGP', 'pound', 'جنيه مصري'],
            'QAR': ['QAR', 'riyal', 'ريال قطري'],
            'KWD': ['KWD', 'dinar', 'دينار'],
            'BHD': ['BHD', 'dinar', 'دينار بحريني']
        }
    
    def extract_invoice(self, tokens: List[Token], filename: str, processing_id: str) -> Invoice:
        """Extract invoice data from OCR tokens"""
        logger.info(f"🔍 Starting deterministic extraction for {filename}")
        
        # Create vendor layout fingerprint
        layout_hash = self._create_layout_fingerprint(tokens)
        
        # Extract vendor information
        vendor = self._extract_vendor(tokens, layout_hash)
        
        # Extract amounts
        amounts = self._extract_amounts(tokens)
        
        # Extract invoice identifiers
        invoice_number = self._extract_invoice_number(tokens)
        invoice_date = self._extract_invoice_date(tokens)
        due_date = self._extract_due_date(tokens)
        
        # Extract line items
        line_items = self._extract_line_items(tokens)
        
        # Extract additional fields
        notes = self._extract_notes(tokens)
        payment_terms = self._extract_payment_terms(tokens)
        po_number = self._extract_po_number(tokens)
        
        # Create duplicate hash
        duplicate_hash = self._create_duplicate_hash(vendor.name.value, invoice_number.value, invoice_date.value, amounts.grand_total.value)
        
        # Build invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            due_date=due_date,
            vendor=vendor,
            amounts=amounts,
            line_items=line_items,
            notes=notes,
            payment_terms=payment_terms,
            po_number=po_number,
            processing_id=processing_id,
            source_file=filename,
            extraction_method="deterministic",
            duplicate_hash=duplicate_hash
        )
        
        logger.info(f"✅ Deterministic extraction completed for {filename}")
        return invoice
    
    def _create_layout_fingerprint(self, tokens: List[Token]) -> str:
        """Create layout fingerprint for vendor caching"""
        # Get top 15 text blocks by position
        sorted_tokens = sorted(tokens, key=lambda t: (t.page, t.bbox[1], t.bbox[0]))
        top_texts = [token.text for token in sorted_tokens[:15]]
        
        # Create hash
        fingerprint_text = '|'.join(top_texts)
        return hashlib.md5(fingerprint_text.encode()).hexdigest()
    
    def _extract_vendor(self, tokens: List[Token], layout_hash: str) -> Vendor:
        """Extract vendor information"""
        vendor_name = self._find_field_by_patterns(tokens, 'vendor', required=True)
        
        # Check cache for layout-based field zones
        cached_zones = self.vendor_cache.get(layout_hash, {})
        
        vendor = Vendor(
            name=vendor_name,
            address=self._find_field_by_patterns(tokens, 'address') or cached_zones.get('address'),
            tax_id=self._find_field_by_patterns(tokens, 'tax_id') or cached_zones.get('tax_id'),
            phone=self._find_field_by_patterns(tokens, 'phone') or cached_zones.get('phone'),
            email=self._find_field_by_patterns(tokens, 'email') or cached_zones.get('email'),
            layout_hash=layout_hash
        )
        
        # Cache field zones for future use
        if layout_hash not in self.vendor_cache:
            self.vendor_cache[layout_hash] = {
                'address': vendor.address,
                'tax_id': vendor.tax_id,
                'phone': vendor.phone,
                'email': vendor.email
            }
        
        return vendor
    
    def _extract_amounts(self, tokens: List[Token]) -> Amounts:
        """Extract financial amounts"""
        subtotal = self._find_field_by_patterns(tokens, 'subtotal')
        tax_amount = self._find_field_by_patterns(tokens, 'tax')
        tax_rate = self._find_field_by_patterns(tokens, 'tax_rate')
        discount = self._find_field_by_patterns(tokens, 'discount')
        shipping = self._find_field_by_patterns(tokens, 'shipping')
        grand_total = self._find_field_by_patterns(tokens, 'total', required=True)
        currency = self._find_currency(tokens, required=True)
        
        return Amounts(
            subtotal=subtotal,
            tax_amount=tax_amount,
            tax_rate=tax_rate,
            discount=discount,
            shipping=shipping,
            grand_total=grand_total,
            currency=currency
        )
    
    def _extract_invoice_number(self, tokens: List[Token]) -> FieldValue:
        """Extract invoice number"""
        return self._find_field_by_patterns(tokens, 'invoice_number', required=True)
    
    def _extract_invoice_date(self, tokens: List[Token]) -> FieldValue:
        """Extract invoice date"""
        return self._find_field_by_patterns(tokens, 'date', required=True)
    
    def _extract_due_date(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract due date"""
        return self._find_field_by_patterns(tokens, 'due_date')
    
    def _extract_line_items(self, tokens: List[Token]) -> List[LineItem]:
        """Extract line items"""
        line_items = []
        
        # Find potential line item sections
        item_tokens = self._find_line_item_tokens(tokens)
        
        for item_token_group in item_tokens:
            description = self._extract_line_description(item_token_group)
            quantity = self._extract_line_quantity(item_token_group)
            unit_price = self._extract_line_unit_price(item_token_group)
            total = self._extract_line_total(item_token_group)
            tax_amount = self._extract_line_tax_amount(item_token_group)
            tax_rate = self._extract_line_tax_rate(item_token_group)
            
            if description and description.value:
                line_item = LineItem(
                    description=description,
                    quantity=quantity,
                    unit_price=unit_price,
                    total=total,
                    tax_amount=tax_amount,
                    tax_rate=tax_rate
                )
                line_items.append(line_item)
        
        return line_items
    
    def _find_field_by_patterns(self, tokens: List[Token], field_type: str, required: bool = False) -> Optional[FieldValue]:
        """Find field value using pattern matching"""
        patterns = self.label_patterns.get(field_type, [])
        
        best_match = None
        best_confidence = 0.0
        
        for token in tokens:
            text = token.text.lower()
            
            # Check for label patterns
            for pattern in patterns:
                if pattern.lower() in text:
                    # Look for value in nearby tokens
                    value_token = self._find_value_near_token(tokens, token, field_type)
                    if value_token:
                        confidence = self._calculate_field_confidence(token, value_token, field_type)
                        if confidence > best_confidence:
                            best_match = FieldValue(
                                value=self._parse_field_value(value_token.text, field_type),
                                confidence=confidence,
                                evidence=[Evidence(
                                    page=value_token.page,
                                    bbox=value_token.bbox,
                                    text=value_token.text,
                                    confidence=value_token.confidence
                                )]
                            )
                            best_confidence = confidence
        
        if required and not best_match:
            # Return empty field with low confidence
            best_match = FieldValue(
                value=None,
                confidence=0.0,
                evidence=[]
            )
        
        return best_match
    
    def _find_value_near_token(self, tokens: List[Token], label_token: Token, field_type: str) -> Optional[Token]:
        """Find value token near a label token"""
        # Look in nearby tokens (within reasonable distance)
        nearby_tokens = []
        
        for token in tokens:
            if token.page == label_token.page:
                # Calculate distance
                distance = self._calculate_token_distance(label_token, token)
                if distance < 200:  # Within 200 pixels
                    nearby_tokens.append((token, distance))
        
        # Sort by distance
        nearby_tokens.sort(key=lambda x: x[1])
        
        # Look for the first token that looks like a value
        for token, distance in nearby_tokens:
            if self._looks_like_value(token.text, field_type):
                return token
        
        return None
    
    def _calculate_token_distance(self, token1: Token, token2: Token) -> float:
        """Calculate distance between two tokens"""
        x1, y1, x2, y2 = token1.bbox
        x3, y3, x4, y4 = token2.bbox
        
        # Calculate center points
        center1 = ((x1 + x2) / 2, (y1 + y2) / 2)
        center2 = ((x3 + x4) / 2, (y3 + y4) / 2)
        
        # Euclidean distance
        return ((center1[0] - center2[0]) ** 2 + (center1[1] - center2[1]) ** 2) ** 0.5
    
    def _looks_like_value(self, text: str, field_type: str) -> bool:
        """Check if text looks like a value for the given field type"""
        text = text.strip()
        
        if field_type in ['total', 'tax', 'discount', 'shipping', 'subtotal']:
            # Should contain numbers and possibly currency symbols
            return bool(re.search(r'[\d.,]+', text)) and len(text) < 50
        
        elif field_type == 'invoice_number':
            # Should contain alphanumeric characters
            return bool(re.search(r'[A-Za-z0-9]', text)) and len(text) < 30
        
        elif field_type == 'date':
            # Should contain date-like patterns
            return bool(re.search(r'\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}', text))
        
        elif field_type == 'vendor':
            # Should be a reasonable company name
            return len(text) > 2 and len(text) < 100 and not re.search(r'[\d.,]+', text)
        
        return False
    
    def _parse_field_value(self, text: str, field_type: str) -> Any:
        """Parse field value based on field type"""
        text = text.strip()
        
        if field_type in ['total', 'tax', 'discount', 'shipping', 'subtotal']:
            return self._parse_amount(text)
        
        elif field_type == 'invoice_number':
            return text
        
        elif field_type == 'date':
            return self._parse_date(text)
        
        elif field_type == 'vendor':
            return text
        
        elif field_type == 'tax_rate':
            return self._parse_percentage(text)
        
        return text
    
    def _parse_amount(self, text: str) -> Optional[Decimal]:
        """Parse amount from text"""
        # Remove currency symbols and extra text
        amount_text = re.sub(r'[^\d.,\-]', '', text)
        
        if not amount_text:
            return None
        
        try:
            # Handle different decimal separators
            if ',' in amount_text and '.' in amount_text:
                # Both present - assume comma is thousands separator
                amount_text = amount_text.replace(',', '')
            elif ',' in amount_text:
                # Only comma - could be decimal separator
                if amount_text.count(',') == 1 and len(amount_text.split(',')[1]) <= 2:
                    amount_text = amount_text.replace(',', '.')
                else:
                    amount_text = amount_text.replace(',', '')
            
            return Decimal(amount_text)
        except (InvalidOperation, ValueError):
            return None
    
    def _parse_date(self, text: str) -> Optional[date]:
        """Parse date from text"""
        for pattern, format_str in self.date_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    date_str = match.group(0)
                    return datetime.strptime(date_str, format_str).date()
                except ValueError:
                    continue
        
        return None
    
    def _parse_percentage(self, text: str) -> Optional[float]:
        """Parse percentage from text"""
        # Look for percentage patterns
        match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        
        return None
    
    def _find_currency(self, tokens: List[Token], required: bool = False) -> Optional[FieldValue]:
        """Find currency code"""
        best_match = None
        best_confidence = 0.0
        
        for token in tokens:
            text = token.text
            
            for currency_code, symbols in self.currency_patterns.items():
                for symbol in symbols:
                    if symbol in text:
                        confidence = 0.9  # High confidence for explicit currency symbols
                        if confidence > best_confidence:
                            best_match = FieldValue(
                                value=currency_code,
                                confidence=confidence,
                                evidence=[Evidence(
                                    page=token.page,
                                    bbox=token.bbox,
                                    text=token.text,
                                    confidence=token.confidence
                                )]
                            )
                            best_confidence = confidence
        
        if required and not best_match:
            # Default to EUR if not found
            best_match = FieldValue(
                value="EUR",
                confidence=0.1,
                evidence=[]
            )
        
        return best_match
    
    def _calculate_field_confidence(self, label_token: Token, value_token: Token, field_type: str) -> float:
        """Calculate confidence score for a field extraction"""
        base_confidence = min(label_token.confidence, value_token.confidence)
        
        # Distance factor
        distance = self._calculate_token_distance(label_token, value_token)
        distance_factor = max(0.1, 1.0 - (distance / 500.0))  # Decay over 500 pixels
        
        # Pattern strength factor
        pattern_factor = 0.8  # Base pattern strength
        
        # Text quality factor
        text_quality = 1.0 if self._looks_like_value(value_token.text, field_type) else 0.3
        
        final_confidence = base_confidence * distance_factor * pattern_factor * text_quality
        return min(1.0, max(0.0, final_confidence))
    
    def _find_line_item_tokens(self, tokens: List[Token]) -> List[List[Token]]:
        """Find groups of tokens that represent line items"""
        # This is a simplified implementation
        # In a full implementation, you'd use more sophisticated layout analysis
        line_items = []
        
        # Look for tokens that might be line items (contain numbers and descriptions)
        current_item = []
        
        for token in tokens:
            if self._looks_like_line_item(token.text):
                current_item.append(token)
            else:
                if current_item:
                    line_items.append(current_item)
                    current_item = []
        
        if current_item:
            line_items.append(current_item)
        
        return line_items
    
    def _looks_like_line_item(self, text: str) -> bool:
        """Check if text looks like a line item"""
        # Simple heuristic: contains both text and numbers
        has_text = bool(re.search(r'[A-Za-z]', text))
        has_numbers = bool(re.search(r'\d', text))
        return has_text and has_numbers and len(text) > 5
    
    def _extract_line_description(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract description from line item tokens"""
        # Find the token with the most text (likely description)
        best_token = max(tokens, key=lambda t: len(t.text))
        
        return FieldValue(
            value=best_token.text,
            confidence=best_token.confidence,
            evidence=[Evidence(
                page=best_token.page,
                bbox=best_token.bbox,
                text=best_token.text,
                confidence=best_token.confidence
            )]
        )
    
    def _extract_line_quantity(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract quantity from line item tokens"""
        for token in tokens:
            if re.match(r'^\d+(\.\d+)?$', token.text.strip()):
                return FieldValue(
                    value=float(token.text),
                    confidence=token.confidence,
                    evidence=[Evidence(
                        page=token.page,
                        bbox=token.bbox,
                        text=token.text,
                        confidence=token.confidence
                    )]
                )
        return None
    
    def _extract_line_unit_price(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract unit price from line item tokens"""
        for token in tokens:
            amount = self._parse_amount(token.text)
            if amount:
                return FieldValue(
                    value=amount,
                    confidence=token.confidence,
                    evidence=[Evidence(
                        page=token.page,
                        bbox=token.bbox,
                        text=token.text,
                        confidence=token.confidence
                    )]
                )
        return None
    
    def _extract_line_total(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract total from line item tokens"""
        # Similar to unit price, but might be the last amount in the line
        amounts = []
        for token in tokens:
            amount = self._parse_amount(token.text)
            if amount:
                amounts.append((amount, token))
        
        if amounts:
            # Return the last (rightmost) amount as total
            amount, token = amounts[-1]
            return FieldValue(
                value=amount,
                confidence=token.confidence,
                evidence=[Evidence(
                    page=token.page,
                    bbox=token.bbox,
                    text=token.text,
                    confidence=token.confidence
                )]
            )
        return None
    
    def _extract_line_tax_amount(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract tax amount from line item tokens"""
        # Look for tax-related keywords
        for token in tokens:
            if any(keyword in token.text.lower() for keyword in ['tax', 'vat', 'ضريبة']):
                amount = self._parse_amount(token.text)
                if amount:
                    return FieldValue(
                        value=amount,
                        confidence=token.confidence,
                        evidence=[Evidence(
                            page=token.page,
                            bbox=token.bbox,
                            text=token.text,
                            confidence=token.confidence
                        )]
                    )
        return None
    
    def _extract_line_tax_rate(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract tax rate from line item tokens"""
        for token in tokens:
            rate = self._parse_percentage(token.text)
            if rate:
                return FieldValue(
                    value=rate,
                    confidence=token.confidence,
                    evidence=[Evidence(
                        page=token.page,
                        bbox=token.bbox,
                        text=token.text,
                        confidence=token.confidence
                    )]
                )
        return None
    
    def _extract_notes(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract notes from tokens"""
        # Look for tokens that might be notes (longer text, not structured data)
        note_tokens = []
        for token in tokens:
            if len(token.text) > 20 and not self._looks_like_value(token.text, 'total'):
                note_tokens.append(token)
        
        if note_tokens:
            # Combine all note tokens
            combined_text = ' '.join(token.text for token in note_tokens)
            return FieldValue(
                value=combined_text,
                confidence=min(token.confidence for token in note_tokens),
                evidence=[Evidence(
                    page=token.page,
                    bbox=token.bbox,
                    text=token.text,
                    confidence=token.confidence
                ) for token in note_tokens]
            )
        return None
    
    def _extract_payment_terms(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract payment terms from tokens"""
        # Look for payment-related keywords
        for token in tokens:
            if any(keyword in token.text.lower() for keyword in ['payment', 'terms', 'due', 'net', 'days']):
                return FieldValue(
                    value=token.text,
                    confidence=token.confidence,
                    evidence=[Evidence(
                        page=token.page,
                        bbox=token.bbox,
                        text=token.text,
                        confidence=token.confidence
                    )]
                )
        return None
    
    def _extract_po_number(self, tokens: List[Token]) -> Optional[FieldValue]:
        """Extract PO number from tokens"""
        # Look for PO-related keywords
        for token in tokens:
            if any(keyword in token.text.lower() for keyword in ['po', 'purchase order', 'order no', 'order number']):
                return FieldValue(
                    value=token.text,
                    confidence=token.confidence,
                    evidence=[Evidence(
                        page=token.page,
                        bbox=token.bbox,
                        text=token.text,
                        confidence=token.confidence
                    )]
                )
        return None
    
    def _create_duplicate_hash(self, vendor_name: str, invoice_number: str, invoice_date: date, grand_total: Decimal) -> str:
        """Create hash for duplicate detection"""
        hash_input = f"{vendor_name}|{invoice_number}|{invoice_date}|{grand_total}"
        return hashlib.md5(hash_input.encode()).hexdigest()


# Global extractor instance
extractor = DeterministicExtractor()


def extract_invoice_deterministic(tokens: List[Token], filename: str, processing_id: str) -> Invoice:
    """Extract invoice using deterministic methods"""
    return extractor.extract_invoice(tokens, filename, processing_id)





