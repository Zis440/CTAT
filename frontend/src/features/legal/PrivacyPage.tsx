import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Server, Cpu, FileCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Privacy Policy | CoreTAT - Psychological Intelligence</title>
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
            <Shield className="w-3.5 h-3.5" />
            Healthcare Privacy & Confidentiality Commitment
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-text font-serif tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-text/60 font-medium">
            Effective Date: January 1, 2026 &bull; Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="space-y-10 text-sm sm:text-base leading-relaxed font-normal text-text/85">
          {/* 1. Introduction */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">01.</span> Introduction & Core Philosophy
            </h2>
            <p>
              At <strong>CoreTAT</strong> (engineered by <strong>Zis440</strong>), we recognize that mental health, narrative psychometrics, and psychological assessment records constitute the most sensitive category of personal data. We are dedicated to maintaining the highest standard of data privacy, clinical confidentiality, and ethical artificial intelligence governance.
            </p>
            <p>
              This Privacy Policy explains how CoreTAT collects, encrypts, manages, and safeguards data across our web applications, assessment pipelines, and administrative interfaces.
            </p>
          </section>

          {/* 2. Information We Process */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">02.</span> Categories of Information Processed
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-sm text-primary flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Practitioner & Organization Data
                </div>
                <p className="text-xs sm:text-sm text-text/75 leading-relaxed">
                  Name, business email, clinic affiliation, phone number, designated role, professional licensing details (e.g. RCI license credentials and verification documents).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/70 space-y-2">
                <div className="font-bold text-sm text-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Candidate & Patient Assessment Data
                </div>
                <p className="text-xs sm:text-sm text-text/75 leading-relaxed">
                  Demographic profiles (age, gender, education, occupation), projective narrative responses, audio transcriptions, behavioral ratings, and quantitative score summaries.
                </p>
              </div>
            </div>
            <p>
              Candidate clinical records are pseudonymized and associated with secure internal tokens rather than exposed directly across unauthenticated channels.
            </p>
          </section>

          {/* 3. AI Usage & Non-Training Pledge */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">03.</span> AI Data Usage & Non-Training Pledge
            </h2>
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Cpu className="w-5 h-5" />
                Our Strict Zero-Training Commitment
              </div>
              <p className="text-xs sm:text-sm text-text/80 leading-relaxed font-medium">
                <strong>Patient narratives, story responses, and psychological data submitted to CoreTAT are NEVER used to train, retrain, or fine-tune public foundation models.</strong>
              </p>
              <p className="text-xs sm:text-sm text-text/70 leading-relaxed">
                Narrative text sent to our specialized inference pipelines (including local Ollama nodes and secure LLM processors) is handled via stateless API inference. Data resides in secure transit and is discarded from model memory immediately upon completion of analytical scoring.
              </p>
            </div>
          </section>

          {/* 4. Security Architecture */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">04.</span> Security Architecture & Encryption Standards
            </h2>
            <p>
              We implement comprehensive technical and organizational safeguards designed to protect psychological records from unauthorized access, accidental alteration, or disclosure:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>In-Transit Encryption:</strong> All communications between your browser, our client web portal, and backend REST APIs are strictly encrypted using TLS 1.3 protocols.</li>
              <li><strong>Storage Encryption:</strong> Database records and uploaded clinical documents are protected using enterprise-grade AES-256 encryption at rest.</li>
              <li><strong>Multi-Tenant Role Isolation:</strong> Rigorous database-level foreign key and tenant scoping guarantees that clinics, enterprise organizations, and individual psychologists access only data to which they are explicitly authorized.</li>
              <li><strong>Immutable Audit Trails:</strong> Sensitive operations — such as generating assessment links, modifying patient reports, or approving verification documents — are permanently captured in our structured audit log table.</li>
            </ul>
          </section>

          {/* 5. Third-Party Integrations */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">05.</span> Authorized Third-Party Subprocessors
            </h2>
            <p>
              To maintain reliable platform operations, CoreTAT integrates with trusted, specialized subprocessors bound by strict data protection agreements:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Razorpay:</strong> PCI-DSS Level 1 compliant payment gateway handling wallet recharges and financial billing.</li>
              <li><strong>Resend:</strong> Transactional email service utilized solely for dispatches such as password resets and account verification notices.</li>
              <li><strong>Nerotix (eKYC):</strong> Encrypted government ID & RCI credential verification service used during clinical onboarding.</li>
            </ul>
            <p>No psychological test narratives, patient responses, or diagnostic metrics are shared with billing or marketing providers.</p>
          </section>

          {/* 6. User Rights & Data Retention */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">06.</span> Candidate & Practitioner Privacy Rights
            </h2>
            <p>
              In accordance with the Digital Personal Data Protection (DPDP) Act, GDPR principles, and applicable healthcare norms, practitioners and candidates possess specific statutory rights:
            </p>
            <ol className="list-decimal pl-6 space-y-1.5">
              <li><strong>Right to Access:</strong> You may request an exported copy of your registered profile and completed evaluation histories.</li>
              <li><strong>Right to Rectification:</strong> You may update inaccurate demographic or organizational credentials directly within account settings.</li>
              <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Subject to mandatory medical record retention laws governing clinical practitioners, you may petition for permanent deletion of inactive patient records and historical sessions.</li>
            </ol>
          </section>

          {/* 7. Cookies & Tracking */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5 border-b border-border/40 pb-2 font-serif">
              <span className="text-primary font-sans text-lg font-extrabold">07.</span> Cookies & Local Storage
            </h2>
            <p>
              CoreTAT utilizes essential local storage keys and secure session tokens strictly necessary for user authentication, dark/light theme persistence, and active session caching. We do not use third-party advertising tracking cookies or behavioral analytics surveillance.
            </p>
          </section>

          {/* 8. Contact */}
          <section className="space-y-3 pt-4 border-t border-border/40">
            <h2 className="text-xl font-bold text-text flex items-center gap-2 font-serif">
              <Server className="w-5 h-5 text-primary" /> Data Protection Officer & Privacy Desk
            </h2>
            <p className="text-sm text-text/70">
              For inquiries regarding personal data processing, compliance certificates, or to exercise your privacy rights, contact our Data Protection Officer:
            </p>
            <div className="mt-2 p-4 rounded-xl bg-card border border-border/70 text-sm space-y-1">
              <p><strong>Privacy Officer:</strong> CoreTAT Information Security (Zis440)</p>
              <p><strong>Email:</strong> <a href="mailto:contact@coretat.com" className="text-primary underline">contact@coretat.com</a> / <a href="mailto:admin@coretat.com" className="text-primary underline">admin@coretat.com</a></p>
              <p><strong>Lead Engineer Portfolio:</strong> <a href="https://saphalya-das.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://saphalya-das.vercel.app/</a></p>
              <p><strong>Jurisdiction:</strong> West Bengal, India</p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
