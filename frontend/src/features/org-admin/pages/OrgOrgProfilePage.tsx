import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Camera, Save, Mail, Phone, Tag, Building } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getClinicProfile, updateClinicProfile, uploadClinicLogo } from "@/services/clinicService";

export function OrgOrgProfilePage() {
  const queryClient = useQueryClient();
  const fileInputLogoRef = useRef<HTMLInputElement>(null);

  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["clinic-profile"],
    queryFn: getClinicProfile,
  });

  useEffect(() => {
    if (profile) {
      setClinicName(profile.clinic_name || "");
      setTagline(profile.tagline || "");
      setContactEmail(profile.contact_email || "");
      setSupportPhone(profile.support_phone || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateClinicProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-profile"] });
      toast.success("Organization profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: uploadClinicLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-profile"] });
      toast.success("Logo uploaded successfully");
    },
    onError: () => {
      toast.error("Failed to upload logo");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      clinic_name: clinicName,
      tagline: tagline,
      contact_email: contactEmail,
      support_phone: supportPhone,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadLogoMutation.mutate(e.target.files[0]);
    }
  };

  const hasChanges =
    clinicName !== (profile?.clinic_name || "") ||
    tagline !== (profile?.tagline || "") ||
    contactEmail !== (profile?.contact_email || "") ||
    supportPhone !== (profile?.support_phone || "");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading profile data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-12">
      <Helmet>
        <title>Organization Profile  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Organization Profile
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Personalize your organization's brand identity and public information.</p>
      </motion.div>

      <Card className="border-0 shadow-xl overflow-hidden bg-background/60 backdrop-blur-md rounded-2xl relative pt-0 gap-0">
        <div className="w-full flex justify-center pt-10 pb-6 bg-gradient-to-br from-primary/10 via-background to-primary/5">
          {/* Profile Logo Avatar */}
          <div className="relative group/logo">
            <div className="h-32 w-32 rounded-2xl border-4 border-background bg-card shadow-xl overflow-hidden flex items-center justify-center">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-12 w-12 text-muted-foreground/40" />
              )}
            </div>

            {/* Logo Overlay & Upload Button */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center cursor-pointer"
              onClick={() => fileInputLogoRef.current?.click()}>
              <input
                type="file"
                ref={fileInputLogoRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              {uploadLogoMutation.isPending ? (
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              ) : (
                <Camera className="h-8 w-8 text-white drop-shadow-md" />
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-6 pb-8 px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-8 md:grid-cols-2"
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <Building className="h-4 w-4 text-primary" /> Organization Name
                </Label>
                <Input
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="e.g. Psychub Care"
                  className="h-12 text-lg bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <Tag className="h-4 w-4 text-primary" /> Tagline / Motto
                </Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Empowering Mental Wellness"
                  className="h-12 bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <Mail className="h-4 w-4 text-primary" /> Contact Email
                </Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="h-12 bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                  <Phone className="h-4 w-4 text-primary" /> Support Phone
                </Label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="+91 99999 88888"
                  className="h-12 bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </motion.div>

          <div className="mt-12 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="lg"
                  className="rounded-full px-8 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
                  disabled={updateMutation.isPending || !hasChanges}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> {hasChanges ? "Update" : "Up to Date"}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to update the changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will save your organization profile changes and make them visible across the platform.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
