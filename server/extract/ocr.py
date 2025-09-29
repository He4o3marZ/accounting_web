"""
OCR Wrapper for Deterministic Extraction Pipeline
Wraps various OCR engines to return standardized Token structure
"""

import re
from typing import List, Optional, Dict, Any
from ..schemas.invoice import Token
import logging

logger = logging.getLogger(__name__)


class OCRWrapper:
    """Wrapper for OCR engines to return standardized Token structure"""
    
    def __init__(self):
        self.ocr_engines = {}
        self._initialize_engines()
    
    def _initialize_engines(self):
        """Initialize available OCR engines"""
        try:
            # Try to import Google Cloud Vision
            from ...services.googleCloudVision import GoogleCloudVisionService
            self.ocr_engines['google_cloud_vision'] = GoogleCloudVisionService()
            logger.info("✅ Google Cloud Vision OCR engine loaded")
        except ImportError:
            logger.warning("⚠️ Google Cloud Vision not available")
        
        try:
            # Try to import local OCR
            from ...services.ocrService import OCRService
            self.ocr_engines['local_tesseract'] = OCRService()
            logger.info("✅ Local Tesseract OCR engine loaded")
        except ImportError:
            logger.warning("⚠️ Local Tesseract not available")
    
    def normalize_digits(self, text: str) -> str:
        """Normalize Arabic-Indic and Persian digits to Western digits"""
        if not text:
            return ""
        
        # Extended mapping for all Arabic/Persian digit variants
        digit_map = {
            # Arabic-Indic digits
            '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
            '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
            # Persian digits
            '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
            '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        }
        
        # Replace digits
        normalized = text
        for arabic_digit, western_digit in digit_map.items():
            normalized = normalized.replace(arabic_digit, western_digit)
        
        # Normalize punctuation
        normalized = normalized.replace('٬', ',')  # Arabic comma
        normalized = normalized.replace('،', ',')  # Arabic comma variant
        normalized = normalized.replace('٫', '.')  # Arabic decimal point
        
        # Clean up spacing
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        return normalized
    
    def normalize_spacing(self, text: str) -> str:
        """Normalize spacing and remove extra whitespace"""
        if not text:
            return ""
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common spacing issues around punctuation
        text = re.sub(r'\s+([.,:;!?])', r'\1', text)  # Remove space before punctuation
        text = re.sub(r'([.,:;!?])\s*([.,:;!?])', r'\1\2', text)  # Remove space between punctuation
        
        return text.strip()
    
    async def extract_tokens_from_image(self, image_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens from image using available OCR engines"""
        tokens = []
        
        # Try Google Cloud Vision first
        if 'google_cloud_vision' in self.ocr_engines:
            try:
                tokens = await self._extract_with_google_cloud_vision(image_buffer, filename)
                if tokens:
                    logger.info(f"✅ Extracted {len(tokens)} tokens with Google Cloud Vision")
                    return tokens
            except Exception as e:
                logger.warning(f"⚠️ Google Cloud Vision failed: {e}")
        
        # Fallback to local OCR
        if 'local_tesseract' in self.ocr_engines:
            try:
                tokens = await self._extract_with_local_ocr(image_buffer, filename)
                if tokens:
                    logger.info(f"✅ Extracted {len(tokens)} tokens with local OCR")
                    return tokens
            except Exception as e:
                logger.warning(f"⚠️ Local OCR failed: {e}")
        
        # If all engines failed, return empty list
        logger.error("❌ All OCR engines failed")
        return []
    
    async def _extract_with_google_cloud_vision(self, image_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens using Google Cloud Vision"""
        try:
            gcv = self.ocr_engines['google_cloud_vision']
            await gcv.initialize()
            
            # Use the processImage method
            result = await gcv.processImage(image_buffer, filename)
            
            if not result.text:
                return []
            
            # Parse the text into tokens
            # For now, we'll create a single token for the entire text
            # In a full implementation, you'd parse the detailed annotations
            tokens = []
            lines = result.text.split('\n')
            
            for i, line in enumerate(lines):
                if line.strip():
                    normalized_text = self.normalize_digits(line)
                    normalized_text = self.normalize_spacing(normalized_text)
                    
                    token = Token(
                        text=normalized_text,
                        confidence=result.confidence / 100.0,  # Convert to 0-1 range
                        page=0,  # Single page for images
                        bbox=[0, i * 20, 1000, (i + 1) * 20]  # Placeholder bbox
                    )
                    tokens.append(token)
            
            return tokens
            
        except Exception as e:
            logger.error(f"Google Cloud Vision extraction failed: {e}")
            return []
    
    async def _extract_with_local_ocr(self, image_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens using local OCR"""
        try:
            ocr_service = self.ocr_engines['local_tesseract']
            
            # Use the processImage method
            result = await ocr_service.processImage(image_buffer, filename)
            
            if not result.text:
                return []
            
            # Parse the text into tokens
            tokens = []
            lines = result.text.split('\n')
            
            for i, line in enumerate(lines):
                if line.strip():
                    normalized_text = self.normalize_digits(line)
                    normalized_text = self.normalize_spacing(normalized_text)
                    
                    token = Token(
                        text=normalized_text,
                        confidence=result.confidence / 100.0,  # Convert to 0-1 range
                        page=0,  # Single page for images
                        bbox=[0, i * 20, 1000, (i + 1) * 20]  # Placeholder bbox
                    )
                    tokens.append(token)
            
            return tokens
            
        except Exception as e:
            logger.error(f"Local OCR extraction failed: {e}")
            return []
    
    async def extract_tokens_from_pdf(self, pdf_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens from PDF using available OCR engines"""
        tokens = []
        
        # Try Google Cloud Vision first
        if 'google_cloud_vision' in self.ocr_engines:
            try:
                tokens = await self._extract_pdf_with_google_cloud_vision(pdf_buffer, filename)
                if tokens:
                    logger.info(f"✅ Extracted {len(tokens)} tokens from PDF with Google Cloud Vision")
                    return tokens
            except Exception as e:
                logger.warning(f"⚠️ Google Cloud Vision PDF extraction failed: {e}")
        
        # Fallback to local OCR
        if 'local_tesseract' in self.ocr_engines:
            try:
                tokens = await self._extract_pdf_with_local_ocr(pdf_buffer, filename)
                if tokens:
                    logger.info(f"✅ Extracted {len(tokens)} tokens from PDF with local OCR")
                    return tokens
            except Exception as e:
                logger.warning(f"⚠️ Local OCR PDF extraction failed: {e}")
        
        # If all engines failed, return empty list
        logger.error("❌ All PDF OCR engines failed")
        return []
    
    async def _extract_pdf_with_google_cloud_vision(self, pdf_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens from PDF using Google Cloud Vision"""
        try:
            gcv = self.ocr_engines['google_cloud_vision']
            await gcv.initialize()
            
            # Use the processPDF method
            result = await gcv.processPDF(pdf_buffer, filename)
            
            if not result.text:
                return []
            
            # Parse the text into tokens by page
            tokens = []
            pages = result.text.split('--- PAGE BREAK ---')
            
            for page_num, page_text in enumerate(pages):
                if page_text.strip():
                    lines = page_text.strip().split('\n')
                    
                    for i, line in enumerate(lines):
                        if line.strip():
                            normalized_text = self.normalize_digits(line)
                            normalized_text = self.normalize_spacing(normalized_text)
                            
                            token = Token(
                                text=normalized_text,
                                confidence=result.confidence / 100.0,
                                page=page_num,
                                bbox=[0, i * 20, 1000, (i + 1) * 20]  # Placeholder bbox
                            )
                            tokens.append(token)
            
            return tokens
            
        except Exception as e:
            logger.error(f"Google Cloud Vision PDF extraction failed: {e}")
            return []
    
    async def _extract_pdf_with_local_ocr(self, pdf_buffer: bytes, filename: str) -> List[Token]:
        """Extract tokens from PDF using local OCR"""
        try:
            ocr_service = self.ocr_engines['local_tesseract']
            
            # Use the processPDF method
            result = await ocr_service.processPDF(pdf_buffer, filename)
            
            if not result.text:
                return []
            
            # Parse the text into tokens by page
            tokens = []
            pages = result.text.split('--- PAGE BREAK ---')
            
            for page_num, page_text in enumerate(pages):
                if page_text.strip():
                    lines = page_text.strip().split('\n')
                    
                    for i, line in enumerate(lines):
                        if line.strip():
                            normalized_text = self.normalize_digits(line)
                            normalized_text = self.normalize_spacing(normalized_text)
                            
                            token = Token(
                                text=normalized_text,
                                confidence=result.confidence / 100.0,
                                page=page_num,
                                bbox=[0, i * 20, 1000, (i + 1) * 20]  # Placeholder bbox
                            )
                            tokens.append(token)
            
            return tokens
            
        except Exception as e:
            logger.error(f"Local OCR PDF extraction failed: {e}")
            return []


# Global OCR wrapper instance
ocr_wrapper = OCRWrapper()


async def extract_tokens(image_buffer: bytes, filename: str) -> List[Token]:
    """Extract tokens from image or PDF file"""
    file_ext = filename.lower().split('.')[-1]
    
    if file_ext in ['pdf']:
        return await ocr_wrapper.extract_tokens_from_pdf(image_buffer, filename)
    else:
        return await ocr_wrapper.extract_tokens_from_image(image_buffer, filename)







