import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LandingNavbar } from "./components/LandingNavbar";
import { Helmet } from "react-helmet-async";
import { Footer } from "./components/FooterSection";
import { AboutSections } from "./components/AboutSections";

export function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>Our Team | CoreTAT - Psychological Intelligence</title>
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

      <main className="flex-1 container mx-auto px-6 lg:px-10 max-w-[1440px] py-16 sm:py-24">
        <AboutSections />
      </main>

      <Footer />
    </div>
  );
}
