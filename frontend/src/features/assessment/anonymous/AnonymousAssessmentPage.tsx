import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/services/apiClient";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AnonymousNIAssessment } from "./AnonymousNIAssessment";
import { AnonymousEMHWAssessment } from "./AnonymousEMHWAssessment";

interface ValidationResponse {
  valid: boolean;
  assessment_name: string;
  assessment_id: number;
  org_id: string;
  patient?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  selected_cards?: string[];
  request_validation?: boolean;
  consent_given?: boolean;
}

export function AnonymousAssessmentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<{ id: string, filename: string }[]>([]);
  const [hasConsent, setHasConsent] = useState(false);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No token provided.");
      setIsLoading(false);
      return;
    }

    apiClient.get<ValidationResponse>(`/anonymous/validate/${token}`)
      .then(res => {
        setValidation(res.data);
        setHasConsent(res.data.consent_given || false);
        if (res.data.assessment_name.includes("Narrative Intelligence")) {
          apiClient.get<{ id: string, filename: string }[]>("/cards")
            .then(cardRes => {
              if (res.data.selected_cards && res.data.selected_cards.length > 0) {
                setCards(cardRes.data.filter(c => res.data.selected_cards!.includes(c.id)));
              } else {
                setCards(cardRes.data);
              }
            })
            .catch(console.error);
        }
      })
      .catch(err => {
        setError(err.response?.data?.detail || "Invalid or expired link.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Validating secure link...</p>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet><title>Invalid Link | PsyicHub - Psychological Intelligence</title></Helmet>
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">{error || "The assessment link is no longer active."}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEMHW = validation.assessment_name.includes("Employee Mental Health") || validation.assessment_name.includes("Screening");

  const handleComplete = () => {

  };

  const handleConsentSubmit = async () => {
    if (!agreedToTerms) return;
    setIsSubmittingConsent(true);
    try {
      await apiClient.post(`/anonymous/consent/${token}`);
      setHasConsent(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to record consent.");
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  if (!hasConsent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Helmet><title>Assessment Consent | PsyicHub</title></Helmet>
        <Card className="w-full max-w-lg border-primary/20">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Data Privacy & Consent</CardTitle>
            <CardDescription>
              Please read and accept the following terms before beginning the {validation.assessment_name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-muted-foreground space-y-4">
              <p>
                By proceeding with this remote assessment, you acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your responses will be securely stored and analyzed by the issuing organization.</li>
                <li>Your IP address and the timestamp of this consent will be recorded for compliance purposes.</li>
                <li>The results generated may be used to inform clinical or organizational insights.</li>
              </ul>
            </div>

            <div className="flex items-start space-x-3 pt-4 border-t">
              <Checkbox
                id="consent"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have read and agree to the data collection and privacy terms.
              </label>
            </div>

            <Button
              className="w-full"
              disabled={!agreedToTerms || isSubmittingConsent}
              onClick={handleConsentSubmit}
            >
              {isSubmittingConsent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording Consent...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  I Agree & Continue
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{validation.assessment_name} | PsyicHub</title></Helmet>
      {isEMHW ? (
        <AnonymousEMHWAssessment token={token!} validation={validation} onComplete={handleComplete} />
      ) : (
        <AnonymousNIAssessment token={token!} validation={validation} cards={cards} onComplete={handleComplete} />
      )}
    </>
  );
}
