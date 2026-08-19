import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { LandingNavbar } from "../landing/components/LandingNavbar";
import { Footer } from "../landing/components/FooterSection";

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Terms of Service | PsyicHub - Psychological Intelligence</title>
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
          Terms of Service
        </h1>

        <div className="space-y-8 text-sm md:text-base leading-relaxed font-medium">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              By accessing or using the Psyichub Assessment System ("Psyichub"), you agree to be bound by these Terms. If you do not agree, you must discontinue use immediately.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              2. Nature of the Service
            </h2>
            <p className="text-muted-foreground mb-4">
              Psyichub provides a platform for automated psychological analysis and clinical interpretation modeling for psychological assessments. It is designed to assist, not replace, the clinical judgment of qualified mental health professionals. Outputs are computational interpretations and should not be considered clinical diagnoses.
            </p>
            <p className="text-text/60 italic">
              The Application currently runs as a locally hosted tool with no user
              authentication. It is in an early development stage and is not intended
              for production clinical use.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              3. User Responsibilities
            </h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide accurate and lawful input</li>
              <li>Not misuse the system or attempt unauthorized access to the backend services</li>
              <li>Not represent system outputs as licensed psychological evaluation</li>
              <li>
                Not use outputs for legal, forensic, insurance, employment, or medical
                decision-making purposes
              </li>
            </ul>
            <p className="font-bold pt-2">
              You are solely responsible for how you interpret and use the generated
              results.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              4. Local Operation & Data
            </h2>
            <p>
              The Application operates entirely on your local machine. There is no
              account creation, login system, or remote data storage at this time. All
              data — including patient narratives, analysis results, and exported
              reports — remains on your device.
            </p>
            <p className="text-text/60 italic">
              Future versions may introduce cloud-based services, user accounts, and
              remote storage. These Terms will be updated accordingly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              5. Permitted Use
            </h2>
            <p>The Application may be used for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Academic research</li>
              <li>Educational purposes</li>
              <li>Psychological modeling demonstrations</li>
              <li>Structured narrative exploration</li>
            </ul>
            <p className="font-bold pt-2">
              Commercial or institutional use may require separate authorization.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              6. Intellectual Property
            </h2>
            <p>
              All system components — including algorithms, scoring frameworks, design
              elements, documentation, and analytical architecture — are the
              intellectual property of the developer. Unauthorized reproduction,
              distribution, modification, or reverse engineering is prohibited.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              7. Limitation of Liability
            </h2>
            <p>
              The developer shall not be liable for decisions made based on
              automated outputs, misinterpretation of results, psychological,
              financial, legal, or personal consequences, data loss, or technical
              interruptions. Use of the Application is at your own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              8. No Warranty
            </h2>
            <p>
              The Application is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis without warranties of any kind, including accuracy,
              reliability, completeness, or continuous availability. As a
              locally-hosted development tool, uptime and stability depend on your own
              system environment.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              9. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless the developer from any claims,
              damages, liabilities, or expenses arising from misuse of the Application
              or violation of these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-text border-b-2 border-primary/20 pb-2">
              10. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and interpreted in accordance with
              applicable laws of the relevant jurisdiction where the Application
              operates.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
