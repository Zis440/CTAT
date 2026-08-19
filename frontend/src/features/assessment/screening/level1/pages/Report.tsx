import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { reportService, assessmentService } from '../services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { getSessionHistoryRoute, getDashboardRoute } from '@/lib/routeUtils';
import { AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AssessmentActionButton } from '@/features/assessment/_shared/components/AssessmentActionButton';
import { MasterReportLayout } from '@/features/assessment/_shared/components/MasterReportLayout';
import { RiskBar, ColorBandBar, SectionHeader, FormattedText } from '@/features/assessment/_shared/components/ReportComponents';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
);



interface ReportData {
  status?: string;
  verified_by_name?: string;
  employee_information?: any;
  indexes?: any;
  executive_summary?: any;
  ai_clinical_insight?: any;
  cross_assessment_integration?: any;
  comprehensive_ai_summary?: any;
  detailed_findings?: any;
  risk_analysis?: any;
  strength_analysis?: any;
  development_areas?: any;
  workplace_interpretation?: any;
  recommendations?: any;
  appendix?: any;
  story_analysis?: any;
  cognitive?: any;
  mental_health?: any;
  raw_answers?: any;
}

export const ScreeningReportUI: React.FC<{ report: ReportData, questions?: any, leftFooterActions?: React.ReactNode, rightFooterActions?: React.ReactNode, rightHeaderActions?: React.ReactNode }> = ({ report, questions, leftFooterActions, rightFooterActions, rightHeaderActions }) => {
  const {
    indexes, executive_summary, ai_clinical_insight, cross_assessment_integration,
    risk_analysis, strength_analysis, development_areas,
    workplace_interpretation, recommendations, story_analysis
  } = report;

  const radarData = {
    labels: ['Collaboration', 'Leadership', 'Decision Making', 'Adaptability', 'Conflict Resolution', 'Stress Tolerance'],
    datasets: [
      {
        label: 'Workplace Intelligence',
        data: [
          story_analysis?.dimensions?.['Social Relationships'] || 50,
          story_analysis?.dimensions?.['Future Expectation'] || 50,
          story_analysis?.dimensions?.['Coping Style'] || 50,
          story_analysis?.dimensions?.['Hero Identification'] || 50,
          100 - (story_analysis?.dimensions?.['Main Conflict'] || 50),
          indexes?.mental_health_index || 50,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  };

  return (
    <MasterReportLayout
      title="EMPLOYEE MENTAL HEALTH & WELLBEING ASSESSMENT REPORT"
      subtitle="CONFIDENTIAL EXECUTIVE ASSESSMENT"
      status={report.status}
      patientId={report.employee_information?.patient_id}
      verifiedByName={report.verified_by_name}
      leftFooterActions={leftFooterActions}
      rightFooterActions={rightFooterActions}
      rightHeaderActions={rightHeaderActions}
    >
      <div className="bg-background p-6 md:p-10 mx-auto max-w-5xl my-6 print:shadow-none print:border-none print:m-0 print:max-w-full">
        {/* EXECUTIVE OVERVIEW */}
        <SectionHeader title="1. Executive Overview" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-l-4 border-primary pl-6">
          <div>
            <h3 className="text-[12px] font-bold text-foreground mb-3 uppercase tracking-wider">Clinical Synthesis</h3>
            <p className="text-foreground leading-relaxed text-[13px] font-['Helvetica',sans-serif]">
              {executive_summary?.overview || "Overview is currently unavailable."}
            </p>
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-foreground mb-3 uppercase tracking-wider">Core Disposition</h3>
            <p className="text-foreground leading-relaxed text-[13px] font-['Helvetica',sans-serif]">
              {executive_summary?.core_disposition || "Core disposition is currently unavailable."}
            </p>
          </div>
        </div>

        {/* 2. CLINICAL INSIGHT */}
        <SectionHeader title="2. CLINICAL INSIGHT" />
        <FormattedText text={ai_clinical_insight} />

        {/* 3. CROSS-ASSESSMENT INTEGRATION */}
        <SectionHeader title="3. CROSS-ASSESSMENT INTEGRATION" />
        <FormattedText text={cross_assessment_integration} />

        {/* 4. DETAILED FINDINGS & PERFORMANCE */}
        <SectionHeader title="4. DETAILED FINDINGS & PERFORMANCE" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-6">
          <div>
            <h3 className="text-[11px] font-bold text-[#238b40] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Cognitive Metrics</h3>
            <ColorBandBar label="Distractibility / Attention Deficit" value={indexes?.attention_deficit_index || 45} compareText="Higher scores indicate higher distractibility" />
            <ColorBandBar label="Processing Speed Index" value={indexes?.processing_speed_index || 60} compareText="Higher scores indicate faster processing" />
            <ColorBandBar label="Task Errors (Sustained Attention)" value={indexes?.error_rate_index || 20} compareText="Higher scores indicate more errors" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-[#238b40] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Emotional Metrics</h3>
            <ColorBandBar label="Wellbeing Index" value={indexes?.mental_health_index || 50} compareText="Higher scores indicate better overall wellbeing" />
            <ColorBandBar label="Stress & Burnout Index" value={indexes?.burnout_index || 40} compareText="Higher scores indicate higher risk" />
          </div>
          <div>
            <h3 className="text-[11px] font-bold text-[#238b40] uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Projective Insight</h3>
            <ColorBandBar label="Anxiety Level" value={story_analysis?.global_metrics?.emotional_tone || 50} />
            <ColorBandBar label="Depressive Ideation" value={100 - (story_analysis?.global_metrics?.optimism_score || 50)} />
            <ColorBandBar label="Hostility / Anger" value={story_analysis?.dimensions?.['Main Conflict'] || 40} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="border rounded-lg border-border p-6 bg-card shadow-sm">
            <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Mental Health</h3>
            <div className="grid grid-cols-2 gap-y-4 text-[13px]">
              <div className="text-muted-foreground font-medium">Wellbeing Index Total</div>
              <div className="text-foreground">{report.mental_health?.wemwbs?.total || 'N/A'}</div>
              <div className="text-muted-foreground font-medium">Wellbeing Index Category</div>
              <div className="text-foreground">{report.mental_health?.wemwbs?.category || 'N/A'}</div>
              <div className="text-muted-foreground font-medium">Resilience (Stress)</div>
              <div className="text-foreground">{report.mental_health?.pss?.score || 'N/A'}</div>
              <div className="text-muted-foreground font-medium">Emotional Exhaustion (Burnout)</div>
              <div className="text-foreground">{report.mental_health?.mbi?.burnout_index || 'N/A'}</div>
            </div>
          </div>
          <div className="border rounded-lg border-border p-6 bg-card shadow-sm">
            <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Cognitive Performance</h3>
            <div className="grid grid-cols-2 gap-y-4 text-[13px]">
              <div className="text-muted-foreground font-medium">PSI Index Sum</div>
              <div className="text-foreground">{report.cognitive?.psi_data?.index_sum || 'N/A'}</div>
              <div className="text-muted-foreground font-medium">Processing Speed Index</div>
              <div className="text-foreground">{report.cognitive?.psi_data?.ivp || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* 5. RISK ANALYSIS */}
        <div style={{ pageBreakInside: 'avoid' }}>
          <SectionHeader title="5. RISK ANALYSIS" />
          <div className="mt-4 bg-card p-6 border border-border shadow-sm rounded-lg grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            <RiskBar label="Burnout Risk" level={risk_analysis?.burnout_risk || risk_analysis?.burnout || "Moderate"} />
            <RiskBar label="Cognitive Fatigue" level={risk_analysis?.cognitive_fatigue_risk || risk_analysis?.cognitive_fatigue || "Moderate"} />
            <RiskBar label="Emotional Distress" level={risk_analysis?.emotional_distress_risk || risk_analysis?.emotional_distress || "Moderate"} />
            <RiskBar label="Occupational" level={risk_analysis?.occupational_risk || risk_analysis?.occupational || "Moderate"} />
            <RiskBar label="Performance" level={risk_analysis?.performance_risk || risk_analysis?.performance || "Moderate"} />
          </div>
        </div>

        {/* 6. STRENGTHS & DEVELOPMENT AREAS */}
        <div className="mt-12 mb-8" style={{ pageBreakInside: 'avoid' }}>
          <SectionHeader title="6. STRENGTHS & DEVELOPMENT AREAS" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="bg-[#f0fdf4] border border-[#dcfce7] p-6 rounded-lg">
              <h3 className="text-xs font-bold text-[#166534] flex items-center gap-2 mb-4">
                <ShieldCheck className="w-4 h-4" /> Core Strengths
              </h3>
              <ul className="list-disc pl-5">
                {Array.isArray(strength_analysis)
                  ? strength_analysis.map((s, i) => {
                    let text = s;
                    if (typeof s === 'object' && s !== null) {
                      text = s.Area ? `${s.Area}: ${s.Impact || s.Description || ''}` : JSON.stringify(s);
                    }
                    return <li key={i} className="text-[12px] text-[#166534] mb-2">{text}</li>
                  })
                  : typeof strength_analysis === 'string'
                    ? strength_analysis.split('\n').filter(Boolean).map((s, i) => <li key={i} className="text-[12px] text-[#166534] mb-2">{s.replace(/^[-*•]\s*/, '')}</li>)
                    : null
                }
              </ul>
            </div>
            <div className="bg-[#fffbeb] border border-[#fef3c7] p-6 rounded-lg">
              <h3 className="text-xs font-bold text-[#b45309] flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4" /> Development Areas
              </h3>
              <ul className="list-disc pl-5">
                {Array.isArray(development_areas)
                  ? development_areas.map((d, i) => {
                    let text = d;
                    if (typeof d === 'object' && d !== null) {
                      text = d.Area ? `${d.Area}: ${d.Impact || d.Description || ''}` : JSON.stringify(d);
                    }
                    return <li key={i} className="text-[12px] text-[#b45309] mb-2">{text}</li>
                  })
                  : typeof development_areas === 'string'
                    ? development_areas.split('\n').filter(Boolean).map((d, i) => <li key={i} className="text-[12px] text-[#b45309] mb-2">{d.replace(/^[-*•]\s*/, '')}</li>)
                    : null
                }
              </ul>
            </div>
          </div>
        </div>

        {/* 7. WORKPLACE INTERPRETATION */}
        <div className="mt-12 mb-8" style={{ pageBreakInside: 'avoid' }}>
          <SectionHeader title="7. WORKPLACE INTERPRETATION" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="h-[300px]">
              <Bar data={radarData} options={{
                maintainAspectRatio: false,
                scales: {
                  y: { min: 0, max: 100, ticks: { stepSize: 20 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                  x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
              }} />
            </div>
            <div className="flex flex-col gap-3">
              {typeof workplace_interpretation === 'object' && workplace_interpretation !== null && Object.keys(workplace_interpretation).length > 0 ? (
                Object.entries(workplace_interpretation).map(([k, v]) => (
                  <div key={k} className="bg-muted/30 border border-border p-3 rounded">
                    <h4 className="text-[10px] font-bold text-foreground uppercase mb-1">{k.replace(/_/g, ' ')}</h4>
                    <p className="text-[11px] text-muted-foreground">{v as string}</p>
                  </div>
                ))
              ) : (
                <div className="bg-muted/30 border border-border p-3 rounded">
                  <FormattedText text={typeof workplace_interpretation === 'string' && workplace_interpretation ? workplace_interpretation : "Data generated conservatively based on profile."} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 8. STRATEGIC RECOMMENDATIONS */}
        <div style={{ pageBreakInside: 'avoid' }}>
          <SectionHeader title="8. STRATEGIC RECOMMENDATIONS" />
          <div className="grid grid-cols-1 gap-4 mt-6">
            {typeof recommendations === 'object' && recommendations !== null && Object.keys(recommendations).length > 0 ? (
              Object.entries(recommendations).map(([k, v]) => (
                <div key={k} className="border border-border shadow-sm p-4 rounded-lg">
                  <h4 className="text-[11px] font-bold text-foreground uppercase mb-2">{k.replace(/_/g, ' ')}</h4>
                  <p className="text-[12px] text-muted-foreground">{v as string}</p>
                </div>
              ))
            ) : (
              <div className="border border-border shadow-sm p-4 rounded-lg">
                <FormattedText text={typeof recommendations === 'string' && recommendations ? recommendations : "Data generated conservatively based on profile."} />
              </div>
            )}
          </div>
        </div>

        {/* 9. CANDIDATE ANSWER SHEET */}
        <div className="mt-16" style={{ pageBreakBefore: 'always' }}>
          <SectionHeader title="9. CANDIDATE ANSWER SHEET" />

          <h3 className="text-sm font-bold text-foreground mb-4 mt-6">Story Assessments</h3>
          <div className="grid grid-cols-1 gap-6">
            {report.raw_answers?.stories?.map((story: any, idx: number) => {
              // Map generic internal IDs to the specific TAT cards used in Employee Mental Health & Wellbeing
              const cardMapping: Record<string, string> = {
                'card_1': 'Card 3',
                'card_2': 'Card 6',
                'card_3': 'Card 11',
                'card_4': 'Card 28',
                'card_1_hi': 'Card 3',
                'card_2_hi': 'Card 6',
                'card_3_hi': 'Card 11',
                'card_4_hi': 'Card 28',
              };

              let rawId = (story.card_id || '1').toLowerCase();
              let cardName = cardMapping[rawId] || cardMapping[`card_${rawId.replace('card_', '')}`];

              if (!cardName) {
                // Fallback parsing just in case it's not 1-4
                cardName = story.card_id || '1';
                if (cardName.toUpperCase().startsWith('CARD_')) {
                  cardName = cardName.replace(/CARD_/i, 'Card ');
                } else if (cardName.toUpperCase().startsWith('CARD ')) {
                  cardName = 'Card ' + cardName.substring(5);
                } else {
                  cardName = 'Card ' + cardName;
                }
              }

              const imageUrl = `http://localhost:8000/api/cards/image/indianized/${cardName}.webp`;

              return (
                <div key={idx} className="flex gap-6 p-4 border border-border rounded-lg bg-card">
                  <div className="w-32 h-32 bg-muted rounded shrink-0 overflow-hidden shadow">
                    <img
                      src={imageUrl}
                      alt={cardName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder if not found
                        e.currentTarget.src = `https://placehold.co/150x150/e2e8f0/475569?text=${encodeURIComponent(cardName)}`;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-foreground uppercase mb-2">Image Card: {cardName}</h4>
                    <p className="text-[12px] text-muted-foreground italic">"{story.story_text}"</p>
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="text-sm font-bold text-foreground mb-4 mt-10 border-b border-border pb-2">Questionnaire Responses</h3>
          <div className="space-y-8">
            {questions && !Array.isArray(questions) ? (
              Object.entries(questions).map(([sectionKey, sectionData]: [string, any]) => {
                // Find all items for this section
                let sectionItems: any[] = [];
                if (sectionData.items) {
                  sectionItems = sectionItems.concat(sectionData.items);
                }
                if (sectionData.sections) {
                  Object.values(sectionData.sections).forEach((sub: any) => {
                    if (sub.items) sectionItems = sectionItems.concat(sub.items);
                  });
                }
                if (sectionData.overall_indicator) {
                  sectionItems.push(sectionData.overall_indicator);
                }

                // Filter items that actually have a response
                const answeredItems = sectionItems.filter(item =>
                  report.raw_answers?.questionnaire?.[item.id] !== undefined
                );

                if (answeredItems.length === 0) return null;

                const scaleLabels = sectionData.scale_labels || [];
                const scaleRange = sectionData.scale_range || [1, 5];

                return (
                  <div key={sectionKey} className="bg-card border border-border rounded-lg p-6">
                    <h4 className="text-[11px] font-bold text-foreground uppercase mb-4 tracking-wider bg-muted/30 p-2 rounded">
                      {sectionData.name || sectionKey.toUpperCase()}
                    </h4>
                    <div className="grid grid-cols-1 gap-y-3">
                      {answeredItems.map((qObj: any) => {
                        const score = report.raw_answers?.questionnaire?.[qObj.id];
                        let label = "";
                        if (scaleLabels.length > 0) {
                          const index = score - scaleRange[0];
                          if (index >= 0 && index < scaleLabels.length) {
                            label = scaleLabels[index];
                          }
                        }

                        return (
                          <div key={qObj.id} className="flex justify-between items-center text-[11px] border-b border-border/50 pb-2">
                            <span className="text-muted-foreground pr-4">{qObj.text || qObj.question_text || `Question ID: ${qObj.id}`}</span>
                            <span className="text-primary font-medium whitespace-nowrap bg-primary/10 px-2 py-1 rounded">
                              {label ? `${label} (Score: ${score})` : `Score: ${score}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-card border border-border rounded-lg p-6">
                <h4 className="text-[11px] font-bold text-foreground uppercase mb-4 tracking-wider bg-muted/30 p-2 rounded">Assessment Responses</h4>
                <div className="grid grid-cols-1 gap-y-3">
                  {Object.entries(report.raw_answers?.questionnaire || {}).map(([qId, score]: [string, any]) => {
                    let questionText = `Question ID: ${qId}`;

                    let allQuestions: any[] = [];
                    if (questions && Array.isArray(questions)) {
                      allQuestions = questions;
                    }

                    if (allQuestions.length > 0) {
                      const qObj = allQuestions.find((q: any) => q.id === qId || String(q.id) === String(qId));
                      if (qObj) questionText = qObj.text || qObj.question_text || questionText;
                    }

                    return (
                      <div key={qId} className="flex justify-between items-center text-[11px] border-b border-border/50 pb-2">
                        <span className="text-muted-foreground pr-4">{questionText}</span>
                        <span className="text-primary font-medium whitespace-nowrap bg-primary/10 px-2 py-1 rounded">Score: {score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col gap-2 text-[10px] text-muted-foreground text-center print:text-left print:flex-row print:justify-between">
          <p className="font-medium text-amber-700 max-w-4xl mx-auto print:mx-0 print:max-w-[70%]">
            Disclaimer: This report is generated for informational and educational purposes only and is not a substitute for professional clinical diagnosis or treatment.
          </p>
          <div className="flex justify-between items-center w-full print:w-auto print:flex-col print:items-end gap-1">
            <span className="font-bold uppercase tracking-widest text-foreground">CONFIDENTIAL</span>
            <span>{new Date().getFullYear()} @ PsyicHub - Psychological Intelligence</span>
          </div>
        </div>
      </div>
    </MasterReportLayout>
  );
};

const Report: React.FC = () => {
  const { id: assessmentId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [questions, setQuestions] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);

  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(mode === 'verify');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editInsight, setEditInsight] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchQuestions = async () => {
      try {
        const qData = await assessmentService.getQuestions();
        setQuestions(qData);
      } catch (err) {
        console.error("Failed to fetch questions", err);
      }
    };
    fetchQuestions();

    const fetchReport = async () => {
      try {
        const data = await reportService.getReport(assessmentId) as ReportData;
        if (data && data.status === 'processing') {
          setIsProcessing(true);
          timeoutId = setTimeout(fetchReport, 5000);
        } else {
          setIsProcessing(false);
          setReport(data);
        }
      } catch (err: any) {
        console.error("Failed to load report", err);
        setError("Failed to load assessment report.");
      }
    };

    fetchReport();
    return () => clearTimeout(timeoutId);
  }, [assessmentId]);

  useEffect(() => {
    if (report && mode === 'verify' && report.status === 'Under Verification') {
      setIsVerifyDialogOpen(true);
      setEditSummary(report.executive_summary || '');
      setEditInsight(report.ai_clinical_insight || '');
    }
  }, [report, mode]);

  useEffect(() => {
    if (report && !isProcessing && questions && !hasAutoSaved) {
      setHasAutoSaved(true);
    }
  }, [report, isProcessing, questions, hasAutoSaved]);

  const handleOpenPDF = async () => {
    let newWindow: Window | null = null;
    try {
      setIsExporting(true);
      if (!assessmentId) return;
      newWindow = window.open('', '_blank');
      const blob = await reportService.openPdf(assessmentId);
      const url = URL.createObjectURL(blob as Blob);
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${assessmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      console.error(error);
      if (newWindow) newWindow.close();
      
      let errorMessage = "Failed to open PDF";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.detail || errorMessage;
        } catch (e) {
          errorMessage = error?.message || errorMessage;
        }
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else {
        errorMessage = error?.message || errorMessage;
      }

      if (error.response?.status === 404) {
        toast.info("Pending PDF: The report is still generating in the background. Please try again in a moment.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!assessmentId) return;
    setIsRequestingVerification(true);
    try {
      await reportService.requestVerification(assessmentId);
      setReport(prev => prev ? { ...prev, status: "Under Verification" } : prev);
      toast.success("Verification requested successfully. ₹100 deducted from wallet.");
    } catch (err: any) {
      console.error("Failed to request verification", err);
      if (err.response?.status === 402) {
        toast.error("Insufficient wallet balance to request verification.");
      } else {
        toast.error("Failed to request verification.");
      }
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const submitVerification = async () => {
    if (!assessmentId) return;
    if (!verifyNotes.trim()) {
      toast.error("Please add verification notes/signature.");
      return;
    }
    setIsVerifying(true);
    try {
      await reportService.verifyReport(assessmentId, {
        executive_summary: editSummary !== report?.executive_summary ? editSummary : undefined,
        ai_clinical_insight: editInsight !== report?.ai_clinical_insight ? editInsight : undefined,
        verification_notes: verifyNotes
      });
      toast.success("Report verified successfully.");
      setIsVerifyDialogOpen(false);
      navigate(`/screening/report/${assessmentId}`, { replace: true });
      window.location.reload();
    } catch (err) {
      console.error("Failed to verify report", err);
      toast.error("Failed to verify report.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center space-y-4 bg-background p-8 rounded-xl shadow-sm border border-border">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="w-12 h-12 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>

          <div className="space-y-2">
            <h3 className="text-xl font-medium text-foreground">
              {isProcessing ? "Synthesizing Report... (This may take 1-2 minutes)" : "Loading..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isProcessing
                ? "Aggregating findings from Employee Mental Health & Wellbeing assessment."
                : "Please wait while we fetch the report data."}
            </p>
          </div>

          {isProcessing && (
            <div className="pt-8">
              <div className="p-5 rounded-xl border border-primary/10 bg-primary/5 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Your result is being processed. You can now return to the dashboard if you want.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate(getDashboardRoute(user?.role))}
                  className="w-full sm:w-auto"
                >
                  Go To Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {isVerifyDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-3xl border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Psychologist Verification</h2>
                <p className="text-sm text-muted-foreground mt-1">Review and amend the automated report insights.</p>
              </div>
              <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)}>Cancel</Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Executive Summary</label>
                <textarea
                  className="w-full min-h-[150px] p-4 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Review the executive summary..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clinical Insights & Synthesis</label>
                <textarea
                  className="w-full min-h-[200px] p-4 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  value={editInsight}
                  onChange={(e) => setEditInsight(e.target.value)}
                  placeholder="Review the clinical insights..."
                />
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verification Notes & Signature <span className="text-destructive">*</span></label>
                <textarea
                  className="w-full min-h-[80px] p-4 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="E.g., 'Reviewed and clinically validated by Dr. Smith. Diagnosis confirmed.'"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>Discard</Button>
              <Button onClick={submitVerification} disabled={isVerifying || !verifyNotes.trim()} className="gap-2">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Sign & Verify Report
              </Button>
            </div>
          </div>
        </div>
      )}

      <ScreeningReportUI
        report={report}
        questions={questions}
        leftFooterActions={
          <Button
            variant="outline"
            onClick={handleOpenPDF}
            disabled={isExporting || isProcessing}
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            View Report
          </Button>
        }
        rightHeaderActions={null}
        rightFooterActions={
          <>
            {/* If the user is a fully verified clinical psychologist, they don't need to pay to verify. They can just review/verify it themselves via a different flow or it's implicitly verified. Hide the button. */}
            {!((user?.rci_number || user?.roc_number) && user?.verification_status === "approved") && (
              <>
                {report?.status === "AI Generated" || report?.status === "Generated" ? (
                  <AssessmentActionButton
                    variant="validate"
                    onClick={handleRequestVerification}
                    isLoading={isRequestingVerification}
                    disabled={isProcessing}
                    price={100}
                  />
                ) : ["pending", "Pending Verification", "Under Verification", "Assigned"].includes(report?.status || "") ? (
                  <AssessmentActionButton
                    variant="validate"
                    onClick={() => { }}
                    disabled={true}
                    label="Verification Pending"
                  />
                ) : ["Verified by Psychologist", "validated", "Finalized"].includes(report?.status || "") ? (
                  <AssessmentActionButton
                    variant="validate"
                    onClick={() => { }}
                    disabled={true}
                    label="Verified"
                  />
                ) : null}
              </>
            )}
            <Button variant="secondary" onClick={() => navigate(getSessionHistoryRoute(user?.role))}>
              Back to History
            </Button>
          </>
        }
      />
    </div>
  );
};

export default Report;
