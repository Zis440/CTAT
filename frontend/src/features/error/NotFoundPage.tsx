import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MessageSquareWarning, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getDashboardRoute, getSupportRoute } from "@/lib/routeUtils";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative font-mono text-zinc-400 p-4">
      <Helmet>
        <title>404 - Page Not Found | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 z-0 opacity-10" 
        style={{
          backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        <div className="border border-zinc-800/60 bg-[#111111]/80 backdrop-blur-sm rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
          
          <div className="w-16 h-16 bg-zinc-800/80 rounded-2xl flex items-center justify-center mb-6 border border-zinc-700/50 shadow-inner">
            <AlertCircle className="w-8 h-8 text-zinc-300" strokeWidth={1.5} />
          </div>

          <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">404</h1>
          <h2 className="text-2xl font-bold text-primary mb-6">Page Not Found</h2>

          <p className="text-sm text-zinc-300 leading-relaxed mb-10 max-w-md font-sans">
            The requested URL was not found on this server. Please check the address or return to the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-center mb-12 font-sans">
            <button
              onClick={() => navigate(getDashboardRoute(user?.role))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded text-sm font-semibold transition-colors shadow-lg shadow-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate(getSupportRoute(user?.role))}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-transparent hover:bg-zinc-800/50 border border-zinc-700 text-white px-6 py-3 rounded text-sm font-semibold transition-colors"
            >
              <MessageSquareWarning className="w-4 h-4" />
              Contact Support
            </button>
          </div>

          <div className="w-full flex justify-between items-center text-[10px] uppercase tracking-wider text-zinc-600 border-t border-zinc-800/60 pt-6 mt-4">
            <span>ERROR CODE: 404_NOT_FOUND</span>
            <span>SYS_TIME: {new Date().toISOString().split('.')[0].replace('T', ' ')} UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
