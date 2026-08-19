from app.services.ocr.classifier import classifier
from app.services.ocr.extractor import extractor

def test_classifier_pan():
    text = "INCOME TAX DEPARTMENT\nPermanent Account Number\nName: JOHN DOE\nABCDE1234F"
    doc_type, conf = classifier.classify(text)
    assert doc_type == "pan_card"
    assert conf > 0.0

def test_classifier_aadhaar():
    text = "Government of India\nUIDAI\nAadhaar\n1234 5678 9012"
    doc_type, conf = classifier.classify(text)
    assert doc_type == "aadhaar_card"
    assert conf > 0.0

def test_extractor_pan():
    text = "INCOME TAX DEPARTMENT\nPermanent Account Number\nName: JOHN DOE\nABCDE1234F\nDOB: 01/01/1990"
    fields, conf = extractor.extract_fields("pan_card", text)
    assert fields.get("pan_number") == "ABCDE1234F"
    assert fields.get("dob") == "01/01/1990"
    assert conf == 1.0

def test_extractor_aadhaar():
    text = "Government of India\nUIDAI\n1234 5678 9012\nDOB: 12-05-1985"
    fields, conf = extractor.extract_fields("aadhaar_card", text)
    assert fields.get("aadhaar_number") == "123456789012"
    assert fields.get("dob") == "12-05-1985"
    assert conf == 1.0

if __name__ == '__main__':
    test_classifier_pan()
    test_classifier_aadhaar()
    test_extractor_pan()
    test_extractor_aadhaar()
    print("All tests passed!")
