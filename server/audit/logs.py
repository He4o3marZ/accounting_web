"""
Audit Logging Module
Full lineage tracking for invoice processing pipeline
"""

import json
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class AuditLogger:
    """Audit logger for processing pipeline"""
    
    def __init__(self, log_dir: str = "server/audit/logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / "audit.log"
        self.detailed_logs = self.log_dir / "detailed"
        self.detailed_logs.mkdir(exist_ok=True)
    
    def log_processing_stage(self, job_id: str, stage: str, status: str, 
                           metadata: Dict[str, Any], duration_ms: Optional[int] = None):
        """Log a processing stage"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'stage': stage,
            'status': status,
            'metadata': metadata,
            'duration_ms': duration_ms
        }
        
        # Write to main log file
        self._write_log_entry(log_entry)
        
        # Write detailed log if needed
        if stage in ['ocr', 'extraction', 'validation', 'llm_fallback', 'completed']:
            self._write_detailed_log(job_id, stage, log_entry)
    
    def log_llm_call(self, job_id: str, input_data: Dict[str, Any], 
                     output_data: Dict[str, Any], model_info: Dict[str, Any]):
        """Log LLM call details"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'type': 'llm_call',
            'input_hash': self._hash_data(input_data),
            'output_hash': self._hash_data(output_data),
            'model_info': model_info,
            'input_size': len(json.dumps(input_data)),
            'output_size': len(json.dumps(output_data))
        }
        
        self._write_log_entry(log_entry)
    
    def log_rule_failure(self, job_id: str, rule_name: str, failure_details: Dict[str, Any]):
        """Log rule failure details"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'type': 'rule_failure',
            'rule_name': rule_name,
            'failure_details': failure_details
        }
        
        self._write_log_entry(log_entry)
    
    def log_human_review(self, job_id: str, review_action: str, 
                        reviewer_id: str, changes: Dict[str, Any]):
        """Log human review actions"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'type': 'human_review',
            'action': review_action,
            'reviewer_id': reviewer_id,
            'changes': changes
        }
        
        self._write_log_entry(log_entry)
    
    def log_export(self, job_id: str, export_format: str, 
                  export_path: str, record_count: int):
        """Log export operations"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'job_id': job_id,
            'type': 'export',
            'format': export_format,
            'path': export_path,
            'record_count': record_count
        }
        
        self._write_log_entry(log_entry)
    
    def _write_log_entry(self, log_entry: Dict[str, Any]):
        """Write log entry to file"""
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            logger.error(f"Failed to write log entry: {e}")
    
    def _write_detailed_log(self, job_id: str, stage: str, log_entry: Dict[str, Any]):
        """Write detailed log for specific stage"""
        try:
            detailed_file = self.detailed_logs / f"{job_id}_{stage}.json"
            with open(detailed_file, 'w', encoding='utf-8') as f:
                json.dump(log_entry, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to write detailed log: {e}")
    
    def _hash_data(self, data: Dict[str, Any]) -> str:
        """Create hash of data for integrity checking"""
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    
    def get_job_audit_trail(self, job_id: str) -> List[Dict[str, Any]]:
        """Get complete audit trail for a job"""
        audit_trail = []
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        log_entry = json.loads(line)
                        if log_entry.get('job_id') == job_id:
                            audit_trail.append(log_entry)
        except Exception as e:
            logger.error(f"Failed to read audit trail: {e}")
        
        return audit_trail
    
    def get_processing_stats(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get processing statistics for date range"""
        stats = {
            'total_jobs': 0,
            'completed_jobs': 0,
            'failed_jobs': 0,
            'llm_calls': 0,
            'human_reviews': 0,
            'auto_posted': 0,
            'stage_counts': {},
            'rule_failures': {},
            'processing_times': []
        }
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        log_entry = json.loads(line)
                        timestamp = datetime.fromisoformat(log_entry['timestamp'])
                        
                        if start_date <= timestamp <= end_date:
                            if log_entry.get('type') == 'llm_call':
                                stats['llm_calls'] += 1
                            elif log_entry.get('type') == 'human_review':
                                stats['human_reviews'] += 1
                            elif log_entry.get('type') == 'rule_failure':
                                rule_name = log_entry.get('rule_name', 'unknown')
                                stats['rule_failures'][rule_name] = stats['rule_failures'].get(rule_name, 0) + 1
                            elif log_entry.get('stage') == 'completed':
                                stats['completed_jobs'] += 1
                                if log_entry.get('metadata', {}).get('final_status') == 'auto_posted':
                                    stats['auto_posted'] += 1
                            elif log_entry.get('stage') == 'error':
                                stats['failed_jobs'] += 1
                            
                            # Count stages
                            stage = log_entry.get('stage')
                            if stage:
                                stats['stage_counts'][stage] = stats['stage_counts'].get(stage, 0) + 1
                            
                            # Collect processing times
                            if log_entry.get('duration_ms'):
                                stats['processing_times'].append(log_entry['duration_ms'])
        
        except Exception as e:
            logger.error(f"Failed to calculate stats: {e}")
        
        # Calculate averages
        if stats['processing_times']:
            stats['avg_processing_time_ms'] = sum(stats['processing_times']) / len(stats['processing_times'])
            stats['max_processing_time_ms'] = max(stats['processing_times'])
            stats['min_processing_time_ms'] = min(stats['processing_times'])
        
        stats['total_jobs'] = stats['completed_jobs'] + stats['failed_jobs']
        
        return stats
    
    def export_audit_trail(self, job_id: str, output_path: str):
        """Export audit trail to file"""
        audit_trail = self.get_job_audit_trail(job_id)
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(audit_trail, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to export audit trail: {e}")


# Global audit logger instance
audit_logger = AuditLogger()


def log_processing_stage(job_id: str, stage: str, status: str, 
                        metadata: Dict[str, Any], duration_ms: Optional[int] = None):
    """Log a processing stage"""
    audit_logger.log_processing_stage(job_id, stage, status, metadata, duration_ms)


def log_llm_call(job_id: str, input_data: Dict[str, Any], 
                output_data: Dict[str, Any], model_info: Dict[str, Any]):
    """Log LLM call details"""
    audit_logger.log_llm_call(job_id, input_data, output_data, model_info)


def log_rule_failure(job_id: str, rule_name: str, failure_details: Dict[str, Any]):
    """Log rule failure details"""
    audit_logger.log_rule_failure(job_id, rule_name, failure_details)


def log_human_review(job_id: str, review_action: str, 
                    reviewer_id: str, changes: Dict[str, Any]):
    """Log human review actions"""
    audit_logger.log_human_review(job_id, review_action, reviewer_id, changes)


def log_export(job_id: str, export_format: str, 
              export_path: str, record_count: int):
    """Log export operations"""
    audit_logger.log_export(job_id, export_format, export_path, record_count)


def get_job_audit_trail(job_id: str) -> List[Dict[str, Any]]:
    """Get complete audit trail for a job"""
    return audit_logger.get_job_audit_trail(job_id)


def get_processing_stats(start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Get processing statistics for date range"""
    return audit_logger.get_processing_stats(start_date, end_date)







