#!/usr/bin/env python3
"""
Python Worker for JoAutomation Accounting System
Handles complex file parsing including PDFs, images, and OCR
"""

import os
import json
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

import boto3
import pandas as pd
import pdfplumber
import camelot
import tabula
import cv2
import pytesseract
from PIL import Image
import requests
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="JoAutomation Python Worker",
    description="Handles complex file parsing for the accounting system",
    version="1.0.0"
)

# S3 Configuration
S3_BUCKET = os.getenv('S3_BUCKET', 'joautomation-uploads')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_ACCESS_KEY = os.getenv('S3_ACCESS_KEY_ID')
S3_SECRET_KEY = os.getenv('S3_SECRET_ACCESS_KEY')
S3_ENDPOINT = os.getenv('S3_ENDPOINT')

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=S3_REGION,
    aws_access_key_id=S3_ACCESS_KEY,
    aws_secret_access_key=S3_SECRET_KEY,
    endpoint_url=S3_ENDPOINT
)

# Pydantic models
class Transaction(BaseModel):
    id: Optional[str] = None
    date: str
    description: str
    vendor: Optional[str] = None
    amount: float
    currency: str = "EUR"
    category: Optional[str] = None
    taxAmount: Optional[float] = None
    meta: Optional[Dict[str, Any]] = None

class JobSummary(BaseModel):
    totalsByCategory: Dict[str, float]
    total: float
    totalIncome: float
    totalExpenses: float
    netCashflow: float
    transactionCount: int

class JobMetadata(BaseModel):
    processingTime: float
    confidence: Optional[float] = None
    method: str
    errors: Optional[List[str]] = None

class JobResult(BaseModel):
    jobId: str
    status: str
    transactions: List[Transaction]
    summary: JobSummary
    metadata: JobMetadata
    createdAt: str

class PythonWorkerRequest(BaseModel):
    jobId: str
    s3Key: str
    mime: str
    originalName: str
    userId: str
    callbackUrl: str
    apiKey: str

class PythonWorkerResponse(BaseModel):
    success: bool
    jobId: str
    result: Optional[JobResult] = None
    error: Optional[str] = None

# File parsers
class CSVParser:
    def can_handle(self, mime_type: str) -> bool:
        return mime_type in ['text/csv', 'application/csv']
    
    def parse(self, file_path: str, filename: str) -> List[Transaction]:
        try:
            df = pd.read_csv(file_path)
            transactions = []
            
            for index, row in df.iterrows():
                transaction = Transaction(
                    id=f"csv-{int(time.time())}-{index}",
                    date=self._parse_date(row.get('Date', row.get('date', datetime.now().isoformat()))),
                    description=str(row.get('Description', row.get('description', 'Transaction'))),
                    vendor=str(row.get('Vendor', row.get('vendor', 'Unknown'))),
                    amount=self._parse_amount(row.get('Amount', row.get('amount', 0))),
                    currency=str(row.get('Currency', row.get('currency', 'EUR'))),
                    category=str(row.get('Category', row.get('category', 'General'))),
                    taxAmount=self._parse_amount(row.get('TaxAmount', row.get('taxAmount'))) if row.get('TaxAmount') or row.get('taxAmount') else None,
                    meta={
                        'source': 'csv',
                        'filename': filename,
                        'rowIndex': index
                    }
                )
                transactions.append(transaction)
            
            return transactions
        except Exception as e:
            logger.error(f"CSV parsing error: {e}")
            raise Exception(f"Failed to parse CSV: {str(e)}")
    
    def _parse_date(self, date_str: str) -> str:
        try:
            from dateutil import parser
            parsed_date = parser.parse(str(date_str))
            return parsed_date.isoformat()
        except:
            return datetime.now().isoformat()
    
    def _parse_amount(self, amount) -> float:
        if pd.isna(amount):
            return 0.0
        
        if isinstance(amount, (int, float)):
            return float(amount)
        
        # Clean string amount
        cleaned = str(amount).replace('€', '').replace('$', '').replace(',', '.').strip()
        try:
            return float(cleaned)
        except:
            return 0.0

class PDFParser:
    def can_handle(self, mime_type: str) -> bool:
        return mime_type == 'application/pdf'
    
    def parse(self, file_path: str, filename: str) -> List[Transaction]:
        try:
            transactions = []
            
            # Try different PDF parsing methods
            # Method 1: pdfplumber for text extraction
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
            
            # Method 2: camelot for table extraction
            try:
                tables = camelot.read_pdf(file_path, pages='all')
                for table in tables:
                    df = table.df
                    # Process table data
                    for index, row in df.iterrows():
                        if len(row) >= 3:  # Ensure we have enough columns
                            transaction = self._parse_table_row(row, index, filename)
                            if transaction:
                                transactions.append(transaction)
            except Exception as e:
                logger.warning(f"Camelot table extraction failed: {e}")
            
            # Method 3: tabula for additional table extraction
            try:
                tabula_df = tabula.read_pdf(file_path, pages='all', multiple_tables=True)
                for df in tabula_df:
                    for index, row in df.iterrows():
                        transaction = self._parse_table_row(row, index, filename)
                        if transaction:
                            transactions.append(transaction)
            except Exception as e:
                logger.warning(f"Tabula extraction failed: {e}")
            
            # If no transactions found from tables, try text parsing
            if not transactions:
                transactions = self._parse_text_content(text, filename)
            
            return transactions
        except Exception as e:
            logger.error(f"PDF parsing error: {e}")
            raise Exception(f"Failed to parse PDF: {str(e)}")
    
    def _parse_table_row(self, row, index: int, filename: str) -> Optional[Transaction]:
        try:
            # Look for amount patterns in the row
            amount = None
            description = ""
            
            for cell in row:
                cell_str = str(cell).strip()
                if not cell_str or cell_str == 'nan':
                    continue
                
                # Check if cell contains a number (amount)
                import re
                amount_match = re.search(r'(\d+[.,]\d{2})', cell_str)
                if amount_match and amount is None:
                    amount = float(amount_match.group(1).replace(',', '.'))
                elif not amount_match and len(cell_str) > 3:
                    description = cell_str
            
            if amount is not None:
                return Transaction(
                    id=f"pdf-{int(time.time())}-{index}",
                    date=datetime.now().isoformat(),
                    description=description or "Transaction",
                    vendor="PDF Document",
                    amount=amount,
                    currency="EUR",
                    category="General",
                    meta={
                        'source': 'pdf',
                        'filename': filename,
                        'rowIndex': index
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to parse table row: {e}")
        
        return None
    
    def _parse_text_content(self, text: str, filename: str) -> List[Transaction]:
        transactions = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if len(line) < 5:
                continue
            
            # Look for lines with amounts
            import re
            amount_match = re.search(r'(\d+[.,]\d{2})', line)
            if amount_match:
                amount = float(amount_match.group(1).replace(',', '.'))
                description = line.replace(amount_match.group(1), '').strip()
                
                transaction = Transaction(
                    id=f"pdf-text-{int(time.time())}-{i}",
                    date=datetime.now().isoformat(),
                    description=description or "Transaction",
                    vendor="PDF Document",
                    amount=amount,
                    currency="EUR",
                    category="General",
                    meta={
                        'source': 'pdf-text',
                        'filename': filename,
                        'lineIndex': i
                    }
                )
                transactions.append(transaction)
        
        return transactions

class ImageParser:
    def can_handle(self, mime_type: str) -> bool:
        return mime_type.startswith('image/')
    
    def parse(self, file_path: str, filename: str) -> List[Transaction]:
        try:
            # Load image
            image = cv2.imread(file_path)
            if image is None:
                raise Exception("Could not load image")
            
            # Preprocess image for better OCR
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            processed = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Perform OCR
            text = pytesseract.image_to_string(processed, config='--psm 6')
            
            # Parse OCR text for transactions
            transactions = self._parse_ocr_text(text, filename)
            
            return transactions
        except Exception as e:
            logger.error(f"Image parsing error: {e}")
            raise Exception(f"Failed to parse image: {str(e)}")
    
    def _parse_ocr_text(self, text: str, filename: str) -> List[Transaction]:
        transactions = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if len(line) < 5:
                continue
            
            # Look for lines with amounts
            import re
            amount_match = re.search(r'(\d+[.,]\d{2})', line)
            if amount_match:
                amount = float(amount_match.group(1).replace(',', '.'))
                description = line.replace(amount_match.group(1), '').strip()
                
                transaction = Transaction(
                    id=f"ocr-{int(time.time())}-{i}",
                    date=datetime.now().isoformat(),
                    description=description or "Transaction",
                    vendor="OCR Document",
                    amount=amount,
                    currency="EUR",
                    category="General",
                    meta={
                        'source': 'ocr',
                        'filename': filename,
                        'lineIndex': i
                    }
                )
                transactions.append(transaction)
        
        return transactions

# Parser router
class ParserRouter:
    def __init__(self):
        self.parsers = [
            CSVParser(),
            PDFParser(),
            ImageParser()
        ]
    
    def parse_file(self, file_path: str, filename: str, mime_type: str) -> List[Transaction]:
        for parser in self.parsers:
            if parser.can_handle(mime_type):
                return parser.parse(file_path, filename)
        
        raise Exception(f"No parser available for MIME type: {mime_type}")

# Utility functions
def download_file_from_s3(s3_key: str) -> str:
    """Download file from S3 and return local path"""
    local_path = f"/tmp/{os.path.basename(s3_key)}"
    
    try:
        s3_client.download_file(S3_BUCKET, s3_key, local_path)
        return local_path
    except Exception as e:
        logger.error(f"Failed to download file from S3: {e}")
        raise Exception(f"Failed to download file: {str(e)}")

def calculate_summary(transactions: List[Transaction]) -> JobSummary:
    """Calculate summary statistics from transactions"""
    totals_by_category = {}
    total_income = 0
    total_expenses = 0
    
    for transaction in transactions:
        category = transaction.category or "General"
        totals_by_category[category] = totals_by_category.get(category, 0) + transaction.amount
        
        if transaction.amount > 0:
            total_income += transaction.amount
        else:
            total_expenses += abs(transaction.amount)
    
    return JobSummary(
        totalsByCategory=totals_by_category,
        total=total_income - total_expenses,
        totalIncome=total_income,
        totalExpenses=total_expenses,
        netCashflow=total_income - total_expenses,
        transactionCount=len(transactions)
    )

async def send_callback(callback_url: str, result: JobResult, api_key: str):
    """Send results back to the API"""
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
        
        response = requests.post(
            callback_url,
            json=result.dict(),
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            logger.info(f"Successfully sent callback for job {result.jobId}")
        else:
            logger.error(f"Callback failed with status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Failed to send callback: {e}")

# API endpoints
@app.post("/process", response_model=PythonWorkerResponse)
async def process_file(request: PythonWorkerRequest):
    """Process a file and return results"""
    start_time = time.time()
    
    try:
        logger.info(f"Processing job {request.jobId} for file {request.originalName}")
        
        # Download file from S3
        local_file_path = download_file_from_s3(request.s3Key)
        
        # Parse file
        parser_router = ParserRouter()
        transactions = parser_router.parse_file(local_file_path, request.originalName, request.mime)
        
        # Calculate summary
        summary = calculate_summary(transactions)
        
        # Create result
        result = JobResult(
            jobId=request.jobId,
            status="completed",
            transactions=transactions,
            summary=summary,
            metadata=JobMetadata(
                processingTime=time.time() - start_time,
                method="python",
                confidence=0.9  # High confidence for Python processing
            ),
            createdAt=datetime.now().isoformat()
        )
        
        # Send callback to API
        await send_callback(request.callbackUrl, result, request.apiKey)
        
        # Clean up local file
        os.remove(local_file_path)
        
        return PythonWorkerResponse(
            success=True,
            jobId=request.jobId,
            result=result
        )
        
    except Exception as e:
        logger.error(f"Processing failed for job {request.jobId}: {e}")
        
        # Send error callback
        error_result = JobResult(
            jobId=request.jobId,
            status="failed",
            transactions=[],
            summary=JobSummary(
                totalsByCategory={},
                total=0,
                totalIncome=0,
                totalExpenses=0,
                netCashflow=0,
                transactionCount=0
            ),
            metadata=JobMetadata(
                processingTime=time.time() - start_time,
                method="python",
                errors=[str(e)]
            ),
            createdAt=datetime.now().isoformat()
        )
        
        try:
            await send_callback(request.callbackUrl, error_result, request.apiKey)
        except:
            pass  # Don't fail if callback fails
        
        return PythonWorkerResponse(
            success=False,
            jobId=request.jobId,
            error=str(e)
        )

@app.get("/status/{job_id}", response_model=PythonWorkerResponse)
async def get_status(job_id: str, authorization: str = Header(None)):
    """Get status of a job (placeholder implementation)"""
    # In a real implementation, this would check job status from a database
    return PythonWorkerResponse(
        success=True,
        jobId=job_id,
        error="Status checking not implemented"
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)






