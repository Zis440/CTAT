
import { useState } from "react";
import {
  BookOpen,
  Brain,
  Shield,
  Sparkles,
  BarChart3,
  FileText,
  Target,
  Eye,
  Layers,
  Info,
  GitBranch,
  Server,
  Database,
  Cpu,
  ArrowRight,
  Settings,
  FolderOpen,
  Network,
  FileJson,
  FolderTree,
  Zap,
  Terminal,
  CheckCircle,
  AlertTriangle,
  Package,
  Calculator,
  Gauge,
  Workflow,
  Repeat,
  MousePointerClick,
  PenLine,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  HelpCircle,
  Compass,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group/code relative bg-primary/5 border border-primary/20 rounded-xl p-5 overflow-x-auto shadow-sm ${className}`}
    >
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-primary/10 text-primary/60 hover:text-primary hover:bg-primary/20 opacity-0 group-hover/code:opacity-100 transition-all duration-200 cursor-pointer"
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        )}
      </button>
      <pre className="text-sm text-text font-mono font-bold">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export const DOCS_SECTIONS = [
  { id: "intro", label: "Introduction" },
  { id: "quickstart", label: "Quickstart" },
  { id: "config", label: "Configuration" },
  { id: "assessment-system", label: "Assessment System" },
  { id: "murray-theory", label: "Murray Need-Press" },
  { id: "scoring", label: "Scoring Logic" },
  { id: "system-flow", label: "System & Flow" },
  { id: "data-model", label: "Data Model" },
  { id: "dashboard-guide", label: "Dashboard Guide" },
  { id: "reports", label: "Report Generation" },
  { id: "local-dev", label: "Local Execution" },
  { id: "cloud-hosting", label: "Cloud Hosting" },
  { id: "api-ref", label: "API Reference" },
  { id: "ethics", label: "Ethics & Usage" },
  { id: "faq", label: "FAQ" },
] as const;

interface DocsNavigationProps {
  currentSection: string;
  onNavigate: (sectionId: string) => void;
}

export function DocsNavigation({ currentSection, onNavigate }: DocsNavigationProps) {
  const currentIndex = DOCS_SECTIONS.findIndex((s) => s.id === currentSection);
  const prev = currentIndex > 0 ? DOCS_SECTIONS[currentIndex - 1] : null;
  const next =
    currentIndex < DOCS_SECTIONS.length - 1
      ? DOCS_SECTIONS[currentIndex + 1]
      : null;

  return (
    <div className="mt-16 pt-8 border-t border-primary/15">
      <div className="flex items-center justify-between gap-4">

        {prev ? (
          <button
            onClick={() => onNavigate(prev.id)}
            className="group flex-1 flex items-center gap-3 p-4 rounded-xl border border-primary/10 bg-secondary/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-left"
          >
            <ChevronLeft className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-text/40 font-medium uppercase tracking-wider">
                Previous
              </p>
              <p className="text-sm font-bold text-text group-hover:text-primary transition-colors truncate">
                {prev.label}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {next ? (
          <button
            onClick={() => onNavigate(next.id)}
            className="group flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-primary/10 bg-secondary/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-right"
          >
            <div className="min-w-0">
              <p className="text-xs text-text/40 font-medium uppercase tracking-wider">
                Next
              </p>
              <p className="text-sm font-bold text-text group-hover:text-primary transition-colors truncate">
                {next.label}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

interface DocsIntroductionProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsIntroduction({ onNavigate }: DocsIntroductionProps) {
  const highlights = [
    {
      icon: Brain,
      title: "Automated Assessment Analysis",
      desc: "CoreTAT uses an advanced clinical assessment engine to analyze patient narratives and identify psychological themes, defense mechanisms, and personality dynamics — automatically.",
    },
    {
      icon: BarChart3,
      title: "Interactive Dashboard",
      desc: "View results through rich, interactive dashboards with radar charts, relational graphs, and visual breakdowns of psychological profiles.",
    },
    {
      icon: FileText,
      title: "Clinical Reports",
      desc: "Generate professional PDF reports suitable for clinical documentation, multi-session comparison, and patient records.",
    },
    {
      icon: Sparkles,
      title: "Murray Need-Press Profiles",
      desc: "Automatically computes Murray Need-Press Profiles, thematic dominance scores, and primary psychometric indicators from patient stories.",
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-3 h-3" /> What is CoreTAT?
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          Welcome to <span className="text-primary">CoreTAT</span>
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          CoreTAT is a comprehensive platform for automated psychometric assessment.
          It helps practitioners and researchers administer clinical tests and analyze
          patient data to uncover deep psychological insights — all powered by our intelligent assessment engine.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text">Available Assessments</h2>
        <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
          <p className="text-text/80 leading-relaxed">
            Currently, CoreTAT includes two primary assessments, with many more clinical tests planned for the future:
          </p>
          <ul className="list-disc pl-6 space-y-3 text-text/80">
            <li>
              <strong>Narrative Assessment:</strong> A projective psychological test where a patient is shown ambiguous images (Projective cards) and asked to tell a story. The system uses automated analysis to review these narratives and reveal unconscious thoughts, emotions, needs, and personality patterns.
            </li>
            <li>
              <strong>Employee Mental Health &amp; Wellbeing:</strong> A rapid screening tool combining cognitive tasks and behavioral screening to evaluate overall mental wellness in professional and clinical settings.
            </li>
          </ul>
          <p className="text-text/80 leading-relaxed pt-2">
            <strong>CoreTAT</strong> digitizes and automates the entire psychological evaluation process — from intake and test administration to automated analysis and clinical report generation.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text">What Makes It Special?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-5 rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-text text-sm">{item.title}</h3>
                <p className="text-xs text-text/60 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-primary text-lg">Ready to learn how to use it?</h3>
          <p className="text-sm text-text/60">
            Check out the step-by-step guide to get started with CoreTAT.
          </p>
        </div>
        <button
          onClick={() => onNavigate("how-to-use")}
          className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary/90 transition-colors shrink-0"
        >
          How to Use It?
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-4 items-start">
        <Shield className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-amber-500">Clinical Disclaimer</h4>
          <p className="text-sm text-text/70 leading-relaxed">
            This system is a <strong>clinical decision-support tool</strong> for emotional support and
            educational purposes only. It does <strong>not</strong> provide medical diagnosis or professional therapy.
            If you or someone you know is in crisis, please contact emergency services or a licensed mental
            health professional immediately.
          </p>
          <p className="text-xs text-text/50 mt-2">
            <strong>India crisis lines:</strong> iCall: 9152987821 · Vandrevala: 9999666555 · AASRA: 9820466726
          </p>
        </div>
      </div>
    </div>
  );
}

interface HowToUseGuideProps {
  onNavigate: (sectionId: string) => void;
}

export function HowToUseGuide({ onNavigate }: HowToUseGuideProps) {
  const steps = [
    {
      step: 1,
      icon: MousePointerClick,
      title: "Register the Patient",
      description:
        "Begin by entering the patient's details — their name, age, and gender. This creates a new session profile so all the analysis results are tied to the right individual.",
      detail:
        'Navigate to "Start an Assessment" from the homepage. Fill in the patient\'s basic information on the intake form and proceed to the next step.',
    },
    {
      step: 2,
      icon: Eye,
      title: "Select Image Cards",
      description:
        "Browse through the collection of Narrative Intelligence cards displayed as a visual grid. Select one or more cards that will be used for the assessment session.",
      detail:
        "Each card is an ambiguous image designed to evoke stories and emotional responses. You can select as many cards as needed for the session. Click on a card to select or deselect it.",
    },
    {
      step: 3,
      icon: PenLine,
      title: "View the Card & Write a Story",
      description:
        "For each selected card, the patient views the image and writes a narrative — describing what they see, what is happening in the scene, what the characters might be thinking or feeling, and what they imagine could happen next.",
      detail:
        "This is the core of the assessment process. The patient should look at the image carefully and freely express what comes to mind. There are no right or wrong answers — the goal is to capture the patient's authentic thoughts, emotions, and perceptions as they interpret the image. The richer and more detailed the story, the better the analysis.",
    },
    {
      step: 4,
      icon: Brain,
      title: "AI Analyzes the Narrative",
      description:
        "Once the story is submitted, CoreTAT' AI engine processes the narrative through multiple specialized analysis pipelines — identifying defense mechanisms, psychological needs, emotional themes, and relational patterns.",
      detail:
        "The analysis runs automatically. You'll see a loading indicator while the system works. This typically takes a few moments. The AI computes Murray Need-Press profiles, thematic dominance scores, and psychometric indicators.",
    },
    {
      step: 5,
      icon: BarChart3,
      title: "Explore the Dashboard",
      description:
        "After all cards are analyzed, you're taken to an interactive clinical dashboard. Here you can explore radar charts, thematic breakdowns, relational graphs, and detailed scoring summaries for each card and overall.",
      detail:
        "The dashboard provides a comprehensive visual overview of the patient's psychological profile as derived from their narratives. You can drill into individual card analyses or view aggregated results across all cards.",
    },
    {
      step: 6,
      icon: FileDown,
      title: "Download the Clinical Report",
      description:
        "Generate and download a professional PDF report summarizing all findings. The report is formatted for clinical documentation and can be used for patient records, referrals, or multi-session tracking.",
      detail:
        'Click the "Generate Report" button on the dashboard to create the PDF. The report includes all scoring data, thematic analysis, and clinical interpretations.',
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-3 h-3" /> Step-by-Step Guide
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          How to <span className="text-primary">Use CoreTAT</span>
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          Follow these simple steps to conduct a projective assessment session — from patient registration
          to automated analysis and clinical report generation.
        </p>
      </div>

      <section className="space-y-6">
        {steps.map((s, index) => (
          <div
            key={s.step}
            className="relative flex gap-5 p-6 rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/30 transition-all duration-300 group"
          >

            <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-extrabold text-lg group-hover:bg-primary group-hover:text-background transition-colors duration-300">
              {s.step}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <s.icon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-text">{s.title}</h3>
              </div>
              <p className="text-sm text-text/70 leading-relaxed">{s.description}</p>
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-text/60 leading-relaxed italic">{s.detail}</p>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className="absolute -bottom-4 left-[1.85rem] z-10">
                <ArrowRight className="w-4 h-4 text-primary/40 rotate-90" />
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 space-y-1">
          <h3 className="font-bold text-primary text-lg">Want to learn more about the platform?</h3>
          <p className="text-sm text-text/60">
            Go back and read about what CoreTAT is and what makes it special.
          </p>
        </div>
        <button
          onClick={() => onNavigate("about")}
          className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary/90 transition-colors shrink-0"
        >
          Platform Overview
        </button>
      </div>
    </div>
  );
}

export function DocsMethodology() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Target className="w-3 h-3" /> The Methodology
        </div>
        <h2 className="text-3xl font-bold text-text mb-6">
          The <span className="text-primary">Assessment</span> System
        </h2>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          Our Narrative Intelligence assessment is a projective psychological test inspired by
          Henry Murray and Christiana Morgan at Harvard University in the 1930s. CoreTAT
          automates the analysis of projective narratives using modern NLP techniques.
        </p>
      </div>

      <section id="assessment-system" className="scroll-mt-32 space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Target className="text-primary w-6 h-6" /> The Assessment System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Projection & Apperception</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              The Thematic Apperception Test relies on the principle of projection. When a subject
              narrates a story based on an ambiguous image (an Image Card), they project their own
              unconscious fears, desires, and conflicts into the characters and plot.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Card Catalog</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              Our system includes a curated dataset of high-resolution Image cards (e.g., Card 1, Card 3BM, Card 13MF).
              Each card is historically mapped to specific psychological themes such as achievement,
              loneliness, or familial conflict.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <FileText className="text-primary w-6 h-6" /> Murray’s Need-Press Theory
        </h2>
        <p className="text-text/70 max-w-4xl">
          At the heart of our scoring engine is Henry Murray’s **Need-Press Theory**. This framework
          hypothesizes that human behavior is driven by an interaction between internal motivation (Needs)
          and external environmental forces (Press).
        </p>

        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Definition</th>
                <th className="px-6 py-4">Examples</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              <tr>
                <td className="px-6 py-4 font-bold text-text">Psychogenic Needs</td>
                <td className="px-6 py-4 text-text/70">Internal drives and motivations of the protagonist.</td>
                <td className="px-6 py-4 italic text-primary/80">n Ach (Achievement), n Aff (Affiliation)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Environmental Press</td>
                <td className="px-6 py-4 text-text/70">External forces acting upon the protagonist.</td>
                <td className="px-6 py-4 italic text-primary/80">Rejection, Dominance, Loss</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Thema</td>
                <td className="px-6 py-4 text-text/70">The interaction between a Need and a Press.</td>
                <td className="px-6 py-4 italic text-primary/80">Achievement thwarted by Poverty</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">Clinical Note</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            CoreTAT automates the *identification* of these patterns but the final clinical
            interpretation should always be performed by a licensed practitioner.
          </p>
        </div>
      </div>
    </div>
  );
}

export function DocsArchitecture() {
  const steps = [
    { icon: Cpu, label: "Narrative Input", desc: "User submits story text via secure portal", color: "from-blue-500 to-cyan-400" },
    { icon: Server, label: "Backend Processing", desc: "NLP Orchestration & ML Inference", color: "from-cyan-400 to-emerald-400" },
    { icon: Database, label: "Data Persistence", desc: "Storing analysis results securely", color: "from-emerald-400 to-amber-400" },
    { icon: Database, label: "Clinical PDF", desc: "Automated report generation", color: "from-amber-400 to-rose-400" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <GitBranch className="w-3 h-3" /> System Architecture
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          Architecture & <span className="text-primary">Flow</span>
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          CoreTAT is designed with a decoupled, high-performance architecture to handle
          computationally intensive NLP pipelines while maintaining a responsive user interface.
        </p>
      </div>

      <section className="space-y-8">
        <h2 className="text-2xl font-bold text-text">Analysis Lifecycle</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-background shadow-lg mb-4 z-10`}>
                <step.icon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-text mb-1">{step.label}</h3>
              <p className="text-xs text-text/50 text-center px-4 leading-tight">{step.desc}</p>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-[2px] bg-primary/20 -z-0">
                  <ArrowRight className="absolute -right-2 -top-[7px] w-4 h-4 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

interface DocsConfigurationProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsConfiguration({ onNavigate }: DocsConfigurationProps) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Settings className="w-3 h-3" /> Configuration
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          Configuration <span className="text-primary">Reference</span>
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          Environment variables, system dependencies, storage modes, and runtime configurations
          for running CoreTAT in development or production.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <FolderOpen className="text-primary w-6 h-6" /> Data Storage Modes
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Aspect</th>
                <th className="px-6 py-4">Local Development</th>
                <th className="px-6 py-4">Cloud (Convex)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              <tr>
                <td className="px-6 py-4 font-bold text-text">PDF Reports</td>
                <td className="px-6 py-4 text-text/70"><code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">backend/outputs/</code></td>
                <td className="px-6 py-4 text-text/70">Convex File Storage</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Session Data</td>
                <td className="px-6 py-4 text-text/70"><code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">backend/data/sessions/</code> (JSON)</td>
                <td className="px-6 py-4 text-text/70">Convex Database</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Card Images</td>
                <td className="px-6 py-4 text-text/70">Served via secure static domains</td>
                <td className="px-6 py-4 text-text/70">Served via secure static domains</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Patient Records</td>
                <td className="px-6 py-4 text-text/70"><code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">patient_database.csv</code></td>
                <td className="px-6 py-4 text-text/70">Convex Database (per-user isolation)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-text">Authentication</td>
                <td className="px-6 py-4 text-text/70">Not required</td>
                <td className="px-6 py-4 text-text/70">Convex Auth / Clerk</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary">Important Notes</h4>
          <ul className="text-sm text-text/70 leading-relaxed space-y-1.5 list-disc list-inside">
            <li>NLP models dynamically fetch required weights on first use (~200 MB).</li>
            <li>Inference optimizations allow the system to run on standard CPU clusters.</li>
            <li>All scoring uses semantic vectorization; no hardcoded keyword lists.</li>
            <li>RAG indices are auto-built from proprietary clinical literature upon boot.</li>
            <li>If Llama 3 is unavailable, the system intelligently fails over to the Airavata reasoning engine.</li>
            <li>Ensure <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">.env</code> is configured if using external inference layers (Gemini, OpenAI, etc.).</li>
          </ul>
        </div>
      </div>

      <DocsNavigation currentSection="config" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsTATSystemProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsTATSystem({ onNavigate }: DocsTATSystemProps) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Target className="w-3 h-3" /> The Methodology
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          The <span className="text-primary">Image Card</span> System
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          The Narrative Intelligence test is a projective psychological test developed by
          Henry Murray and Christiana Morgan at Harvard University in the 1930s. CoreTAT
          automates the analysis of projective narratives using modern NLP techniques.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Eye className="text-primary w-6 h-6" /> The Principle of Projection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Apperception</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              When a subject narrates a story based on an ambiguous image (an Image Card), they
              unconsciously project their own fears, desires, and internal conflicts into the
              characters and plot. This phenomenon — called <em>apperception</em> — is
              the foundation of all projective testing.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Why Ambiguity Matters</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              The cards are deliberately ambiguous. Unlike structured questionnaires, they
              do not suggest "correct" answers. The absence of clear context forces the
              narrator to fill in meaning from their own psychological framework, revealing
              latent emotional patterns that might not surface in direct questioning.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Layers className="text-primary w-6 h-6" /> HOW CORETAT PROCESSES CARDS Cards
        </h2>
        <p className="text-text/70 max-w-3xl">
          Unlike traditional manual scoring, CoreTAT uses a fully automated pipeline. Each
          narrative goes through the following stages:
        </p>
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Semantic Narrative Parsing",
              desc: "The story is processed by an advanced linguistic engine to split the text into sentences. Each sentence is classified into a narrative event type — intention, obstacle, emotion, action, outcome, defense, or resolution — using semantic embeddings compared against prototype sentences for each type. Agents and targets are extracted via dependency parsing.",
            },
            {
              step: "2",
              title: "Emotion Detection",
              desc: "An emotion detection layer identifies the primary emotion in each sentence with confidence scores. Sentiment valence (-1 to +1) is computed using a specialized text processing engine.",
            },
            {
              step: "3",
              title: "Event Structuring",
              desc: "Each sentence is converted into a NarrativeEvent dataclass containing: the raw text, event type, agent, target, goal, emotion, valence, intensity, and placeholders for need/press/defense data that downstream engines will populate.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex gap-5 p-5 rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/30 transition-colors"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {item.step}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-text text-sm">{item.title}</h3>
                <p className="text-xs text-text/60 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <BookOpen className="text-primary w-6 h-6" /> Card Catalog & Themes
        </h2>
        <p className="text-text/70 max-w-3xl">
          CoreTAT includes a curated set of high-resolution Image cards (Card 1 through
          Card 13). Each card is historically mapped to elicit specific psychological themes:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Card</th>
                <th className="px-6 py-4">Typical Scene</th>
                <th className="px-6 py-4">Common Themes Elicited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {[
                { card: "Card 1", scene: "Boy with violin", themes: "Achievement, parental pressure, autonomy vs obligation" },
                { card: "Card 2", scene: "Country scene", themes: "Family dynamics, aspiration, gender roles" },
                { card: "Card 3BM", scene: "Figure on floor", themes: "Depression, guilt, loneliness, despair" },
                { card: "Card 4", scene: "Man-woman pair", themes: "Romantic conflict, dominance, attachment" },
                { card: "Card 6BM", scene: "Elderly woman", themes: "Mother-son dynamics, separation, guilt" },
                { card: "Card 7GF", scene: "Girl with doll", themes: "Nurturance, dependency, parental role" },
                { card: "Card 8BM", scene: "Surgical scene", themes: "Aggression, authority, anxiety about harm" },
                { card: "Card 13MF", scene: "Man and woman", themes: "Sexuality, guilt, aggression, loss" },
              ].map((row) => (
                <tr key={row.card}>
                  <td className="px-6 py-4 font-bold text-text whitespace-nowrap">{row.card}</td>
                  <td className="px-6 py-4 text-text/70">{row.scene}</td>
                  <td className="px-6 py-4 text-text/60 italic">{row.themes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        Card images are served securely via localized static image routes.
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">Why No Keywords?</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            CoreTAT deliberately avoids hardcoded keyword lists. All classification — event
            types, emotions, needs, defenses — is performed using sentence embeddings compared
            against clinical prototype sentences. This provides semantic understanding rather than
            surface-level pattern matching, enabling the system to capture nuance that keyword
            approaches would miss.
          </p>
        </div>
      </div>

      <DocsNavigation currentSection="tat-system" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsMurrayTheoryProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsMurrayTheory({ onNavigate }: DocsMurrayTheoryProps) {
  const needs = [
    { name: "nAchievement", desc: "Striving to accomplish, overcome obstacles, and reach high standards" },
    { name: "nAffiliation", desc: "Seeking companionship, friendship, and group belonging" },
    { name: "nAutonomy", desc: "Desire for independence and freedom from constraints" },
    { name: "nDominance", desc: "Need to control, influence, or direct others" },
    { name: "nNurturance", desc: "Wanting to help, protect, or care for others" },
    { name: "nSuccorance", desc: "Seeking help, protection, or sympathy from others" },
    { name: "nAggression", desc: "Expressing anger, hostility, or overcoming opposition forcefully" },
    { name: "nHarmAvoidance", desc: "Desire to avoid pain, danger, or illness" },
    { name: "nAbasement", desc: "Need to submit, accept blame, or apologize" },
    { name: "nRecognition", desc: "Wanting to be admired, respected, or praised" },
  ];

  const presses = [
    { name: "pDominance", desc: "External forces trying to control or influence the person" },
    { name: "pNurturance", desc: "Someone offering help, support, or care" },
    { name: "pLoss", desc: "Experiencing a loss of something valuable" },
    { name: "pRejection", desc: "Being rejected, excluded, or abandoned" },
    { name: "pAggression", desc: "Being attacked, threatened, or harmed" },
    { name: "pAffliction", desc: "Suffering from illness, pain, or misfortune" },
    { name: "pCompetition", desc: "Facing rivals or competitors" },
    { name: "pAffiliation", desc: "Friendly, cooperative environment" },
  ];

  const conflictPairs = [
    { a: "Autonomy", b: "Dominance", desc: "Desire for independence vs. need to control" },
    { a: "Nurturance", b: "Aggression", desc: "Caring impulse vs. hostile impulse" },
    { a: "Affiliation", b: "Rejection", desc: "Need for belonging vs. pushing others away" },
    { a: "Achievement", b: "Play", desc: "Striving for excellence vs. desire for leisure" },
    { a: "HarmAvoidance", b: "Aggression", desc: "Safety-seeking vs. combativeness" },
    { a: "Counteraction", b: "Abasement", desc: "Compensating for failure vs. accepting blame" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <FileText className="w-3 h-3" /> The Methodology
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          Murray's <span className="text-primary">Need-Press</span> Theory
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          Henry Murray's Need-Press Theory (1938) is the psychological backbone of
          CoreTAT. It models human behavior as the interaction between internal
          motivations (<strong>Needs</strong>) and external environmental forces (<strong>Presses</strong>).
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Zap className="text-primary w-6 h-6" /> How CoreTAT Infers Needs & Presses
        </h2>
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Sentence-BERT Embeddings</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              Instead of keyword matching, each of the 20 psychogenic needs and 10 environmental
              presses has 4 clinical prototype sentences. These prototypes are embedded into vector
              space using <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">all-MiniLM-L6-v2</code>.
              Narrative events are similarly embedded, and cosine similarity is computed
              between each event and all prototypes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Temperature-Scaled Softmax</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              Raw similarity scores are converted to probabilities via a temperature-scaled softmax
              function with <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">temperature=0.3</code>.
              A temperature below 1.0 sharpens the distribution — making dominant needs stand out
              more clearly and preventing over-smoothing where every need gets an equal probability.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
            <h3 className="text-lg font-bold text-primary">Need Categorization</h3>
            <p className="text-sm text-text/70 leading-relaxed">
              After probability computation, needs are categorized into three tiers:
            </p>
            <ul className="text-sm text-text/60 space-y-1.5 list-inside list-disc">
              <li><strong>Dominant needs</strong> — Top 3 needs with probability &gt; 0.10</li>
              <li><strong>Latent needs</strong> — Needs with probability between 0.05 and 0.10</li>
              <li><strong>Suppressed needs</strong> — Needs with probability &lt; 0.05</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text">Psychogenic Needs <span className="text-text/40 text-lg">(20 total, top 10 shown)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {needs.map((n) => (
            <div key={n.name} className="flex gap-3 p-4 rounded-xl border border-primary/10 bg-secondary/20 hover:border-primary/30 transition-colors">
              <code className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg h-fit shrink-0">{n.name}</code>
              <p className="text-xs text-text/60 leading-relaxed">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text">Environmental Presses <span className="text-text/40 text-lg">(10 total)</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presses.map((p) => (
            <div key={p.name} className="flex gap-3 p-4 rounded-xl border border-primary/10 bg-secondary/20 hover:border-primary/30 transition-colors">
              <code className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-lg h-fit shrink-0">{p.name}</code>
              <p className="text-xs text-text/60 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <ArrowRightLeft className="text-primary w-6 h-6" /> Conflict Detection
        </h2>
        <p className="text-text/70 max-w-3xl">
          The engine detects two types of conflicts: <strong>need-need</strong> conflicts
          (opposing internal drives) and <strong>need-press</strong> conflicts (internal drives
          thwarted by external forces). Conflict strength is calculated as the product of both
          probabilities, with a threshold of <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">0.05</code>.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Need A</th>
                <th className="px-6 py-4">Need B</th>
                <th className="px-6 py-4">Conflict Dynamic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {conflictPairs.map((pair) => (
                <tr key={pair.a + pair.b}>
                  <td className="px-6 py-4 font-bold text-text">{pair.a}</td>
                  <td className="px-6 py-4 font-bold text-text">{pair.b}</td>
                  <td className="px-6 py-4 text-text/60 italic">{pair.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">What is a Thema?</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            Murray defined a <strong>Thema</strong> as the specific interaction between a Need and
            a Press — for example, "Achievement thwarted by Loss." CoreTAT detects these
            thematic patterns by cross-referencing the top needs and presses inferred from each
            narrative, providing clinicians with a structured view of the patient's motivational landscape.
          </p>
        </div>
      </div>

      <DocsNavigation currentSection="murray-theory" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsScoringLogicProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsScoringLogic({ onNavigate }: DocsScoringLogicProps) {
  const dimensions = [
    {
      name: "Ego Strength",
      scale: "0 – 100",
      formula: "(resolution_success + agency) × 50",
      desc: "Measures how effectively the protagonist handles challenges. Computed from resolution success scores and the proportion of events with an active agent.",
    },
    {
      name: "Reality Testing",
      scale: "0 – 100",
      formula: "agent_ratio × 60 + situated_ratio × 40",
      desc: "Agent consistency and plausible event structure. Events with both an identified agent and target indicate higher reality contact. Floor of 20 prevents zero scores.",
    },
    {
      name: "Affective Integration",
      scale: "0 – 10",
      formula: "compute_affective_integration(events, words)",
      desc: "Blended emotional complexity score measuring how well emotions are integrated within the narrative rather than being isolated or chaotic.",
    },
    {
      name: "Cognitive Complexity",
      scale: "0 – 100",
      formula: "event_type_variety × 10",
      desc: "Diversity of event types in the narrative (intention, obstacle, emotion, action, outcome, defense, resolution). More variety indicates higher cognitive complexity.",
    },
    {
      name: "Social Cognition",
      scale: "0 – 100",
      formula: "(interactions / num_events) × 100",
      desc: "Proportion of events involving interpersonal interaction (target present). Higher ratios indicate greater awareness of social dynamics.",
    },
    {
      name: "Emotional Stability",
      scale: "0 – 100",
      formula: "100 – (valence_std × 100)",
      desc: "Inverse of valence variance across events. Low emotional variability indicates stability; high variability flags affect dysregulation.",
    },
    {
      name: "Narrative Coherence",
      scale: "0 – 100",
      formula: "transition_diversity × 15 + 20",
      desc: "Diversity of event-type transitions — a logical flow from intention→obstacle→action→resolution scores higher than repetitive sequences.",
    },
    {
      name: "Object Relations",
      scale: "0 – 100",
      formula: "(interactions / num_events) × 100",
      desc: "Quantifies relationships between characters. Correlated with social cognition but specifically measures relational capacity.",
    },
  ];

  const defenseMechanisms = [
    { name: "Intellectualization", trigger: "High word count + distancing language + low emotion density", evidence: "Cognitive distancing via abstract, high verbal productivity" },
    { name: "Repression", trigger: "Extremely brief events + missing agents + narrative truncation", evidence: "Unconscious inhibition: truncated narrative without emotional content" },
    { name: "Suppression", trigger: "Explicit restraint language: 'hide', 'stop', 'hold back'", evidence: "Conscious emotional inhibition with explicit suppression markers" },
    { name: "Reaction Formation", trigger: "Positive valence in conflict/obstacle/attack events", evidence: "Affective mismatch: positivity applied to distress events" },
    { name: "Avoidance", trigger: "Escapism language: 'leave', 'escape', 'run', 'ignore'", evidence: "Flight responses: explicit turning away from conflict" },
    { name: "Overcontrol", trigger: "Obligation language: 'must', 'should', 'always', 'never'", evidence: "Behavioral rigidity: high density of absolutist constraints" },
    { name: "Compliance", trigger: "Submission language: 'agree', 'follow', 'obey', 'accept'", evidence: "Relational submission: prominent obedience and conformity" },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Calculator className="w-3 h-3" /> The Methodology
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          <span className="text-primary">Scoring</span> Logic
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          CoreTAT computes multi-dimensional psychological scores from narrative events.
          Each narrative produces 8 dimension scores, confidence intervals, defense mechanism
          inferences, and a psychosis risk assessment.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <BarChart3 className="text-primary w-6 h-6" /> Eight Dimension Scores
        </h2>
        <p className="text-text/70 max-w-3xl">
          The <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">TATScoringEngine</code> transforms
          structured narrative events into quantitative scores across 8 clinical dimensions:
        </p>
        <div className="space-y-3">
          {dimensions.map((dim) => (
            <details
              key={dim.name}
              className="group rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/25 transition-colors"
            >
              <summary className="flex items-center justify-between p-5 cursor-pointer select-none">
                <div className="flex items-center gap-3">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-text">{dim.name}</span>
                  <span className="text-xs text-text/40 font-mono">[{dim.scale}]</span>
                </div>
                <span className="text-primary/50 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 space-y-3 border-t border-primary/5 pt-4">
                <code className="block text-xs text-primary bg-primary/5 px-4 py-2 rounded-lg font-bold">{dim.formula}</code>
                <p className="text-xs text-text/60 leading-relaxed">{dim.desc}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text">Recalibration v3.0</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Confidence Intervals</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Each dimension score comes with a confidence interval computed from
              event count and scale maximum. Low event counts widen the interval,
              signaling reduced measurement precision.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Extreme Score Capping</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Unless psychosis markers are present, scores are capped at 88 on
              0–100 scales. This prevents non-clinical narratives from producing
              artificially extreme values.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Variance Justification</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Per-dimension variance justifications are generated when high affective
              variability, low event counts, or limited event-type diversity are detected.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Shield className="text-primary w-6 h-6" /> Defense Mechanism Inference
        </h2>
        <p className="text-text/70 max-w-3xl">
          The <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">DefenseInferenceEngine</code> detects 7
          defense mechanisms using heuristic clinical rules based on semantic markers within
          narrative events. Each defense produces a confidence score (0–1) and supporting evidence.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-5 py-4">Defense</th>
                <th className="px-5 py-4">Trigger</th>
                <th className="px-5 py-4">Evidence Pattern</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {defenseMechanisms.map((d) => (
                <tr key={d.name}>
                  <td className="px-5 py-3.5 font-bold text-text whitespace-nowrap">{d.name}</td>
                  <td className="px-5 py-3.5 text-text/60 text-xs">{d.trigger}</td>
                  <td className="px-5 py-3.5 text-text/50 text-xs italic">{d.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-text/60 leading-relaxed">
            <strong>Production hardening:</strong> When multiple defenses co-occur, Overcontrol
            confidence is capped at 0.7. If average valence is positive, Suppression is
            reclassified as "Healthy Emotional Regulation." If Avoidance co-occurs with
            Compliance, it is reclassified as "Adaptive Deferral."
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Brain className="text-primary w-6 h-6" /> Psychosis Risk Assessment
        </h2>
        <div className="p-6 rounded-2xl bg-secondary/30 border border-primary/10 space-y-4">
          <p className="text-sm text-text/70 leading-relaxed">
            A composite risk score is computed from four dimension scores. Each dimension
            below the clinical threshold of 30 adds to the risk score:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { dim: "Reality Testing", weight: "+2", thresh: "< 30" },
              { dim: "Emotional Stability", weight: "+2", thresh: "< 30" },
              { dim: "Narrative Coherence", weight: "+2", thresh: "< 30" },
              { dim: "Affective Integration", weight: "+1", thresh: "< 30" },
            ].map((item) => (
              <div key={item.dim} className="text-center p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-text/50 font-medium">{item.dim}</p>
                <p className="text-lg font-bold text-primary">{item.weight}</p>
                <p className="text-xs text-text/40">when {item.thresh}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-center">
            <div className="flex-1 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-bold text-green-600">Low Risk</p>
              <p className="text-xs text-text/50">Score 0–2</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-bold text-amber-600">Moderate Risk</p>
              <p className="text-xs text-text/50">Score 3–4</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-bold text-red-600">High Risk</p>
              <p className="text-xs text-text/50">Score ≥ 5</p>
            </div>
          </div>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">Cultural Context Sensitivity</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            The scoring engine applies automatic cultural normalization for Indian contexts.
            Themes of obedience, collectivism, spiritual devotion, arranged social structures,
            and honor/shame dynamics are flagged as culturally normative rather than pathological.
            This prevents over-pathologizing culturally adaptive behaviors.
          </p>
        </div>
      </div>

      <DocsNavigation currentSection="scoring" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsSystemFlowProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsSystemFlow({ onNavigate }: DocsSystemFlowProps) {
  const pipelineSteps = [
    {
      num: 1,
      title: "Input Validation",
      engine: "production_utils",
      desc: "Detects input quality (empty, minimal, adequate). Empty narratives return safe defaults immediately. A reproducibility seed is set for deterministic results.",
      output: "Input quality report + reproducibility seed",
    },
    {
      num: 2,
      title: "Semantic Narrative Parsing",
      engine: "SemanticNarrativeEngine",
      desc: "Advanced NLP engines process the story into sentences. Each sentence is classified into event types (intention, obstacle, emotion, action, outcome, defense, resolution) using multi-dimensional embeddings compared against prototype sentences.",
      output: "List of NarrativeEvent objects",
    },
    {
      num: 3,
      title: "Murray Need-Press Inference",
      engine: "MurrayInferenceEngine",
      desc: "Events are embedded and compared against 20 needs × 4 prototypes and 10 presses × 4 prototypes. Temperature-scaled softmax (T=0.3) produces probability distributions. Needs are categorized as dominant (>0.10), latent (0.05–0.10), or suppressed (<0.05).",
      output: "Needs, presses, conflicts, full profiles",
    },
    {
      num: 4,
      title: "Theme Detection",
      engine: "ThemeDetectionEngine",
      desc: "Sentences are embedded with Sentence-BERT and clustered using BERTopic. Each theme gets intensity, clarity, affect tone, symbolic density, and related needs. Themes are mapped back to Murray needs via centroid similarity.",
      output: "Structured themes with metadata",
    },
    {
      num: 5,
      title: "Relational Field Analysis",
      engine: "RelationalFieldEngine",
      desc: "A directed graph of character interactions is built using dependency parsing. Nodes = characters (filtered against pronoun/time/adverb blacklists), edges = interactions with sentiment. Computes centrality, reciprocity, authority figures, figure classifications, and attachment style.",
      output: "Relational patterns, attachment classification",
    },
    {
      num: 6,
      title: "Conflict Structure Analysis",
      engine: "ConflictAspectEngine",
      desc: "Runs in parallel with need detection. 6 clinical conflict prototypes are compared via embedding similarity (threshold 0.45). Murray-derived conflicts are generated from top need/press divergences with resolution status (3-tier: Resolved → Partially Resolved → Unresolved).",
      output: "Enriched conflicts with domains and polarities",
    },
    {
      num: 7,
      title: "Environment Classification",
      engine: "EnvironmentClassifier",
      desc: "Murray presses are analyzed to classify the psychological environment as supportive, hostile, competitive, depriving, or mixed.",
      output: "Primary environment type",
    },
    {
      num: 8,
      title: "Quantitative Scoring",
      engine: "QuantitativeScorer",
      desc: "Produces numerical values for anxiety level, conflict (internal/interpersonal), hero ego strength, complexity, and social cognition from narrative event statistics.",
      output: "10 quantitative metric scores",
    },
    {
      num: 9,
      title: "Multi-dimensional Scoring",
      engine: "TATScoringEngine",
      desc: "Computes 8 dimension scores (ego strength, reality testing, affective integration, cognitive complexity, social cognition, emotional stability, narrative coherence, object relations) with confidence intervals and variance justifications.",
      output: "Dimension scores + confidence intervals",
    },
    {
      num: 10,
      title: "Defense Mechanism Inference",
      engine: "DefenseInferenceEngine",
      desc: "Detects 7 defense mechanisms via heuristic clinical rules. Production hardening: Overcontrol capped at 0.7 when multiple defenses present; Suppression reclassified based on valence; Avoidance → Adaptive Deferral when co-occurring with Compliance.",
      output: "Top 3 per-card defenses with confidence",
    },
    {
      num: 11,
      title: "Pre-output Validation Gate",
      engine: "validate_and_autocorrect_analysis",
      desc: "Final quality check: nuclear bounding on all dimension scores, score synchronization between quantitative and dimensional systems (conservative minimum), hard cap at 88, and cross-metric consistency checks.",
      output: "Validated, auto-corrected analysis",
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Workflow className="w-3 h-3" /> Architecture
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          System <span className="text-primary">Architecture</span> & Flow
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          CoreTAT uses an 11-step per-card analysis pipeline orchestrated by the
          <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs mx-1">analyze_card()</code>
          function. Each engine operates independently and contributes data that downstream
          engines may consume.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Layers className="text-primary w-6 h-6" /> Per-Card Analysis Pipeline
        </h2>
        <div className="space-y-2">
          {pipelineSteps.map((step, i) => (
            <div key={step.num} className="relative">
              <div className="flex gap-4 p-5 rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/25 transition-colors">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {step.num}
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-text text-sm">{step.title}</h3>
                    <code className="text-xs text-primary/70 bg-primary/5 px-2 py-0.5 rounded-md">{step.engine}</code>
                  </div>
                  <p className="text-xs text-text/60 leading-relaxed">{step.desc}</p>
                  <div className="flex items-center gap-2 text-xs text-text/40">
                    <ArrowRight className="w-3 h-3 text-primary/40" />
                    <span className="italic">{step.output}</span>
                  </div>
                </div>
              </div>
              {i < pipelineSteps.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <div className="w-px h-3 bg-primary/15" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Repeat className="text-primary w-6 h-6" /> Multi-Card Aggregation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Dual-Layer Aggregation</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              When multiple cards are analyzed, scores are merged using dual-layer aggregation:
              weighted mean across cards with a stability coefficient that adjusts based on
              peak-to-mean ratio. This preserves clinically significant peaks while smoothing noise.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Peak Anxiety Preservation</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Anxiety levels receive special treatment: <code className="text-primary text-xs bg-primary/5 px-1 py-0.5 rounded">mean + 0.4 × (peak − mean) + 0.15 × volatility</code>.
              An additional +5 escalation modifier is applied when peak anxiety ≥ 70. This
              ensures anxiety spikes are never smoothed away by averaging.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Psychometric Integrity</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Internal consistency (Cronbach's α) and cross-card convergence scores quantify
              how reliably the multi-card battery produces consistent results. An interpretive
              confidence score weighs card count, average word count, and theme diversity.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Conflict Persistence</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Conflicts appearing across &gt;50% of cards receive elevated persistence scores.
              Similarly, defense mechanisms are validated for cross-card consistency — defenses
              persistent across multiple cards have their rigidity cap lifted above 0.6.
            </p>
          </div>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">RAG Subsystem</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            CoreTAT includes a Retrieval-Augmented Generation (RAG) subsystem that
            ingests scoring manuals (PDF and text) via built-in OCR. Documents
            are chunked (500 tokens, 50 overlap), embedded via high-dimensional vectors, and indexed
            in a secure vector store. At inference time, the top-k (default 5) most relevant
            chunks are retrieved to augment scoring rules dynamically.
          </p>
        </div>
      </div>

      <DocsNavigation currentSection="system-flow" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsDataModelProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsDataModel({ onNavigate }: DocsDataModelProps) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Database className="w-3 h-3" /> Architecture
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          <span className="text-primary">Data</span> Model
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          CoreTAT operates on structured data objects produced by each engine in the
          pipeline. This page documents the core data structures, graph models, and storage
          patterns.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <FileJson className="text-primary w-6 h-6" /> NarrativeEvent
        </h2>
        <p className="text-text/70 max-w-3xl">
          The fundamental data unit. Each sentence in a projective narrative produces one
          <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs mx-1">NarrativeEvent</code>.
          Downstream engines consume and enrich these events.
        </p>
        <CodeBlock className="rounded-2xl border-primary/10 bg-secondary/10">{`@dataclass
class NarrativeEvent:
    text: str                         # Raw sentence text
    event_type: str                   # intention | obstacle | emotion |
                                      # action | outcome | defense | resolution
    agent: Optional[str]              # Subject (extracted via dep parsing)
    target: Optional[str]             # Object (dobj/pobj/attr)
    goal: Optional[str]              # Goal phrase (xcomp complement)
    emotion: Optional[str]           # Primary emotion (GoEmotions)
    valence: float                   # Sentiment score (-1 to +1)
    intensity: float                 # Emotion confidence score
    need_activated: Optional[str]    # Filled by Murray engine
    press_activated: Optional[str]   # Filled by Murray engine
    conflict_intensity: float        # Filled by Conflict engine
    defense_mechanism: Optional[str] # Filled by Defense engine
    resolution_success: Optional[float]  # 0–1 (resolution events only)`}</CodeBlock>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Network className="text-primary w-6 h-6" /> Knowledge Graph
        </h2>
        <p className="text-text/70 max-w-3xl">
          The <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">KnowledgeGraphEngine</code> maintains
          a <strong>NetworkX directed graph</strong> that stores scoring rules extracted from clinical
          manuals. This is a rule-based system (not a learning system).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Core Anchors</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Five dimension nodes are pre-initialized as core anchors:
              <code className="text-primary text-xs ml-1">conflict_internal</code>,
              <code className="text-primary text-xs ml-1">conflict_interpersonal</code>,
              <code className="text-primary text-xs ml-1">anxiety_level</code>,
              <code className="text-primary text-xs ml-1">coping_style</code>, and
              <code className="text-primary text-xs ml-1">defense</code>.
              These are cross-connected with weighted edges (influences, triggers, activates, modulates).
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Defense Hierarchy</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              An explicit defense hierarchy connects the
              <code className="text-primary text-xs ml-1">defense</code> node to
              repression, suppression, avoidance, and denial via "contains" edges.
              Each defense node connects to <code className="text-primary text-xs ml-1">coping_style</code> with "affects" edges.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Edge Weighting</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              Concept-to-rule edges use gradient weights:
              <code className="text-primary text-xs">0.25 + (count − 1) × 0.15</code>, capped at 1.0.
              Edges with weight ≥ 0.70 are labeled "strong"; below that, "weak."
              Orphan nodes are auto-connected to a <code className="text-primary text-xs">core_self</code> anchor with minimal weight.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-3">
            <h3 className="font-bold text-primary text-sm">Anomaly Detection</h3>
            <p className="text-xs text-text/60 leading-relaxed">
              The graph engine detects nodes with unusually low connectivity (below min_degree=2),
              ignoring system anchors and rule nodes. This helps identify potential gaps in the
              knowledge base.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <GitBranch className="text-primary w-6 h-6" /> Relational Character Graph
        </h2>
        <p className="text-text/70 max-w-3xl">
          Per narrative, a <strong>directed character interaction graph</strong> is built where
          nodes represent characters and edges represent interactions. This graph powers
          relational pattern analysis.
        </p>
        <div className="space-y-3">
          {[
            {
              title: "Entity Filtering",
              desc: "Four blacklists (pronouns, time markers, adverbs, abstract verbs) plus environmental press tokens, abstract nouns, and object blacklists ensure only meaningful characters become graph nodes.",
            },
            {
              title: "Figure Classification",
              desc: "Each character is classified into 7 types: Hero, Authority Figure, Peer, Caregiver, Threat Object, Dependency Object, or Symbolic Object. Authority validation requires power asymmetry (in_degree > out_degree) and decision influence. Only one Hero is allowed per narrative.",
            },
            {
              title: "Attachment Classification",
              desc: "Three-way classification (Secure, Anxious, Avoidant) using valence, reciprocity, marker presence, and dependency ratios. An ambiguity check requires ≥ 0.15 margin between top scores — otherwise 'Indeterminate' is returned. Consistency rules enforce score-style alignment.",
            },
            {
              title: "Personality Traits",
              desc: "Inferred from graph structure: dependency orientation (avg dependency score), control orientation (avg power perception), affect regulation (1 − valence_std), and defensive rigidity (weighted composite: 25% reciprocity + 40% defense index + 25% cross-card + 10% marker density).",
            },
          ].map((item) => (
            <div key={item.title} className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 hover:border-primary/25 transition-colors space-y-2">
              <h3 className="font-bold text-text text-sm">{item.title}</h3>
              <p className="text-xs text-text/60 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <FolderTree className="text-primary w-6 h-6" /> Theme Data Object
        </h2>
        <p className="text-text/70 max-w-3xl">
          Each detected theme is a structured object with rich metadata:
        </p>
        <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-secondary/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary/5 text-primary uppercase text-xs font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Field</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {[
                { field: "words", type: "string[]", desc: "Top 5 semantically filtered keywords (nouns, verbs, adjectives)" },
                { field: "intensity", type: "float", desc: "Theme prevalence normalized to 0–1" },
                { field: "clarity", type: "float", desc: "Avg cosine similarity of theme sentences to centroid" },
                { field: "affect_tone", type: "string", desc: "positive | negative | mixed | neutral" },
                { field: "related_needs", type: "string[]", desc: "Murray needs mapped via centroid-to-prototype similarity (threshold 0.5)" },
                { field: "conflicting_needs", type: "object[]", desc: "Opposing needs detected within related needs" },
                { field: "emotional_consistency", type: "float", desc: "1 / (1 + sentiment_std) — higher = more consistent" },
                { field: "narrative_centrality", type: "float", desc: "Average sentence position, normalized 0–1" },
                { field: "type", type: "string", desc: "relational | achievement | conflict | autonomy | narrative" },
              ].map((row) => (
                <tr key={row.field}>
                  <td className="px-6 py-3 font-mono text-xs text-text">{row.field}</td>
                  <td className="px-6 py-3 text-primary/60 font-mono text-xs">{row.type}</td>
                  <td className="px-6 py-3 text-text/60 text-xs">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-primary italic">Persistence & Storage</h4>
          <p className="text-sm text-text/70 italic leading-relaxed">
            The Knowledge Graph is securely persisted in an optimized binary format
            for rapid loading. Patient sessions, analyses, and
            reports can be stored locally as JSON files in <code className="text-primary text-xs">sessions/</code> and
            <code className="text-primary text-xs ml-1">outputs/</code> directories, or remotely via secure cloud sync.
            RAG indexes are maintained in <code className="text-primary text-xs ml-1">saved_learning/rag_index/</code> as optimized vector hierarchies.
          </p>
        </div>
      </div>

      <DocsNavigation currentSection="data-model" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsQuickstartProps {
  onNavigate: (sectionId: string) => void;
}

export function DocsQuickstart({ onNavigate }: DocsQuickstartProps) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Zap className="w-3 h-3" /> Getting Started
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight lg:text-5xl">
          Quickstart <span className="text-primary">Guide</span>
        </h1>
        <p className="text-lg text-text/70 leading-relaxed max-w-3xl">
          Get CoreTAT running on your local machine in minutes. This guide covers
          installation, dependency setup, and launching both the backend and frontend servers.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Package className="text-primary w-6 h-6" /> Prerequisites
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Python", version: "3.10+", link: "https://python.org" },
            { name: "Node.js", version: "18+", link: "https://nodejs.org" },
            { name: "Inference Engine", version: "Latest", link: "#" },
          ].map((dep) => (
            <div key={dep.name} className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 flex items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {dep.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="font-bold text-text text-sm">{dep.name}</h3>
                <p className="text-xs text-text/50">{dep.version}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-text/60">
          Additionally, <strong>Tesseract OCR</strong> and <strong>Poppler</strong> are required for
          PDF card reading. These can be installed system-wide or placed in the backend project root
          (auto-detected).
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <Terminal className="text-primary w-6 h-6" /> Step 1 — Local Installation
        </h2>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-text">Create a new workspace</h3>
          <CodeBlock>{`npm create coretat@latest my-app
cd my-app`}</CodeBlock>

          <h3 className="text-lg font-bold text-text">Start the Interactive Dashboard</h3>
          <CodeBlock>{`npm run dev`}</CodeBlock>

          <p className="text-sm text-text/70">
            This command automatically provisions your local environment, downloads the localized
            NLP inference models (Llama 3, Airavata), and boots the analytics dashboard securely on port 3000.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <CheckCircle className="text-primary w-6 h-6" /> Verify Installation
        </h2>
        <CodeBlock>{`npx coretat check-environment`}</CodeBlock>
        <p className="text-sm text-text/60">
          The RAG index builds automatically on first run (~60-90s). Subsequent runs load instantly
          from <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs">saved_learning/rag_index/</code>.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-text flex items-center gap-3">
          <AlertTriangle className="text-primary w-6 h-6" /> Troubleshooting
        </h2>
        <div className="space-y-4">
          {[
            {
              problem: "\"ModuleNotFoundError\" on backend",
              solution: "Ensure you have activated the virtual environment (.\\venv\\Scripts\\Activate.ps1) before running the uvicorn command.",
            },
            {
              problem: "Port 8000 already in use",
              solution: "You may have a previous instance still running. Terminate it with Ctrl+C in its terminal window.",
            },
            {
              problem: "Node errors on frontend",
              solution: "Ensure your node modules are installed by running npm install inside the frontend directory first.",
            },
            {
              problem: "PyABSA model downloads",
              solution: "PyABSA downloads models on first use (~200 MB). Reduce batch size if memory errors occur. CUDA is optional; the system runs on CPU by default.",
            },
            {
              problem: "Ollama not responding",
              solution: "Local LLM service must be running in the background for humanized medication summaries. The system prefers Llama 3, falling back to Airavata.",
            },
          ].map((item) => (
            <div
              key={item.problem}
              className="p-5 rounded-2xl border border-primary/10 bg-secondary/20 space-y-2 hover:border-primary/30 transition-colors"
            >
              <h3 className="text-sm font-bold text-text">{item.problem}</h3>
              <p className="text-xs text-text/60 leading-relaxed">{item.solution}</p>
            </div>
          ))}
        </div>
      </section>

      <DocsNavigation currentSection="quickstart" onNavigate={onNavigate} />
    </div>
  );
}

interface DocsSidebarProps {
  activeItem?: string;
  onSelect?: (item: string) => void;
}

export function DocsSidebar({ activeItem = "what-is", onSelect }: DocsSidebarProps) {
  const menuItems = [
    {
      label: "Guide",
      items: [
        { id: "about-ct", label: "Platform Overview", icon: HelpCircle },
        { id: "how-to-use", label: "How to Use It?", icon: Compass },
      ],
    },
  ];

  return (
    <Sidebar collapsible="icon" className="!top-16 !h-[calc(100svh-4rem)]">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          <span className="text-sm font-bold text-text tracking-tight group-data-[collapsible=icon]:hidden">
            How To Use?
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeItem === item.id}
                      tooltip={item.label}
                      onClick={() => onSelect?.(item.id)}
                      className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-bold"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
