import re
from typing import Tuple

class DocumentClassifier:
    """Classifies OCR text into document types based on heuristics."""

    KEYWORDS = {
        "pan_card": [
            r"INCOME\s*TAX\s*DEPARTMENT",
            r"Permanent\s*Account\s*Number",
            r"\bPAN\b",
            r"GOVT\.\s*OF\s*INDIA",
        ],
        "aadhaar_card": [
            r"Government\s*of\s*India",
            r"Unique\s*Identification\s*Authority",
            r"\bUIDAI\b",
            r"\bAadhaar\b",
            r"Mera\s*Aadhaar",
        ],
        "passport": [
            r"Republic\s*of\s*India",
            r"\bPassport\b",
            r"PASSPORT\s*NO",
        ],
        "driving_licence": [
            r"Driving\s*Licence",
            r"DL\s*No",
            r"UNION\s*OF\s*INDIA",
            r"TRANSPORT\s*DEPARTMENT",
            r"AUTHORIZATION\s*TO\s*DRIVE",
        ]
    }

    def classify(self, text: str) -> Tuple[str, float]:
        """
        Classifies the text and returns (document_type, confidence_score).
        Confidence is based on the number of keyword matches.
        """
        if not text:
            return "invalid", 0.0

        scores = {}
        for doc_type, patterns in self.KEYWORDS.items():
            matches = 0
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    matches += 1
            scores[doc_type] = matches / len(patterns) if patterns else 0.0

        best_match = max(scores.items(), key=lambda x: x[1])
        doc_type, confidence = best_match

        if confidence == 0.0:
            return "unknown", 0.0

        return doc_type, confidence

classifier = DocumentClassifier()
