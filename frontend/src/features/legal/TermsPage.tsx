import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Cpu, Lock, FileText, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Terms and Conditions | CoreTAT - Psychological Intelligence</title>
      </Helmet>
      <LandingNavbar />

      <div className="sticky top-16 z-40 w-full pointer-events-none">
        <div className="container mx-auto px-6 lg:px-10 max-w-[1440px] pt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:bg-primary/10 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-border/50 shadow-sm transition-colors cursor-pointer pointer-events-auto w-max"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        {/* Header */}
        <div className="border-b border-border/60 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-4">
            <Scale className="w-3.5 h-3.5" />
            Legal Agreement & Compliance Standards
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text font-serif tracking-tight">
            Terms and Conditions
          </h1>
          <p className="mt-3 text-sm text-text/60 font-medium">
            Effective Date: January 1, 2026 &bull; Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Critical Clinical Alert */}
        <div className="mb-10 p-5 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Clinical Decision Support Notice</h3>
              <p className="text-sm mt-1 leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                CoreTAT provides assistive artificial intelligence and computational scoring engines for psychometric evaluation.
                <strong> The platform does not issue autonomous psychiatric or medical diagnoses.</strong> All generated outputs, thematic scores, and interpretive narratives must be reviewed, contextualized, and validated by a qualified mental health practitioner or registered psychologist.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-10 text-sm sm:text-base leading-relaxed font-normal text-text/85">
          {/* 1. Acceptance */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">01.</span> Acceptance of Terms
            </h2>
            <p>
              These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Practitioner&quot;, &quot;Clinic&quot;, or &quot;Organization&quot;) and <strong>CoreTAT</strong> (a software platform engineered by <strong>Zis440</strong>, referred to as &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p>
              By accessing, registering for, integrating, or utilizing the CoreTAT platform, including its web portal, REST APIs, and automated assessment scoring engines, you represent that you have read, understood, and agreed to be bound by these Terms. If you do not agree with any provision herein, you must immediately terminate access and discontinue use of the platform.
            </p>
          </section>

          {/* 2. Platform Nature & Scope */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">02.</span> Nature of Service & Professional Scope
            </h2>
            <p>
              CoreTAT is an enterprise-grade psychological intelligence platform providing structured test administration, multi-informant data ingestion, and deep-learning-augmented psychometric analysis across specialized assessment modalities (including Thematic Apperception Tests, Behavioral Rating scales, and Mental Health Screenings).
            </p>
            <ul className="space-y-2 my-3 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                <span><strong>Support Tool Only:</strong> CoreTAT acts as a clinical decision-support system (CDSS) designed to streamline narrative scoring, reduce manual evaluation latency, and generate structured diagnostic indices.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                <span><strong>No Doctor-Patient Relationship:</strong> The provision of CoreTAT software does not establish a physician-patient, therapist-client, or privileged medical relationship between CoreTAT and any end-candidate.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
                <span><strong>Emergency Limitations:</strong> CoreTAT is not equipped for crisis intervention. If an individual poses an imminent risk of self-harm or harm to others, immediate emergency medical or psychiatric intervention must be engaged outside of this platform.</span>
              </li>
            </ul>
          </section>

          {/* 3. AI & Algorithmic Governance */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">03.</span> Artificial Intelligence & Algorithmic Governance
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Cpu className="w-4 h-4" />
                AI Models, Machine Learning & Probabilistic Analysis
              </div>
              <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                CoreTAT employs state-of-the-art computational linguistic pipelines, Large Language Models (LLMs), Computer Vision (Faster R-CNN / LLaVA), and deterministic Knowledge Graphs to process subjective responses and identify psychological themes, defense mechanisms, and emotional balance scores.
              </p>
            </div>
            <p>You acknowledge and agree to the following AI governance principles:</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Probabilistic Nature:</strong> AI models generate outputs based on pattern recognition and statistical probability. Minor variations in narrative phrasing can produce divergent scoring vectors.</li>
              <li><strong>Mandatory Practitioner Review:</strong> Clinicians and organizational administrators maintain sole ethical and legal responsibility for verifying machine-generated reports before releasing them to patients, organizations, or legal bodies.</li>
              <li><strong>Prohibition on Purely Automated Adverse Action:</strong> In compliance with international algorithmic accountability norms, CoreTAT reports may not be used as the sole deciding factor in terminating employment, denying insurance coverage, determining criminal culpability, or establishing child custody.</li>
              <li><strong>No Model Scraping or Exploitation:</strong> You may not reverse-engineer prompts, extract training weights, or conduct automated adversarial injection attacks against our analysis APIs.</li>
            </ol>
          </section>

          {/* 4. Data Privacy, Confidentiality & PHI */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">04.</span> Data Privacy, Clinical Records & Confidentiality
            </h2>
            <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Lock className="w-4 h-4" />
                Data Protection & Medical Information Compliance
              </div>
              <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                CoreTAT adheres to industry-standard data protection protocols aligned with the Digital Personal Data Protection (DPDP) Act, HIPAA security principles, and international information confidentiality standards.
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Data Ownership:</strong> Practitioners and patient subjects retain ultimate ownership over personal clinical narratives and assessment histories. CoreTAT does not sell, lease, or monetize personal identifiable data.</li>
              <li><strong>Encryption & Transmission:</strong> All data in transit is protected by Transport Layer Security (TLS 1.3). Sensitive identifying records in our PostgreSQL storage are protected via robust database encryption and row-level access barriers.</li>
              <li><strong>Consent Requirement:</strong> Before initiating an assessment on behalf of a patient or candidate, the initiating practitioner or organization represents and warrants that they have acquired explicit, informed consent from the test-taker (or legal guardian in the case of minors).</li>
              <li><strong>Tokenized Anonymous Links:</strong> Links dispatched for remote assessment execution utilize cryptographically secured, single-use tokens to prevent unauthenticated data linkage.</li>
            </ul>
          </section>

          {/* 5. User Roles & Account Security */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">05.</span> User Roles, Verification & Credential Security
            </h2>
            <p>
              CoreTAT supports multiple operational account tiers (Super Admin, Clinic Admin, Clinic Staff, Org Admin, Org Staff, and Individual Psychologist). Each role carries distinct responsibilities:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>RCI / Professional Licensure Verification:</strong> Practitioners applying for clinical verification badges must upload authentic, valid credentials (e.g., Rehabilitation Council of India registration, certified clinical licenses). Submission of falsified, expired, or impersonated credentials constitutes fraud and results in immediate permanent blacklisting and regulatory reporting.</li>
              <li><strong>Credential Security:</strong> Users are responsible for safeguarding multi-factor authentication codes, API keys, and session tokens. You must notify CoreTAT immediately upon suspecting any unauthorized account access.</li>
              <li><strong>Audit Logging:</strong> For compliance and clinical traceability, CoreTAT maintains immutable audit logs capturing assessment dispatches, report generations, and practitioner sign-offs.</li>
            </ul>
          </section>

          {/* 6. Financial Terms & Wallet System */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">06.</span> Billing, Wallet Recharges & Refund Policy
            </h2>
            <p>
              Platform assessments operate on a credit/wallet deduction model or contracted institutional invoicing.
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Payment Processing:</strong> Transactions are routed through authorized, PCI-DSS certified payment aggregators (including Razorpay). CoreTAT does not store complete debit/credit card CVVs or net banking credentials.</li>
              <li><strong>Credit Consumption:</strong> Platform wallet credits are debited at the point of assessment submission and processing pipeline dispatch.</li>
              <li><strong>Refund Policy:</strong> Because computational analysis pipelines and cloud LLM inferences are executed instantaneously upon report initiation, processed assessments are non-refundable. Wallet balances resulting from verified technical failures or duplicate billings will be reviewed and refunded in accordance with our financial audit protocol.</li>
            </ul>
          </section>

          {/* 7. Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">07.</span> Intellectual Property & Proprietary Architecture
            </h2>
            <p>
              All rights, title, and interest in the CoreTAT platform — including but not limited to the cognitive scoring algorithms, calibrated normative datasets, assessment pipelines, automated report layouts, trademarks, logos, visual designs, and backend services — are the exclusive intellectual property of <strong>Zis440</strong> and its licensors.
            </p>
            <p>
              Nothing in these Terms grants the User any right to sublicense, copy, modify, republish, create derivative works from, or commercialize the underlying source code or analytical engines of CoreTAT.
            </p>
          </section>

          {/* 8. Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">08.</span> Limitation of Liability & Warranty Disclaimer
            </h2>
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2 text-destructive-foreground">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                Comprehensive Liability Waiver
              </div>
              <p className="text-xs sm:text-sm text-text/80 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CORETAT AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF CLINICAL PRACTICE REVENUE, PERSONAL INJURY, CLINICAL MALPRACTICE CLAIMS, MISDIAGNOSIS, OR INTERRUPTIONS OF PATIENT CARE ARISING FROM SYSTEM USE.
              </p>
            </div>
            <p>
              The platform is provided on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis without warranties of any kind, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular clinical purpose, or uninterrupted uptime.
            </p>
          </section>

          {/* 9. Indemnification */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">09.</span> Indemnification
            </h2>
            <p>
              You agree to defend, indemnify, and hold harmless CoreTAT, Zis440, its developers, operators, and affiliates from and against any third-party claims, liabilities, losses, damages, penalties, and legal expenses resulting from: (a) your violation of these Terms; (b) clinical treatments or diagnostic actions administered on the basis of platform outputs; (c) failure to obtain valid candidate consent; or (d) infringement of third-party intellectual property or privacy rights.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">10.</span> Governing Law, Jurisdiction & Dispute Resolution
            </h2>
            <p>
              These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the substantive laws of India, without giving effect to any principles of conflicts of law.
            </p>
            <p>
              Any legal action, suit, or proceeding arising out of or related to CoreTAT shall be instituted exclusively in the competent courts located in Kolkata, West Bengal, India.
            </p>
          </section>

          {/* 11. Contact */}
          <section className="space-y-3 pt-4 border-t border-border/40">
            <h2 className="text-xl font-bold text-text flex items-center gap-2 font-serif">
              <FileText className="w-5 h-5 text-primary" /> Contact & Legal Inquiries
            </h2>
            <p className="text-sm text-text/70">
              For questions, legal compliance notifications, or regulatory correspondence regarding these Terms, please contact our administrative desk:
            </p>
            <div className="mt-2 p-4 rounded-xl bg-card border border-border/70 text-sm space-y-1">
              <p><strong>Entity:</strong> CoreTAT Compliance & Governance (Zis440)</p>
              <p><strong>Legal & Support Email:</strong> <a href="mailto:admin@coretat.com" className="text-primary underline">admin@coretat.com</a></p>
              <p><strong>Developer Inquiries:</strong> <a href="https://saphalya-das.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Saphalya Das Portfolio</a></p>
              <p><strong>Location:</strong> West Bengal, India</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
