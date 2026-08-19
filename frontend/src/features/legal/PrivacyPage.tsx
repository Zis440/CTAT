import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Privacy Policy | PsyicHub - Psychological Intelligence</title>
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

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h1 className="text-4xl font-bold mb-8 text-primary font-serif">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed font-medium">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              1. Introduction
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              This Privacy Policy describes how the Psyichub Assessment System ("we", "us", or "our")
              collects, uses, and shares your personal information.
            </p>
            <p className="text-muted-foreground text-lg mb-8">
              (&quot;Application&quot;) handles data. The Application currently operates as a
              <strong> locally hosted tool</strong> — all processing happens on your own
              machine. There is no user authentication, no cloud storage, and no remote
              data transmission at this time.
            </p>
            <p className="text-text/60 italic">
              Note: Cloud-based deployment is planned for the future. This policy will
              be updated accordingly when remote services are introduced.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              2. Information Handled
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  A. Information You Provide
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Patient demographics (name/identifier, age, gender — if entered)</li>
                  <li>Narrative responses and story content</li>
                  <li>Any additional textual input submitted for analysis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  B. Automatically Generated Data
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Thematic scoring results</li>
                  <li>Conflict analysis outputs</li>
                  <li>Emotional intensity metrics</li>
                  <li>Behavioral pattern indicators</li>
                  <li>System-generated interpretive summaries</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              3. How Data Is Stored
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                All data is stored <strong>locally on your machine</strong> — in the
                application&apos;s local database and file system.
              </li>
              <li>
                No data is transmitted to external servers, cloud services, or third
                parties under the current architecture.
              </li>
              <li>
                Generated reports (PDF exports) are saved to your local file system only.
              </li>
            </ul>
            <p className="text-text/60 italic pt-2">
              When cloud deployment is introduced in the future, data storage and
              transmission practices will be clearly documented here.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              4. Purpose of Data Processing
            </h2>
            <p>Data is processed solely for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Generating automated narrative and thematic analysis</li>
              <li>Producing clinical-grade scoring dashboards and PDF reports</li>
              <li>Academic research and structured psychological modeling</li>
            </ul>
            <p className="font-bold pt-2">
              No data is sold, shared, or transmitted to any third party.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              5. Third-Party Services
            </h2>
            <p>
              The Application does not transmit data to external third-party services. All analysis and processing are performed locally within the application environment.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              6. No Tracking or Cookies
            </h2>
            <p>
              The Application does not use cookies, analytics trackers, or any form of
              user behavior monitoring. There is no user authentication system — the
              application is open to anyone who runs it locally.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              7. Data Security
            </h2>
            <p>
              Since data resides entirely on your local machine, security is primarily
              governed by your own system&apos;s protections (OS-level permissions,
              disk encryption, etc.). The Application does not implement remote
              authentication or access controls at this stage.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              8. Children&apos;s Privacy
            </h2>
            <p>
              This Application is not intended for unsupervised use by individuals
              under 18 years of age.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              9. Policy Updates
            </h2>
            <p>
              This Privacy Policy may be updated as the Application evolves — particularly
              when cloud deployment, user accounts, or remote data storage features are
              introduced. Continued use of the Application constitutes acceptance of the
              revised policy.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
