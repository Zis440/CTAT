import logging
from typing import Optional, Dict, Any

from fastapi import HTTPException

from app.services.ocr.ocr_service import ocr_service
from app.services.ocr.classifier import classifier
from app.services.ocr.extractor import extractor
from app.services.ocr.document_validator import document_validator
from app.services.neurofy_service import neurofy_service

logger = logging.getLogger(__name__)

class VerificationCoordinator:
    """Orchestrates the new OCR and Validation pipeline."""
    
    def process_upload(self, expected_slot: str, file_path: str, user_id: str) -> Dict[str, Any]:
        """
        1. OCR Extraction
        2. Classification
        3. Slot Validation
        4. Field Extraction
        5. API Verification Cross-check
        Returns the payload to save in the Database.
        """
        logger.info(f"Starting verification pipeline for {user_id} - slot: {expected_slot}")
        
        # 1. Raw Text OCR
        raw_text = ocr_service.extract_text(file_path)
        if not raw_text.strip():
            raise HTTPException(400, "Could not extract any text from the document. Ensure it is not blurry or password-protected.")
            
        # 2. Document Classification
        detected_type, doc_confidence = classifier.classify(raw_text)
        logger.info(f"Classified as {detected_type} with confidence {doc_confidence}")
        
        # 3. Slot Validation (Raises HTTPException if invalid)
        document_validator.validate_slot(expected_slot, detected_type)
        
        # 4. Field Extraction
        extracted_fields, ext_confidence = extractor.extract_fields(detected_type, raw_text)
        
        # 5. Quality check
        if doc_confidence < 0.2 and ext_confidence < 0.2:
            raise HTTPException(400, "Document quality is too low to verify automatically. Please upload a clearer image.")
            
        # 6. API Verification & Cross-Validation
        verification_status = "manual_review"
        verification_response = {}
        
        if detected_type == "pan_card":
            pan_num = extracted_fields.get("pan_number")
            if pan_num:
                logger.info(f"Verifying extracted PAN: {pan_num}")
                resp = neurofy_service.verify_pan(pan_num)
                verification_response = resp
                
                if resp.get("verified"):
                    verification_status = "verified"
                else:
                    verification_status = "failed"
            else:
                logger.warning("PAN detected but number not extracted.")
                verification_status = "manual_review"
                verification_response = {"reason": "PAN number could not be read clearly by OCR"}
                
        elif detected_type == "aadhaar_card":
            aadhaar_num = extracted_fields.get("aadhaar_number")
            if aadhaar_num and len(aadhaar_num) == 12:
                logger.info(f"Aadhaar detected and number extracted ({aadhaar_num}). Routing to manual review (OTP flow required).")
                verification_status = "manual_review"
                verification_response = {"reason": "Aadhaar requires OTP verification or manual validation"}
            else:
                logger.warning("Aadhaar detected but 12-digit number could not be extracted.")
                verification_status = "manual_review"
                verification_response = {"reason": "Aadhaar number could not be read clearly by OCR"}
            
        elif detected_type in ["passport", "driving_licence"]:
            logger.info(f"{detected_type.title()} detected. Routing to Manual Review.")
            verification_status = "manual_review"
            verification_response = {"reason": "Automatic API verification not available for this document type"}

        return {
            "detected_document_type": detected_type,
            "ocr_fields": extracted_fields,
            "ocr_confidence": round((doc_confidence + ext_confidence) / 2.0, 2),
            "verification_response": verification_response,
            "verification_status": verification_status
        }

coordinator = VerificationCoordinator()
