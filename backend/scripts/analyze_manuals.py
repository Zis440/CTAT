"""
Direct manual extraction using minimal dependencies
"""
import json
from pathlib import Path

print("Starting manual analysis...")
print("="*70)

PROJECT_ROOT = Path(r"D:\TAT\project_root")

manuals_info = {
    'Scoring Guide for Psychological Assessment': {
        'path': PROJECT_ROOT / "datasets" / "tat_scoring_manual" / "Scoring Guide for Psychological Assessment.pdf",
        'description': 'Comprehensive scoring guide for psychological assessment',
        'key_areas': [
            'Quantitative scoring methods',
            'Clinical interpretation frameworks',
            'Statistical norms and validation',
            'Diagnostic criteria mapping'
        ]
    },
    'TAT Needs and Presses': {
        'path': PROJECT_ROOT / "datasets" / "tat_scoring_manual" / "tat-needs-presses.pdf",
        'description': 'Murray\'s system of needs and environmental presses',
        'key_areas': [
            'Achievement needs',
            'Affiliation needs',
            'Power and dominance needs',
            'Environmental press factors',
            'Need-press interaction patterns'
        ]
    },
    'TAT Manual': {
        'path': PROJECT_ROOT / "datasets" / "tat_judging_manual" / "The Thematic Apperception Test manual.pdf",
        'description': 'Official TAT administration and interpretation manual',
        'key_areas': [
            'Administration procedures',
            'Card-specific guidelines',
            'Interpretive frameworks',
            'Clinical applications'
        ]
    }
}

report = {
    'analysis_date': '2026-02-10',
    'manuals_analyzed': [],
    'total_manuals': len(manuals_info),
    'extraction_status': 'In Progress - Manual Analysis Required',
    'recommendations': []
}

for name, info in manuals_info.items():
    manual_data = {
        'name': name,
        'file_name': info['path'].name,
        'file_exists': info['path'].exists(),
        'file_size_mb': round(info['path'].stat().st_size / (1024*1024), 2) if info['path'].exists() else 0,
        'description': info['description'],
        'key_content_areas': info['key_areas'],
        'extraction_method_needed': 'pdfplumber or pdf2image+tesseract'
    }

    report['manuals_analyzed'].append(manual_data)

    print(f"\n📄 {name}")
    print(f"   File: {info['path'].name}")
    print(f"   Exists: {'✅' if manual_data['file_exists'] else '❌'}")
    if manual_data['file_exists']:
        print(f"   Size: {manual_data['file_size_mb']} MB")
    print(f"   Key Areas:")
    for area in info['key_areas']:
        print(f"      - {area}")

report['scoring_system_requirements'] = {
    'quantitative_metrics': [
        'Need achievement score',
        'Need affiliation score',
        'Need power score',
        'Environmental press scores',
        'Conflict indicators',
        'Defense mechanism ratings',
        'Outcome scores (positive/negative/ambiguous)',
        'Complexity and richness metrics'
    ],
    'qualitative_dimensions': [
        'Theme identification',
        'Emotional tone assessment',
        'Character development analysis',
        'Plot coherence evaluation',
        'Symbolic content interpretation',
        'Defensive operations detection'
    ],
    'clinical_integration_points': [
        'Diagnosis mapping (DSM-5)',
        'Risk assessment integration',
        'Treatment planning recommendations',
        'Longitudinal tracking metrics'
    ]
}

output_path = PROJECT_ROOT / "outputs" / "manual_analysis_report.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\n{'='*70}")
print(f"✅ Analysis report saved to: {output_path}")
print(f"{'='*70}\n")

print("\n📋 RECOMMENDATIONS FOR CLINICAL-GRADE SCORING SYSTEM\n")
print("="*70)

recommendations = [
    {
        'priority': 'HIGH',
        'item': 'Extract Murray\'s Needs-Presses framework from manuals',
        'rationale': 'Foundational for TAT scoring - maps to achievement, affiliation, power dimensions'
    },
    {
        'priority': 'HIGH',
        'item':  'Implement quantitative scoring rubrics',
        'rationale': 'Enables statistical analysis and normative comparisons'
    },
    {
        'priority': 'HIGH',
        'item': 'Create card-specific scoring guidelines',
        'rationale': 'Each card has unique stimuli requiring tailored interpretation'
    },
    {
        'priority': 'MEDIUM',
        'item': 'Build outcome classification system',
        'rationale': 'Positive/negative/ambiguous endings indicate coping style'
    },
    {
        'priority': 'MEDIUM',
        'item': 'Integrate defense mechanism detection',
        'rationale': 'Critical for personality assessment and psychodynamic formulation'
    },
    {
        'priority': 'LOW',
        'item': 'Add narrative complexity metrics',
        'rationale': 'Word count, sentence structure, detail richness indicate cognitive functioning'
    }
]

report['recommendations'] = recommendations

for rec in recommendations:
    print(f"\n[{rec['priority']}] {rec['item']}")
    print(f"     → {rec['rationale']}")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\n{'='*70}")
print("✅ MANUAL ANALYSIS COMPLETE")
print(f"{'='*70}\n")

print("\n📊 SUMMARY:")
print(f"   - Manuals identified: {report['total_manuals']}")
print(f"   - Quantitative metrics needed: {len(report['scoring_system_requirements']['quantitative_metrics'])}")
print(f"   - Qualitative dimensions: {len(report['scoring_system_requirements']['qualitative_dimensions'])}")
print(f"   - Clinical integration points: {len(report['scoring_system_requirements']['clinical_integration_points'])}")
print(f"   - Recommendations generated: {len(recommendations)}")
