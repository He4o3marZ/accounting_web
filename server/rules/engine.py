"""
Rules Engine for Invoice Validation
Deterministic validation rules with detailed failure reporting
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime
from ..schemas.invoice import Invoice, RuleReport, ProcessingThresholds
import logging

logger = logging.getLogger(__name__)


class RulesEngine:
    """Engine for validating invoice data against business rules"""
    
    def __init__(self, thresholds: ProcessingThresholds = None):
        self.thresholds = thresholds or ProcessingThresholds()
    
    def validate_invoice(self, invoice: Invoice) -> RuleReport:
        """Validate invoice against all business rules"""
        logger.info(f"🔍 Validating invoice {invoice.invoice_number.value}")
        
        failures = []
        warnings = []
        
        # Run all validation rules
        failures.extend(self._validate_arithmetic(invoice))
        failures.extend(self._validate_line_sum(invoice))
        failures.extend(self._validate_dates(invoice))
        failures.extend(self._validate_currency(invoice))
        failures.extend(self._validate_duplicate_hash(invoice))
        failures.extend(self._validate_tax_coherence(invoice))
        failures.extend(self._validate_rounding_policy(invoice))
        
        # Check if all rules passed
        passed = len(failures) == 0
        
        rule_report = RuleReport(
            passed=passed,
            failures=failures,
            warnings=warnings
        )
        
        logger.info(f"✅ Validation completed: {len(failures)} failures, {len(warnings)} warnings")
        return rule_report
    
    def _validate_arithmetic(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate arithmetic relationships: subtotal + tax + shipping - discount ≈ grand_total"""
        failures = []
        
        try:
            grand_total = invoice.amounts.grand_total.value
            if not isinstance(grand_total, Decimal):
                grand_total = Decimal(str(grand_total))
            
            # Calculate expected total
            expected_total = Decimal('0')
            
            # Add subtotal
            if invoice.amounts.subtotal and invoice.amounts.subtotal.value:
                subtotal = Decimal(str(invoice.amounts.subtotal.value))
                expected_total += subtotal
            else:
                # If no subtotal, assume it's the grand total minus other amounts
                expected_total = grand_total
            
            # Add tax
            if invoice.amounts.tax_amount and invoice.amounts.tax_amount.value:
                tax_amount = Decimal(str(invoice.amounts.tax_amount.value))
                expected_total += tax_amount
            
            # Add shipping
            if invoice.amounts.shipping and invoice.amounts.shipping.value:
                shipping = Decimal(str(invoice.amounts.shipping.value))
                expected_total += shipping
            
            # Subtract discount
            if invoice.amounts.discount and invoice.amounts.discount.value:
                discount = Decimal(str(invoice.amounts.discount.value))
                expected_total -= discount
            
            # Check tolerance
            if expected_total != 0:
                relative_error = abs(grand_total - expected_total) / abs(expected_total)
                if relative_error > self.thresholds.arithmetic_tolerance:
                    failures.append({
                        'rule': 'arithmetic_balance',
                        'path': '/amounts/grand_total',
                        'reason': f'Arithmetic balance check failed. Expected: {expected_total}, Actual: {grand_total}, Error: {relative_error:.2%}',
                        'expected': float(expected_total),
                        'actual': float(grand_total),
                        'tolerance': self.thresholds.arithmetic_tolerance,
                        'suggested_fix': f'Adjust grand total to {expected_total} or verify individual amounts'
                    })
        
        except Exception as e:
            failures.append({
                'rule': 'arithmetic_balance',
                'path': '/amounts',
                'reason': f'Arithmetic validation failed: {str(e)}',
                'suggested_fix': 'Check amount formats and values'
            })
        
        return failures
    
    def _validate_line_sum(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate line item sum: Σ(qty×unit_price + tax_amount) ≈ subtotal + tax_total"""
        failures = []
        
        try:
            # Calculate line item totals
            line_total = Decimal('0')
            line_tax_total = Decimal('0')
            
            for line_item in invoice.line_items:
                if line_item.quantity and line_item.quantity.value and line_item.unit_price and line_item.unit_price.value:
                    qty = Decimal(str(line_item.quantity.value))
                    unit_price = Decimal(str(line_item.unit_price.value))
                    line_total += qty * unit_price
                
                if line_item.tax_amount and line_item.tax_amount.value:
                    line_tax_total += Decimal(str(line_item.tax_amount.value))
            
            # Get invoice totals
            invoice_subtotal = Decimal('0')
            if invoice.amounts.subtotal and invoice.amounts.subtotal.value:
                invoice_subtotal = Decimal(str(invoice.amounts.subtotal.value))
            
            invoice_tax_total = Decimal('0')
            if invoice.amounts.tax_amount and invoice.amounts.tax_amount.value:
                invoice_tax_total = Decimal(str(invoice.amounts.tax_amount.value))
            
            # Compare
            expected_subtotal = line_total
            expected_tax_total = line_tax_total
            
            if invoice_subtotal != 0:
                subtotal_error = abs(invoice_subtotal - expected_subtotal) / abs(invoice_subtotal)
                if subtotal_error > self.thresholds.arithmetic_tolerance:
                    failures.append({
                        'rule': 'line_sum_subtotal',
                        'path': '/amounts/subtotal',
                        'reason': f'Line item subtotal mismatch. Expected: {expected_subtotal}, Actual: {invoice_subtotal}, Error: {subtotal_error:.2%}',
                        'expected': float(expected_subtotal),
                        'actual': float(invoice_subtotal),
                        'suggested_fix': f'Adjust subtotal to {expected_subtotal} or verify line item calculations'
                    })
            
            if invoice_tax_total != 0:
                tax_error = abs(invoice_tax_total - expected_tax_total) / abs(invoice_tax_total)
                if tax_error > self.thresholds.arithmetic_tolerance:
                    failures.append({
                        'rule': 'line_sum_tax',
                        'path': '/amounts/tax_amount',
                        'reason': f'Line item tax total mismatch. Expected: {expected_tax_total}, Actual: {invoice_tax_total}, Error: {tax_error:.2%}',
                        'expected': float(expected_tax_total),
                        'actual': float(invoice_tax_total),
                        'suggested_fix': f'Adjust tax amount to {expected_tax_total} or verify line item tax calculations'
                    })
        
        except Exception as e:
            failures.append({
                'rule': 'line_sum',
                'path': '/line_items',
                'reason': f'Line item sum validation failed: {str(e)}',
                'suggested_fix': 'Check line item calculations and formats'
            })
        
        return failures
    
    def _validate_dates(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate date relationships and formats"""
        failures = []
        
        # Check invoice date
        if not invoice.invoice_date.value:
            failures.append({
                'rule': 'required_date',
                'path': '/invoice_date',
                'reason': 'Invoice date is required',
                'suggested_fix': 'Provide a valid invoice date'
            })
        elif not isinstance(invoice.invoice_date.value, date):
            failures.append({
                'rule': 'date_format',
                'path': '/invoice_date',
                'reason': f'Invalid date format: {invoice.invoice_date.value}',
                'suggested_fix': 'Use YYYY-MM-DD format'
            })
        
        # Check due date
        if invoice.due_date and invoice.due_date.value:
            if not isinstance(invoice.due_date.value, date):
                failures.append({
                    'rule': 'date_format',
                    'path': '/due_date',
                    'reason': f'Invalid due date format: {invoice.due_date.value}',
                    'suggested_fix': 'Use YYYY-MM-DD format'
                })
            elif isinstance(invoice.invoice_date.value, date) and invoice.due_date.value < invoice.invoice_date.value:
                failures.append({
                    'rule': 'date_logic',
                    'path': '/due_date',
                    'reason': f'Due date ({invoice.due_date.value}) cannot be before invoice date ({invoice.invoice_date.value})',
                    'suggested_fix': 'Adjust due date to be after invoice date'
                })
        
        return failures
    
    def _validate_currency(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate currency codes and amounts"""
        failures = []
        
        # Check currency code
        if not invoice.amounts.currency.value:
            failures.append({
                'rule': 'required_currency',
                'path': '/amounts/currency',
                'reason': 'Currency is required',
                'suggested_fix': 'Provide a valid ISO 4217 currency code'
            })
        elif invoice.amounts.currency.value not in ['EUR', 'USD', 'GBP', 'JPY', 'SAR', 'AED', 'EGP', 'QAR', 'KWD', 'BHD']:
            failures.append({
                'rule': 'currency_format',
                'path': '/amounts/currency',
                'reason': f'Invalid currency code: {invoice.amounts.currency.value}',
                'suggested_fix': 'Use valid ISO 4217 currency code (EUR, USD, GBP, etc.)'
            })
        
        # Check amounts are non-negative
        amount_fields = [
            ('grand_total', invoice.amounts.grand_total),
            ('subtotal', invoice.amounts.subtotal),
            ('tax_amount', invoice.amounts.tax_amount),
            ('discount', invoice.amounts.discount),
            ('shipping', invoice.amounts.shipping)
        ]
        
        for field_name, field_value in amount_fields:
            if field_value and field_value.value is not None:
                try:
                    amount = Decimal(str(field_value.value))
                    if amount < 0:
                        failures.append({
                            'rule': 'non_negative_amount',
                            'path': f'/amounts/{field_name}',
                            'reason': f'{field_name} cannot be negative: {amount}',
                            'suggested_fix': f'Adjust {field_name} to be non-negative'
                        })
                except Exception as e:
                    failures.append({
                        'rule': 'amount_format',
                        'path': f'/amounts/{field_name}',
                        'reason': f'Invalid amount format: {field_value.value}',
                        'suggested_fix': f'Use valid decimal format for {field_name}'
                    })
        
        return failures
    
    def _validate_duplicate_hash(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate duplicate detection"""
        failures = []
        
        # This would typically check against a database of processed invoices
        # For now, we'll just validate that the hash exists
        if not invoice.duplicate_hash:
            failures.append({
                'rule': 'duplicate_hash',
                'path': '/duplicate_hash',
                'reason': 'Duplicate hash is missing',
                'suggested_fix': 'Generate duplicate hash for tracking'
            })
        
        return failures
    
    def _validate_tax_coherence(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate tax rate and amount coherence"""
        failures = []
        
        try:
            if invoice.amounts.tax_rate and invoice.amounts.tax_rate.value and invoice.amounts.tax_amount and invoice.amounts.tax_amount.value:
                tax_rate = float(invoice.amounts.tax_rate.value)
                tax_amount = Decimal(str(invoice.amounts.tax_amount.value))
                
                # Calculate expected tax amount
                if invoice.amounts.subtotal and invoice.amounts.subtotal.value:
                    subtotal = Decimal(str(invoice.amounts.subtotal.value))
                    expected_tax = subtotal * Decimal(str(tax_rate / 100))
                    
                    # Check tolerance
                    if expected_tax != 0:
                        tax_error = abs(tax_amount - expected_tax) / abs(expected_tax)
                        if tax_error > self.thresholds.arithmetic_tolerance:
                            failures.append({
                                'rule': 'tax_coherence',
                                'path': '/amounts/tax_amount',
                                'reason': f'Tax amount ({tax_amount}) does not match tax rate ({tax_rate}%) applied to subtotal. Expected: {expected_tax}',
                                'expected': float(expected_tax),
                                'actual': float(tax_amount),
                                'suggested_fix': f'Adjust tax amount to {expected_tax} or verify tax rate calculation'
                            })
        
        except Exception as e:
            failures.append({
                'rule': 'tax_coherence',
                'path': '/amounts',
                'reason': f'Tax coherence validation failed: {str(e)}',
                'suggested_fix': 'Check tax rate and amount formats'
            })
        
        return failures
    
    def _validate_rounding_policy(self, invoice: Invoice) -> List[Dict[str, Any]]:
        """Validate rounding policy compliance"""
        failures = []
        
        # Check that amounts are rounded to the specified decimal places
        amount_fields = [
            ('grand_total', invoice.amounts.grand_total),
            ('subtotal', invoice.amounts.subtotal),
            ('tax_amount', invoice.amounts.tax_amount),
            ('discount', invoice.amounts.discount),
            ('shipping', invoice.amounts.shipping)
        ]
        
        for field_name, field_value in amount_fields:
            if field_value and field_value.value is not None:
                try:
                    amount = Decimal(str(field_value.value))
                    # Check decimal places
                    decimal_places = len(str(amount).split('.')[-1]) if '.' in str(amount) else 0
                    if decimal_places > self.thresholds.rounding_decimal_places:
                        failures.append({
                            'rule': 'rounding_policy',
                            'path': f'/amounts/{field_name}',
                            'reason': f'{field_name} has too many decimal places: {decimal_places} (max: {self.thresholds.rounding_decimal_places})',
                            'suggested_fix': f'Round {field_name} to {self.thresholds.rounding_decimal_places} decimal places'
                        })
                except Exception:
                    pass  # Skip invalid amounts (handled by other rules)
        
        return failures
    
    def validate_after_llm_patch(self, invoice: Invoice, llm_patch: List[Dict[str, Any]]) -> RuleReport:
        """Validate invoice after applying LLM patch"""
        logger.info(f"🔍 Re-validating invoice after LLM patch")
        
        # Apply the patch (simplified - in real implementation, you'd use jsonpatch library)
        # For now, we'll just re-run validation
        return self.validate_invoice(invoice)


# Global rules engine instance
rules_engine = RulesEngine()


def validate_invoice_rules(invoice: Invoice) -> RuleReport:
    """Validate invoice against business rules"""
    return rules_engine.validate_invoice(invoice)





