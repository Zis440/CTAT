import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function GlobalBackBar() {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-30 pb-4 md:pb-6 pointer-events-none">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer pointer-events-auto px-1 py-1.5 rounded-md"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
    </div>
  );
}
