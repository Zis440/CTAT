import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { apiClient } from "@/services/apiClient";
import { getDashboardRoute } from "@/lib/routeUtils";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

export function PsychologistApplyPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  
  const [rciLicense, setRciLicense] = useState<File | null>(null);
  const [eSignature, setESignature] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const rciInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`"${file.name}" is not allowed. Use PDF, JPG, or PNG.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }
    setter(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!rciLicense || !eSignature) {
      toast.error("Please upload both your RCI License and E-Signature to continue.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rci_license", rciLicense);
      formData.append("e_signature", eSignature);
      
      const response = await apiClient.post("/api/individual/apply", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });
      
      toast.success(response.data.message || "Application submitted successfully!");
      if (user) {
        setUser({ ...user, verification_status: "pending" });
      }
      navigate("/settings");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guard: only RCI-certificated Clinical Psychologists can apply
  const isEligible = user?.professional_domain === "Clinical Psychologist" && !!user?.rci_number;

  if (!isEligible) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/10">
          <CardHeader className="text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Not Eligible</CardTitle>
            <CardDescription>
              Only RCI-certificated Clinical Psychologists are eligible for the Psyichub Verified Psychologist program.
              Your professional domain is listed as "{user?.professional_domain || "Not specified"}".
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate(getDashboardRoute(user?.role || "individual_psychologist"))} className="font-bold">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user?.verification_status === "pending" || user?.verification_status === "approved") {
    const isApproved = user.verification_status === "approved";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/10">
          <CardHeader className="text-center">
            <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>{isApproved ? "RCI Psychologist Verified" : "Application Under Review"}</CardTitle>
            <CardDescription>
              {isApproved 
                ? "You are already verified as an RCI Psychologist!" 
                : "Your verification status is currently pending. Our team is reviewing your documents."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate(getDashboardRoute(user?.role || "individual_psychologist"))} className="font-bold">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Helmet>
        <title>Apply for PsyicHub - Psychological Intelligence's RCI Verified Psychologist</title>
      </Helmet>

      <div className="space-y-8 w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            Apply for Psyichub's RCI Verified Psychologist
          </h1>
          <p className="text-text/60 text-sm">
            Join our network of verified clinical psychologists. Please upload your credentials below.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RCI License Upload */}
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-text flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                RCI License
              </CardTitle>
              <CardDescription className="text-text/50 text-sm">
                A clear scan or photo of your Rehabilitation Council of India registration certificate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rciLicense ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-bold text-text/80 truncate max-w-[200px]">
                      {rciLicense.name}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => rciInputRef.current?.click()} className="text-primary font-bold">
                    Replace
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => rciInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/15 hover:border-primary/40 hover:bg-primary/5 rounded-xl p-8 cursor-pointer text-center transition-all duration-200"
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-primary/40" />
                  <p className="font-bold text-sm text-text/60 mb-1">Click to upload RCI License</p>
                  <p className="text-xs text-text/40">PDF, JPG, PNG (Max 5MB)</p>
                </div>
              )}
              <input type="file" ref={rciInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, setRciLicense)} />
            </CardContent>
          </Card>

          {/* E-Signature Upload */}
          <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-text flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                E-Signature
              </CardTitle>
              <CardDescription className="text-text/50 text-sm">
                A clear image of your signature on a white background. This will be automatically appended to your clinical reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eSignature ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-bold text-text/80 truncate max-w-[200px]">
                      {eSignature.name}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => sigInputRef.current?.click()} className="text-primary font-bold">
                    Replace
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => sigInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/15 hover:border-primary/40 hover:bg-primary/5 rounded-xl p-8 cursor-pointer text-center transition-all duration-200"
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-primary/40" />
                  <p className="font-bold text-sm text-text/60 mb-1">Click to upload E-Signature</p>
                  <p className="text-xs text-text/40">PNG, JPG (Max 5MB)</p>
                </div>
              )}
              <input type="file" ref={sigInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, setESignature)} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/10 bg-background/80 backdrop-blur-sm mt-6">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-text/60 max-w-md">
                By submitting this application, you confirm that the provided documents are authentic and belong to you.
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !rciLicense || !eSignature}
              className="bg-primary hover:bg-primary/90 text-background font-bold px-8"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Submit Application
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
