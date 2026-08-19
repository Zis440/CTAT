"""
Comprehensive analysis of TAT scoring manuals
Uses existing PDF parser from utils
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from app.core.pdf_parser import PDFParser
import json

def analyze_manual(pdf_path: Path, manual_name: str):
    """Extract and analyze a manual"""
    print(f"\n{'='*70}")
    print(f"ANALYZING: {manual_name}")
    print(f"File: {pdf_path.name}")
    print(f"{'='*70}\n")

    parser = PDFParser(pdf_path)

    print("📄 Extracting pages...")
    all_pages = parser.extract_all_pages()

    print(f"✅ Extracted {len(all_pages)} pages\n")

    for i, page_data in enumerate(all_pages[:3]):
        print(f"\n--- Page {i+1} Preview (first 600 chars) ---")
        text = page_data.get('text', '')
        print(text[:600] if text else "[Empty page]")

    return {
        'manual_name': manual_name,
        'file_name': pdf_path.name,
        'total_pages': len(all_pages),
        'pages': all_pages,
        'full_text': '\n\n'.join([p.get('text', '') for p in all_pages])
    }

manuals = [
    (PROJECT_ROOT / "data" / "tat_scoring_manual" / "Scoring Guide for Psychological Assessment.pdf",
     "Scoring Guide"),
    (PROJECT_ROOT / "data" / "tat_scoring_manual" / "tat-needs-presses.pdf",
     "Needs and Presses"),
    (PROJECT_ROOT / "data" / "tat_judging_manual" / "The Thematic Apperception Test manual.pdf",
     "TAT Manual")
]

extracted = {}
for pdf_path, name in manuals:
    try:
        result = analyze_manual(pdf_path, name)
        extracted[name] = result
    except Exception as e:
        print(f"❌ Error processing {name}: {e}")
        extracted[name] = {'error': str(e)}

output_path = PROJECT_ROOT / "outputs" / "extracted_manuals.json"
output_path.parent.mkdir(parents=True, exist_ok=True)

print(f"\n{'='*70}")
print("💾 Saving extracted content...")
print(f"{'='*70}\n")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(extracted, f, indent=2, ensure_ascii=False)

print(f"✅ Saved to: {output_path}\n")

print("📊 EXTRACTION SUMMARY")
print("="*70)
for name, data in extracted.items():
    if 'error' in data:
        print(f"{name}: ERROR - {data['error']}")
    else:
        total_chars = len(data.get('full_text', ''))
        print(f"{name}:")
        print(f"  - Pages: {data['total_pages']}")
        print(f"  - Characters: {total_chars:,}")
        print(f"  - Words (approx): {total_chars // 5:,}")

print("="*70)
print("\n✅ Manual extraction complete!")
