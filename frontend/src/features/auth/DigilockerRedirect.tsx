import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function DigilockerRedirect() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // The Nerotix DigiLocker redirect page usually passes ref_id and status in the query params.
    const ref_id = searchParams.get("ref_id");
    const status = searchParams.get("status");
    const error = searchParams.get("error");

    if (window.opener) {
      if (ref_id && status === "success") {
        window.opener.postMessage({ type: "DIGILOCKER_SUCCESS", ref_id }, "*");
      } else {
        window.opener.postMessage({ type: "DIGILOCKER_ERROR", error }, "*");
      }
      
      // Close the window after sending the message
      setTimeout(() => {
        window.close();
      }, 500);
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      <h2 className="text-lg font-bold text-text">Verifying with DigiLocker...</h2>
      <p className="text-text/60 text-sm mt-2">Please wait while we complete your verification.</p>
      <p className="text-text/40 text-xs mt-4">This window will close automatically.</p>
    </div>
  );
}
