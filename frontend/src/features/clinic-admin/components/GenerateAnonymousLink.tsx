import { useState, useEffect } from "react";
import { apiClient } from "@/services/apiClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, Loader2, Copy, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getWalletBalance } from "@/services/walletService";

export function GenerateAnonymousLink() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient.get("/assessments").then(res => setAssessments(res.data)).catch(console.error);
  }, []);

  const handleGenerate = async () => {
    if (!selectedAssessment) {
      toast.error("Please select an assessment.");
      return;
    }

    setIsGenerating(true);
    setGeneratedLink(null);
    try {
      const assessment = assessments.find(a => a.id.toString() === selectedAssessment);
      if (assessment) {
        const price = assessment.clinicPrice || 0;
        if (price > 0) {
          const currentBalance = await getWalletBalance();
          if (currentBalance.balance_rupees < price) {
            toast.error(`Insufficient wallet balance to generate link. (Required: ₹${price.toFixed(2)})`);
            setIsGenerating(false);
            return;
          }
        }
      }
      const res = await apiClient.post("/org/anonymous-links/", {
        assessment_id: parseInt(selectedAssessment),
        expires_in_days: 1
      });

      const token = res.data.token;
      const fullUrl = `${window.location.origin}/assessment/${token}`;
      setGeneratedLink(fullUrl);
      toast.success("Link generated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="col-span-1 border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden mt-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500/40 via-purple-500/20 to-transparent" />
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link className="h-4 w-4 text-purple-500" /> Generate One-Time Link
        </CardTitle>
        <CardDescription>Send a self-administered assessment link directly to a candidate. No account required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Assessment</label>
          <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
            <SelectTrigger>
              <SelectValue placeholder="Choose assessment type..." />
            </SelectTrigger>
            <SelectContent>
              {assessments.filter(a => !a.is_coming_soon).map(a => (
                <SelectItem key={a.id} value={a.id.toString()}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleGenerate}
          disabled={isGenerating || !selectedAssessment}
        >
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Secure Link
        </Button>

        {generatedLink && (
          <div className="mt-4 p-3 rounded-md bg-muted/50 border animate-in fade-in">
            <label className="text-xs text-muted-foreground font-semibold mb-1 block">Your One-Time Link (Valid for 7 days)</label>
            <div className="flex items-center gap-2">
              <Input value={generatedLink} readOnly className="font-mono text-xs bg-background h-8" />
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
