import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, CheckCircle2, Clock, XCircle, ShieldCheck,
  Loader2, ArrowRight, Info, AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Helmet } from "react-helmet-async";
import { getMe } from "@/services/authService";
import {
  getVerificationRequirements,
  getVerificationStatus,
  uploadVerificationDocument,
  submitForVerification,
  initDigilocker,
  digilockerCallback,
  deleteVerificationDocument,
  getRciProfile,
  saveRciProfile,
  removeRciCv
} from "@/services/verificationService";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/providers";
import type {
  DocumentRequirement,
  UploadedDocument,
  VerificationRequirementsResponse,
  VerificationStatusResponse,
  DocumentCategory,
} from "@/types/auth";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; icon: string; order: number }> = {
  business: { label: "Business Documents", icon: "🏢", order: 0 },
  identity: { label: "Identity Documents", icon: "🪪", order: 1 },
  professional: { label: "Professional Documents", icon: "🎓", order: 2 },
  compliance: { label: "Optional Compliance", icon: "📋", order: 3 },
};

const CLINIC_SUBTYPE_LABELS: Record<string, string> = {
  sole_proprietorship: "Proprietorship",
  "sole-proprietorship": "Proprietorship",
  partnership: "Partnership",
  llp: "LLP",
  private_limited: "Private Limited",
  "private-limited": "Private Limited",
  opc: "One Person Company (OPC)",
  public_limited: "Public Limited",
  trust: "Trust",
  society: "Society",
  section_8: "Section 8",
  cooperative: "Co-operative",
  ngo: "NGO / Trust",
  government: "Government",
  other: "Other",
};

function VerificationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
    not_submitted: { label: "Not Submitted", color: "bg-muted text-muted-foreground", icon: ShieldCheck },
    pending: { label: "Under Review", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", icon: Clock },
    approved: { label: "Verified", color: "bg-green-500/10 text-green-600 dark:text-green-400", icon: CheckCircle2 },
    rejected: { label: "Rejected", color: "bg-destructive/10 text-destructive", icon: XCircle },
  };
  const { label, color, icon: Icon } = map[status] || map.not_submitted;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full", color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function VerificationSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      <div className="rounded-xl border border-primary/10 bg-background/85 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-primary/10 rounded" />
            <div className="h-4 w-72 bg-primary/5 rounded" />
          </div>
          <div className="h-7 w-28 bg-primary/10 rounded-full" />
        </div>
        <div className="h-2 w-full bg-primary/10 rounded-full" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-primary/10 bg-background/85 backdrop-blur-xl p-6 space-y-3">
          <div className="h-5 w-40 bg-primary/10 rounded" />
          <div className="h-24 w-full bg-primary/5 rounded-xl border-2 border-dashed border-primary/10" />
        </div>
      ))}
    </div>
  );
}

interface DocumentSlotProps {
  requirement: DocumentRequirement;
  uploadedDoc?: UploadedDocument;
  onUpload: (documentType: string, category: string, file: File) => Promise<void>;
  isUploading: boolean;
  uploadingDocType: string | null;
  onDigilockerClick?: (documentType: string) => void;
  onDelete?: (documentType: string) => Promise<void>;
  isVerifiedAccount?: boolean;
}

function DocumentSlot({ requirement, uploadedDoc, onUpload, isUploading, uploadingDocType, onDigilockerClick, onDelete, isVerifiedAccount }: DocumentSlotProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isThisUploading = isUploading && uploadingDocType === requirement.document_type;
  const isAadhaar = requirement.document_type.includes("aadhaar") || requirement.document_type.includes("government_id");

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`"${file.name}" is not allowed. Use PDF, JPG, or PNG.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }
    onUpload(requirement.document_type, requirement.category, file);
  }, [onUpload, requirement]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-primary/10 bg-background/60 p-4 space-y-2.5"
    >

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary/60 shrink-0" />
          <span className="text-sm font-bold text-text truncate">{requirement.label}</span>
          {requirement.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="shrink-0">
                  <Info className="h-3.5 w-3.5 text-text/30 hover:text-text/50 transition-colors" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {requirement.description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          {requirement.is_required ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
              Required
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
              Optional
            </span>
          )}
          {uploadedDoc && <DocStatusBadge status={isVerifiedAccount && uploadedDoc.status === "pending" ? "approved" : uploadedDoc.status} />}
        </div>
      </div>

      {uploadedDoc && uploadedDoc.status !== "rejected" ? (
        uploadedDoc.original_filename === "digilocker_verified" ? (

          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm text-text/80 truncate font-medium">
                Aadhaar Card — Verified via DigiLocker
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 font-bold h-7 px-2"
                disabled={isUploading}
                onClick={() => onDelete?.(requirement.document_type)}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (

          <div className={cn(
            "flex flex-col gap-2 px-3 py-2.5 rounded-lg border",
            uploadedDoc.verification_notes && !isVerifiedAccount ? "bg-amber-500/5 border-amber-500/20" : "bg-green-500/5 border-green-500/10"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {uploadedDoc.verification_notes && !isVerifiedAccount ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                )}
                <span className="text-sm text-text/80 truncate font-medium">
                  {uploadedDoc.original_filename || requirement.document_type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!isVerifiedAccount && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 font-bold h-7 px-2"
                      disabled={isUploading}
                      onClick={() => onDelete?.(requirement.document_type)}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary hover:text-primary/80 font-bold h-7 px-2"
                      disabled={isUploading}
                      onClick={() => inputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </>
                )}
              </div>
            </div>
            {uploadedDoc.verification_notes && !isVerifiedAccount && (
              <div className="pl-6 text-xs text-amber-500/90 font-medium leading-relaxed">
                <span className="font-bold text-amber-500">Automated Verification Failed:</span> {uploadedDoc.verification_notes}
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
            />
          </div>
        )
      ) : (
        <div className="space-y-3">
          {isAadhaar && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary hover:text-white transition-colors"
              onClick={() => onDigilockerClick?.(requirement.document_type)}
              disabled={isUploading}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify Aadhar with DigiLocker
            </Button>
          )}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-5 cursor-pointer text-center transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5"
                : uploadedDoc?.status === "rejected"
                  ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                  : "border-primary/15 hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            {isThisUploading && !isAadhaar ? (
              <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
            ) : isThisUploading && isAadhaar ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin mb-2" />
                <span className="text-xs text-primary font-medium">Waiting for DigiLocker...</span>
              </div>
            ) : (
              <>
                {uploadedDoc?.status === "rejected" && (
                  <div className="flex flex-col items-center justify-center gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-bold text-destructive">Rejected — please re-upload</span>
                    </div>
                    {uploadedDoc.verification_notes && (
                      <span className="text-[11px] text-destructive/80 text-center max-w-[90%]">
                        {uploadedDoc.verification_notes}
                      </span>
                    )}
                  </div>
                )}
                <Upload className={cn("h-5 w-5 mx-auto mb-1.5", isDragging ? "text-primary" : "text-primary/40")} />
                <p className="font-medium text-xs text-text/60">
                  {isDragging ? "Drop file here" : "Click or drag to upload manually"}
                </p>
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-[10px] font-medium text-text/50">
                    PDF, JPG, PNG · Max {MAX_FILE_SIZE_MB}MB
                  </p>
                  <p className="text-[10px] text-text/40 px-4 leading-snug">
                    Ensure the document is well-lit, all text is clearly legible (not blurry), and the file is not password-protected.
                  </p>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RciProfileSection() {
  const { user, setUser } = useAuthStore();
  const [bio, setBio] = useState("");
  const [cvFilename, setCvFilename] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [initialBio, setInitialBio] = useState("");
  const [initialCvFilename, setInitialCvFilename] = useState<string | null>(null);

  const isApproved = user?.verification_status === "approved";

  useEffect(() => {
    getRciProfile()
      .then((data) => {
        setBio(data.bio || "");
        setInitialBio(data.bio || "");
        setCvFilename(data.cv_filename);
        setInitialCvFilename(data.cv_filename);
      })
      .catch((err) => console.error("Failed to load RCI profile", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    const originalFileName = cvFile?.name ?? null;
    try {
      setIsSaving(true);
      const res = await saveRciProfile(cvFile || undefined, bio);
      toast.success("Profile submitted for review!");

      setCvFilename(originalFileName ?? res.cv_filename);
      setInitialCvFilename(originalFileName ?? res.cv_filename);
      setInitialBio(bio);
      setCvFile(null);
      setFileInputKey(k => k + 1);

      if (user) {
        setUser({
          ...user,
          bio: res.bio || undefined,
          cv_path: res.cv_uploaded ? (res.cv_filename || "uploaded") : undefined,
          verification_status: res.verification_status || user.verification_status
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(file.type)) {
      toast.error("Please upload a PDF or Word document for your CV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    setCvFile(file);
  };

  const handleRemoveCv = async () => {
    try {
      setIsRemoving(true);
      await removeRciCv();
      setCvFilename(null);
      setCvFile(null);
      setFileInputKey(k => k + 1);
      if (user) {
        setUser({ ...user, cv_path: undefined });
      }
      toast.success("CV removed successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to remove CV.");
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-primary/10">
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-xl shadow-primary/5 dark:shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Report Reviewer Profile</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {user?.verification_status === "approved" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> RCI Reviewer — Approved
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                Optional
              </span>
            </div>
          </div>
          <p className="text-sm text-text/60 leading-relaxed">
            {user?.verification_status === "approved"
              ? "You are an approved RCI Reviewer. You can update your bio or CV below — changes will require re-approval from an admin."
              : "Submit your professional bio and CV to join the PsyicHub Report Reviewer Network. This is completely optional and is only used if you wish to review and sign off on automated assessment reports for organizations. You can still get your account fully verified and use all core platform features without submitting this."}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Professional Bio</Label>
          <Textarea
            placeholder="A short professional bio (max 1000 characters)..."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 1000))}
            className="min-h-[100px] resize-none"
          />
          <div className="text-xs text-text/40 text-right">{bio.length} / 1000</div>
        </div>

        <div className="space-y-2">
          <Label>Curriculum Vitae (CV)</Label>
          <div className="flex flex-col gap-3">
            {cvFilename && !cvFile && (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm truncate">{cvFilename}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    disabled={isRemoving}
                    className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                  >
                    {isRemoving ? "Removing..." : "Remove"}
                  </button>
                  <Badge variant="outline" className="bg-primary/5">Uploaded</Badge>
                </div>
              </div>
            )}
            {cvFile && (
              <div className="flex items-center justify-between p-3 border rounded-md bg-amber-500/10 border-amber-500/20">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-sm truncate text-amber-700">{cvFile.name}</span>
                </div>
                <span className="text-xs font-semibold text-amber-600">Pending Save</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="relative cursor-pointer" type="button">
                {cvFilename || cvFile ? "Replace CV" : "Upload CV"}
                <input
                  key={fileInputKey}
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                />
              </Button>
              <span className="text-xs text-text/40">PDF or DOCX, max 10MB</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSaving || (bio === initialBio && !cvFile && cvFilename === initialCvFilename)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving
                  ? "Submitting..."
                  : isApproved
                    ? "Update Profile"
                    : cvFilename
                      ? "Resubmit for Verification"
                      : "Submit for Verification"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isApproved ? "Update RCI Reviewer Profile?" : "Submit for RCI Reviewer Verification?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isApproved ? (
                    <>
                      Saving these changes will update your RCI Reviewer profile. Your account will be set back to <strong>Pending Review</strong> until an admin re-approves your updated profile.
                      <br /><br />
                      Note: Your existing reviewer access remains active until a decision is made.
                    </>
                  ) : (
                    <>
                      This will submit your CV and Bio to the PsyicHub admin for review to join the <strong>Report Reviewer Network</strong>.
                      Your account verification status will be set to <strong>Pending</strong> while an admin reviews your profile.
                      <br /><br />
                      Note: You can still run all regular assessments and sessions during this review period. Only the report reviewer access will be pending.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSave}>Confirm & Submit</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocVerificationPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  useTheme();

  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<VerificationRequirementsResponse | null>(null);
  const [statusData, setStatusData] = useState<VerificationStatusResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const toggleCategory = useCallback((cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [reqs, status, freshUser] = await Promise.all([
          getVerificationRequirements(),
          getVerificationStatus(),
          getMe(),
        ]);
        if (cancelled) return;
        setRequirements(reqs);
        setStatusData(status);

        setUser({ ...freshUser, verification_status: status.verification_status as typeof freshUser.verification_status });
      } catch (err) {
        if (!cancelled) toast.error("Failed to load verification requirements.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleUpload = useCallback(async (documentType: string, category: string, file: File) => {
    setIsUploading(true);
    setUploadingDocType(documentType);
    try {
      await uploadVerificationDocument(documentType, category, file);

      const freshStatus = await getVerificationStatus();
      setStatusData(freshStatus);
      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadingDocType(null);
    }
  }, []);

  const handleDigilockerClick = useCallback(async (documentType: string) => {
    setIsUploading(true);
    setUploadingDocType(documentType);
    let popup: Window | null = null;
    let checkClosed: number;
    let resolved = false;

    try {
      const initRes = await initDigilocker();
      if (!initRes.success || !initRes.url) {
        throw new Error("Failed to initialize DigiLocker");
      }

      const refId = initRes.reference_id || (initRes as any).ref_id;
      const txnId = initRes.txn_id;

      const tryCompleteVerification = async (rid: string) => {
        if (resolved) return;
        resolved = true;
        try {
          await digilockerCallback({
            ref_id: rid,
            txn_id: txnId,
            target_document_type: documentType,
          });
          toast.success("DigiLocker verification successful!");
          const freshStatus = await getVerificationStatus();
          setStatusData(freshStatus);
        } catch (err: any) {
          toast.error(err?.response?.data?.detail || "DigiLocker verification could not be completed. Please try again.");
        } finally {
          setIsUploading(false);
          setUploadingDocType(null);
        }
      };

      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      popup = window.open(
        initRes.url,
        "DigiLocker Verification",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const messageListener = async (event: MessageEvent) => {
        const data = event.data;
        if (data?.type === "DIGILOCKER_SUCCESS" && data?.ref_id) {
          window.removeEventListener("message", messageListener);
          window.clearInterval(checkClosed);
          popup?.close();
          await tryCompleteVerification(data.ref_id);
        } else if (data?.type === "DIGILOCKER_ERROR") {
          window.removeEventListener("message", messageListener);
          window.clearInterval(checkClosed);
          popup?.close();
          resolved = true;
          toast.error("DigiLocker verification failed or was cancelled.");
          setIsUploading(false);
          setUploadingDocType(null);
        }
      };

      window.addEventListener("message", messageListener);

      checkClosed = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          if (!resolved && refId) {

            tryCompleteVerification(String(refId));
          } else if (!resolved) {
            setIsUploading(false);
            setUploadingDocType(null);
          }
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || "Failed to start DigiLocker");
      setIsUploading(false);
      setUploadingDocType(null);
    }
  }, []);

  const handleDelete = useCallback(async (documentType: string) => {
    setIsUploading(true);
    setUploadingDocType(documentType);
    try {
      await deleteVerificationDocument(documentType);
      const freshStatus = await getVerificationStatus();
      setStatusData(freshStatus);
      toast.success("Document removed.");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove document.");
    } finally {
      setIsUploading(false);
      setUploadingDocType(null);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await submitForVerification();
      toast.success(res.message);

      if (user) setUser({ ...user, verification_status: "pending" });
      const freshStatus = await getVerificationStatus();
      setStatusData(freshStatus);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, setUser]);

  const verificationStatus = statusData?.verification_status || user?.verification_status || "not_submitted";
  const allRequirements = requirements ? [...requirements.required, ...requirements.optional] : [];
  const uploadedMap = new Map(statusData?.documents.map(d => [d.document_type, d]) || []);

  const requiredCount = statusData?.required_count || 0;
  const uploadedRequiredCount = statusData?.uploaded_required_count || 0;
  const progressPercent = requiredCount > 0 ? Math.round((uploadedRequiredCount / requiredCount) * 100) : 0;

  const groupedRequirements = allRequirements.reduce<Record<string, DocumentRequirement[]>>((acc, req) => {
    if (!acc[req.category]) acc[req.category] = [];
    acc[req.category].push(req);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedRequirements).sort(
    (a, b) => (CATEGORY_CONFIG[a as DocumentCategory]?.order || 0) - (CATEGORY_CONFIG[b as DocumentCategory]?.order || 0)
  );

  const getDashboardRoute = () => {
    if (!user) return "/dashboard";
    if (user.role === "super_admin") return "/admin";
    if (user.role === "clinic_admin") return "/clinic/dashboard";
    if (user.role === "clinic_staff") return "/clinic-staff/dashboard";
    if (user.role === "org_admin") return "/org/dashboard";
    if (user.role === "org_staff") return "/org-staff/dashboard";
    return "/dashboard";
  };

  const isAutoVerifiedStaff =
    user?.role === "clinic_staff" || user?.role === "org_staff";

  if (isAutoVerifiedStaff) {
    const staffLabel =
      user?.role === "clinic_staff" ? "Clinic Staff" : "Organization Staff";
    const parentName = user?.clinic_name || "your organization";
    const parentType =
      user?.role === "clinic_staff" ? "clinic" : "organization";
    const joinedDate = user?.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : null;

    return (
      <div className="container py-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <Helmet>
          <title>Verification | PsyicHub - Psychological Intelligence</title>
        </Helmet>

        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Account Verification
          </h1>
          <p className="text-muted-foreground">
            Your account has been automatically verified by your administrator.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full space-y-6"
        >

          <Card className="border-green-500/20 bg-green-500/5 shadow-xl dark:shadow-sm">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center ring-4 ring-green-500/20">
                <ShieldCheck className="h-10 w-10 text-green-500" />
              </div>

              <div className="text-center space-y-1">
                <p className="font-extrabold text-xl text-text">
                  Auto-Verified
                </p>
                <p className="text-sm text-text/60 max-w-md leading-relaxed">
                  Your account was automatically verified when it was created by
                  your {parentType} administrator. No document submission is
                  required.
                </p>
              </div>

              <div className="w-full max-w-sm mt-2 rounded-xl border border-green-500/15 bg-background/60 backdrop-blur-sm divide-y divide-green-500/10">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    Role
                  </span>
                  <span className="text-sm font-bold text-text/80">
                    {staffLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    {parentType === "clinic" ? "Clinic" : "Organization"}
                  </span>
                  <span className="text-sm font-bold text-text/80 truncate max-w-[200px]">
                    {parentName}
                  </span>
                </div>

                {joinedDate && (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                      Member Since
                    </span>
                    <span className="text-sm font-medium text-text/70">
                      {joinedDate}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-text/50">
                    Assessment
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full",
                      user?.can_assess
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {user?.can_assess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Authorized
                      </>
                    ) : (
                      "Not Authorized"
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10 max-w-sm">
                <Info className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                <p className="text-xs text-text/50 leading-relaxed">
                  Your verification and assessment permissions are managed by
                  your {parentType} administrator. Contact them if you need
                  changes.
                </p>
              </div>

              <div className="w-full flex justify-end mt-8 px-2">
                <Button
                  onClick={() => navigate(getDashboardRoute())}
                  className="bg-primary hover:bg-primary/90 text-background font-bold"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <Helmet>
        <title>Verification | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Account Verification</h1>
        <p className="text-muted-foreground">
          {user?.verification_status === "approved" ? (
            "Your account has been fully verified and you have full platform access."
          ) : user?.verification_status === "pending" ? (
            "Your documents have been submitted and are currently under review."
          ) : requirements?.account_type === "clinic" && requirements?.clinic_subtype ? (
            <>
              Upload documents for your{" "}
              <span className="font-bold text-primary">
                {CLINIC_SUBTYPE_LABELS[requirements.clinic_subtype] || requirements.clinic_subtype}
              </span>{" "}
              clinic to unlock full platform access.
            </>
          ) : (
            "Upload your professional documents to unlock full platform access."
          )}
        </p>
      </div>

      {loading ? (
        <div className="mt-16">
          <VerificationSkeleton />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full space-y-6"
        >

          {verificationStatus !== "approved" && (
            <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-xl shadow-primary/5 dark:shadow-sm mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Verification Progress</CardTitle>
                  <VerificationStatusBadge status={verificationStatus} />
                </div>
              </CardHeader>
              <CardContent>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text/60">
                      {uploadedRequiredCount} of {requiredCount} required document{requiredCount === 1 ? '' : 's'} uploaded
                    </span>
                    <span className="font-bold text-primary">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <AnimatePresence mode="wait">
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {verificationStatus === "approved" && (
                <Card className="border-green-500/20 bg-green-500/5 shadow-xl dark:shadow-sm mb-6">
                  <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-text">You're verified!</p>
                      <p className="text-sm text-text/60 mt-1">Full platform access has been granted.</p>
                    </div>
                    <Button
                      onClick={() => navigate(getDashboardRoute())}
                      className="bg-primary hover:bg-primary/90 text-background font-bold mt-2"
                    >
                      Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {verificationStatus === "pending" && (
                <Card className="border-yellow-500/20 bg-yellow-500/5 shadow-xl dark:shadow-sm mb-6">
                  <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-text">Verification in progress</p>
                      <p className="text-sm text-text/60 mt-1">
                        Our team will review your documents within 1–2 business days.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(getDashboardRoute())}
                      className="border-primary/15 font-bold mt-2"
                    >
                      Continue to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {sortedCategories.map((cat) => {
                const config = CATEGORY_CONFIG[cat as DocumentCategory];
                const docs = groupedRequirements[cat];
                if (!docs?.length) return null;

                const isCollapsed = collapsedCategories[cat];
                return (
                  <Card key={cat} className="p-0 gap-0 border-primary/10 bg-background/85 backdrop-blur-xl shadow-xl shadow-primary/5 dark:shadow-sm overflow-hidden">
                    <CardHeader
                      className={cn("p-4 cursor-pointer select-none transition-colors hover:bg-primary/5 rounded-t-xl", isCollapsed ? "rounded-b-xl" : "pb-2")}
                      onClick={() => toggleCategory(cat)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-text flex items-center gap-2">
                          <span className="text-lg">{config?.icon}</span>
                          {config?.label || cat}
                        </CardTitle>
                        {isCollapsed ? (
                          <ChevronDown className="h-5 w-5 text-text/50 transition-transform" />
                        ) : (
                          <ChevronUp className="h-5 w-5 text-text/50 transition-transform" />
                        )}
                      </div>
                    </CardHeader>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <CardContent className="px-4 pb-4 pt-2 space-y-3">
                            {docs.map((req) => (
                              <DocumentSlot
                                key={req.document_type}
                                requirement={req}
                                uploadedDoc={uploadedMap.get(req.document_type)}
                                onUpload={handleUpload}
                                isUploading={isUploading}
                                uploadingDocType={uploadingDocType}
                                onDigilockerClick={handleDigilockerClick}
                                onDelete={handleDelete}
                                isVerifiedAccount={verificationStatus === "approved"}
                              />
                            ))}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}

              {user?.account_type === "individual" && user?.rci_number && (
                <RciProfileSection />
              )}

              {verificationStatus !== "pending" && verificationStatus !== "approved" && (
                <Card className="border-primary/10 bg-background/85 backdrop-blur-xl shadow-xl shadow-primary/5 dark:shadow-sm">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !statusData?.can_submit_review}
                        className="flex-1 bg-primary hover:bg-primary/90 text-background font-bold shadow-lg shadow-primary/20 h-11"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Submit for Verification
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigate(getDashboardRoute())}
                        className="text-text/50 hover:text-text/70 font-bold"
                      >
                        Skip for now
                      </Button>
                    </div>
                    {!statusData?.can_submit_review && uploadedRequiredCount < requiredCount && (
                      <p className="text-xs text-text/40 text-center">
                        {requiredCount === 1
                          ? "Upload the required document to enable submission."
                          : `Upload all ${requiredCount} required documents to enable submission.`}
                      </p>
                    )}
                    <p className="text-xs text-text/30 text-center leading-relaxed">
                      You can continue using the platform while verification is pending. Some features
                      may be limited until your account is approved.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
