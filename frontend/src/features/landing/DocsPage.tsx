// src/features/landing/DocsPage.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Helmet } from "react-helmet-async";
import { DocsIntroduction, HowToUseGuide } from "./components/DocsSections";
import { LandingNavbar as Navbar } from "./components/LandingNavbar";
import { Footer } from "./components/FooterSection";

export function DocsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = location.pathname.includes("how-to-use") ? "how-to-use" : "about";

  const handleNavigate = (path: string) => {
    navigate(`/${path}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "about":
        return <DocsIntroduction onNavigate={handleNavigate} />;
      case "how-to-use":
        return <HowToUseGuide onNavigate={handleNavigate} />;
      default:
        return <DocsIntroduction onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-text font-sans selection:bg-primary selection:text-background transition-colors duration-300">
      <Helmet>
        <title>
          {activeSection === "how-to-use" ? "User Guide" : "Platform Overview"} | Psyichub
        </title>
      </Helmet>
      <Navbar />

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

      {/* MAIN CONTENT */}
      <main className="flex-1 px-6 py-12 md:py-20 lg:px-10 w-full flex justify-center">
        <div className="max-w-4xl w-full">
          {renderContent()}
        </div>
      </main>

      <Footer />
    </div>
  );
}
