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
        {/* <TabsList className="bg-background/50 border border-border/50 gap-2">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
        </TabsList> */}

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden bg-background/60 backdrop-blur-md rounded-2xl relative pt-0 gap-0">
            <div className="w-full flex justify-center pt-10 pb-6 bg-gradient-to-br from-primary/10 via-background to-primary/5">
              {/* Profile Logo Avatar */}
              <div className="relative group/logo">
                <div className="h-32 w-32 rounded-full border-4 border-background bg-card shadow-xl overflow-hidden flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img src={getMediaUrl(user.avatar_url)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground/40" />
                  )}
                </div>

                {/* Logo Overlay & Upload Button */}
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

        {/* Notifications Tab
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Notification Toggles</CardTitle>
              <CardDescription>Manage how you receive updates and alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-4 p-4 border border-border/50 rounded-xl bg-background/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <Label className="text-base font-bold">Email Notification</Label>
                    <p className="text-sm text-muted-foreground">Receive daily summaries and alerts via Email.</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/50 pt-6">
              <Button onClick={handleSave} disabled={isSaving} className="text-white dark:text-black">
                {isSaving ? "Saving..." : "Save Notification Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        */}

        {/* WhatsApp Configuration Tab
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="border-primary/10 bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>WhatsApp SMS Configuration</CardTitle>
              <CardDescription>Choose your preferred method for sending automated WhatsApp messages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className={`flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4 p-4 border-2 rounded-xl transition-colors cursor-pointer ${whatsappConfig === 'cloud_api' ? 'border-primary bg-primary/5' : 'border-border/50 bg-background/50 hover:border-primary/50'}`}
                onClick={() => setWhatsappConfig("cloud_api")}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center mt-1">
                    <UploadCloud className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-bold cursor-pointer">Business Cloud API WhatsApp</Label>
                      {whatsappConfig === 'cloud_api' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Use the official Meta Business Cloud API for high reliability and scale.</p>
                    <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-xs text-white dark:text-black font-semibold">
                      Price: ₹0.80 / message
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${whatsappConfig === 'cloud_api' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {whatsappConfig === 'cloud_api' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </div>

              <div
                className={`flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 md:space-x-4 p-4 border-2 rounded-xl transition-colors cursor-pointer ${whatsappConfig === 'node_qr' ? 'border-primary bg-primary/5' : 'border-border/50 bg-background/50 hover:border-primary/50'}`}
                onClick={() => setWhatsappConfig("node_qr")}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center mt-1">
                    <Smartphone className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-bold cursor-pointer">Node QR Code WhatsApp</Label>
                      {whatsappConfig === 'node_qr' && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Link your own WhatsApp account via QR code (using Node.js Baileys or similar).</p>
                    <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-xs text-white dark:text-black font-semibold">
                      Price: Free (Uses your device)
                    </div>

                    {whatsappConfig === 'node_qr' && (
                      <div className="mt-4 p-4 bg-background rounded-lg border border-border flex flex-col items-center justify-center">
                        <div className="w-48 h-48 bg-muted/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center mb-3">
                          <span className="text-sm text-muted-foreground">QR Code Display</span>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Scan this code with your WhatsApp app to link your device.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${whatsappConfig === 'node_qr' ? 'border-primary' : 'border-muted-foreground'}`}>
                    {whatsappConfig === 'node_qr' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-border/50 pt-6">
              <Button onClick={handleSave} disabled={isSaving} className="text-white dark:text-black">
                {isSaving ? "Saving..." : "Save WhatsApp Configuration"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        */}
      </Tabs>
    </div>
  );
}
