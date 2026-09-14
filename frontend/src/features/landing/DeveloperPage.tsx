import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Mail, Code2, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { LandingNavbar } from "./components/LandingNavbar";
import { Helmet } from "react-helmet-async";
import { Footer } from "./components/FooterSection";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function DeveloperPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Developer | CoreTAT - Psychological Intelligence</title>
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

      <main className="flex-1 container mx-auto px-6 lg:px-10 max-w-5xl py-12 sm:py-20">
        {/* Profile Card */}
        <div className="relative bg-card/60 backdrop-blur-md border-2 border-primary/20 rounded-3xl p-8 sm:p-12 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10">
            {/* Content */}
            <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Product by Zis440
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text font-serif">
                Saphalya Das
              </h1>
              <p className="text-lg font-medium text-primary mt-1">
                Backend & Systems Engineer • Creator of CoreTAT
              </p>

              <p className="mt-4 text-text/80 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
                Engineered the complete architecture of CoreTAT — bridging computational cognitive science,
                deterministic NLP scoring, multi-modal vision pipelines, and resilient distributed microservices for clinical decision support.
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a
                  href="https://saphalya-das.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-background font-bold text-sm shadow-md hover:bg-primary/90 transition-all hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visit Portfolio
                </a>
                <a
                  href="https://github.com/Zis440"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/70 hover:border-primary/40 text-text font-semibold text-sm transition-all hover:bg-muted"
                >
                  <GithubIcon className="w-4 h-4" />
                  GitHub (@Zis440)
                </a>
                <a
                  href="https://www.linkedin.com/in/saphalya-das-81a06b1b3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/70 hover:border-primary/40 text-text font-semibold text-sm transition-all hover:bg-muted"
                >
                  <LinkedinIcon className="w-4 h-4" />
                  LinkedIn
                </a>
                <a
                  href="mailto:szd0238@gmail.com"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background border border-border/70 hover:border-primary/40 text-text font-semibold text-sm transition-all hover:bg-muted"
                >
                  <Mail className="w-4 h-4" />
                  Contact
                </a>
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-8 border-t border-border/50 relative z-10">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-border/40">
              <Code2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-text">CoreTAT Architecture</h4>
                <p className="text-xs text-text/70 mt-1">High-throughput FastAPI backend powering 11 automated psychometric assessment engines.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-border/40">
              <Cpu className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-text">Clinical AI Pipelines</h4>
                <p className="text-xs text-text/70 mt-1">Computer vision and NLP constructs mapping narrative nuances to verified psychological scoring indices.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-border/40">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-text">Secure & Compliant</h4>
                <p className="text-xs text-text/70 mt-1">Enterprise role-based access control, cryptographic verification, and end-to-end clinical data isolation.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
