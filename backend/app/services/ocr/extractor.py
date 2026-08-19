import re
from typing import Dict, Any, Tuple

class OCRExtractor:
    """Extracts structured fields from raw OCR text using Regex."""
    
    def extract_fields(self, document_type: str, text: str) -> Tuple[Dict[str, Any], float]:
        """
        Extracts fields based on document type.
        Returns a tuple of (extracted_fields, overall_confidence).
        Confidence is calculated as the ratio of found mandatory fields.
        """
        if not text:
            return {}, 0.0
            
        fields = {}
        found_mandatory = 0
        mandatory_count = 0
        
        # Helper to find first match
        def extract(pattern: str, text: str) -> str:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip() if len(match.groups()) > 0 else match.group(0).strip()
            return ""

        if document_type == "pan_card":
            mandatory_count = 1
            # PAN Number (5 chars, 4 digits, 1 char)
            fields["pan_number"] = extract(r'\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b', text)
            if fields["pan_number"]: found_mandatory += 1
            
            # Very basic DOB extraction
            fields["dob"] = extract(r'\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b', text)
            
        elif document_type == "aadhaar_card":
            mandatory_count = 1
            # Aadhaar Number (12 digits, possibly spaced)
            fields["aadhaar_number"] = extract(r'\b(\d{4}\s?\d{4}\s?\d{4})\b', text)
            if fields["aadhaar_number"]: 
                fields["aadhaar_number"] = fields["aadhaar_number"].replace(" ", "")
                found_mandatory += 1
                
            fields["dob"] = extract(r'DOB.*?\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b|Year of Birth.*?\b(\d{4})\b', text)
            
        elif document_type == "passport":
            mandatory_count = 1
            fields["passport_number"] = extract(r'\b([A-Z][1-9]\d{6})\b', text)
            if fields["passport_number"]: found_mandatory += 1
            
        elif document_type == "driving_licence":
            mandatory_count = 1
            # DL patterns vary heavily by state, e.g. RJ14 20110012345
            fields["dl_number"] = extract(r'\b([A-Z]{2}[0-9]{2,13})\b', text)
            if fields["dl_number"]: found_mandatory += 1
            
        confidence = found_mandatory / mandatory_count if mandatory_count > 0 else 0.0
        
        return fields, confidence

extractor = OCRExtractor()
