"""
Pipeline Orchestration
Main pipeline controller for deterministic extraction with LLM fallback
"""

import uuid
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from ..schemas.invoice import Invoice, RuleReport, ProcessingThresholds, ProcessingResult, JsonPatch
from ..extract.ocr import extract_tokens
from ..extract.deterministic import extract_invoice_deterministic
from ..rules.engine import validate_invoice_rules
from ..ml.category import predict_line_item_category
from ..llm.fallback import propose_llm_patch
from ..audit.logs import log_processing_stage

logger = logging.getLogger(__name__)


class ProcessingPipeline:
    """Main processing pipeline orchestrator"""
    
    def __init__(self, thresholds: ProcessingThresholds = None):
        self.thresholds = thresholds or ProcessingThresholds()
        self.active_jobs = {}  # In-memory job tracking
    
    async def process_invoice(self, file_buffer: bytes, filename: str) -> str:
        """Start invoice processing and return job ID"""
        job_id = str(uuid.uuid4())
        
        # Initialize job tracking
        self.active_jobs[job_id] = {
            'status': 'processing',
            'started_at': datetime.now(),
            'filename': filename,
            'stages_completed': [],
            'current_stage': 'ocr',
            'result': None,
            'error': None
        }
        
        # Start processing asynchronously
        asyncio.create_task(self._process_invoice_async(job_id, file_buffer, filename))
        
        logger.info(f"🚀 Started processing job {job_id} for {filename}")
        return job_id
    
    async def _process_invoice_async(self, job_id: str, file_buffer: bytes, filename: str):
        """Process invoice asynchronously"""
        try:
            # Stage 1: OCR
            await self._update_job_status(job_id, 'ocr', 'Extracting text from document...')
            tokens = await extract_tokens(file_buffer, filename)
            
            if not tokens:
                raise Exception("OCR failed - no text extracted")
            
            await log_processing_stage(job_id, 'ocr', 'completed', {
                'tokens_extracted': len(tokens),
                'pages': len(set(token.page for token in tokens))
            })
            
            # Stage 2: Deterministic Extraction
            await self._update_job_status(job_id, 'extraction', 'Extracting invoice data...')
            processing_id = f"{job_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            invoice = extract_invoice_deterministic(tokens, filename, processing_id)
            
            await log_processing_stage(job_id, 'extraction', 'completed', {
                'vendor': invoice.vendor.name.value,
                'invoice_number': invoice.invoice_number.value,
                'grand_total': float(invoice.amounts.grand_total.value) if invoice.amounts.grand_total.value else None
            })
            
            # Stage 3: ML Category Classification
            await self._update_job_status(job_id, 'classification', 'Classifying line items...')
            await self._classify_line_items(invoice)
            
            await log_processing_stage(job_id, 'classification', 'completed', {
                'line_items_classified': len(invoice.line_items)
            })
            
            # Stage 4: Rules Validation
            await self._update_job_status(job_id, 'validation', 'Validating business rules...')
            rule_report = validate_invoice_rules(invoice)
            
            await log_processing_stage(job_id, 'validation', 'completed', {
                'rules_passed': rule_report.passed,
                'failures': len(rule_report.failures),
                'warnings': len(rule_report.warnings)
            })
            
            # Stage 5: Decision Logic
            await self._update_job_status(job_id, 'decision', 'Evaluating processing decision...')
            decision = await self._make_processing_decision(invoice, rule_report)
            
            if decision['action'] == 'auto_post':
                # Auto-post the invoice
                await self._update_job_status(job_id, 'auto_post', 'Auto-posting invoice...')
                result = await self._create_processing_result(invoice, rule_report, None, 'auto_posted')
                
            elif decision['action'] == 'llm_fallback':
                # Try LLM fallback
                await self._update_job_status(job_id, 'llm_fallback', 'Applying LLM fallback...')
                llm_patch = await self._apply_llm_fallback(invoice, rule_report, tokens)
                
                if llm_patch:
                    # Apply patch and re-validate
                    await self._update_job_status(job_id, 'patch_apply', 'Applying LLM patch...')
                    await self._apply_patch_to_invoice(invoice, llm_patch)
                    
                    # Re-validate
                    rule_report = validate_invoice_rules(invoice)
                    
                    if rule_report.passed:
                        result = await self._create_processing_result(invoice, rule_report, llm_patch, 'auto_posted')
                    else:
                        result = await self._create_processing_result(invoice, rule_report, llm_patch, 'needs_review')
                else:
                    result = await self._create_processing_result(invoice, rule_report, None, 'needs_review')
            
            else:  # needs_review
                result = await self._create_processing_result(invoice, rule_report, None, 'needs_review')
            
            # Final stage
            await self._update_job_status(job_id, 'completed', 'Processing completed')
            self.active_jobs[job_id]['result'] = result
            self.active_jobs[job_id]['status'] = 'completed'
            
            await log_processing_stage(job_id, 'completed', 'completed', {
                'final_status': result.status,
                'processing_time': (datetime.now() - self.active_jobs[job_id]['started_at']).total_seconds()
            })
            
            logger.info(f"✅ Completed processing job {job_id}")
            
        except Exception as e:
            logger.error(f"❌ Processing failed for job {job_id}: {e}")
            self.active_jobs[job_id]['status'] = 'failed'
            self.active_jobs[job_id]['error'] = str(e)
            
            await log_processing_stage(job_id, 'error', 'failed', {
                'error': str(e),
                'processing_time': (datetime.now() - self.active_jobs[job_id]['started_at']).total_seconds()
            })
    
    async def _update_job_status(self, job_id: str, stage: str, message: str):
        """Update job status"""
        if job_id in self.active_jobs:
            self.active_jobs[job_id]['current_stage'] = stage
            self.active_jobs[job_id]['stages_completed'].append({
                'stage': stage,
                'message': message,
                'timestamp': datetime.now()
            })
    
    async def _classify_line_items(self, invoice: Invoice):
        """Classify line items using ML model"""
        vendor_name = invoice.vendor.name.value if invoice.vendor.name.value else None
        
        for line_item in invoice.line_items:
            if line_item.description and line_item.description.value:
                category, confidence = predict_line_item_category(
                    line_item.description.value,
                    vendor_name
                )
                line_item.category = category
                line_item.category_confidence = confidence
    
    async def _make_processing_decision(self, invoice: Invoice, rule_report: RuleReport) -> Dict[str, Any]:
        """Make processing decision based on confidence and rules"""
        # Check field confidence
        field_conf_ok = self._check_field_confidence(invoice)
        
        # Check rules
        rules_ok = rule_report.passed
        
        # Check category confidence
        category_ok = self._check_category_confidence(invoice)
        
        logger.info(f"Decision factors - Field conf: {field_conf_ok}, Rules: {rules_ok}, Category: {category_ok}")
        
        if field_conf_ok and rules_ok and category_ok:
            return {'action': 'auto_post', 'reason': 'All checks passed'}
        elif not rules_ok and self._has_fixable_rules(rule_report):
            return {'action': 'llm_fallback', 'reason': 'Rules failed but fixable'}
        else:
            return {'action': 'needs_review', 'reason': 'Manual review required'}
    
    def _check_field_confidence(self, invoice: Invoice) -> bool:
        """Check if all required fields have sufficient confidence"""
        required_fields = [
            invoice.invoice_number,
            invoice.invoice_date,
            invoice.vendor.name,
            invoice.amounts.grand_total,
            invoice.amounts.currency
        ]
        
        for field in required_fields:
            if field.confidence < self.thresholds.field_confidence_threshold:
                logger.info(f"Field confidence too low: {field.confidence} < {self.thresholds.field_confidence_threshold}")
                return False
        
        return True
    
    def _check_category_confidence(self, invoice: Invoice) -> bool:
        """Check if line item categories have sufficient confidence"""
        if not invoice.line_items:
            return True  # No line items to check
        
        for line_item in invoice.line_items:
            if line_item.category_confidence and line_item.category_confidence < self.thresholds.category_confidence_threshold:
                logger.info(f"Category confidence too low: {line_item.category_confidence} < {self.thresholds.category_confidence_threshold}")
                return False
        
        return True
    
    def _has_fixable_rules(self, rule_report: RuleReport) -> bool:
        """Check if failed rules are fixable by LLM"""
        fixable_rules = [
            'arithmetic_balance',
            'line_sum_subtotal',
            'line_sum_tax',
            'date_format',
            'currency_format',
            'tax_coherence',
            'rounding_policy'
        ]
        
        for failure in rule_report.failures:
            if failure['rule'] in fixable_rules:
                return True
        
        return False
    
    async def _apply_llm_fallback(self, invoice: Invoice, rule_report: RuleReport, tokens: List) -> Optional[List[JsonPatch]]:
        """Apply LLM fallback to fix issues"""
        try:
            # Prepare evidence snippets
            evidence_snippets = self._prepare_evidence_snippets(tokens, rule_report)
            
            # Call LLM fallback
            llm_patch = await propose_llm_patch(invoice, rule_report, evidence_snippets)
            
            return llm_patch
            
        except Exception as e:
            logger.error(f"LLM fallback failed: {e}")
            return None
    
    def _prepare_evidence_snippets(self, tokens: List, rule_report: RuleReport) -> List[Dict[str, Any]]:
        """Prepare evidence snippets for LLM"""
        snippets = []
        
        # Get tokens related to failed rules
        failed_paths = [failure['path'] for failure in rule_report.failures]
        
        for token in tokens:
            # Create snippet with context
            snippet = {
                'bbox_id': f"p{token.page}#bx_{hash(token.text) % 10000}",
                'text': token.text,
                'context': self._get_token_context(tokens, token),
                'page': token.page,
                'bbox': token.bbox
            }
            snippets.append(snippet)
        
        return snippets
    
    def _get_token_context(self, tokens: List, target_token) -> str:
        """Get context around a token"""
        # Find nearby tokens
        nearby_tokens = []
        for token in tokens:
            if token.page == target_token.page:
                distance = abs(token.bbox[1] - target_token.bbox[1])  # Y distance
                if distance < 40:  # Within 40 pixels
                    nearby_tokens.append((token, distance))
        
        # Sort by distance and take closest ones
        nearby_tokens.sort(key=lambda x: x[1])
        context_tokens = [token for token, _ in nearby_tokens[:5]]
        
        return ' '.join(token.text for token in context_tokens)
    
    async def _apply_patch_to_invoice(self, invoice: Invoice, llm_patch: List[JsonPatch]):
        """Apply LLM patch to invoice"""
        for patch in llm_patch:
            try:
                # Apply patch operation
                if patch.op == 'replace':
                    self._apply_replace_patch(invoice, patch)
                elif patch.op == 'add':
                    self._apply_add_patch(invoice, patch)
                # Add other operations as needed
                
                logger.info(f"Applied patch: {patch.path} = {patch.value}")
                
            except Exception as e:
                logger.error(f"Failed to apply patch {patch.path}: {e}")
    
    def _apply_replace_patch(self, invoice: Invoice, patch: JsonPatch):
        """Apply replace patch operation"""
        path_parts = patch.path.strip('/').split('/')
        
        if path_parts[0] == 'amounts':
            if path_parts[1] == 'grand_total':
                invoice.amounts.grand_total.value = patch.value
            elif path_parts[1] == 'subtotal':
                invoice.amounts.subtotal.value = patch.value
            elif path_parts[1] == 'tax_amount':
                invoice.amounts.tax_amount.value = patch.value
            # Add other amount fields
        
        elif path_parts[0] == 'invoice_number':
            invoice.invoice_number.value = patch.value
        
        elif path_parts[0] == 'invoice_date':
            invoice.invoice_date.value = patch.value
        
        # Add other field paths
    
    def _apply_add_patch(self, invoice: Invoice, patch: JsonPatch):
        """Apply add patch operation"""
        # Implement add operations as needed
        pass
    
    async def _create_processing_result(self, invoice: Invoice, rule_report: RuleReport, 
                                      llm_patch: Optional[List[JsonPatch]], status: str) -> ProcessingResult:
        """Create final processing result"""
        return ProcessingResult(
            invoice=invoice,
            rule_report=rule_report,
            llm_patch=llm_patch,
            final_json=invoice.dict(),
            audit_trail=[],  # Will be populated by audit logging
            status=status
        )
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status"""
        return self.active_jobs.get(job_id)
    
    def get_job_result(self, job_id: str) -> Optional[ProcessingResult]:
        """Get job result"""
        job = self.active_jobs.get(job_id)
        return job['result'] if job and job['status'] == 'completed' else None


# Global pipeline instance
pipeline = ProcessingPipeline()


async def start_invoice_processing(file_buffer: bytes, filename: str) -> str:
    """Start invoice processing"""
    return await pipeline.process_invoice(file_buffer, filename)


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get job status"""
    return pipeline.get_job_status(job_id)


def get_job_result(job_id: str) -> Optional[ProcessingResult]:
    """Get job result"""
    return pipeline.get_job_result(job_id)







