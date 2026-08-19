"""
Clinical Report Generator for Narrative Intelligence Analysis
Generates professional journal-grade PDF reports with comprehensive per-card
and aggregated analysis results, visualizations, Murray profiles, and more.

PRODUCTION v1.2 — Fully comprehensive output.
"""

import os
import tempfile
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, Flowable
)
from reportlab.platypus.flowables import HRFlowable

# ============================================================================
# HELPERS
# ============================================================================

def _scale(val, max_expected=10):
    """If val > max_expected*1.5, assume 0-100 scale and divide by 10.
       Always clamp output to [0, max_expected]."""
    try:
        fval = float(val)
        if fval > max_expected * 1.5:
            fval = fval / 10.0
        # Hard-cap: never exceed max_expected
        return max(0, min(max_expected, fval))
    except (TypeError, ValueError):
        return val

def _scale_dict(d, max_expected=10):
    return {k: _scale(v, max_expected) for k, v in d.items()}

def _safe_str(val, default="—"):
    if val is None:
        return default
    return str(val)

def _pct(val, default="N/A"):
    try:
        return f"{float(val):.0%}"
    except (TypeError, ValueError):
        return default

def _strip_np(val: str) -> str:
    """Strips internal 'n' or 'p' prefixes from Murray labels at display-level."""
    if isinstance(val, str):
        # Handle recent underscore-based naming conventions like "n_accurate" or "p_accurate"
        if val.startswith('n_') and len(val) > 2:
            return val[2:].replace('_', ' ').title()
        if val.startswith('p_') and len(val) > 2:
            return val[2:].replace('_', ' ').title()
            
        # Handle older PascalCase like "nAchievement"
        if val.startswith('n') and len(val) > 1 and val[1].isupper():
            return val[1:]
        if val.startswith('p') and len(val) > 1 and val[1].isupper():
            return val[1:]
    return str(val)

# ============================================================================
# CHART GENERATORS
# ============================================================================

def generate_radar_chart(metrics: Dict[str, float], out_dir: Path, filename: str):
    metrics = _scale_dict(metrics)
    categories = list(metrics.keys())
    values = list(metrics.values())
    N = len(categories)
    if N < 3:
        return None

    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    values += values[:1]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    ax.fill(angles, values, alpha=0.25, color='#50d3a7')
    ax.plot(angles, values, marker='o', color='#238b40')
    ax.set_xticks(angles[:-1])
    # Wrap long labels so they don't overlap
    wrapped_labels = [textwrap.fill(c.replace('_', ' ').title(), width=12) for c in categories]
    ax.set_xticklabels(wrapped_labels, fontsize=6)
    ax.set_ylim(0, 10)
    ax.set_title("Psychological Profile Radar", size=10, pad=20)
    ax.tick_params(axis='y', labelsize=6)
    ax.tick_params(axis='x', pad=12)
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    plt.close()
    return filepath


def generate_phase_diagram(conflict: float, ego: float, out_dir: Path, filename: str):
    conflict = _scale(conflict)
    ego = _scale(ego)
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.scatter(conflict, ego, s=200, c='#50d3a7', marker='o', zorder=5)
    ax.axhline(y=5, color='gray', linestyle='--', alpha=0.5)
    ax.axvline(x=5, color='gray', linestyle='--', alpha=0.5)
    # Quadrant labels
    ax.text(2.5, 7.5, "Low Conflict\nHigh Ego", ha='center', va='center', fontsize=6, alpha=0.4)
    ax.text(7.5, 7.5, "High Conflict\nHigh Ego", ha='center', va='center', fontsize=6, alpha=0.4)
    ax.text(2.5, 2.5, "Low Conflict\nLow Ego", ha='center', va='center', fontsize=6, alpha=0.4)
    ax.text(7.5, 2.5, "High Conflict\nLow Ego", ha='center', va='center', fontsize=6, alpha=0.4)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.set_xlabel("Conflict Level", fontsize=8)
    ax.set_ylabel("Ego Strength", fontsize=8)
    ax.set_title("Conflict vs Ego Strength Phase Diagram", fontsize=10)
    ax.tick_params(axis='both', which='major', labelsize=7)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    plt.close()
    return filepath


def generate_emotion_bar_chart(emotions: List[Tuple[str, int]], out_dir: Path, filename: str):
    """Bar chart of emotional attractors."""
    if not emotions:
        return None
    labels = [textwrap.fill(e[0], width=20) for e in emotions]
    values = [e[1] for e in emotions]
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.barh(labels, values, color='#50d3a7')
    ax.set_xlabel("Frequency", fontsize=8)
    ax.set_title("Emotional Attractors Across Cards", fontsize=10)
    ax.tick_params(axis='both', which='major', labelsize=7)
    ax.invert_yaxis()
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    plt.close()
    return filepath


def generate_needs_bar_chart(needs: List[Tuple[str, float]], out_dir: Path, filename: str):
    """Horizontal bar chart of Murray needs with intensity."""
    if not needs:
        return None
    labels = [textwrap.fill(_strip_np(n[0]), width=20) for n in needs[:10]]
    values = [float(n[1]) for n in needs[:10]]
    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.barh(labels, values, color='#238b40')
    ax.set_xlabel("Intensity", fontsize=8)
    ax.set_title("Murray Need Profile", fontsize=10)
    ax.tick_params(axis='both', which='major', labelsize=8)
    ax.invert_yaxis()
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    plt.close()
    return filepath


def generate_trajectory_plot(history: List[Dict], metrics: List[str], out_dir: Path, filename: str):
    if not history or len(history) < 2:
        return None
    fig, ax = plt.subplots(figsize=(10, 5))
    sessions = list(range(1, len(history) + 1))
    for metric in metrics[:3]:
        values = [_scale(s.get('aggregated', {}).get(metric, 0)) for s in history]
        ax.plot(sessions, values, marker='o', label=metric.replace('_', ' ').title())
    ax.set_xlabel("Session Number")
    ax.set_ylabel("Score")
    ax.set_title("Longitudinal Trajectory")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight')
    plt.close()
    return filepath


# ============================================================================
# TABLE STYLE PRESETS
# ============================================================================

HEADER_STYLE = TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#238b40')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#50d3a7')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white]),
])

SIMPLE_GRID = TableStyle([
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#50d3a7')),
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eaffea')),
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
])

# ============================================================================
# MAIN REPORT
# ============================================================================

# Grab project root from this file's location to correctly resolve the frontend logo path
# File is at: backend/app/engines/clinical/clinical_report_generator.py (4 levels deep)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.resolve()

def generate_report(
    aggregated: Dict[str, Any],
    patient_info: Dict[str, Any],
    output_path: Path,
    card_analyses: Optional[List[Dict]] = None,
    graph_insights: Optional[Dict] = None,
    trajectory_comparison: Optional[Dict] = None,
    medication_result: Optional[Dict] = None,
    learning_stats: Optional[Dict] = None,
    risk_assessment: Optional[Dict] = None,
    clinical_formulation: Optional[str] = None,
    user_info: Optional[Dict[str, str]] = None,
    clinic_info: Optional[Dict[str, str]] = None,
    verification_audit: Optional[Dict[str, str]] = None
):
    """Generate a comprehensive clinical PDF report."""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            rightMargin=54, leftMargin=54,
            topMargin=54, bottomMargin=54,
            title=output_path.name,
            author="Psyichub Psychological Analysis System"
        )
        styles = getSampleStyleSheet()
        story = []

        # ================= STYLES =================
        title_style = ParagraphStyle(
            'ReportTitle', fontName='Helvetica-Bold', fontSize=15, 
            textColor=colors.HexColor('#111827'), alignment=1, spaceAfter=6, leading=18
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', fontName='Helvetica-Bold', fontSize=9, 
            textColor=colors.HexColor('#6b7280'), alignment=1, spaceAfter=25,
        )
        h2 = ParagraphStyle(
            'H2', fontName='Helvetica-Bold', fontSize=10, 
            textColor=colors.HexColor('#238b40'), spaceBefore=18, spaceAfter=8,
        )
        h3 = ParagraphStyle(
            'H3', fontName='Helvetica-Bold', fontSize=8, 
            textColor=colors.HexColor('#238b40'), spaceBefore=10, spaceAfter=6,
        )
        body = ParagraphStyle(
            'Body', fontName='Helvetica', fontSize=8.5, 
            textColor=colors.black, spaceAfter=6, leading=12
        )
        small = ParagraphStyle('Small', parent=body, fontSize=8, textColor=colors.grey)

        # ====================================================================
        # COVER PAGE (LETTERHEAD STYLE)
        # ====================================================================
        
        # ── Resolve Logos ──
        true_root = Path(__file__).resolve().parents[6]
        psyichub_logo_path = true_root / "frontend" / "public" / "psyichub-report-logo.png"
        if not psyichub_logo_path.exists():
            # Fallback: try relative to backend dir if structure differs
            psyichub_logo_path = Path(__file__).resolve().parents[5].parent / "frontend" / "public" / "psyichub-report-logo.png"

        clinic_logo_path = None
        if clinic_info and clinic_info.get("logo_path"):
            from app.database import DATA_STORE_DIR
            c_logo = DATA_STORE_DIR / clinic_info["logo_path"]
            if c_logo.exists():
                clinic_logo_path = c_logo

        story.append(HRFlowable(width="100%", thickness=12, color=colors.HexColor('#238b40'), spaceBefore=-20, spaceAfter=20))

        # ── Top Left Column (Psyichub Logo) ──
        left_content = []
        if psyichub_logo_path.exists():
            try:
                left_content.append(Image(str(psyichub_logo_path), width=1.5*inch, height=0.83*inch))
            except Exception as e:
                print(f"[WARN] Could not embed psyichub logo: {e}")
        else:
            print(f"[WARN] Logo not found at {psyichub_logo_path}")

        if clinic_info:
            left_content.append(Spacer(1, 0.05*inch))
            c_name = clinic_info.get("clinic_name", "")
            if c_name:
                left_content.append(Paragraph(c_name.upper(), ParagraphStyle('CName', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#238b40'), alignment=0, spaceAfter=2)))
                
            c_address = clinic_info.get("address", "")
            c_phone = clinic_info.get("phone", "")
            c_email = clinic_info.get("email", "")
            
            c_style = ParagraphStyle('CStyle', fontName='Helvetica', fontSize=7.5, textColor=colors.gray, alignment=0)
            if c_address: left_content.append(Paragraph(c_address, c_style))
            if c_phone: left_content.append(Paragraph(f"Ph: {c_phone}", c_style))
            if c_email: left_content.append(Paragraph(f"Email: {c_email}", c_style))
            
        # ── Top Right Column (Therapist Details) ──
        right_content = []
        if user_info and user_info.get("name"):
            right_content.append(Paragraph(user_info["name"].upper(), ParagraphStyle('TherapistName', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11, textColor=colors.black, alignment=2, spaceAfter=2)))
            
            if user_info.get("designation"):
                right_content.append(Paragraph(user_info["designation"], ParagraphStyle('TDesig', parent=small, fontName='Helvetica-Bold', alignment=2, spaceAfter=2)))
                
            rci = user_info.get("rci_number")
            roc = user_info.get("roc_number")
            if rci: right_content.append(Paragraph(f"RCI Reg No: {rci}", ParagraphStyle('TRci', parent=small, alignment=2)))
            if roc: right_content.append(Paragraph(f"State/Pro License: {roc}", ParagraphStyle('TRoc', parent=small, alignment=2)))
            
            # Show therapist phone if it's different from clinic phone
            t_phone = user_info.get("phone")
            if t_phone and (not clinic_info or clinic_info.get("phone") != t_phone):
                right_content.append(Paragraph(f"Contact: {t_phone}", ParagraphStyle('TPhone', parent=small, alignment=2)))

        # Generated Date
        right_content.append(Spacer(1, 0.05*inch))
        right_content.append(Paragraph("GENERATED", ParagraphStyle('r1', fontName='Helvetica-Bold', fontSize=6, textColor=colors.gray, alignment=2)))
        right_content.append(Paragraph(datetime.now().strftime('%B %d, %Y'), ParagraphStyle('r2', fontName='Helvetica-Bold', fontSize=10, textColor=colors.black, alignment=2)))

        # ── Layout Letterhead Table ──
        letterhead_table = Table([[left_content, right_content]], colWidths=[3.5*inch, 3.5*inch])
        letterhead_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(letterhead_table)
        # ── Separator Line ──
        story.append(Spacer(1, 0.05*inch))
        story.append(Table([['']], colWidths=[7.2*inch], style=[('LINEABOVE', (0,0), (-1,-1), 1.5, colors.HexColor('#238b40'))]))
        story.append(Spacer(1, 0.2*inch))
        
        # ── Report Title ──
        story.append(Paragraph("NARRATIVE INTELLIGENCE ASSESSMENT REPORT", title_style))
        story.append(Paragraph("CONFIDENTIAL EXECUTIVE ASSESSMENT", subtitle_style))
        story.append(Spacer(1, 0.15*inch))

        # Extract validation info and test performer info
        validation_info = aggregated.get('psychologist_validation', {})
        test_performed_by = user_info.get("name") if user_info else ""
        
        rci_val = user_info.get("rci_number") if user_info else None
        roc_val = user_info.get("roc_number") if user_info else None
        user_license = ""
        if rci_val and roc_val:
            user_license = f"RCI: {rci_val} / ROC: {roc_val}"
        elif rci_val:
            user_license = rci_val
        elif roc_val:
            user_license = roc_val

        val_name = validation_info.get('validator_name', "")
        val_license = validation_info.get('license_number', "")
        val_date = validation_info.get('validation_date') or datetime.now().strftime('%d-%m-%Y')

        # Patient table
        story.append(Paragraph("■ PATIENT INFORMATION", h2))
        pid = patient_info.get('patient_id', 'N/A')
        data = [
            ["Patient ID", pid],
            ["Patient Name", patient_info.get('name', 'Anonymous')],
            ["Age", _safe_str(patient_info.get('age'))],
            ["Gender", _safe_str(patient_info.get('gender'))],
            ["Number of Cards Analyzed", str(len(card_analyses) if card_analyses else 1)],
            ["Assessment Date", patient_info.get('assessment_date') or datetime.now().strftime('%d-%m-%Y')],
            ["Assessment Time", patient_info.get('assessment_time') or datetime.now().strftime('%I:%M %p')],
        ]
        demo = patient_info.get('demographic_data', {})
        if demo.get('education'):
            data.append(["Education", demo['education']])
        if demo.get('background'):
            data.append(["Background", demo['background']])
        if demo.get('referral_reason'):
            data.append(["Referral Reason", demo['referral_reason']])

        t = Table(data, colWidths=[2*inch, 4*inch], hAlign='LEFT')
        t.setStyle(SIMPLE_GRID)
        story.append(t)
        
        story.append(Spacer(1, 0.2*inch))
        # Determine institution/clinic name for the report.
        # Priority: clinic_info (from ClinicProfile/admin) > user_info.clinic_name > "Private Practice"
        clinic_name_val = ""
        if clinic_info and (clinic_info.get("clinic_name") or "").strip():
            clinic_name_val = clinic_info["clinic_name"]
        elif user_info and (user_info.get("clinic_name") or "").strip():
            clinic_name_val = user_info["clinic_name"]
        
        if not clinic_name_val.strip():
            clinic_name_val = "Private Practice"

        role_str = user_info.get("role", "") if user_info else ""
        is_org = "org" in role_str.lower()

        header_text = "■ ORGANIZATION INFORMATION" if is_org else "■ PSYCHOLOGIST INFORMATION"
        story.append(Paragraph(header_text, h2))
        
        inst_label = "Organization Name" if is_org else "Clinic / Institution"
            
        rci_val = user_info.get("rci_number") if user_info else None
        roc_val = user_info.get("roc_number") if user_info else None
        user_license = ""
        if rci_val and roc_val:
            user_license = f"RCI: {rci_val} / ROC: {roc_val}"
        elif rci_val:
            user_license = f"RCI: {rci_val}"
        elif roc_val:
            user_license = f"ROC: {roc_val}"

        psych_data = [
            ["Test Performed By", test_performed_by or '________________________'],
            ["ROC / RCI No.", user_license or 'N/A'],
            [inst_label, clinic_name_val],
        ]
        
        t_psych = Table(psych_data, colWidths=[2*inch, 4*inch], hAlign='LEFT')
        t_psych.setStyle(SIMPLE_GRID)
        story.append(t_psych)
        
        story.append(PageBreak())

        # ====================================================================
        # PATIENT CONTEXT ANALYSIS
        # ====================================================================
        ctx = aggregated.get('context_adjustment')
        if ctx:
            story.append(Paragraph("■ PATIENT CONTEXT ANALYSIS", h2))
            story.append(Paragraph("This section highlights the mathematical adjustment applied to the base psychological score based on socio-cultural, developmental, and environmental context.", body))
            story.append(Spacer(1, 0.1*inch))
            
            ctx_data = [
                ["Context Metric", "Score (0-100)"],
                ["Age Congruence", f"{ctx.get('age_congruence_score', 0)}"],
                ["Living Condition Stress", f"{ctx.get('stress_context_score', 0)}"],
                ["Environmental Pressure", f"{ctx.get('environmental_pressure_score', 0)}"],
                ["Family Support", f"{ctx.get('family_support_score', 0)}"],
                ["Socioeconomic Adjustment", f"{ctx.get('socioeconomic_adjustment', 0)}"],
                ["Psychological Context Score (PCS)", f"{ctx.get('psychological_context_score', 0)}"]
            ]
            t_ctx = Table(ctx_data, colWidths=[4*inch, 2*inch], hAlign='LEFT')
            t_ctx.setStyle(HEADER_STYLE)
            story.append(t_ctx)
            
            story.append(Spacer(1, 0.1*inch))
            base_score = aggregated.get('base_psychological_score', 'N/A')
            final_score = aggregated.get('overall_score', 'N/A')
            story.append(Paragraph(f"<b>Base Narrative Intelligence Score:</b> {base_score} | <b>Final Score (with PCS):</b> {final_score}", body))
            story.append(PageBreak())

        # ====================================================================
        # EXECUTIVE SUMMARY
        # ====================================================================
        story.append(Paragraph("■ EXECUTIVE SUMMARY", h2))

        murray_agg = aggregated.get('murray', {})
        top_needs = murray_agg.get('needs', [])[:3]
        top_presses = murray_agg.get('presses', [])[:3]
        dom_emotions = aggregated.get('emotional_attractors', aggregated.get('dominant_emotions', []))

        summary_data = [["Domain", "Key Findings"]]

        needs_str = ", ".join([_strip_np(n[0]) if isinstance(n, (list, tuple)) else _strip_np(str(n)) for n in top_needs]) or "None"
        presses_str = ", ".join([_strip_np(p[0]) if isinstance(p, (list, tuple)) else _strip_np(str(p)) for p in top_presses]) or "None"
        emo_str = ", ".join([e[0] if isinstance(e, (list, tuple)) else str(e) for e in (dom_emotions[:3] if dom_emotions else [])]) or "None"

        summary_data.append(["Dominant Needs", needs_str])
        summary_data.append(["Dominant Presses", presses_str])
        summary_data.append(["Emotional Attractors", emo_str])
        summary_data.append(["Anxiety Level", f"{_scale(aggregated.get('anxiety_level', 0)):.1f} / 10"])
        summary_data.append(["Internal Conflict", f"{_scale(aggregated.get('conflict_internal', 0)):.1f} / 10"])
        summary_data.append(["Interpersonal Conflict", f"{_scale(aggregated.get('conflict_interpersonal', 0)):.1f} / 10"])
        summary_data.append(["Ego Strength", f"{_scale(aggregated.get('hero_ego_strength', 0)):.1f} / 10"])
        summary_data.append(["Dominant Environment", aggregated.get('dominant_environment', 'N/A')])

        if graph_insights:
            if graph_insights.get('dominant_motive'):
                summary_data.append(["Graph: Dominant Motive", _strip_np(graph_insights['dominant_motive'])])
            if graph_insights.get('dominant_emotion'):
                summary_data.append(["Graph: Dominant Emotion", graph_insights['dominant_emotion']])
            if 'regulation_index' in graph_insights:
                summary_data.append(["Regulation Index", f"{graph_insights['regulation_index']:.3f}"])

        t = Table(summary_data, colWidths=[2.2*inch, 4*inch], hAlign='LEFT')
        t.setStyle(HEADER_STYLE)
        story.append(t)
        story.append(PageBreak())

        # ====================================================================
        # AGGREGATED METRICS & VISUALIZATIONS
        # ====================================================================
        story.append(Paragraph("■ AGGREGATED METRICS VISUALIZATION", h2))

        # Radar chart
        dims = aggregated.get('dimension_scores', {})
        if dims:
            story.append(Paragraph("■■ AGGREGATED PSYCHOLOGICAL RADAR PROFILE", h3))
            radar_file = generate_radar_chart(dims, tmp, "radar.png")
            if radar_file:
                story.append(Image(str(radar_file), width=4.5*inch, height=4.5*inch))
                story.append(Spacer(1, 0.1*inch))

        # Phase diagram
        conflict_val = _scale(aggregated.get('conflict_internal', 5))
        ego_val = _scale(aggregated.get('hero_ego_strength', 5))
        phase_file = generate_phase_diagram(conflict_val, ego_val, tmp, "phase.png")
        story.append(Image(str(phase_file), width=4.5*inch, height=3*inch))

        # Emotional attractors chart
        emo_attractors = aggregated.get('emotional_attractors', [])
        if emo_attractors:
            emo_chart = generate_emotion_bar_chart(emo_attractors, tmp, "emotions.png")
            if emo_chart:
                story.append(Spacer(1, 0.1*inch))
                story.append(Image(str(emo_chart), width=4.5*inch, height=2.5*inch))

        story.append(PageBreak())

        # ====================================================================
        # HISTORICAL PROGRESSION (IF APPLICABLE)
        # ====================================================================
        hist_comp = aggregated.get('historical_comparison', {})
        if hist_comp and hist_comp.get('metrics'):
            story.append(Paragraph("■ HISTORICAL PROGRESSION", h2))
            story.append(Paragraph("Comparison of core psychometrics against the patient's most recent previous session.", body))
            story.append(Spacer(1, 0.1*inch))
            
            hc_data = [["Metric", "Previous", "Current", "Delta", "Clinical Trend"]]
            
            for m in hist_comp['metrics']:
                if m['is_better'] is True:
                    trend_str = "Improved"
                elif m['is_better'] is False:
                    trend_str = "Worsened"
                else:
                    trend_str = "Stable"
                    
                diff_str = f"{m['diff']:+.2f}"
                if m['diff'] == 0:
                    diff_str = "0.00"
                    
                hc_data.append([
                    m['metric'],
                    f"{m['past']:.2f}",
                    f"{m['current']:.2f}",
                    diff_str,
                    trend_str
                ])
                
            t = Table(hc_data, colWidths=[2*inch, 1*inch, 1*inch, 1*inch, 1.2*inch], hAlign='LEFT')
            t.setStyle(HEADER_STYLE)
            story.append(t)
            story.append(PageBreak())

        # ====================================================================
        # FULL AGGREGATED MURRAY PROFILE
        # ====================================================================
        story.append(Paragraph("■ STRUCTURED SECTIONS ANALYSIS", h2))

        # Full needs profile
        full_needs = murray_agg.get('needs_full_profile', murray_agg.get('needs', []))
        if full_needs:
            story.append(Paragraph("Section 1: Needs (Psychological)", h3))
            needs_chart = generate_needs_bar_chart(full_needs, tmp, "needs_profile.png")
            if needs_chart:
                story.append(Image(str(needs_chart), width=5*inch, height=3.5*inch))
                story.append(Spacer(1, 0.1*inch))

            nd = [["Need", "Intensity"]]
            for n in full_needs:
                name = _strip_np(n[0]) if isinstance(n, (list, tuple)) else _strip_np(str(n))
                score = f"{float(n[1]):.3f}" if isinstance(n, (list, tuple)) and len(n) > 1 else "—"
                nd.append([name, score])
            t = Table(nd, colWidths=[3*inch, 2*inch], hAlign='LEFT')
            t.setStyle(HEADER_STYLE)
            story.append(t)
            story.append(Spacer(1, 0.15*inch))

        # Presses
        all_presses = murray_agg.get('presses', [])
        if all_presses:
            story.append(Paragraph("Section 2: Presses (Environmental Pressures)", h3))
            pd_data = [["Press", "Intensity"]]
            for p in all_presses:
                name = _strip_np(p[0]) if isinstance(p, (list, tuple)) else _strip_np(str(p))
                score = f"{float(p[1]):.3f}" if isinstance(p, (list, tuple)) and len(p) > 1 else "—"
                pd_data.append([name, score])
            t = Table(pd_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
            t.setStyle(HEADER_STYLE)
            story.append(t)
            story.append(Spacer(1, 0.15*inch))

        # Conflicts
        conflicts_agg = murray_agg.get('conflicts', [])
        if conflicts_agg:
            story.append(Paragraph("Section 4: Conflicts (Internal & Experiential)", h3))
            cd = [["Need", "Press", "Intensity"]]
            for c in conflicts_agg:
                if isinstance(c, (list, tuple)) and len(c) >= 3:
                    cd.append([_strip_np(str(c[0])), _strip_np(str(c[1])), f"{float(c[2]):.3f}"])
            t = Table(cd, colWidths=[2*inch, 2*inch, 1.5*inch], hAlign='LEFT')
            t.setStyle(HEADER_STYLE)
            story.append(t)

        story.append(PageBreak())

        # ====================================================================
        # STABILITY INDICES (Cross-Card Consistency)
        # ====================================================================
        story.append(Paragraph("■ CROSS-CARD STABILITY ANALYSIS", h2))

        # ── Single-card guard ──────────────────────────────────────────────────
        n_cards = aggregated.get('num_cards', aggregated.get('card_count', 1))
        if not isinstance(n_cards, int):
            try:
                n_cards = int(n_cards)
            except Exception:
                n_cards = 1

        if n_cards < 2:
            story.append(Paragraph(
                "<i>Cross-card stability metrics require at least 2 cards. "
                "Only 1 card was analyzed in this session.</i>", small
            ))
            story.append(Paragraph(
                "<b>Dominant Environment:</b> " + aggregated.get('dominant_environment', 'N/A'), body
            ))
            ego_traj = aggregated.get('ego_trajectory', {})
            if isinstance(ego_traj, dict):
                story.append(Paragraph(
                    f"<b>Ego Trend:</b> {ego_traj.get('trend', 'stable')} "
                    f"(single-card estimate; stability index not applicable)", body
                ))
        else:
            stability_data = [["Metric", "Value", "Interpretation"]]

            ns = aggregated.get('need_stability', 0)
            ps = aggregated.get('press_stability', 0)
            cp = aggregated.get('conflict_persistence', 0)
            auth_s = aggregated.get('authority_pattern_stability', 0)
            tc = aggregated.get('trait_convergence', 0)

            def interp(val):
                try:
                    v = float(val)
                    if v >= 0.7: return "High (Stable)"
                    if v >= 0.4: return "Moderate"
                    return "Low (Variable)"
                except (TypeError, ValueError):
                    return "N/A"

            stability_data.append(["Need Stability", f"{_safe_str(ns)}", interp(ns)])
            stability_data.append(["Press Stability", f"{_safe_str(ps)}", interp(ps)])
            stability_data.append(["Conflict Persistence", f"{_safe_str(cp)}", interp(cp)])
            stability_data.append(["Authority Pattern Stability", f"{_safe_str(auth_s)}", interp(auth_s)])
            contemp_s = aggregated.get('contemporary_pattern_stability', 0)
            stability_data.append(["Contemporary Pattern Stability", f"{_safe_str(contemp_s)}", interp(contemp_s)])
            stability_data.append(["Trait Convergence", f"{_safe_str(tc)}", interp(tc)])
            stability_data.append(["Dominant Environment", aggregated.get('dominant_environment', 'N/A'), "—"])

            ego_traj = aggregated.get('ego_trajectory', {})
            if isinstance(ego_traj, dict):
                stability_data.append(["Ego Trend", _safe_str(ego_traj.get('trend')), _safe_str(ego_traj.get('volatility'))])

            t = Table(stability_data, colWidths=[2*inch, 1.5*inch, 2*inch], hAlign='LEFT')
            t.setStyle(HEADER_STYLE)
            story.append(t)

        # Defenses
        defenses = aggregated.get('defenses', {})
        if defenses:
            story.append(Spacer(1, 0.15*inch))
            story.append(Paragraph("Section 7: Defence Mechanisms", h3))
            if isinstance(defenses, dict):
                dd = [["Mechanism", "Details"]]
                for k, v in defenses.items():
                    dd.append([k.replace('_', ' ').title(), Paragraph(str(v), body)])
                t = Table(dd, colWidths=[1.5*inch, 4.5*inch], hAlign='LEFT')
                t.setStyle(SIMPLE_GRID)
                story.append(t)
            elif isinstance(defenses, list):
                dd = [["Defense Mechanism", "Confidence", "Evidence"]]
                for d in defenses:
                    if isinstance(d, dict):
                        defense_name = d.get('defense', d.get('name', 'Unknown'))
                        # Try to format confidence as percentage
                        conf = d.get('confidence', '')
                        if isinstance(conf, (int, float)):
                            conf = f"{conf:.0%}"
                        evidence_str = _safe_str(d.get('evidence', ''))
                        dd.append([defense_name, conf, Paragraph(evidence_str, body)])
                    else:
                        dd.append([str(d), "", ""])
                
                t = Table(dd, colWidths=[1.5*inch, 1.0*inch, 3.5*inch], hAlign='LEFT')
                t.setStyle(SIMPLE_GRID)
                story.append(t)

        story.append(PageBreak())

        # ====================================================================
        # CLINICAL FORMULATION
        # ====================================================================
        story.append(Paragraph("■ CLINICAL SUMMARY (NON-DIAGNOSTIC)", h2))
        if clinical_formulation:
            story.append(Paragraph(clinical_formulation.replace('\n', '<br/>'), body))
        else:
            story.append(Paragraph(
                "No clinical formulation was generated for this session. "
                "Please refer to the aggregated metrics and per-card analyses for clinical indicators.", body
            ))
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph(
            "<b>Note:</b> This is an exploratory, non-diagnostic screening based on narrative material. "
            "Formal clinical evaluation is required for diagnosis.", small
        ))
        story.append(PageBreak())

        # ====================================================================
        # STRUCTURED 7-COMPONENT SUMMARY (v9.0)
        # ====================================================================
        story.append(Paragraph("■ STRUCTURED PSYCHODYNAMIC COMPONENTS", h2))
        story.append(Paragraph(
            "The following table presents the seven essential psychodynamic components "
            "extracted from the Narrative Intelligence narrative analysis, per Murray's framework.", body
        ))
        story.append(Spacer(1, 0.1*inch))

        # Build 7-component data from per-card and aggregated results
        try:
            # ── 1. HERO ──
            agg_hero = '—'
            for card in (card_analyses or []):
                sc = card.get('structured_components', {})
                if sc.get('hero', {}).get('entity') and agg_hero == '—':
                    hero_conf = sc['hero'].get('confidence', 0)
                    agg_hero = f"{sc['hero']['entity']} (confidence: {hero_conf:.0%})"
            # Fallback: relational engine / events
            if agg_hero == '—':
                for card in (card_analyses or []):
                    rel = card.get('relational', {})
                    hero_e = rel.get('hero', '')
                    if hero_e:
                        agg_hero = str(hero_e)
                        break
            if agg_hero == '—':
                for card in (card_analyses or []):
                    events = card.get('events', [])
                    if events:
                        first_agent = events[0].get('agent', '')
                        if first_agent:
                            agg_hero = f"{first_agent} (inferred from narrative events)"
                            break
            # Fallback: System meta-reasoning
            if agg_hero == '—' and aggregated.get('ollama_meta_reasoning'):
                agg_hero = 'See System Meta-Reasoning section below'

            # ── 4. AUTHORITY FIGURE ──
            agg_authority = '—'
            for card in (card_analyses or []):
                sc = card.get('structured_components', {})
                if sc.get('authority_figure', {}).get('entity') and agg_authority == '—':
                    auth_conf = sc['authority_figure'].get('confidence', 0)
                    agg_authority = f"{sc['authority_figure']['entity']} (confidence: {auth_conf:.0%})"
            # Fallback: relational engine
            if agg_authority == '—':
                for card in (card_analyses or []):
                    rel = card.get('relational', {})
                    auth_figs = rel.get('authority_figures', [])
                    if auth_figs:
                        agg_authority = str(auth_figs[0]) if isinstance(auth_figs[0], str) else str(auth_figs[0].get('entity', auth_figs[0]))
                        break

            # ── 5. CONTEMPORARY FIGURE ──
            agg_contemporary = '—'
            for card in (card_analyses or []):
                sc = card.get('structured_components', {})
                if sc.get('contemporary_figure', {}).get('entity') and agg_contemporary == '—':
                    cont_conf = sc['contemporary_figure'].get('confidence', 0)
                    agg_contemporary = f"{sc['contemporary_figure']['entity']} (confidence: {cont_conf:.0%})"
            # Fallback: relational engine
            if agg_contemporary == '—':
                for card in (card_analyses or []):
                    rel = card.get('relational', {})
                    contemp = rel.get('contemporary_figures', rel.get('peers', []))
                    if contemp:
                        agg_contemporary = str(contemp[0]) if isinstance(contemp[0], str) else str(contemp[0].get('entity', contemp[0]))
                        break

            # ── 2. NEEDS ──
            agg_murray = aggregated.get('murray', {})
            agg_needs = agg_murray.get('needs', [])
            needs_str = ', '.join([_strip_np(n) for n, _ in agg_needs[:5]]) if agg_needs else '—'
            # Fallback: per-card needs
            if needs_str == '—':
                for card in (card_analyses or []):
                    cn = card.get('murray', {}).get('needs', [])
                    if cn:
                        needs_str = ', '.join([_strip_np(n) for n, _ in cn[:5]])
                        break

            # ── 3. ENVIRONMENT / PRESS ──
            agg_presses = agg_murray.get('presses', [])
            presses_str = ', '.join([_strip_np(p) for p, _ in agg_presses[:5]]) if agg_presses else '—'
            agg_env = aggregated.get('aggregated_environment', {})
            env_str = agg_env.get('dominant_type', aggregated.get('dominant_environment', '—'))
            # Fallback: per-card environment
            if env_str == '—':
                for card in (card_analyses or []):
                    ce = card.get('environment', {})
                    if isinstance(ce, dict) and ce.get('primary_type'):
                        env_str = ce['primary_type']
                        break

            # ── 6. CONFLICT ──
            agg_conflicts = aggregated.get('aggregated_conflicts', [])
            if agg_conflicts:
                conflict_parts = []
                for c in agg_conflicts[:3]:
                    ctype = c.get('type', '—')
                    forces = c.get('forces', [])
                    if len(forces) >= 2:
                        conflict_parts.append(f"{ctype} ({forces[0]} vs {forces[1]})")
                    else:
                        conflict_parts.append(ctype)
                conflict_str = '; '.join(conflict_parts)
            else:
                # Fallback: per-card conflict_structure
                all_conflicts = []
                for card in (card_analyses or []):
                    for c in card.get('conflict_structure', [])[:2]:
                        forces = c.get('forces', [])
                        ctype = c.get('type', '—')
                        if len(forces) >= 2:
                            all_conflicts.append(f"{ctype} ({forces[0]} vs {forces[1]})")
                        else:
                            all_conflicts.append(ctype)
                conflict_str = '; '.join(all_conflicts[:4]) if all_conflicts else '—'

            # ── 7. DEFENSE MECHANISMS ──
            agg_defenses = aggregated.get('aggregated_defenses', [])
            if agg_defenses:
                defense_str = ', '.join([
                    f"{d.get('defense', '—')} ({d.get('maturity_level', '?')})"
                    for d in agg_defenses[:4]
                ])
            else:
                # Fallback: per-card defense_mechanisms
                all_defenses = []
                for card in (card_analyses or []):
                    for d in card.get('defense_mechanisms', [])[:2]:
                        dname = d.get('defense', 'Unknown')
                        dconf = d.get('confidence', 0)
                        all_defenses.append(f"{dname} ({dconf:.0%})")
                defense_str = ', '.join(all_defenses[:4]) if all_defenses else '—'

            comp_data = [
                ["Component", "Extracted Value"],
                [Paragraph("<b>1. Hero</b>", body), Paragraph(str(agg_hero), body)],
                [Paragraph("<b>2. Needs</b>", body), Paragraph(needs_str, body)],
                [Paragraph("<b>3. Environment / Press</b>", body),
                 Paragraph(f"Environment: {env_str}<br/>Presses: {presses_str}", body)],
                [Paragraph("<b>4. Authority Figure</b>", body), Paragraph(str(agg_authority), body)],
                [Paragraph("<b>5. Contemporary Figure</b>", body), Paragraph(str(agg_contemporary), body)],
                [Paragraph("<b>6. Conflict</b>", body), Paragraph(conflict_str, body)],
                [Paragraph("<b>7. Defense Mechanisms</b>", body), Paragraph(defense_str, body)],
            ]
            t = Table(comp_data, colWidths=[2.0*inch, 4.5*inch], hAlign='LEFT')
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#238b40')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#50d3a7')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#eaffea')),
            ]))
            story.append(t)
        except Exception as e:
            story.append(Paragraph(f"<i>Component extraction unavailable: {e}</i>", small))

        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph(
            "<b>Note:</b> All components listed above have been extracted algorithmically "
            "and must be validated by a qualified psychologist before clinical interpretation.", small
        ))
        story.append(PageBreak())

        # ====================================================================
        # DETAILED CARD-BY-CARD ANALYSIS
        # ====================================================================
        if card_analyses:
            story.append(Paragraph("■ DETAILED CARD-BY-CARD ANALYSIS", h2))
            story.append(Spacer(1, 0.1*inch))

            for i, card in enumerate(card_analyses):
                card_id = card.get('card_id', f'Card {i+1}')

                # ---- Card header ----
                story.append(Paragraph(f"■ {card_id.upper()}", h2))

                # ---- Story text ----
                story.append(Paragraph("<b>■■ Patient Story</b>", h3))
                story_text_card = card.get('story_text', '')
                # Truncate very long stories for PDF readability
                if len(story_text_card) > 2000:
                    story_text_card = story_text_card[:2000] + "... [truncated]"
                story.append(Paragraph(story_text_card, body))

                # Verbatim transcription disclaimer + Language detection
                transcription_policy = card.get('transcription_policy', 'verbatim')
                detected_lang = card.get('detected_language', {})
                lang_label = detected_lang.get('language_name', 'Unknown') if detected_lang else 'Unknown'
                lang_conf = detected_lang.get('confidence', 0) if detected_lang else 0
                story.append(Paragraph(
                    f"<i>Narrative Language: <b>{lang_label}</b> (confidence: {lang_conf:.0%})</i>", small
                ))
                story.append(Spacer(1, 0.1*inch))

                # ---- Scoring overview ----
                story.append(Paragraph("<b>■■ SCORING OVERVIEW</b>", h3))
                score_data = [
                    ["Metric", "Value"],
                    ["Overall Score", f"{_scale(card.get('overall_score', 0)):.2f} / 10.0"],
                    ["Scoring Confidence", f"{card.get('scoring_confidence', 0):.2f}"],
                    ["Word Count", str(card.get('word_count', 0))],
                ]
                t = Table(score_data, colWidths=[2.5*inch, 2.5*inch], hAlign='LEFT')
                t.setStyle(SIMPLE_GRID)
                story.append(t)
                story.append(Spacer(1, 0.1*inch))

                # ---- Dimension scores ----
                dims_card = card.get('dimension_scores', {})
                if dims_card:
                    story.append(Paragraph("<b>■■ DIMENSION BREAKDOWN</b>", h3))
                    dd = [["Dimension", "Score"]]
                    for k, v in dims_card.items():
                        try:
                            fv = float(v)
                            # Hard-cap: affective_integration 0-10, all others 0-100 before _scale
                            if k == 'affective_integration':
                                fv = max(0, min(10, fv))
                            else:
                                fv = max(0, min(100, fv))
                            dd.append([k.replace('_', ' ').title(), f"{_scale(fv):.1f} / 10"])
                        except (TypeError, ValueError):
                            dd.append([k.replace('_', ' ').title(), str(v)])
                    t = Table(dd, colWidths=[3*inch, 2*inch], hAlign='LEFT')
                    t.setStyle(HEADER_STYLE)
                    story.append(t)
                    story.append(Spacer(1, 0.1*inch))



                # ---- Murray needs & presses ----
                murray_card = card.get('murray', {})
                needs_card = murray_card.get('needs', [])
                presses_card = murray_card.get('presses', [])
                conflicts_card = murray_card.get('conflicts', [])

                if needs_card or presses_card:
                    story.append(Paragraph("<b>■■ MURRAY NEED-PRESS ANALYSIS</b>", h3))

                    # Full needs with intensity
                    full_profile = murray_card.get('needs_full_profile', needs_card)
                    if full_profile:
                        np_data = [["Need", "Intensity"]]
                        for n in full_profile:
                            if isinstance(n, (list, tuple)):
                                name = _strip_np(n[0])
                                score = f"{float(n[1]):.3f}" if len(n) > 1 else "—"
                            else:
                                name, score = _strip_np(str(n)), "—"
                            np_data.append([name, score])
                        t = Table(np_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
                        t.setStyle(HEADER_STYLE)
                        story.append(t)
                        story.append(Spacer(1, 0.05*inch))

                    # Presses
                    if presses_card:
                        pp_data = [["Press", "Intensity"]]
                        for p in presses_card:
                            if isinstance(p, (list, tuple)):
                                name = _strip_np(p[0])
                                score = f"{float(p[1]):.3f}" if len(p) > 1 else "—"
                            else:
                                name, score = _strip_np(str(p)), "—"
                            pp_data.append([name, score])
                        t = Table(pp_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
                        t.setStyle(HEADER_STYLE)
                        story.append(t)
                        story.append(Spacer(1, 0.05*inch))

                    # Conflicts
                    if conflicts_card:
                        cc_data = [["Need", "Press", "Intensity"]]
                        for c in conflicts_card:
                            if isinstance(c, (list, tuple)) and len(c) >= 3:
                                cc_data.append([_strip_np(str(c[0])), _strip_np(str(c[1])), f"{float(c[2]):.3f}"])
                        if len(cc_data) > 1:
                            t = Table(cc_data, colWidths=[2*inch, 2*inch, 1.5*inch], hAlign='LEFT')
                            t.setStyle(HEADER_STYLE)
                            story.append(t)

                    story.append(Spacer(1, 0.1*inch))

                # ---- Themes ----
                themes = card.get('themes', [])
                if themes:
                    story.append(Paragraph("<b>■■ DETECTED THEMES</b>", h3))
                    if isinstance(themes, dict):
                        themes = themes.get('themes', [])
                    if themes and isinstance(themes[0], dict):
                        # Structured theme table — no label column (removed per user request)
                        th_data = [["Mode", "Density", "Coherence", "Affect", "Related Needs"]]
                        for t in themes[:6]:
                            if not isinstance(t, dict):
                                th_data.append([
                                    Paragraph(str(t), body),
                                    Paragraph("—", body),
                                    Paragraph("—", body),
                                    Paragraph("—", body),
                                    Paragraph("—", body),
                                ])
                                continue
                            mode = t.get('expression_mode', '—')
                            density = f"{t.get('symbolic_density', 0):.2f}"
                            coh = t.get('coherence', t.get('clarity', 0))
                            coh_flag = t.get('coherence_flag', '')
                            coh_str = f"{coh:.2f}" + (f" ({coh_flag})" if coh_flag else "")
                            affect = t.get('affect_tone', '—')
                            needs = ', '.join([_strip_np(n) for n in t.get('related_needs', [])[:3]]) or '—'
                            th_data.append([
                                Paragraph(mode, body),
                                Paragraph(density, body),
                                Paragraph(coh_str, body),
                                Paragraph(affect, body),
                                Paragraph(needs, body),
                            ])
                        t = Table(th_data, colWidths=[1.0*inch, 0.7*inch, 1.1*inch, 0.8*inch, 2.6*inch], hAlign='LEFT')
                        t.setStyle(HEADER_STYLE)
                        story.append(t)
                        # Show words for top 3 themes (keep this as the only label reference)
                        for th in themes[:3]:
                            if isinstance(th, dict):
                                words = th.get('words', [])
                                if words:
                                    story.append(Paragraph(f"<i>{', '.join(words[:6])}</i>", small))
                    else:
                        # Fallback: simple label list
                        theme_labels = [str(t) for t in themes[:8]]
                        story.append(Paragraph(", ".join(theme_labels), body))
                    story.append(Spacer(1, 0.05*inch))

                # ---- Conflict structure (parallel dynamics) ----
                conflict_struct = card.get('conflict_structure', [])
                if conflict_struct:
                    story.append(Paragraph("<b>■■ CONFLICT STRUCTURE (PARALLEL DYNAMICS)</b>", h3))
                    cs_data = [["Type", "Between (Forces)", "Intensity", "Status", "Evidence"]]
                    for c in conflict_struct[:5]:
                        if not isinstance(c, dict):
                            cs_data.append([
                                Paragraph(str(c), body),
                                Paragraph("—", body),
                                "0.00",
                                Paragraph("—", body),
                                Paragraph("—", body),
                            ])
                            continue
                        forces = c.get('forces', [])
                        if len(forces) >= 2:
                            forces_str = f"{_strip_np(str(forces[0]))} ↔ {_strip_np(str(forces[1]))}"
                        elif len(forces) == 1:
                            forces_str = _strip_np(str(forces[0]))
                        else:
                            forces_str = _strip_np(c.get('primary_conflict', '—'))
                        cs_data.append([
                            Paragraph(_strip_np(c.get('type', '—')), body),
                            Paragraph(forces_str, body),
                            f"{c.get('intensity', 0):.2f}",
                            Paragraph(c.get('status', '—'), body),
                            Paragraph(_safe_str(c.get('evidence', '')), body),
                        ])
                    t = Table(cs_data, colWidths=[1.5*inch, 1.5*inch, 0.6*inch, 1.2*inch, 2.0*inch], hAlign='LEFT')
                    t.setStyle(HEADER_STYLE)
                    story.append(t)
                    # Also print domain & polarity if available
                    for c in conflict_struct[:5]:
                        if isinstance(c, dict):
                            domain = c.get('conflict_domain', '')
                            polarity = c.get('conflict_polarity', '')
                            pattern = c.get('resolution_pattern', '')
                            if domain or polarity:
                                detail = f"<b>{c.get('type','')}</b> — Domain: {domain or '—'} | Polarity: {polarity or '—'} | Pattern: {pattern or '—'}"
                                story.append(Paragraph(detail, small))
                    story.append(Spacer(1, 0.1*inch))

                # ---- Card-Level Defenses (Fix 6) ----
                card_defenses = card.get('defense_mechanisms', [])
                if card_defenses:
                    story.append(Paragraph("<b>■■ DERIVED COPING & DEFENSES</b>", h3))
                    def_labels = []
                    for d in card_defenses[:3]:
                        if not isinstance(d, dict):
                            def_labels.append(f"{d}")
                            continue
                        name = d.get('defense', 'Unknown')
                        conf = d.get('confidence', 0)
                        def_labels.append(f"{name} ({conf:.0%})")
                    story.append(Paragraph(", ".join(def_labels), body))
                    story.append(Spacer(1, 0.1*inch))


                # ---- Theme–Conflict–Coping Alignment (Section 8) ----
                # Unified single-pass: no index-merge bugs
                card_themes_s8 = card.get('themes', [])
                if isinstance(card_themes_s8, dict):
                    card_themes_s8 = card_themes_s8.get('themes', [])
                card_conflicts_s8 = card.get('conflict_structure', [])
                card_coping_s8 = card.get('coping_mechanisms', [])
                card_defenses_s8 = card.get('defense_mechanisms', [])
                murray_s8 = card.get('murray', {})
                murray_needs_s8 = [_strip_np(n) for n, _ in murray_s8.get('needs', [])[:2]]
                murray_presses_s8 = [_strip_np(p) for p, _ in murray_s8.get('presses', [])[:2]]

                n_s8 = max(len(card_themes_s8[:3]), len(card_conflicts_s8[:3]),
                           len((card_coping_s8 or card_defenses_s8)[:3]), 1)

                s8_rows = []
                for row_i in range(n_s8):
                    # Theme
                    th = card_themes_s8[row_i] if row_i < len(card_themes_s8) else None
                    if isinstance(th, dict):
                        t_label = str(th.get('theme', th.get('label', '—')))[:40]
                        t_needs = [_strip_np(n) for n in th.get('related_needs', [])[:2]]
                        t_np_str = ', '.join(t_needs) if t_needs else (', '.join(murray_needs_s8 + murray_presses_s8) or '—')
                    elif th:
                        t_label = str(th)[:40]
                        t_np_str = ', '.join(murray_needs_s8 + murray_presses_s8) or '—'
                    else:
                        t_label = '—'
                        t_np_str = ', '.join(murray_needs_s8 + murray_presses_s8) or '—'

                    # Conflict
                    cf = card_conflicts_s8[row_i] if row_i < len(card_conflicts_s8) else None
                    if cf and isinstance(cf, dict):
                        forces = cf.get('forces', [])
                        s8_conflict = (f"{forces[0]} vs {forces[1]}" if len(forces) >= 2 else cf.get('type', '—'))
                    elif cf:
                        s8_conflict = str(cf)[:40]
                    else:
                        s8_conflict = '—'

                    # Coping / Defense
                    cp_item = None
                    if row_i < len(card_coping_s8):
                        cp_item = str(card_coping_s8[row_i])[:35]
                    elif row_i < len(card_defenses_s8):
                        d = card_defenses_s8[row_i]
                        cp_item = (d.get('defense', str(d))[:35] if isinstance(d, dict) else str(d)[:35])
                    s8_coping = cp_item or '—'

                    s8_rows.append([
                        Paragraph(t_label, body),
                        Paragraph(t_np_str, body),
                        Paragraph(s8_conflict, body),
                        Paragraph(s8_coping, body),
                    ])

                if s8_rows:
                    story.append(Paragraph("<b>■■ SECTION 8: COPING STRATEGIES &amp; THEME ALIGNMENT</b>", h3))
                    s8_data = [["Related Needs/Presses", "Conflict (What vs What)", "Coping / Defense"]]
                    for row in s8_rows:
                        # row was built as [theme, needs/presses, conflict, coping] — skip index 0 (theme)
                        s8_data.append([row[1], row[2], row[3]])
                    t = Table(s8_data, colWidths=[2.0*inch, 2.2*inch, 2.0*inch], hAlign='LEFT')
                    t.setStyle(HEADER_STYLE)
                    story.append(t)
                    story.append(Spacer(1, 0.1*inch))


                # ---- Environment classification ----
                env_class = card.get('environment_classification', {})
                if env_class and env_class.get('primary'):
                    story.append(Paragraph("<b>■■ PSYCHOLOGICAL ENVIRONMENT</b>", h3))
                    env_data = [
                        ["Primary", env_class.get('primary', '—')],
                        ["Confidence", f"{env_class.get('primary_confidence', 0):.2f}"],
                        ["Secondary", _safe_str(env_class.get('secondary'))],
                        ["Mixed Environment", "Yes" if env_class.get('is_mixed_environment') else "No"],
                    ]
                    # Show signal breakdown if available
                    signal_scores = env_class.get('signal_scores', {})
                    if signal_scores:
                        signals = []
                        for sig_name, sig_val in signal_scores.items():
                            signals.append(f"{sig_name}: {sig_val:.2f}")
                        env_data.append(["Signal Scores", Paragraph(" | ".join(signals), body)])
                    evidence = env_class.get('evidence', [])
                    if evidence:
                        driver_str = "<br/>".join(f"&bull; {_strip_np(str(e))}" for e in evidence[:4])
                        env_data.append(["Drivers", Paragraph(driver_str, body)])
                    t = Table(env_data, colWidths=[1.5*inch, 4*inch], hAlign='LEFT')
                    t.setStyle(SIMPLE_GRID)
                    story.append(t)
                    story.append(Spacer(1, 0.1*inch))

                # ---- Relational dynamics ----
                relational = card.get('relational_patterns', {})
                if relational:
                    story.append(Paragraph("<b>■■ RELATIONAL DYNAMICS</b>", h3))

                    # Figure Classifications table (v4.0)
                    valid_figs = relational.get('valid_figure_types', [])
                    if valid_figs:
                        fig_data = [["Entity", "Figure Type", "Role Confidence"]]
                        for fig in valid_figs[:8]:
                            if isinstance(fig, dict):
                                fig_data.append([
                                    Paragraph(str(fig.get('entity', '—')), body),
                                    Paragraph(str(fig.get('type', '—')), body),
                                    Paragraph(f"{fig.get('role_confidence', 0):.2f}", body),
                                ])
                        if len(fig_data) > 1:
                            t = Table(fig_data, colWidths=[1.8*inch, 1.8*inch, 1.5*inch], hAlign='LEFT')
                            t.setStyle(HEADER_STYLE)
                            story.append(t)
                            story.append(Spacer(1, 0.05*inch))

                    central_figs = relational.get('central_figures', [])
                    if central_figs:
                        rf_data = [["Figure", "Centrality"]]
                        for fig in central_figs[:5]:
                            if isinstance(fig, (list, tuple)) and len(fig) >= 2:
                                rf_data.append([str(fig[0]), f"{float(fig[1]):.3f}"])
                        if len(rf_data) > 1:
                            t = Table(rf_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
                            t.setStyle(HEADER_STYLE)
                            story.append(t)

                    inter_psych = relational.get('interaction_psychology', {})
                    if inter_psych and central_figs:
                        top_fig = central_figs[0][0] if isinstance(central_figs[0], (list, tuple)) else str(central_figs[0])
                        if top_fig in inter_psych:
                            metrics = inter_psych[top_fig]
                            ip_data = [["Metric", "Value"]]
                            for mk, mv in metrics.items():
                                ip_data.append([mk.replace('_', ' ').title(), f"{float(mv):.2f}" if isinstance(mv, (int, float)) else str(mv)])
                            t = Table(ip_data, colWidths=[2.5*inch, 2*inch], hAlign='LEFT')
                            t.setStyle(SIMPLE_GRID)
                            story.append(t)
                    story.append(Spacer(1, 0.1*inch))

                # ---- Quantitative metrics ----
                quant = card.get('quantitative_scores', {})
                if quant:
                    story.append(Paragraph("<b>■■ QUANTITATIVE METRICS</b>", h3))
                    qd = [["Metric", "Value"]]
                    # Metrics that should NOT be auto-scaled (raw integers)
                    NO_SCALE = {'word_count', 'sentences', 'sentence_count'}
                    for qk in ['word_count', 'sentences', 'coherence', 'complexity',
                               'anxiety_level', 'hero_ego_strength', 'emotional_stability',
                               'reality_testing', 'narrative_coherence']:
                        val = quant.get(qk)
                        if val is not None:
                            if qk in NO_SCALE:
                                qd.append([qk.replace('_', ' ').title(), str(int(val))])
                            else:
                                qd.append([qk.replace('_', ' ').title(), f"{_scale(val):.2f}"])
                    # Emotions from GoEmotions
                    emo_list = quant.get('emotions', [])
                    if emo_list:
                        emo_names = ", ".join([e[0] if isinstance(e, (list, tuple)) else str(e) for e in emo_list[:5]])
                        qd.append(["Section 3: Emotions & Affect", emo_names])
                    if len(qd) > 1:
                        t = Table(qd, colWidths=[2.5*inch, 3*inch], hAlign='LEFT')
                        t.setStyle(SIMPLE_GRID)
                        story.append(t)
                    story.append(Spacer(1, 0.1*inch))

                # ---- Indian context ----
                indian = card.get('indian_context_factors', [])
                if indian:
                    story.append(Paragraph("<b>■■ INDIAN CULTURAL CONTEXT</b>", h3))
                    story.append(Paragraph(", ".join(indian), body))
                    story.append(Spacer(1, 0.05*inch))

                # ---- Psychosis risk ----
                psych_risk = card.get('psychosis_risk', {})
                if psych_risk and psych_risk.get('risk_score', 0) > 0:
                    story.append(Paragraph("<b>■■ RISK SCREENING</b>", h3))
                    story.append(Paragraph(
                        f"<b>Risk Level:</b> {psych_risk.get('risk_level', 'Low')} "
                        f"(Score: {psych_risk.get('risk_score', 0)})", body
                    ))
                    flags = psych_risk.get('flags', [])
                    if flags:
                        story.append(Paragraph("<b>Flags:</b> " + ", ".join(flags), body))

                story.append(PageBreak())

        # ====================================================================
        # GRAPH INTELLIGENCE
        # ====================================================================
        if graph_insights and graph_insights.get('core_constructs'):
            story.append(Paragraph("Knowledge Graph Intelligence", h2))

            # Core drivers table
            core = graph_insights.get('core_constructs', [])
            if core:
                gi_data = [["Construct", "Centrality"]]
                for c in core[:10]:
                    gi_data.append([str(c[0]), f"{float(c[1]):.3f}"])
                t = Table(gi_data, colWidths=[3*inch, 2*inch], hAlign='LEFT')
                t.setStyle(HEADER_STYLE)
                story.append(t)
                story.append(Spacer(1, 0.1*inch))

            # Key insights
            for key, label in [
                ('dominant_motive', 'Dominant Motive'),
                ('dominant_emotion', 'Dominant Emotion'),
                ('primary_conflict', 'Primary Conflict'),
            ]:
                if key in graph_insights:
                    story.append(Paragraph(f"<b>{label}:</b> {graph_insights[key]}", body))

            if 'regulation_index' in graph_insights:
                story.append(Paragraph(f"<b>Regulation Index:</b> {graph_insights['regulation_index']:.3f}", body))
            if 'system_density' in graph_insights:
                story.append(Paragraph(f"<b>System Density:</b> {graph_insights['system_density']:.3f}", body))

            anomalies = graph_insights.get('anomalies', [])
            if anomalies:
                story.append(Paragraph(f"<b>Isolated Nodes:</b> {len(anomalies)} — {', '.join(str(a) for a in anomalies[:8])}", body))

            story.append(PageBreak())

        # ====================================================================
        # TRAJECTORY COMPARISON
        # ====================================================================
        if trajectory_comparison and trajectory_comparison.get('is_returning'):
            story.append(Paragraph("Longitudinal Trajectory (Returning Patient)", h2))
            story.append(Paragraph(f"Previous Sessions: {trajectory_comparison['previous_sessions']}", body))
            story.append(Paragraph(f"Stability Score: {trajectory_comparison.get('stability_score', 'N/A')}/100", body))

            deltas = trajectory_comparison.get('metrics_delta', {})
            if deltas:
                td = [["Metric", "Previous", "Current", "Delta", "Direction"]]
                for metric, vals in deltas.items():
                    td.append([
                        metric.replace('_', ' ').title(),
                        f"{_scale(vals.get('previous', 0)):.1f}",
                        f"{_scale(vals.get('current', 0)):.1f}",
                        f"{_scale(vals.get('delta', 0)):+.1f}",
                        vals.get('direction', '—'),
                    ])
                t = Table(td, colWidths=[1.8*inch, 1*inch, 1*inch, 1*inch, 1.4*inch], hAlign='LEFT')
                t.setStyle(HEADER_STYLE)
                story.append(t)

            if trajectory_comparison.get('clinical_notes'):
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Clinical Notes:</b>", body))
                for note in trajectory_comparison['clinical_notes']:
                    story.append(Paragraph(f"  - {note}", body))

            story.append(PageBreak())


        # ====================================================================
        # RISK ASSESSMENT
        # ====================================================================
        if risk_assessment and (risk_assessment.get('risk_score', 0) > 0 or risk_assessment.get('flags')):
            story.append(Paragraph("Risk Assessment", h2))
            story.append(Paragraph(
                f"<b>Risk Level:</b> {risk_assessment.get('risk_level', 'Low')} "
                f"(Score: {risk_assessment.get('risk_score', 0)})", body
            ))
            if risk_assessment.get('flags'):
                story.append(Paragraph("<b>Risk Flags:</b>", body))
                for flag in risk_assessment['flags']:
                    story.append(Paragraph(f"  - {flag}", body))
            story.append(Spacer(1, 0.1*inch))
            story.append(Paragraph("<b>Recommendations:</b>", body))
            story.append(Paragraph("  - Continue routine monitoring", body))
            story.append(Paragraph("  - Encourage help-seeking if symptoms worsen", body))
            story.append(PageBreak())

        # ====================================================================
        # LEARNING SYSTEM STATS
        # ====================================================================
        if learning_stats:
            story.append(Paragraph("Learning System Statistics", h2))
            ls_data = [
                ["Metric", "Value"],
                ["Concepts Before", str(learning_stats.get('concepts_before', 0))],
                ["Concepts After", str(learning_stats.get('concepts_after', 0))],
                ["Learned This Session", str(learning_stats.get('concepts_learned_this_session', 0))],
                ["Knowledge Graph Nodes", str(learning_stats.get('knowledge_graph_size', {}).get('nodes', 0))],
                ["Knowledge Graph Edges", str(learning_stats.get('knowledge_graph_size', {}).get('edges', 0))],
                ["Analyses Processed", str(learning_stats.get('total_analyses_processed', 0))],
            ]
            newly = learning_stats.get('newly_learned_concepts', [])
            if newly:
                ls_data.append(["Newly Learned", ", ".join(str(c) for c in newly[:8])])
            t = Table(ls_data, colWidths=[2.5*inch, 3.5*inch], hAlign='LEFT')
            t.setStyle(SIMPLE_GRID)
            story.append(t)
            story.append(PageBreak())

        # ====================================================================
        # EMBEDDED VISUALIZATIONS
        # ====================================================================
        viz_dir = output_path.parent / "visualizations"
        if viz_dir.exists():
            viz_files = sorted(viz_dir.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
            if viz_files:
                story.append(Paragraph("Session Visualizations", h2))
                for vf in viz_files[:6]:
                    try:
                        story.append(Paragraph(vf.stem.replace('_', ' ').title(), h3))
                        story.append(Image(str(vf), width=5*inch, height=3.5*inch))
                        story.append(Spacer(1, 0.1*inch))
                    except Exception:
                        pass
                story.append(PageBreak())

        # ====================================================================
        # CLINICAL CONCLUSION (standalone — always present)
        # ====================================================================
        story.append(Paragraph("Clinical Conclusion", h2))

        ollama_conclusion = aggregated.get('ollama_formulation_summary', '')
        ollama_med_summary = aggregated.get('ollama_clinical_summary', '')

        if ollama_conclusion and len(ollama_conclusion.strip()) > 80:
            # Full comprehensive conclusion available
            story.append(Paragraph(ollama_conclusion.replace('\n', '<br/>'), body))
        elif ollama_med_summary and len(ollama_med_summary.strip()) > 80:
            story.append(Paragraph(ollama_med_summary.replace('\n', '<br/>'), body))
        else:
            # Generate comprehensive analysis-based conclusion from real data
            conclusion_parts = []

            # Emotional landscape
            attractors = aggregated.get('emotional_attractors', [])
            if attractors:
                top_emotions = [f"{e}" for e, _ in attractors[:6]]
                conclusion_parts.append(
                    f"<b>Emotional Landscape:</b> The patient's stories frequently involve feelings of {', '.join(top_emotions[:3])}. "
                    f"{'Other notable emotions that surfaced include ' + ', '.join(top_emotions[3:]) + '. ' if len(top_emotions) > 3 else ''}"
                    f"These recurring emotional themes offer a helpful window into their internal world."
                )

            # Themes
            themes_data = aggregated.get('themes', {})
            if isinstance(themes_data, dict):
                theme_list = themes_data.get('themes', [])
            else:
                theme_list = themes_data if isinstance(themes_data, list) else []
            if theme_list:
                theme_labels = []
                for t in theme_list[:5]:
                    if isinstance(t, dict):
                        theme_labels.append(t.get('label', t.get('words', [''])[0] if t.get('words') else ''))
                    elif isinstance(t, str):
                        theme_labels.append(t)
                if theme_labels:
                    conclusion_parts.append(
                        f"<b>Core Themes:</b> Throughout the narratives, several key topics consistently emerged, particularly: {', '.join(theme_labels)}. "
                        f"These patterns highlight the situations and challenges the patient may be currently focusing on in their daily life."
                    )

            # Murray needs/presses
            murray = aggregated.get('murray', {})
            needs = murray.get('needs', [])
            presses = murray.get('presses', [])
            if needs or presses:
                np_text = "<b>Underlying Motivations:</b> "
                if needs:
                    need_names = [n.replace('n_', '').replace('n', '').replace('_', ' ').title() for n, _ in needs[:5]]
                    np_text += f"The analysis reveals a strong drive toward {', '.join(need_names)}. "
                if presses:
                    press_names = [p.replace('p_', '').replace('p', '').replace('_', ' ').title() for p, _ in presses[:5]]
                    np_text += f"Additionally, the patient seems to feel external pressure or influence from {', '.join(press_names)}. "
                conclusion_parts.append(np_text)

            # Relational dynamics
            relational = aggregated.get('relational', {})
            figures = relational.get('valid_figure_types', [])
            if figures:
                fig_summary = []
                for f in figures[:4]:
                    if isinstance(f, dict):
                        fig_summary.append(f"{f.get('type', 'others')}")
                if fig_summary:
                    # Remove duplicates while keeping order
                    unique_figs = list(dict.fromkeys(fig_summary))
                    conclusion_parts.append(
                        f"<b>Interpersonal Style:</b> The stories frequently involve interactions with {', '.join(unique_figs)}. "
                        f"This helps us understand how the patient views their relationships and connections with others."
                    )

            # Defense mechanisms
            defenses = aggregated.get('defenses', {})
            defense_list = []
            if isinstance(defenses, dict):
                defense_list = list(defenses.keys())[:5]
            elif isinstance(defenses, list):
                defense_list = [d.get('defense', d.get('name', str(d))) if isinstance(d, dict) else str(d) for d in defenses][:5]
                
            if defense_list:
                conclusion_parts.append(
                    f"<b>Coping Strategies:</b> When faced with stress or conflict in the stories, the patient tends to rely on coping strategies like {', '.join(defense_list)}. "
                    f"Recognizing these patterns can help identify how the patient protects themselves emotionally during difficult times."
                )

            # Environment
            environment = aggregated.get('environment', {})
            env_type = environment.get('type', '') if isinstance(environment, dict) else str(environment)
            if env_type:
                conclusion_parts.append(
                    f"<b>Perceived Environment:</b> The patient's narratives often take place in a setting that feels <i>{env_type.lower()}</i>, "
                    f"which gives us insight into how they experience their surrounding world."
                )

            # Clinical formulation reference
            if clinical_formulation:
                # Clean up the formulation text to be more human-readable
                import re
                clean_form = re.sub(r'[=—-]', '', clinical_formulation)
                clean_form = clean_form.replace("CLINICAL FORMULATION (Non-Diagnostic)", "")
                clean_form = clean_form.replace("CLINICAL FORMULATION (NonDiagnostic)", "").strip()
                
                # Truncate if necessary
                form_text = clean_form[:500]
                if len(clean_form) > 500:
                    form_text += "..."
                conclusion_parts.append(
                    f"<b>Overall Clinical Impression:</b> {form_text}"
                )

            # Therapeutic recommendation
            conclusion_parts.append(
                "<b>Next Steps:</b> These insights offer a deeper, more empathetic understanding of the patient's emotional world. "
                "It is recommended that these themes, relationship patterns, and coping strategies be "
                "explored further in a supportive therapeutic environment. "
                "All interpretations are algorithmically generated and should be "
                "reviewed and contextualized by a qualified mental health professional."
            )

            # Write all parts
            for part in conclusion_parts:
                story.append(Paragraph(part, body))
                story.append(Spacer(1, 0.08*inch))

        story.append(PageBreak())

        # ====================================================================
        # CANDIDATE NARRATIVES (Original Stories)
        # ====================================================================
        if card_analyses:
            story.append(Paragraph("■ CANDIDATE NARRATIVES", h2))
            story.append(Paragraph("The following are the original, verbatim stories provided by the candidate for each image card.", body))
            story.append(Spacer(1, 0.1*inch))
            
            card_mapping = {
                'card_1': 'Card 3', 'card_2': 'Card 6', 'card_3': 'Card 11', 'card_4': 'Card 28',
                'card_1_hi': 'Card 3', 'card_2_hi': 'Card 6', 'card_3_hi': 'Card 11', 'card_4_hi': 'Card 28'
            }
            
            _BACKEND_ROOT = Path(__file__).resolve().parents[5]
            
            for ca in card_analyses:
                c_id = str(ca.get('card_id', '1')).lower()
                c_name = card_mapping.get(c_id) or card_mapping.get(f"card_{c_id.replace('card_', '')}")
                if not c_name:
                    c_name = c_id
                    if c_name.upper().startswith('CARD_'): c_name = c_name.replace('CARD_', 'Card ', 1)
                    elif c_name.upper().startswith('CARD '): c_name = 'Card ' + c_name[5:]
                    else: c_name = 'Card ' + c_name

                # Try finding the image
                img_path = _BACKEND_ROOT / "data" / "tat_cards" / "indianized" / f"{c_name}.webp"
                if not img_path.exists():
                    img_path = _BACKEND_ROOT / "data" / "tat_cards" / f"{c_name}.webp"
                if not img_path.exists():
                    img_path = _BACKEND_ROOT / "data" / "tat_cards" / f"{c_name}.jpg"

                row_data = []
                if img_path.exists():
                    row_data.append(Image(str(img_path), width=1.5*inch, height=1.5*inch, kind='proportional'))
                else:
                    class PH(Flowable):
                        def wrap(self, aw, ah): return (1.5*inch, 1.5*inch)
                        def draw(self):
                            self.canv.setFillColor(colors.lightgrey)
                            self.canv.rect(0,0,1.5*inch,1.5*inch,fill=1,stroke=0)
                    row_data.append(PH())
                
                text_flow = [
                    Paragraph(f"IMAGE CARD: {c_name.upper()}", ParagraphStyle('ca_h', fontName='Helvetica-Bold', fontSize=8, textColor=colors.black)),
                    Paragraph(f'"{ca.get("story_text", "")}"', ParagraphStyle('ca_b', fontName='Helvetica-Oblique', fontSize=8.5, textColor=colors.HexColor('#4b5563'), spaceBefore=6))
                ]
                row_data.append(text_flow)
                
                st_table = Table([row_data], colWidths=[1.7*inch, 5.5*inch])
                st_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'), 
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f9fafb')), 
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f3f4f6')), 
                    ('PADDING', (0,0), (-1,-1), 10)
                ]))
                story.append(KeepTogether(st_table))
                story.append(Spacer(1, 15))

            story.append(PageBreak())

        # ====================================================================
        # PSYCHOLOGIST VALIDATION BLOCK (v9.0)
        # ====================================================================
        story.append(Paragraph("Psychologist Validation", h2))
        story.append(Paragraph(
            "The stories and analysis included in this report must be reviewed and validated "
            "by a qualified psychologist before any clinical interpretation or action is taken.", body
        ))
        story.append(Spacer(1, 0.2*inch))

        validation_info = aggregated.get('psychologist_validation', {})
        is_verified_psych = validation_info.get('is_verified', False)

        if is_verified_psych:
            val_name = validation_info.get('validator_name', "_________________________")
            val_license = validation_info.get('license_number', "_________________________")
            date_str = validation_info.get('validation_date', datetime.now().strftime('%d-%m-%Y'))
            e_sig_path = validation_info.get('signature_path', '')
            
            sig_flowable = Paragraph("<i>Digitally Verified via Psyichub</i>", body)
            
            if e_sig_path:
                from app.database import DATA_STORE_DIR
                full_sig_path = DATA_STORE_DIR / e_sig_path
                if full_sig_path.exists():
                    try:
                        sig_img = Image(str(full_sig_path), width=1.8*inch, height=0.6*inch, kind='proportional')
                        sig_text = Paragraph("<font size=7 color='#6b7280'><i>Digitally signed by PsyicHub</i></font>", body)
                        sig_flowable = Table(
                            [[sig_img, sig_text]],
                            colWidths=[2.0*inch, 2.0*inch],
                            style=[('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ALIGN', (0,0), (-1,-1), 'LEFT'), ('LEFTPADDING', (0,0), (-1,-1), 0)]
                        )
                    except Exception:
                        pass
                        
            val_data = [
                ["Verified By (Psychologist)", Paragraph(str(val_name), body)],
                ["ROC / RCI No.", Paragraph(str(val_license), body)],
                ["Date of Validation", Paragraph(str(date_str), body)],
                ["Signature", sig_flowable],
            ]
        else:
            val_data = [
                ["Verified By (Psychologist)", "_________________________"],
                ["ROC / RCI No.", "_________________________"],
                ["Date of Validation", "_________________________"],
                ["Signature", "_________________________"],
            ]

        t = Table(val_data, colWidths=[2.2*inch, 4.3*inch], hAlign='LEFT')
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#50d3a7')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#eaffea')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(PageBreak())

        # ====================================================================
        # VERIFICATION SIGNATURE
        # ====================================================================
        if verification_audit:
            story.append(Paragraph("System Verification & Digital Signature", h2))
            story.append(Paragraph(
                "This practitioner's credentials have been verified by the Psyichub Super Admin team. "
                "The digital signature below serves as a cryptographic proof of this verification event.", body
            ))
            story.append(Spacer(1, 0.1*inch))
            
            sig_data = [
                ["Verification Timestamp (UTC)", str(verification_audit.get("timestamp") or "N/A")],
                ["Approved By (Admin ID)", str(verification_audit.get("admin_id") or "N/A")],
                ["Signature Hash", Paragraph(f"<font name='Helvetica' size=7>{str(verification_audit.get('signature_hash') or 'N/A')}</font>", body)]
            ]
            t_sig = Table(sig_data, colWidths=[2.2*inch, 4.3*inch], hAlign='LEFT')
            t_sig.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t_sig)
            story.append(PageBreak())

        # ====================================================================
        # DISCLAIMERS
        # ====================================================================
        story.append(PageBreak())
        story.append(Paragraph("Important Disclaimers", h2))
        story.append(Paragraph(
            "All outputs require review by qualified mental health professionals. "
            "This is a research and educational tool only. Not for clinical diagnosis. "
            "Results are generated algorithmically and must not be used as a substitute "
            "for professional clinical judgment.", body
        ))
        small_disc = ParagraphStyle('SmallDisc', fontName='Helvetica', fontSize=7, textColor=colors.gray)
        story.append(Spacer(1, 0.1*inch))
        
        gen_time = datetime.now().strftime('%d-%m-%Y, %I:%M %p')
        story.append(Paragraph(
            f"Report generated by Psyichub Psychological Analysis System on {gen_time}", small_disc
        ))

        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb'), spaceBefore=10, spaceAfter=10))
        
        disclaimer_text = (
            "DISCLAIMER: This assessment tool and its generated report are for informational and educational "
            "purposes only and are not a substitute for professional clinical diagnosis, treatment, or medical advice. "
            "The results should be reviewed by a qualified healthcare professional or psychologist."
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle('Disclaimer', fontName='Helvetica-Oblique', fontSize=7, textColor=colors.HexColor('#ef4444'), alignment=1)))
        story.append(Spacer(1, 10))
        
        story.append(Paragraph("END OF ASSESSMENT REPORT • CONFIDENTIAL", ParagraphStyle('Footer', fontName='Helvetica-Bold', fontSize=7, textColor=colors.HexColor('#9ca3af'), alignment=1)))

        # Build
        try:
            doc.build(story)
            print(f"[INFO] Report saved to: {output_path}")
        except Exception as build_err:
            import traceback
            print(f"[CRITICAL] ReportLab doc.build() failed: {build_err}")
            traceback.print_exc()
            raise