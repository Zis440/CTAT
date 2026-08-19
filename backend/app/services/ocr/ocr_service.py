import logging
from pathlib import Path
from typing import List, Tuple
from PIL import Image
import pytesseract
import pdf2image

logger = logging.getLogger(__name__)

class OCRService:
    """Service to extract raw text from images or PDFs using pytesseract."""
    
    def __init__(self, tesseract_cmd: str = None):
        """Optionally configure the path to the tesseract executable."""
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    
    def extract_text(self, file_path: str) -> str:
        """
        Detects if file is PDF or image. Converts to grayscale and extracts text.
        Returns the combined raw text from all pages.
        """
        path = Path(file_path)
        if not path.exists():
            logger.error(f"File not found for OCR: {file_path}")
            return ""
            
        ext = path.suffix.lower()
        full_text = []
        
        try:
            if ext == '.pdf':
                # Convert PDF to list of PIL Images
                images = pdf2image.convert_from_path(str(path))
            else:
                # Open image
                images = [Image.open(path)]
                
            for img in images:
                # Preprocess: Convert to grayscale
                gray_img = img.convert('L')
                
                # Extract text
                text = pytesseract.image_to_string(gray_img)
                full_text.append(text)
                
            return "\n".join(full_text)
            
        except Exception as e:
            logger.error(f"OCR Extraction failed for {file_path}: {str(e)}")
            return ""

ocr_service = OCRService()
