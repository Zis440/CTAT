import os
import tempfile
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

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
    PageBreak, CondPageBreak, Image, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor

PROJECT_ROOT = Path(__file__).resolve().parents[6]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if not BACKEND_ROOT.exists():
    BACKEND_ROOT = PROJECT_ROOT

def _safe_str(val, default="—"):
    if val is None:
        return default
    return str(val)

# ============================================================================
# CHART GENERATORS
# ============================================================================
def generate_bar_chart(metrics: Dict[str, float], out_dir: Path, filename: str):
    categories = list(metrics.keys())
    values = list(metrics.values())
    N = len(categories)
    if N == 0:
        return None

    fig, ax = plt.subplots(figsize=(4.5, 3))
    
    # Create bar chart
    bars = ax.bar(categories, values, color='#bfdbfe', edgecolor='#3b82f6', linewidth=1.5, width=0.6)
    
    wrapped_labels = [textwrap.fill(c, width=12) for c in categories]
    ax.set_xticks(range(len(categories)))
    ax.set_xticklabels(wrapped_labels, fontsize=7, rotation=30, ha='right')
    
    ax.set_ylim(0, 100)
    ax.set_yticks([0, 20, 40, 60, 80, 100])
    ax.tick_params(axis='y', labelsize=8)
    
    # Hide top and right spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#e5e7eb')
    ax.spines['bottom'].set_color('#e5e7eb')
    
    ax.grid(axis='y', color='black', alpha=0.05)
    
    plt.tight_layout()
    filepath = out_dir / filename
    plt.savefig(filepath, dpi=150, bbox_inches='tight', transparent=True)
    plt.close()
    return filepath

# ============================================================================
# CUSTOM FLOWABLES
# ============================================================================

class ColorBandBar(Flowable):
    def __init__(self, label: str, value: float, compare_text: str = "", width=2.2*inch):
        Flowable.__init__(self)
        self.label = label
        try:
            self.value = max(0, min(100, float(value)))
        except:
            self.value = 50
        self.compare_text = compare_text
        self.width = width
        
        # Wrap the label strictly so it doesn't overlap the score
        self.wrapped_label = textwrap.fill(self.label.upper(), width=20)
        self.lines = self.wrapped_label.split('\n')
        
        # Height is dynamic depending on wrap
        base_h = 16 + (len(self.lines) * 8)
        self.height = base_h + 10 if compare_text else base_h

    def wrap(self, availWidth, availHeight):
        return (self.width, self.height)

    def draw(self):
        self.canv.saveState()
        
        # Score Value (always on top right)
        self.canv.setFont("Helvetica-Bold", 6.5)
        self.canv.setFillColor(HexColor('#50d3a7'))
        
        # Display with up to 2 decimal places if there are decimals
        val_str = f"{self.value:.2f}".rstrip('0').rstrip('.') if isinstance(self.value, float) else str(self.value)
        self.canv.drawRightString(self.width, self.height - 8, f"{val_str} / 100")
        
        # Upper Label
        self.canv.setFillColor(colors.black)
        y_offset = self.height - 8
        for line in self.lines:
            self.canv.drawString(0, y_offset, line)
            y_offset -= 8
            
        # The Bar
        bar_y = y_offset - 2
        self.canv.setFillColor(HexColor('#eaffea'))
        self.canv.setStrokeColor(HexColor('#50d3a7'))
        self.canv.rect(0, bar_y, self.width, 6, fill=1, stroke=1)
        
        fill_width = (self.value / 100.0) * self.width
        self.canv.setFillColor(HexColor('#238b40'))
        self.canv.rect(0, bar_y, fill_width, 6, fill=1, stroke=0)
        
        # Bottom compare text
        if self.compare_text:
            self.canv.setFont("Helvetica-Oblique", 5.5)
            self.canv.setFillColor(colors.gray)
            wrapped_compare = textwrap.fill(self.compare_text, width=60)
            c_lines = wrapped_compare.split('\n')
            cy_offset = bar_y - 8
            for cline in c_lines:
                self.canv.drawString(0, cy_offset, cline)
                cy_offset -= 6
            
        self.canv.restoreState()

class RiskBar(Flowable):
    def __init__(self, label: str, level: str, width=3*inch):
        Flowable.__init__(self)
        self.label = label
        
        import re
        match = re.search(r'\((.*?)/100\)', str(level))
        if match:
            self.level_text = str(level).upper()
            self.risk_score = int(match.group(1))
        else:
            lt = str(level).strip().upper()
            self.risk_score = 30
            if 'LOW' in lt: self.risk_score = 20
            elif 'MODERATE' in lt: self.risk_score = 50
            elif 'HIGH' in lt: self.risk_score = 80
            elif 'ELEVATED' in lt: self.risk_score = 80
            elif 'CRITICAL' in lt: self.risk_score = 100
            elif 'SEVERE' in lt: self.risk_score = 100
            self.level_text = f"{lt} ({self.risk_score}/100)"

        self.color = HexColor('#238b40') # Low
        if 'MODERATE' in self.level_text: self.color = HexColor('#3b82f6')
        elif 'HIGH' in self.level_text or 'ELEVATED' in self.level_text: self.color = HexColor('#f59e0b')
        elif 'CRITICAL' in self.level_text or 'SEVERE' in self.level_text: self.color = HexColor('#ef4444')

        self.width = width
        self.height = 25

    def wrap(self, availWidth, availHeight):
        return (self.width, self.height)

    def draw(self):
        self.canv.saveState()
        self.canv.setFont("Helvetica-Bold", 7.5)
        self.canv.setFillColor(colors.black)
        self.canv.drawString(0, self.height - 10, self.label.upper())
        
        self.canv.setFillColor(self.color)
        self.canv.drawRightString(self.width, self.height - 10, self.level_text)
        
        bar_y = self.height - 20
        self.canv.setFillColor(HexColor('#f1f5f9'))
        self.canv.roundRect(0, bar_y, self.width, 6, 3, fill=1, stroke=0)
        
        fill_width = (self.risk_score / 100.0) * self.width
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, bar_y, fill_width, 6, 3, fill=1, stroke=0)
        self.canv.restoreState()


class BoxedMetrics(Flowable):
    def __init__(self, title: str, metrics_dict: dict, width=3.3*inch):
        Flowable.__init__(self)
        self.title = title
        self.metrics = metrics_dict
        self.width = width
        self.row_height = 14
        self.height = 35 + (len(self.metrics) * self.row_height)

    def wrap(self, availWidth, availHeight):
        return (self.width, self.height)

    def draw(self):
        self.canv.saveState()
        # Outer box
        self.canv.setStrokeColor(HexColor('#e2e8f0'))
        self.canv.setFillColor(colors.white)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        
        # Title
        self.canv.setFont("Helvetica-Bold", 8)
        self.canv.setFillColor(HexColor('#1f2937'))
        self.canv.drawString(10, self.height - 18, self.title.upper())
        
        # Separator line
        self.canv.setStrokeColor(HexColor('#f1f5f9'))
        self.canv.line(10, self.height - 24, self.width - 10, self.height - 24)
        
        # Items
        y = self.height - 40
        self.canv.setFont("Helvetica", 8)
        for k, v in self.metrics.items():
            self.canv.setFillColor(HexColor('#64748b'))
            self.canv.drawString(10, y, str(k))
            self.canv.setFillColor(HexColor('#1f2937'))
            self.canv.drawRightString(self.width - 15, y, str(v))
            y -= self.row_height
            
        self.canv.restoreState()


class StyledListBlock(Flowable):
    def __init__(self, title: str, items: list, bg_color, border_color, text_color, width=3.3*inch):
        Flowable.__init__(self)
        self.title = title
        self.items = items
        self.width = width
        self.bg_color = bg_color
        self.border_color = border_color
        self.text_color = text_color
        
        self.lines = []
        import textwrap
        for item in items:
            wrapped = textwrap.fill(item, width=55)
            self.lines.extend(wrapped.split('\n'))
            
        self.row_height = 11
        self.height = 35 + (len(self.lines) * self.row_height)

    def wrap(self, availWidth, availHeight):
        return (self.width, self.height)

    def draw(self):
        self.canv.saveState()
        self.canv.setStrokeColor(self.border_color)
        self.canv.setFillColor(self.bg_color)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=1)
        
        self.canv.setFont("Helvetica-Bold", 8)
        self.canv.setFillColor(self.text_color)
        self.canv.drawString(15, self.height - 20, self.title)
        
        y = self.height - 35
        self.canv.setFont("Helvetica", 7.5)
        for line in self.lines:
            if not line.startswith(' '): # It's a new bullet point
                self.canv.drawString(10, y, "•")
            self.canv.drawString(18, y, line.strip())
            y -= self.row_height
            
        self.canv.restoreState()


# ============================================================================
# MAIN GENERATOR
# ============================================================================

def generate_report(
    report: Dict[str, Any],
    patient_info: Dict[str, Any],
    output_path: Path,
    user_info: Optional[Dict[str, str]] = None,
    clinic_info: Optional[Dict[str, str]] = None,
):
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=A4,
            rightMargin=40, leftMargin=40,
            topMargin=40, bottomMargin=40,
            title="Employee Mental Health & Wellbeing Assessment Report"
        )
        styles = getSampleStyleSheet()
        story = []

        # ================= STYLES =================
        title_style = ParagraphStyle(
            'ReportTitle', fontName='Helvetica-Bold', fontSize=15, 
            textColor=HexColor('#111827'), alignment=1, spaceAfter=6, leading=18
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', fontName='Helvetica-Bold', fontSize=9, 
            textColor=HexColor('#6b7280'), alignment=1, spaceAfter=25,
        )
        h2 = ParagraphStyle(
            'H2', fontName='Helvetica-Bold', fontSize=10, 
            textColor=HexColor('#238b40'), spaceBefore=18, spaceAfter=8,
        )
        h3 = ParagraphStyle(
            'H3', fontName='Helvetica-Bold', fontSize=8, 
            textColor=HexColor('#238b40'), spaceBefore=10, spaceAfter=6,
        )
        body = ParagraphStyle(
            'Body', fontName='Helvetica', fontSize=8.5, 
            textColor=colors.black, spaceAfter=6, leading=12
        )
        small = ParagraphStyle('Small', parent=body, fontSize=8, textColor=colors.gray)
        
        # ── Header ──
        psyichub_logo_path = PROJECT_ROOT / "frontend" / "public" / "psyichub-report-logo.png"
        
        story.append(HRFlowable(width="100%", thickness=12, color=HexColor('#238b40'), spaceBefore=-20, spaceAfter=20))
        
        left_content = []
        if psyichub_logo_path.exists():
            left_content.append(Image(str(psyichub_logo_path), width=1.5*inch, height=0.83*inch))
            
        if clinic_info:
            left_content.append(Spacer(1, 0.05*inch))
            c_name = clinic_info.get("clinic_name", "")
            if c_name:
                left_content.append(Paragraph(c_name.upper(), ParagraphStyle('CName', fontName='Helvetica-Bold', fontSize=9, textColor=HexColor('#238b40'), alignment=0, spaceAfter=2)))
                
            c_address = clinic_info.get("address", "")
            c_phone = clinic_info.get("phone", "")
            c_email = clinic_info.get("email", "")
            
            c_style = ParagraphStyle('CStyle', fontName='Helvetica', fontSize=7.5, textColor=colors.gray, alignment=0)
            if c_address: left_content.append(Paragraph(c_address, c_style))
            if c_phone: left_content.append(Paragraph(f"Ph: {c_phone}", c_style))
            if c_email: left_content.append(Paragraph(f"Email: {c_email}", c_style))
        
        right_content = []
        if user_info and user_info.get("name"):
            right_content.append(Paragraph(user_info["name"].upper(), ParagraphStyle('TherapistName', parent=h2, fontName='Helvetica-Bold', fontSize=11, textColor=colors.black, alignment=2, spaceAfter=2, spaceBefore=0)))
            if user_info.get("designation"):
                right_content.append(Paragraph(user_info["designation"], ParagraphStyle('TDesig', parent=small, fontName='Helvetica-Bold', alignment=2, spaceAfter=2)))
            rci = user_info.get("rci_number")
            roc = user_info.get("roc_number")
            if rci: right_content.append(Paragraph(f"RCI Reg No: {rci}", ParagraphStyle('TRci', parent=small, alignment=2)))
            if roc: right_content.append(Paragraph(f"State/Pro License: {roc}", ParagraphStyle('TRoc', parent=small, alignment=2)))
            
            t_phone = user_info.get("phone")
            if t_phone and (not clinic_info or clinic_info.get("phone") != t_phone):
                right_content.append(Paragraph(f"Contact: {t_phone}", ParagraphStyle('TPhone', parent=small, alignment=2)))

        completed_at = patient_info.get('completed_at', datetime.now())
        right_content.append(Spacer(1, 0.05*inch))
        right_content.append(Paragraph("GENERATED", ParagraphStyle('r1', fontName='Helvetica-Bold', fontSize=6, textColor=colors.gray, alignment=2)))
        right_content.append(Paragraph(completed_at.strftime('%B %d, %Y'), ParagraphStyle('r2', fontName='Helvetica-Bold', fontSize=10, textColor=colors.black, alignment=2)))

        header_table = Table([[left_content, right_content]], colWidths=[3.6*inch, 3.6*inch])
        header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (1,0), (1,0), 'RIGHT'), ('BOTTOMPADDING', (0,0), (-1,-1), 15)]))
        story.append(header_table)
        
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#238b40'), spaceBefore=0, spaceAfter=20))
        
        story.append(Paragraph("EMPLOYEE MENTAL HEALTH & WELLBEING ASSESSMENT REPORT", title_style))
        story.append(Paragraph("CONFIDENTIAL EXECUTIVE ASSESSMENT", subtitle_style))

        # ── Patient Demographics Table ──
        SIMPLE_GRID = TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#50d3a7')),
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#eaffea')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ])
        
        story.append(Paragraph("■ PATIENT INFORMATION", h2))
        pid = patient_info.get('patient_id', 'Unknown')
        data = [
            ["Patient ID", pid],
            ["Patient Name", patient_info.get('name', 'Anonymous')],
            ["Age", _safe_str(patient_info.get('age'))],
            ["Gender", _safe_str(patient_info.get('gender'))],
            ["Assessment Date", patient_info.get('assessment_date', completed_at.strftime('%d-%m-%Y'))],
            ["Assessment Time", patient_info.get('assessment_time', completed_at.strftime('%I:%M %p'))],
        ]
        
        t = Table(data, colWidths=[2*inch, 4*inch], hAlign='LEFT')
        t.setStyle(SIMPLE_GRID)
        story.append(t)
        story.append(Spacer(1, 0.2*inch))
        story.append(PageBreak())

        # ── Extract Data ──
        comprehensive_data = report
        report_summary = report.get('report_summary', report)
        
        def _get_text(key, default="Data generated conservatively based on profile."):
            val = report_summary.get(key)
            if not val: return default
            return str(val).replace('\n', '<br/>')

        # 1. EXECUTIVE SUMMARY
        story.append(Paragraph("■ 1. EXECUTIVE SUMMARY", h2))
        story.append(Paragraph(_get_text('executive_summary'), body))
        
        # 2. CLINICAL INSIGHT
        story.append(Paragraph("■ 2. CLINICAL INSIGHT", h2))
        story.append(Paragraph(_get_text('ai_clinical_insight'), body))
        
        # 3. CROSS-ASSESSMENT INTEGRATION
        story.append(Paragraph("■ 3. CROSS-ASSESSMENT INTEGRATION", h2))
        story.append(Paragraph(_get_text('cross_assessment_integration'), body))

        # 4. DETAILED FINDINGS & PERFORMANCE
        story.append(Paragraph("■ 4. DETAILED FINDINGS & PERFORMANCE", h2))
        
        col1 = []
        col1.append(Paragraph("COGNITIVE METRICS", h3))
        col1.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=8))
        
        idx = report_summary.get('indexes', {})
        if not idx:
            idx = report_summary.get('cognitive', {}).get('psi_data', {})

        distract = idx.get('attention_deficit_index', 45)
        psi = idx.get('processing_speed_index', 60)
        err = idx.get('error_rate_index', 20)
        col1.append(ColorBandBar("Distractibility / Attention Deficit", distract, "Higher scores indicate higher distractibility", width=2.3*inch))
        col1.append(ColorBandBar("Processing Speed Index", psi, "Higher scores indicate faster processing", width=2.3*inch))
        col1.append(ColorBandBar("Task Errors (Sustained Attention)", err, "Higher scores indicate more errors", width=2.3*inch))

        col2 = []
        col2.append(Paragraph("EMOTIONAL METRICS", h3))
        col2.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=8))
        mh_idx = idx.get('mental_health_index', 50)
        burn_idx = idx.get('burnout_index', 40)
        col2.append(ColorBandBar("Wellbeing Index", mh_idx, "Higher scores indicate better overall wellbeing", width=2.3*inch))
        col2.append(ColorBandBar("Stress & Burnout Index", burn_idx, "Higher scores indicate higher risk", width=2.3*inch))

        col3 = []
        col3.append(Paragraph("PROJECTIVE INSIGHT", h3))
        col3.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=8))
        sa_glob = report_summary.get('story_analysis', {}).get('global_metrics', {})
        sa_dim = report_summary.get('story_analysis', {}).get('dimensions', {})
        anx = sa_glob.get('emotional_tone', 50)
        dep = 100 - sa_glob.get('optimism_score', 50)
        hos = sa_dim.get('Main Conflict', 40)
        col3.append(ColorBandBar("Anxiety Level", anx, width=2.3*inch))
        col3.append(ColorBandBar("Depressive Ideation", dep, width=2.3*inch))
        col3.append(ColorBandBar("Hostility / Anger", hos, width=2.3*inch))

        metrics_table = Table([[col1, col2, col3]], colWidths=[2.4*inch, 2.4*inch, 2.4*inch])
        metrics_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)]))
        story.append(metrics_table)
        story.append(Spacer(1, 10))

        mh_data = report_summary.get('mental_health', {})
        wemwbs = mh_data.get('wemwbs', {})
        pss = mh_data.get('pss', {})
        mbi = mh_data.get('mbi', {})
        wrqol = mh_data.get('wrqol', {})
        
        mh_metrics = {
            "Wellbeing Index Total": wemwbs.get('total', 'N/A'),
            "Wellbeing Index Category": wemwbs.get('category', 'N/A'),
            "Resilience (Stress)": pss.get('score', 'N/A'),
            "Emotional Exhaustion (Burnout)": mbi.get('burnout_index', 'N/A'),
            "Work quality of life": wrqol.get('score', 'N/A')
        }
        
        cog_data = report_summary.get('cognitive', {}).get('psi_data', {})
        cog_metrics = {
            "PSI Index Sum": cog_data.get('index_sum', 'N/A'),
            "Processing Speed Index": cog_data.get('ivp', 'N/A')
        }
        
        box_table = Table([[BoxedMetrics("Mental Health", mh_metrics), BoxedMetrics("Cognitive Performance", cog_metrics)]], colWidths=[3.6*inch, 3.6*inch])
        box_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)]))
        story.append(KeepTogether(box_table))
        
        # 5. RISK ANALYSIS
        story.append(KeepTogether([
            Paragraph("■ 5. RISK ANALYSIS", h2),
            Spacer(1, 5),
            Table([
                [RiskBar("Burnout Risk", report_summary.get('risk_analysis', {}).get('burnout_risk', 'Moderate')), 
                 RiskBar("Cognitive Fatigue", report_summary.get('risk_analysis', {}).get('cognitive_fatigue_risk', 'Moderate'))],
                [RiskBar("Emotional Distress", report_summary.get('risk_analysis', {}).get('emotional_distress_risk', 'Moderate')), 
                 RiskBar("Occupational", report_summary.get('risk_analysis', {}).get('occupational_risk', 'Moderate'))],
                [RiskBar("Performance", report_summary.get('risk_analysis', {}).get('performance_risk', 'Moderate')), '']
            ], colWidths=[3.6*inch, 3.6*inch], style=[('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)])
        ]))

        # 6. STRENGTHS & DEVELOPMENT AREAS
        s_items = []
        sa = report_summary.get('strength_analysis', [])
        if isinstance(sa, dict): s_items = [f"{k.replace('_', ' ').capitalize()}: {v}" for k, v in sa.items()]
        elif isinstance(sa, list): s_items = sa
        elif isinstance(sa, str): s_items = [x.strip().replace('- ', '') for x in sa.split('\n') if x.strip()]
        
        d_items = []
        da = report_summary.get('development_areas', [])
        if isinstance(da, dict): d_items = [f"{k.replace('_', ' ').capitalize()}: {v}" for k, v in da.items()]
        elif isinstance(da, list): d_items = da
        elif isinstance(da, str): d_items = [x.strip().replace('- ', '') for x in da.split('\n') if x.strip()]

        story.append(KeepTogether([
            Paragraph("■ 6. STRENGTHS & DEVELOPMENT AREAS", h2),
            Spacer(1, 5),
            Table([
                [StyledListBlock("Core Strengths", s_items, HexColor('#f0fdf4'), HexColor('#dcfce7'), HexColor('#166534')),
                 StyledListBlock("Development Areas", d_items, HexColor('#fffbeb'), HexColor('#fef3c7'), HexColor('#b45309'))]
            ], colWidths=[3.6*inch, 3.6*inch], style=[('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)])
        ]))

        # 7. WORKPLACE INTERPRETATION
        story.append(Paragraph("■ 7. WORKPLACE INTERPRETATION", h2))
        
        r_metrics = {
            'Collaboration': sa_dim.get('Social Relationships', 50),
            'Leadership': sa_dim.get('Future Expectation', 50),
            'Decision Making': sa_dim.get('Coping Style', 50),
            'Adaptability': sa_dim.get('Hero Identification', 50),
            'Conflict Resolution': 100 - sa_dim.get('Main Conflict', 50),
            'Stress Tolerance': mh_idx
        }
        
        bar_path = generate_bar_chart(r_metrics, tmp, "bar.png")
        wi_content = []
        wi = report_summary.get('workplace_interpretation')
        if isinstance(wi, dict) and wi:
            for k, v in wi.items():
                wi_content.append(Paragraph(k.replace('_', ' ').upper(), ParagraphStyle('wi_h', fontName='Helvetica-Bold', fontSize=7.5, textColor=colors.black)))
                wi_content.append(Paragraph(str(v).replace('\n', '<br/>'), ParagraphStyle('wi_b', fontName='Helvetica', fontSize=8, textColor=HexColor('#4b5563'), spaceAfter=8, leading=10)))
        elif wi:
            wi_content.append(Paragraph(str(wi).replace('\n', '<br/>'), body))
        else:
            wi_content.append(Paragraph("Data generated conservatively based on profile.", body))
            
        layout_7 = [[Image(str(bar_path), width=3.5*inch, height=2.33*inch) if bar_path else "", wi_content]]
        t7 = Table(layout_7, colWidths=[3.7*inch, 3.5*inch])
        t7.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0)]))
        story.append(KeepTogether(t7))

        # 8. STRATEGIC RECOMMENDATIONS
        story.append(Paragraph("■ 8. STRATEGIC RECOMMENDATIONS", h2))
        rec = report_summary.get('recommendations')
        if isinstance(rec, dict) and rec:
            for k, v in rec.items():
                class RecBox(Flowable):
                    def __init__(self, title, text, w):
                        Flowable.__init__(self)
                        self.w = w
                        import textwrap
                        self.lines = textwrap.fill(text, width=130).split('\n')
                        self.h = 30 + (len(self.lines) * 12)
                        self.title = title
                    def wrap(self, aw, ah): return (self.w, self.h)
                    def draw(self):
                        self.canv.setStrokeColor(HexColor('#f1f5f9'))
                        self.canv.setFillColor(colors.white)
                        self.canv.roundRect(0, 0, self.w, self.h, 4, fill=1, stroke=1)
                        self.canv.setFont("Helvetica-Bold", 8)
                        self.canv.setFillColor(HexColor('#1f2937'))
                        self.canv.drawString(10, self.h - 18, self.title.upper())
                        self.canv.setFont("Helvetica", 8.5)
                        self.canv.setFillColor(HexColor('#4b5563'))
                        y = self.h - 32
                        for l in self.lines:
                            self.canv.drawString(10, y, l)
                            y -= 12
                story.append(RecBox(k, str(v), 7.2*inch))
                story.append(Spacer(1, 10))
        elif rec:
            story.append(Paragraph(str(rec).replace('\n', '<br/>'), body))
        else:
            story.append(Paragraph("Data generated conservatively based on profile.", body))


        # 9. CANDIDATE ANSWER SHEET
        story.append(CondPageBreak(10*inch))
        story.append(Paragraph("■ 9. CANDIDATE ANSWER SHEET", h2))
        story.append(Paragraph("Story Assessments", ParagraphStyle('H3a', fontName='Helvetica-Bold', fontSize=10, textColor=colors.black, spaceBefore=10, spaceAfter=10)))
        
        stories = report.get('card_results', {}).get('story_assessments', [])
        if not stories:
            stories = report_summary.get('raw_answers', {}).get('stories', [])
        
        card_mapping = {
            'card_1': 'Card 3', 'card_2': 'Card 6', 'card_3': 'Card 11', 'card_4': 'Card 28',
            'card_1_hi': 'Card 3', 'card_2_hi': 'Card 6', 'card_3_hi': 'Card 11', 'card_4_hi': 'Card 28'
        }
        
        if stories:
            for idx_s, st in enumerate(stories):
                raw_id = str(st.get('card_id', '1')).lower()
                card_name = card_mapping.get(raw_id) or card_mapping.get(f"card_{raw_id.replace('card_', '')}")
                if not card_name:
                    card_name = st.get('card_id', '1')
                    if card_name.upper().startswith('CARD_'): card_name = card_name.replace('CARD_', 'Card ', 1)
                    elif card_name.upper().startswith('CARD '): card_name = 'Card ' + card_name[5:]
                    else: card_name = 'Card ' + card_name

                img_path = BACKEND_ROOT / "data" / "tat_cards" / "indianized" / f"{card_name}.webp"
                if not img_path.exists():
                    img_path = BACKEND_ROOT / "data" / "tat_cards" / f"{card_name}.webp"

                row_data = []
                if img_path.exists():
                    # Use kind='proportional' to avoid stretching the image
                    row_data.append(Image(str(img_path), width=1.5*inch, height=1.5*inch, kind='proportional'))
                else:
                    class PH(Flowable):
                        def wrap(self, aw, ah): return (1.5*inch, 1.5*inch)
                        def draw(self):
                            self.canv.setFillColor(colors.lightgrey)
                            self.canv.rect(0,0,1.5*inch,1.5*inch,fill=1,stroke=0)
                    row_data.append(PH())
                
                text_flow = [
                    Paragraph(f"IMAGE CARD: {card_name.upper()}", ParagraphStyle('ca_h', fontName='Helvetica-Bold', fontSize=8, textColor=colors.black)),
                    Paragraph(f'"{st.get("story_text", "")}"', ParagraphStyle('ca_b', fontName='Helvetica-Oblique', fontSize=8.5, textColor=HexColor('#4b5563'), spaceBefore=6))
                ]
                row_data.append(text_flow)
                
                st_table = Table([row_data], colWidths=[1.7*inch, 5.5*inch])
                st_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BACKGROUND', (0,0), (-1,-1), HexColor('#f9fafb')), ('BOX', (0,0), (-1,-1), 1, HexColor('#f3f4f6')), ('PADDING', (0,0), (-1,-1), 10)]))
                story.append(KeepTogether(st_table))
                story.append(Spacer(1, 15))
        else:
            story.append(Paragraph("No stories available.", body))

        story.append(Paragraph("Questionnaire Responses", ParagraphStyle('H3b', fontName='Helvetica-Bold', fontSize=10, textColor=colors.black, spaceBefore=15, spaceAfter=10)))
        
        q_ans_list = report.get('card_results', {}).get('questionnaire_responses', [])
        if q_ans_list:
            q_ans = {str(q.get('question_id', '')): q.get('score', 0) for q in q_ans_list}
        else:
            q_ans = report_summary.get('raw_answers', {}).get('questionnaire', {})
            
        if q_ans:
            try:
                from app.assessments.screening.level1.utils.question_bank import get_all_questions
                questions = get_all_questions()
            except ImportError:
                questions = {}
            
            if questions:
                for section_key, section_data in questions.items():
                    section_items = []
                    if 'items' in section_data:
                        section_items.extend(section_data['items'])
                    if 'sections' in section_data:
                        for sub in section_data['sections'].values():
                            if 'items' in sub:
                                section_items.extend(sub['items'])
                    if 'overall_indicator' in section_data:
                        section_items.append(section_data['overall_indicator'])

                    answered_items = [item for item in section_items if str(item['id']) in q_ans]
                    if not answered_items:
                        continue

                    scale_labels = section_data.get('scale_labels', [])
                    scale_range = section_data.get('scale_range', [1, 5])
                    
                    section_name = section_data.get('name', section_key.upper())
                    
                    sec_style = ParagraphStyle('sec_h', fontName='Helvetica-Bold', fontSize=8, textColor=HexColor('#4b5563'), spaceBefore=8, spaceAfter=4, borderWidth=1, borderColor=HexColor('#e5e7eb'), borderPadding=4, backColor=HexColor('#f9fafb'))
                    story.append(Paragraph(section_name.upper(), sec_style))
                    
                    q_table_data = []
                    for qObj in answered_items:
                        q_id = str(qObj['id'])
                        score = q_ans[q_id]
                        label = ""
                        if scale_labels:
                            index = score - scale_range[0]
                            if 0 <= index < len(scale_labels):
                                label = scale_labels[index]
                        
                        score_str = f"{label} (Score: {score})" if label else f"Score: {score}"
                        
                        q_table_data.append([
                            Paragraph(qObj.get('text', f"Question ID: {q_id}"), ParagraphStyle('q1', fontName='Helvetica', fontSize=8, textColor=HexColor('#374151'))),
                            Paragraph(score_str, ParagraphStyle('q2', fontName='Helvetica-Bold', fontSize=8, textColor=HexColor('#2563eb'), alignment=2))
                        ])

                    qt = Table(q_table_data, colWidths=[5.5*inch, 1.7*inch])
                    qt.setStyle(TableStyle([
                        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                        ('LINEBELOW', (0,0), (-1,-1), 0.5, HexColor('#f3f4f6')),
                        ('PADDING', (0,0), (-1,-1), 6)
                    ]))
                    story.append(KeepTogether(qt))
                    story.append(Spacer(1, 10))
            else:
                # Fallback if questions dict not available
                q_table_data = []
                for q_id, score in q_ans.items():
                    q_table_data.append([
                        Paragraph(f"Question ID: {q_id}", ParagraphStyle('q1', fontName='Helvetica', fontSize=8)),
                        Paragraph(f"Score: {score}", ParagraphStyle('q2', fontName='Helvetica-Bold', fontSize=8, textColor=HexColor('#2563eb')))
                    ])
                
                qt = Table(q_table_data, colWidths=[5.5*inch, 1.7*inch])
                qt.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('LINEBELOW', (0,0), (-1,-1), 0.5, HexColor('#f3f4f6')),
                    ('PADDING', (0,0), (-1,-1), 6)
                ]))
                story.append(qt)
        else:
            story.append(Paragraph("No questionnaire responses available.", body))

        # ====================================================================
        # VERIFICATION SECTION
        # ====================================================================
        story.append(CondPageBreak(10*inch))
        story.append(Paragraph("Psychologist Validation", h2))
        story.append(Paragraph(
            "The results and analysis included in this report must be reviewed and validated "
            "by a qualified psychologist before any clinical interpretation or action is taken.", body
        ))
        story.append(Spacer(1, 0.2*inch))

        validation_info = report.get('psychologist_validation', {})
        is_verified = validation_info.get('is_verified', False)

        val_name = validation_info.get('validator_name', '')
        roc_rci_no = validation_info.get('license_number', '')
        
        psychologist_name = val_name or "_________________________"
        roc_rci_no = roc_rci_no or "_________________________"
        
        if is_verified:
            date_str = validation_info.get('validation_date', datetime.now().strftime('%d-%m-%Y'))
            sig_flowable = Paragraph("<i>Digitally Verified via Psyichub</i>", body)
            
            e_sig_path = validation_info.get("e_signature_path")
            if e_sig_path:
                # We need DATA_STORE_DIR from backend/app/database.py
                try:
                    from app.database import DATA_STORE_DIR
                    full_sig_path = DATA_STORE_DIR / e_sig_path
                    if full_sig_path.exists():
                        # Use a reasonable signature size (e.g., 2 inches wide, proportional height)
                        sig_flowable = Image(str(full_sig_path), width=1.8*inch, height=0.6*inch, kind='proportional')
                except Exception:
                    pass
            
            val_data = [
                ["Verified By (Psychologist)", Paragraph(psychologist_name, body)],
                ["ROC / RCI No.", Paragraph(roc_rci_no, body)],
                ["Date of Validation", Paragraph(date_str, body)],
                ["Signature", sig_flowable],
            ]
        else:
            val_data = [
                ["Verified By (Psychologist)", Paragraph(psychologist_name, body)],
                ["ROC / RCI No.", Paragraph(roc_rci_no, body)],
                ["Date of Validation", "_________________________"],
                ["Signature", "_________________________"],
            ]

        t = Table(val_data, colWidths=[2.2*inch, 4.3*inch], hAlign='LEFT')
        t.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#50d3a7')),
            ('BACKGROUND', (0, 0), (0, -1), HexColor('#eaffea')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        
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
        small = ParagraphStyle('Small', fontName='Helvetica', fontSize=7, textColor=colors.gray)
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(
            f"Report generated by Psyichub Psychological Analysis System on {completed_at.strftime('%d-%m-%Y, %I:%M %p')}", small
        ))

        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e5e7eb'), spaceBefore=10, spaceAfter=10))
        
        disclaimer_text = (
            "DISCLAIMER: This assessment tool and its generated report are for informational and educational "
            "purposes only and are not a substitute for professional clinical diagnosis, treatment, or medical advice. "
            "The results should be reviewed by a qualified healthcare professional or psychologist."
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle('Disclaimer', fontName='Helvetica-Oblique', fontSize=7, textColor=HexColor('#ef4444'), alignment=1)))
        story.append(Spacer(1, 10))
        
        story.append(Paragraph("END OF ASSESSMENT REPORT • CONFIDENTIAL", ParagraphStyle('Footer', fontName='Helvetica-Bold', fontSize=7, textColor=HexColor('#9ca3af'), alignment=1)))

        doc.build(story)
        
    return output_path
