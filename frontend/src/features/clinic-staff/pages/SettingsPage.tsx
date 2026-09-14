import { useState } from "react";
import {
  CalendarIcon,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Shield,
  Trash2,
  User,
  X,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getMediaUrl } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/useAuthStore";
import { updateProfile, changePassword, uploadAvatar } from "@/services/authService";
import { useEffect } from "react";

export function SettingsPage() {
  const { user, setUser, markVerificationSeen, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && (user.verification_status === "approved" || user.verification_status === "rejected")) {
      markVerificationSeen(user.verification_status);
    }
  }, [user, markVerificationSeen]);

  const [title, setTitle] = useState(user?.title || "");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    user?.date_of_birth ? new Date(user.date_of_birth) : undefined
  );
  const [gender, setGender] = useState(user?.gender || "male");
  const [designation, setDesignation] = useState(user?.designation || "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const hasProfileChanges =
    title !== (user?.title || "") ||
    firstName !== (user?.first_name || "") ||
    lastName !== (user?.last_name || "") ||
    email !== (user?.email || "") ||
    gender !== (user?.gender || "male") ||
    designation !== (user?.designation || "") ||
    dateOfBirth?.toISOString() !==
    (user?.date_of_birth ? new Date(user.date_of_birth).toISOString() : undefined);

  const handleCancelProfile = () => {
    setTitle(user?.title || "");
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setEmail(user?.email || "");
    setDateOfBirth(user?.date_of_birth ? new Date(user.date_of_birth) : undefined);
    setGender(user?.gender || "male");
    setDesignation(user?.designation || "");
    toast.info("Changes discarded");
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (firstName: string, lastName?: string) => {
    const initials = firstName.charAt(0) + (lastName ? lastName.charAt(0) : "");
    return initials.toUpperCase() || "U";
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    try {
      const payload = {
        title: title,
        first_name: firstName,
        last_name: lastName,
        email: email,
        date_of_birth: dateOfBirth ? new Date(dateOfBirth.getTime() - dateOfBirth.getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
        gender: gender,
        designation: designation,
      };
      const updatedUser = await updateProfile(payload);
      setUser(updatedUser);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowProfileConfirm(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { avatar_url } = await uploadAvatar(file);
      if (user) {
        setUser({ ...user, avatar_url: `${avatar_url}?t=${Date.now()}` });
      }
      toast.success("Avatar updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update avatar");
    } finally {
      setIsUploadingAvatar(false);

      e.target.value = "";
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handlePasswordFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setShowPasswordConfirm(true);
  };

  return (
    <div className="w-full">
      <Helmet>
        <title>Settings | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-8 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            Settings
          </h1>
          <p className="text-text/60 text-sm">
            Manage your account details, security preferences, and profile
            information.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="bg-background/50 border border-border/50 gap-2 mb-8 inline-flex">
              <TabsTrigger value="profile" className="font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="font-bold text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="space-y-6">

                <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                      <Avatar className="h-16 w-16 border-2 border-primary/20 shrink-0">
                        <AvatarImage src={getMediaUrl(user?.avatar_url)} alt={`${user?.first_name} ${user?.last_name || ""}`.trim()} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                          {getInitials(user?.first_name || "U", user?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-text text-lg">{[user?.title, user?.first_name, user?.last_name].filter(Boolean).join(" ")}</h3>
                        <p className="text-sm text-text/50">{email}</p>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          disabled={isUploadingAvatar}
                        />
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="border-primary/15 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 hover:border-primary/30 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <label htmlFor="avatar-upload">
                            {isUploadingAvatar ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              "Change Avatar"
                            )}
                          </label>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-text">
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-text/50 text-sm">
                      Update your personal details. These are used for clinical
                      profile calibration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileFormSubmit} className="space-y-5">

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_2fr] gap-5">
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Title
                          </Label>
                          <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Dr."
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            First Name
                          </Label>
                          <Input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Last Name
                          </Label>
                          <Input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Email Address
                          </Label>
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Designation
                          </Label>
                          <Input
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            placeholder="e.g. Clinical Psychologist"
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Date of Birth
                          </Label>
                          <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-11 justify-start text-left font-normal bg-background/50 border-primary/15 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 hover:border-primary/30 transition-all",
                                  !dateOfBirth && "text-text/40"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary/60" />
                                {dateOfBirth
                                  ? formatDate(dateOfBirth)
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 border-primary/10"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={dateOfBirth}
                                onSelect={(date) => {
                                  setDateOfBirth(date);
                                  setCalendarOpen(false);
                                }}
                                captionLayout="dropdown"
                                startMonth={new Date(1930, 0)}
                                endMonth={new Date()}
                                disabled={(date) => date > new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Gender
                          </Label>
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger className="w-full h-11 bg-background/50 border-primary/15 hover:border-primary/30 transition-all">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent className="border-primary/10">
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        {hasProfileChanges && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelProfile}
                            className="border-primary/15 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-text/60 font-bold text-sm px-6 transition-all"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="submit"
                          disabled={isSavingProfile || !hasProfileChanges}
                          className="bg-primary hover:bg-primary/90 text-background font-bold text-sm px-6 shadow-lg shadow-primary/20 transition-all disabled:opacity-40"
                        >
                          {isSavingProfile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card
                  className="border-primary/10 bg-background/80 backdrop-blur-sm transition-all"
                >
                  <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-text text-lg">
                        Assessment Authority
                      </h3>
                      <p className="text-sm text-text/50">
                        {user?.can_assess
                          ? "You have been granted the authority to perform clinical assessments."
                          : "Permission required to perform clinical assessments. Please contact your clinic administrator."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5",
                        user?.can_assess ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {user?.can_assess && <Check className="h-3 w-3" />}
                        {user?.can_assess ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {user?.account_type === "individual" && (
                  <Card
                    className="border-primary/10 bg-background/80 backdrop-blur-sm cursor-pointer hover:border-primary/30 transition-all"
                    onClick={() => navigate("/verification")}
                  >
                    <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-text text-lg">
                          {user?.account_type === "individual" ? "Apply for CoreTAT's RCI Verified Psychologist" : "CoreTAT Verified Psychologist"}
                        </h3>
                        <p className="text-sm text-text/50">
                          {user?.verification_status === "approved"
                            ? "Your RCI credentials are verified. Full access granted."
                            : user?.verification_status === "pending"
                              ? "Your RCI credentials are under review by our team."
                              : user?.verification_status === "rejected"
                                ? "RCI Verification rejected. Please resubmit your documents."
                                : user?.account_type === "individual"
                                  ? "Upload your RCI License and E-Signature to get verified."
                                  : "Please upload your professional RCI credentials to get verified."}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5",
                          user?.verification_status === "approved" ? "bg-green-500/10 text-green-500" :
                          user?.verification_status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-red-500/10 text-red-500"
                        )}>
                          {user?.verification_status === "approved" && <Check className="h-3 w-3" />}
                          {user?.verification_status === "approved" ? "Verified" :
                           user?.verification_status === "pending" ? "Under Review" :
                           user?.verification_status === "rejected" ? "Rejected" :
                           "Not Verified"}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary pointer-events-none">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-6">

                <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-text">
                      Change Password
                    </CardTitle>
                    <CardDescription className="text-text/50 text-sm">
                      Update your password to keep your account secure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handlePasswordFormSubmit}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            placeholder="Enter your current password"
                            className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 pr-10 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text/70 transition-colors cursor-pointer"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            New Password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              minLength={8}
                              placeholder="••••••••"
                              className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 pr-10 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text/70 transition-colors"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-text/80 font-bold text-xs uppercase tracking-wider">
                            Confirm New Password
                          </Label>
                          <div className="relative">
                            <Input
                              type={showConfirmNewPassword ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={(e) =>
                                setConfirmNewPassword(e.target.value)
                              }
                              required
                              minLength={8}
                              placeholder="••••••••"
                              className="h-11 bg-background/50 border-primary/15 focus:border-primary/40 pr-10 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmNewPassword(!showConfirmNewPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text/70 transition-colors"
                            >
                              {showConfirmNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={isSavingPassword}
                          className="bg-primary hover:bg-primary/90 text-background font-bold text-sm px-6 shadow-lg shadow-primary/20 transition-all"
                        >
                          {isSavingPassword ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Update Password
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 bg-background/80 backdrop-blur-sm">
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold text-text">
                        Active Sessions
                      </CardTitle>
                      <CardDescription className="text-text/50 text-sm">
                        Manage your active login sessions across devices.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 dark:text-destructive hover:border-destructive/30 font-bold text-xs transition-all shrink-0"
                      type="button"
                      onClick={() => setShowSignOutConfirm(true)}
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1.5" />
                      Sign Out of All Other Sessions
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <div>
                          <p className="text-sm font-bold text-text">
                            Current Session
                          </p>
                          <p className="text-xs text-text/40">
                            Windows · Chrome · Active now
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-primary font-bold px-2 py-1 rounded-md bg-primary/10">
                        This device
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/15 bg-background/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-destructive">
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-text/50 text-sm">
                      Irreversible actions. Proceed with caution.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-5 bg-destructive/10" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-text">
                          Delete Account
                        </p>
                        <p className="text-xs text-text/40">
                          Permanently remove your account and all associated
                          clinical data.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/20 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 dark:text-destructive hover:border-destructive/30 font-bold text-xs transition-all"
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        <AlertDialog open={showProfileConfirm} onOpenChange={setShowProfileConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will update your personal information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowProfileConfirm(false); handleSaveProfile(); }}>
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showPasswordConfirm} onOpenChange={setShowPasswordConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update Password?</AlertDialogTitle>
              <AlertDialogDescription>
                This will change your account password. You may need to log in again on other devices.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setShowPasswordConfirm(false); handleChangePassword(); }}>
                Update Password
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign Out Everywhere?</AlertDialogTitle>
              <AlertDialogDescription>
                This will terminate all active sessions on other devices. You will remain logged in on this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowSignOutConfirm(false);
                  logout();
                  navigate("/login");
                  toast.success("Signed out successfully");
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sign Out All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is <strong>permanent and irreversible</strong>. All your data, patient records, and session history will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
