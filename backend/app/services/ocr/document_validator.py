from fastapi import HTTPException

class DocumentValidator:
    """Validates if the classified document matches the expected upload slot."""
    
    # Map frontend slot name to allowed OCR detected types
    ALLOWED_MAPPINGS = {
        "pan_card": ["pan_card"],
        "government_id": ["aadhaar_card", "passport", "driving_licence"],
        # Add more mappings as needed
    }
    
    def validate_slot(self, expected_slot: str, detected_type: str) -> bool:
        """
        Validates if the detected_type is allowed in the expected_slot.
        Raises HTTPException if invalid.
        """
        if detected_type == "invalid" or detected_type == "unknown":
            raise HTTPException(
                status_code=400,
                detail=f"Could not reliably detect document type from the image. Please upload a clearer document."
            )
            
        allowed = self.ALLOWED_MAPPINGS.get(expected_slot, [])
        
        # If the slot is not strictly mapped, we might allow it (or reject it depending on strictness)
        if not allowed:
            return True
            
        if detected_type not in allowed:
            allowed_str = ", ".join(allowed).replace("_", " ").title()
            detected_str = detected_type.replace("_", " ").title()
            expected_str = expected_slot.replace("_", " ").title()
            raise HTTPException(
                status_code=400,
                detail=f"Expected {expected_str}. Received {detected_str}. Please upload an allowed document type: {allowed_str}."
            )
            
        return True

document_validator = DocumentValidator()
