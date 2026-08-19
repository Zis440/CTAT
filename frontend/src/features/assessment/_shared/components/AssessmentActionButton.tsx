import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, FileText, Share2, Play, RefreshCw, Eye } from "lucide-react";

export type AssessmentActionVariant = 
  | "validate"
  | "download"
  | "share"
  | "start"
  | "resume"
  | "view";

interface AssessmentActionButtonProps {
  variant: AssessmentActionVariant;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  price?: number;
}

export function AssessmentActionButton({
  variant,
  onClick,
  isLoading,
  disabled,
  label,
  price,
}: AssessmentActionButtonProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case "validate":
        return {
          icon: ShieldCheck,
          defaultLabel: price ? `Verify With Psychologist (₹${price})` : "Verify With Psychologist",
          btnVariant: "outline" as const,
          className: "bg-background text-foreground border-border shadow-sm hover:bg-muted",
        };
      case "download":
        return {
          icon: FileText,
          defaultLabel: "Download PDF Report",
          btnVariant: "default" as const,
          className: "bg-primary/10 text-primary hover:bg-primary/20 rounded-md shadow-sm border border-primary/20",
        };
      case "share":
        return {
          icon: Share2,
          defaultLabel: "Share Assessment",
          btnVariant: "outline" as const,
          className: "bg-background text-foreground border-border shadow-sm hover:bg-muted",
        };
      case "start":
        return {
          icon: Play,
          defaultLabel: "Start Assessment",
          btnVariant: "default" as const,
          className: "",
        };
      case "resume":
        return {
          icon: RefreshCw,
          defaultLabel: "Resume Assessment",
          btnVariant: "secondary" as const,
          className: "",
        };
      case "view":
        return {
          icon: Eye,
          defaultLabel: "View Report",
          btnVariant: "outline" as const,
          className: "",
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  return (
    <Button
      variant={config.btnVariant}
      className={config.className}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Icon className="w-4 h-4 mr-2" />
      )}
      {label || config.defaultLabel}
    </Button>
  );
}
