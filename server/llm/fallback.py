"""
LLM Fallback Module
Single LLM call for fixing invoice data with JSON Patch output
"""

import json
from typing import List, Dict, Any, Optional
from ..schemas.invoice import Invoice, RuleReport, JsonPatch
import logging

logger = logging.getLogger(__name__)


class LLMFallback:
    """LLM fallback for fixing invoice data issues"""
    
    def __init__(self):
        self.system_prompt = """You are an auditor for invoice JSON. Input: a strict JSON schema instance (fields may be null), a RULE REPORT with failed rules, and OCR evidence snippets with bbox ids.
TASK: Only if you can fix a field with high confidence from the snippets, output a JSON Patch array. Otherwise, output [].
RULES:
- Do not re-extract from raw text beyond provided snippets.
- Only edit fields listed in failed rules or null required fields.
- If uncertain, abstain.
- For each operation, include a "rationale" sibling key (string) and a "cites_bbox" array of evidence ids.
OUTPUT: JSON Patch array of objects with keys: op, path, value, rationale, cites_bbox."""
    
    async def propose_patch(self, invoice: Invoice, rule_report: RuleReport, 
                          evidence_snippets: List[Dict[str, Any]]) -> Optional[List[JsonPatch]]:
        """Propose JSON Patch to fix invoice issues"""
        try:
            logger.info("🤖 Calling LLM fallback for invoice fixes")
            
            # Prepare input for LLM
            llm_input = self._prepare_llm_input(invoice, rule_report, evidence_snippets)
            
            # Call LLM (placeholder - replace with actual LLM call)
            llm_response = await self._call_llm(llm_input)
            
            # Parse response
            patch_operations = self._parse_llm_response(llm_response)
            
            if patch_operations:
                logger.info(f"✅ LLM proposed {len(patch_operations)} fixes")
                return patch_operations
            else:
                logger.info("⚠️ LLM abstained from making changes")
                return []
                
        except Exception as e:
            logger.error(f"❌ LLM fallback failed: {e}")
            return None
    
    def _prepare_llm_input(self, invoice: Invoice, rule_report: RuleReport, 
                          evidence_snippets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Prepare input for LLM"""
        return {
            'system_prompt': self.system_prompt,
            'invoice_json': invoice.dict(),
            'rule_report': rule_report.dict(),
            'evidence_snippets': evidence_snippets,
            'instructions': {
                'max_patches': 5,
                'confidence_threshold': 0.8,
                'allowed_operations': ['replace', 'add'],
                'required_fields': ['invoice_number', 'invoice_date', 'vendor.name', 'amounts.grand_total', 'amounts.currency']
            }
        }
    
    async def _call_llm(self, llm_input: Dict[str, Any]) -> str:
        """Call LLM with prepared input"""
        # This is a placeholder implementation
        # In a real implementation, you would call GPT-5 or another LLM
        
        # For now, return a mock response based on the rule failures
        rule_failures = llm_input['rule_report']['failures']
        evidence_snippets = llm_input['evidence_snippets']
        
        # Generate mock patches based on common failures
        patches = []
        
        for failure in rule_failures:
            if failure['rule'] == 'arithmetic_balance' and failure['path'] == '/amounts/grand_total':
                # Find evidence for grand total
                grand_total_evidence = self._find_evidence_for_field(evidence_snippets, 'total')
                if grand_total_evidence:
                    patches.append({
                        'op': 'replace',
                        'path': '/amounts/grand_total',
                        'value': failure.get('expected', 0),
                        'rationale': f"Grand total text shows {failure.get('expected', 0)}; arithmetic now balances within tolerance.",
                        'cites_bbox': [grand_total_evidence['bbox_id']]
                    })
            
            elif failure['rule'] == 'date_format' and failure['path'] == '/invoice_date':
                # Find evidence for date
                date_evidence = self._find_evidence_for_field(evidence_snippets, 'date')
                if date_evidence:
                    patches.append({
                        'op': 'replace',
                        'path': '/invoice_date',
                        'value': '2024-01-15',  # Mock date
                        'rationale': f"Date text shows 2024-01-15 format; converted to ISO format.",
                        'cites_bbox': [date_evidence['bbox_id']]
                    })
            
            elif failure['rule'] == 'currency_format' and failure['path'] == '/amounts/currency':
                # Find evidence for currency
                currency_evidence = self._find_evidence_for_field(evidence_snippets, 'currency')
                if currency_evidence:
                    patches.append({
                        'op': 'replace',
                        'path': '/amounts/currency',
                        'value': 'EUR',
                        'rationale': f"Currency symbol € detected; converted to ISO code EUR.",
                        'cites_bbox': [currency_evidence['bbox_id']]
                    })
        
        return json.dumps(patches)
    
    def _find_evidence_for_field(self, evidence_snippets: List[Dict[str, Any]], field_type: str) -> Optional[Dict[str, Any]]:
        """Find evidence snippet for a specific field type"""
        # Simple keyword matching
        keywords = {
            'total': ['total', 'amount', 'sum', 'الإجمالي', 'المجموع'],
            'date': ['date', 'تاريخ'],
            'currency': ['€', '$', '£', 'EUR', 'USD', 'GBP']
        }
        
        field_keywords = keywords.get(field_type, [])
        
        for snippet in evidence_snippets:
            text = snippet['text'].lower()
            if any(keyword.lower() in text for keyword in field_keywords):
                return snippet
        
        return None
    
    def _parse_llm_response(self, response: str) -> Optional[List[JsonPatch]]:
        """Parse LLM response into JsonPatch objects"""
        try:
            # Parse JSON response
            patch_data = json.loads(response)
            
            if not isinstance(patch_data, list):
                logger.warning("LLM response is not a list")
                return None
            
            # Convert to JsonPatch objects
            patches = []
            for patch_dict in patch_data:
                try:
                    patch = JsonPatch(**patch_dict)
                    patches.append(patch)
                except Exception as e:
                    logger.warning(f"Invalid patch format: {e}")
                    continue
            
            return patches
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return None
    
    def _validate_patch(self, patch: JsonPatch, invoice: Invoice) -> bool:
        """Validate that patch is safe to apply"""
        # Check if path is valid
        if not patch.path.startswith('/'):
            return False
        
        # Check if operation is allowed
        if patch.op not in ['replace', 'add']:
            return False
        
        # Check if rationale is provided
        if not patch.rationale or len(patch.rationale.strip()) < 10:
            return False
        
        # Check if evidence is cited
        if not patch.cites_bbox or len(patch.cites_bbox) == 0:
            return False
        
        return True


# Global LLM fallback instance
llm_fallback = LLMFallback()


async def propose_llm_patch(invoice: Invoice, rule_report: RuleReport, 
                           evidence_snippets: List[Dict[str, Any]]) -> Optional[List[JsonPatch]]:
    """Propose LLM patch for invoice fixes"""
    return await llm_fallback.propose_patch(invoice, rule_report, evidence_snippets)







