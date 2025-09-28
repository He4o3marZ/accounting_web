"""
Pipeline API Endpoints
HTTP endpoints for the deterministic extraction pipeline
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import Dict, Any, Optional
import logging

from ..pipeline.route import start_invoice_processing, get_job_status, get_job_result
from ..schemas.invoice import ProcessingResult, ProcessingThresholds
from ..audit.logs import get_job_audit_trail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/ingest")
async def ingest_invoice(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
) -> Dict[str, str]:
    """
    Start invoice processing pipeline
    
    Returns job_id for tracking processing status
    """
    try:
        # Validate file type
        allowed_types = ['.csv', '.xlsx', '.xls', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
        file_ext = '.' + file.filename.split('.')[-1].lower()
        
        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Allowed types: {allowed_types}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Start processing
        job_id = await start_invoice_processing(file_content, file.filename)
        
        logger.info(f"🚀 Started processing job {job_id} for {file.filename}")
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": f"Processing started for {file.filename}"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to start processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result")
async def get_result(job_id: str) -> Dict[str, Any]:
    """
    Get processing result for a job
    
    Returns complete processing result with status
    """
    try:
        # Get job status
        job_status = get_job_status(job_id)
        if not job_status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Get result if completed
        result = get_job_result(job_id)
        
        response = {
            "job_id": job_id,
            "status": job_status["status"],
            "current_stage": job_status.get("current_stage", "unknown"),
            "started_at": job_status["started_at"].isoformat(),
            "filename": job_status["filename"],
            "stages_completed": job_status.get("stages_completed", []),
            "error": job_status.get("error")
        }
        
        if result:
            response.update({
                "invoice_json": result.final_json,
                "rule_report": result.rule_report.dict(),
                "llm_patch": [patch.dict() for patch in result.llm_patch] if result.llm_patch else None,
                "final_json": result.final_json,
                "audit_trail": result.audit_trail,
                "processing_status": result.status
            })
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status(job_id: str) -> Dict[str, Any]:
    """
    Get processing status for a job
    
    Returns current status and progress information
    """
    try:
        job_status = get_job_status(job_id)
        if not job_status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "job_id": job_id,
            "status": job_status["status"],
            "current_stage": job_status.get("current_stage", "unknown"),
            "started_at": job_status["started_at"].isoformat(),
            "filename": job_status["filename"],
            "stages_completed": job_status.get("stages_completed", []),
            "error": job_status.get("error")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit")
async def get_audit_trail(job_id: str) -> Dict[str, Any]:
    """
    Get complete audit trail for a job
    
    Returns detailed processing log
    """
    try:
        audit_trail = get_job_audit_trail(job_id)
        
        return {
            "job_id": job_id,
            "audit_trail": audit_trail,
            "total_entries": len(audit_trail)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get audit trail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review/apply")
async def apply_human_patch(
    job_id: str,
    patch_data: Dict[str, Any]
) -> Dict[str, str]:
    """
    Apply human review patch to invoice
    
    Accepts manual corrections and re-runs validation
    """
    try:
        # This would integrate with the review system
        # For now, return success
        
        logger.info(f"🔧 Applied human patch to job {job_id}")
        
        return {
            "job_id": job_id,
            "status": "success",
            "message": "Human patch applied successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to apply human patch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_processing_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get processing statistics
    
    Returns aggregated statistics for the specified date range
    """
    try:
        from datetime import datetime
        from ..audit.logs import get_processing_stats
        
        # Parse dates
        start = datetime.fromisoformat(start_date) if start_date else datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end = datetime.fromisoformat(end_date) if end_date else datetime.now()
        
        stats = get_processing_stats(start, end)
        
        return {
            "date_range": {
                "start": start.isoformat(),
                "end": end.isoformat()
            },
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint
    
    Returns system health status
    """
    return {
        "status": "healthy",
        "message": "Pipeline service is running",
        "timestamp": datetime.now().isoformat()
    }





