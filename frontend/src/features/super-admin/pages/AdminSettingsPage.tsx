import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { User, Camera, Mail, Phone, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { getMediaUrl } from "@/lib/utils";
import { updateProfile } from "@/services/authService";

export function AdminSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    email: user?.email || "",
    phone: user?.phone || "",
    name: [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Super Admin",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        phone: profileData.phone,
        email: profileData.email,
      });
      setUser(updated);
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Settings  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Manage global configurations, notifications, and WhatsApp integrations.</p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden bg-background/60 backdrop-blur-md rounded-2xl relative pt-0 gap-0">
            <div className="w-full flex justify-center pt-10 pb-6 bg-gradient-to-br from-primary/10 via-background to-primary/5">

              <div className="relative group/logo">
                <div className="h-32 w-32 rounded-full border-4 border-background bg-card shadow-xl overflow-hidden flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img src={getMediaUrl(user.avatar_url)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground/40" />
                  )}
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300 rounded-full flex flex-col items-center justify-center cursor-pointer">
                  <Camera className="h-8 w-8 text-white drop-shadow-md" />
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
                      <User className="h-4 w-4 text-primary" /> Admin Name
                    </Label>
                    <Input
                      value={profileData.name}
                      disabled
                      className="h-12 text-lg bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                      <Mail className="h-4 w-4 text-primary" /> Email Address
                    </Label>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="superadmin@psyichub.com"
                      className="h-12 bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                      <Phone className="h-4 w-4 text-primary" /> Phone Number
                    </Label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="h-12 bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                    />
                  </div>
                </div>
              </motion.div>

              <div className="mt-12 flex justify-end">
                <Button
                  size="lg"
                  className="rounded-full px-8 shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all text-white dark:text-black"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Profile Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
