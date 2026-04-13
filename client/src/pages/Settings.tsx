import { useState, useEffect } from "react";
import { useSession, updateUser, changeEmail, changePassword, listSessions, revokeSession, revokeOtherSessions } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/lib/wouter-stub";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Shield,
  Monitor,
  Settings as SettingsIcon,
  Loader2,
  Save,
  Mail,
  Lock,
  CheckCircle,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authTranslations } from "@/translations/auth";

// Session type from Better Auth
interface Session {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Parsed session info for display
interface ParsedSession extends Session {
  deviceType: "Desktop" | "Mobile" | "Tablet";
  browserName: string;
  isCurrent: boolean;
}

// Parse userAgent to extract device type
function parseDeviceType(userAgent: string | null | undefined): "Desktop" | "Mobile" | "Tablet" {
  if (!userAgent) return "Desktop";
  const ua = userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "Tablet";
  }
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

// Parse userAgent to extract browser name
function parseBrowserName(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown Browser";
  
  // Order matters - check more specific patterns first
  if (/edg/i.test(userAgent)) return "Edge";
  if (/opr|opera/i.test(userAgent)) return "Opera";
  if (/chrome|chromium|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return "Safari";
  if (/msie|trident/i.test(userAgent)) return "Internet Explorer";
  
  return "Unknown Browser";
}

// Format timestamp for display
function formatLastActive(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  
  return d.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
  });
}

// Get device icon component
function DeviceIcon({ deviceType, className }: { deviceType: "Desktop" | "Mobile" | "Tablet"; className?: string }) {
  switch (deviceType) {
    case "Mobile":
      return <Smartphone className={className} />;
    case "Tablet":
      return <Tablet className={className} />;
    default:
      return <Laptop className={className} />;
  }
}

type TabValue = "profile" | "security" | "sessions";

export default function Settings() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = authTranslations[language].settings;
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  
  // Profile state
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change Email state
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<ParsedSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Initialize name from session
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  // Fetch sessions on mount
  const fetchSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    
    try {
      const result = await listSessions();
      
      if (result.error) {
        setSessionsError(result.error.message || "Failed to load sessions");
        return;
      }
      
      if (result.data) {
        // Get current session token for comparison
        const currentToken = (session as any)?.session?.token;
        
        // Parse and enrich session data
        const parsedSessions: ParsedSession[] = result.data.map((s: Session) => ({
          ...s,
          deviceType: parseDeviceType(s.userAgent),
          browserName: parseBrowserName(s.userAgent),
          isCurrent: s.token === currentToken,
        }));
        
        // Sort: current session first, then by updatedAt descending
        parsedSessions.sort((a, b) => {
          if (a.isCurrent) return -1;
          if (b.isCurrent) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        
        setSessions(parsedSessions);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load sessions";
      setSessionsError(message);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Load sessions when tab changes to sessions or on mount
  useEffect(() => {
    if (activeTab === "sessions" && sessions.length === 0 && !sessionsLoading) {
      fetchSessions();
    }
  }, [activeTab]);

  // Handle revoking a single session
  const handleRevokeSession = async (token: string) => {
    setRevokingSession(token);
    
    try {
      const result = await revokeSession({ token });
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message || "Could not sign out this device. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Remove session from list
      setSessions((prev) => prev.filter((s) => s.token !== token));
      
      toast({
        title: "Session Revoked",
        description: "The device has been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not sign out this device. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevokingSession(null);
    }
  };

  // Handle revoking all other sessions
  const handleRevokeAllOtherSessions = async () => {
    setRevokingAll(true);
    
    try {
      const result = await revokeOtherSessions();
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error.message || "Could not sign out other devices. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Keep only current session
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      
      toast({
        title: "All Other Sessions Revoked",
        description: "All other devices have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not sign out other devices. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevokingAll(false);
    }
  };

  const formatRole = (role: string | undefined): string => {
    if (!role) return "User";
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      setProfileError("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    setProfileError(null);

    try {
      const result = await updateUser({ name: name.trim() });
      
      if (result.error) {
        setProfileError(result.error.message || "Failed to update name");
        toast({
          title: "Error",
          description: result.error.message || "Failed to update name",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Your name has been updated successfully",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update name";
      setProfileError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      setEmailError("Please enter a new email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (newEmail.trim().toLowerCase() === session?.user?.email?.toLowerCase()) {
      setEmailError("New email must be different from your current email");
      return;
    }

    setIsChangingEmail(true);
    setEmailError(null);
    setEmailChangeSuccess(false);

    try {
      const result = await changeEmail({ 
        newEmail: newEmail.trim(),
        callbackURL: "/settings"
      });
      
      if (result.error) {
        // Handle duplicate email error (409)
        if (result.error.status === 409) {
          setEmailError("This email is already in use by another account.");
        } else {
          setEmailError(result.error.message || "Failed to change email");
        }
      } else {
        setEmailChangeSuccess(true);
        setPendingEmail(newEmail.trim());
        setNewEmail("");
      }
    } catch (error: any) {
      // Handle duplicate email error from exception
      if (error?.status === 409 || error?.message?.includes("already")) {
        setEmailError("This email is already in use by another account.");
      } else {
        const message = error instanceof Error ? error.message : "Failed to change email";
        setEmailError(message);
      }
    } finally {
      setIsChangingEmail(false);
    }
  };

  const getDashboardLink = () => {
    if ((session?.user as any)?.role === "bodhi_admin") {
      return "/admin";
    }
    return "/dashboard";
  };

  const handleChangePassword = async () => {
    // Reset states
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validate new password length
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    // Validate current password is provided
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (result.error) {
        // Generic error message for wrong current password (no field hint per Requirement 7.3)
        setPasswordError("Password change failed. Please check your current password.");
      } else {
        setPasswordSuccess(true);
        // Clear form on success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({
          title: "Success",
          description: "Your password has been changed successfully.",
        });
      }
    } catch (error) {
      // Generic error message (no field hint per Requirement 7.3)
      setPasswordError("Password change failed. Please check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#8B4513]/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#991b1b]/10 rounded-full flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-[#991b1b]" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-[#2c2c2c]">
                {t.title}
              </h1>
              <p className="font-serif text-xs text-[#8B4513]/70">
                {language === "vi" ? "Quản lý hồ sơ và bảo mật" : "Manage your profile and security"}
              </p>
            </div>
          </div>
          <Link to={getDashboardLink()} className="flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm hover:bg-[#7a1515] transition-all">
              <ArrowLeft className="w-4 h-4" /> {t.backToDashboard}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 rounded-2xl shadow-xl overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabValue)}
            className="w-full"
          >
            <div className="border-b border-[#8B4513]/20 px-6 pt-4">
              <TabsList className="bg-[#8B4513]/5 p-1 rounded-lg">
                <TabsTrigger
                  value="profile"
                  className="font-serif text-sm data-[state=active]:bg-white data-[state=active]:text-[#991b1b] data-[state=active]:shadow-sm text-[#8B4513]/70 hover:text-[#8B4513] transition-all px-4 py-2 rounded-md"
                >
                  <User className="w-4 h-4 mr-2" />
                  {t.tabs.profile}
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="font-serif text-sm data-[state=active]:bg-white data-[state=active]:text-[#991b1b] data-[state=active]:shadow-sm text-[#8B4513]/70 hover:text-[#8B4513] transition-all px-4 py-2 rounded-md"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {t.tabs.security}
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className="font-serif text-sm data-[state=active]:bg-white data-[state=active]:text-[#991b1b] data-[state=active]:shadow-sm text-[#8B4513]/70 hover:text-[#8B4513] transition-all px-4 py-2 rounded-md"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {t.tabs.sessions}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="profile" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#2c2c2c] mb-4">
                      {t.profile.title}
                    </h2>
                    <p className="font-serif text-sm text-[#8B4513]/70">
                      {language === "vi" ? "Cập nhật thông tin hồ sơ tài khoản." : "Update your account profile information."}
                    </p>
                  </div>

                  {/* Name Field - Editable */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-serif text-sm font-medium text-[#2c2c2c]">
                      {t.profile.name}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.profile.namePlaceholder}
                      className="font-serif border-[#8B4513]/20 focus:border-[#991b1b] focus:ring-[#991b1b]/20"
                    />
                  </div>

                  {/* Email Field - Read Only */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-serif text-sm font-medium text-[#2c2c2c]">
                      {t.profile.email}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={session?.user?.email || ""}
                      readOnly
                      disabled
                      className="font-serif border-[#8B4513]/20 bg-[#8B4513]/5 text-[#8B4513]/70 cursor-not-allowed"
                    />
                  </div>

                  {/* Change Email Section */}
                  <div className="space-y-4 p-4 bg-[#8B4513]/5 rounded-lg border border-[#8B4513]/10">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#991b1b]" />
                      <h3 className="font-serif text-sm font-semibold text-[#2c2c2c]">
                        {t.profile.changeEmail}
                      </h3>
                    </div>
                    <p className="font-serif text-xs text-[#8B4513]/70">
                      {language === "vi" ? "Nhập địa chỉ email mới. Bạn cần xác minh trước khi thay đổi có hiệu lực." : "Enter a new email address. You'll need to verify it before the change takes effect."}
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newEmail" className="font-serif text-sm font-medium text-[#2c2c2c]">
                        {t.profile.newEmail}
                      </Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          setEmailError(null);
                          setEmailChangeSuccess(false);
                          setPendingEmail(null);
                        }}
                        placeholder={t.profile.newEmailPlaceholder}
                        className="font-serif border-[#8B4513]/20 focus:border-[#991b1b] focus:ring-[#991b1b]/20"
                        disabled={isChangingEmail}
                      />
                    </div>

                    {/* Email Change Success Message */}
                    {emailChangeSuccess && pendingEmail && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-serif text-sm text-green-700">
                          {t.profile.emailChangeRequested}
                        </p>
                      </div>
                    )}

                    {/* Email Change Error Message */}
                    {emailError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-serif text-sm text-red-600">{emailError}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleChangeEmail}
                      disabled={isChangingEmail || !newEmail.trim()}
                      className="bg-[#991b1b] hover:bg-[#7a1515] text-white font-serif"
                    >
                      {isChangingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.profile.changingEmail}
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          {t.profile.changeEmailButton}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Role Field - Read Only */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="font-serif text-sm font-medium text-[#2c2c2c]">
                      {t.profile.role}
                    </Label>
                    <Input
                      id="role"
                      type="text"
                      value={formatRole((session?.user as any)?.role)}
                      readOnly
                      disabled
                      className="font-serif border-[#8B4513]/20 bg-[#8B4513]/5 text-[#8B4513]/70 cursor-not-allowed"
                    />
                  </div>

                  {/* Error Message */}
                  {profileError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-serif text-sm text-red-600">{profileError}</p>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-[#8B4513]/10">
                    <Button
                      onClick={handleSaveName}
                      disabled={isSaving || name === session?.user?.name}
                      className="bg-[#991b1b] hover:bg-[#7a1515] text-white font-serif"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.profile.saving}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t.profile.saveChanges}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#2c2c2c] mb-4">
                      {language === "vi" ? "Cài Đặt Bảo Mật" : "Security Settings"}
                    </h2>
                    <p className="font-serif text-sm text-[#8B4513]/70">
                      {language === "vi" ? "Quản lý mật khẩu và tùy chọn bảo mật tài khoản." : "Manage your password and account security preferences."}
                    </p>
                  </div>

                  {/* Change Password Section */}
                  <div className="space-y-4 p-4 bg-[#8B4513]/5 rounded-lg border border-[#8B4513]/10">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#991b1b]" />
                      <h3 className="font-serif text-sm font-semibold text-[#2c2c2c]">
                        {t.security.title}
                      </h3>
                    </div>
                    <p className="font-serif text-xs text-[#8B4513]/70">
                      {t.security.requirements}
                    </p>

                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="font-serif text-sm font-medium text-[#2c2c2c]">
                        {t.security.currentPassword}
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        placeholder={t.security.currentPasswordPlaceholder}
                        className="font-serif border-[#8B4513]/20 focus:border-[#991b1b] focus:ring-[#991b1b]/20"
                        disabled={isChangingPassword}
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="font-serif text-sm font-medium text-[#2c2c2c]">
                        {t.security.newPassword}
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        placeholder={t.security.newPasswordPlaceholder}
                        className="font-serif border-[#8B4513]/20 focus:border-[#991b1b] focus:ring-[#991b1b]/20"
                        disabled={isChangingPassword}
                      />
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="font-serif text-sm font-medium text-[#2c2c2c]">
                        {t.security.confirmPassword}
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordSuccess(false);
                        }}
                        placeholder={t.security.confirmPasswordPlaceholder}
                        className="font-serif border-[#8B4513]/20 focus:border-[#991b1b] focus:ring-[#991b1b]/20"
                        disabled={isChangingPassword}
                      />
                    </div>

                    {/* Password Success Message */}
                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="font-serif text-sm text-green-700">
                          {t.security.passwordChanged}
                        </p>
                      </div>
                    )}

                    {/* Password Error Message */}
                    {passwordError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-serif text-sm text-red-600">{passwordError}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-[#991b1b] hover:bg-[#7a1515] text-white font-serif"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t.security.changing}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {t.security.changePassword}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sessions" className="mt-0">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#2c2c2c] mb-4">
                      {t.sessions.title}
                    </h2>
                    <p className="font-serif text-sm text-[#8B4513]/70">
                      {t.sessions.description}
                    </p>
                  </div>

                  {/* Loading State */}
                  {sessionsLoading && (
                    <div className="p-8 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#991b1b] animate-spin mb-3" />
                      <p className="font-serif text-sm text-[#8B4513]/70">{t.sessions.loading}</p>
                    </div>
                  )}

                  {/* Error State */}
                  {sessionsError && !sessionsLoading && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="font-serif text-sm text-red-600">{sessionsError}</p>
                      </div>
                      <Button
                        onClick={fetchSessions}
                        variant="outline"
                        size="sm"
                        className="font-serif border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {language === "vi" ? "Thử Lại" : "Retry"}
                      </Button>
                    </div>
                  )}

                  {/* Sessions List */}
                  {!sessionsLoading && !sessionsError && sessions.length > 0 && (
                    <div className="space-y-3">
                      {sessions.map((sessionItem) => (
                        <div
                          key={sessionItem.id}
                          className={`p-4 rounded-lg border ${
                            sessionItem.isCurrent
                              ? "bg-[#991b1b]/5 border-[#991b1b]/30"
                              : "bg-[#8B4513]/5 border-[#8B4513]/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  sessionItem.isCurrent
                                    ? "bg-[#991b1b]/10"
                                    : "bg-[#8B4513]/10"
                                }`}
                              >
                                <DeviceIcon
                                  deviceType={sessionItem.deviceType}
                                  className={`w-5 h-5 ${
                                    sessionItem.isCurrent
                                      ? "text-[#991b1b]"
                                      : "text-[#8B4513]"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-serif text-sm font-medium text-[#2c2c2c]">
                                    {sessionItem.deviceType} • {sessionItem.browserName}
                                  </span>
                                  {sessionItem.isCurrent && (
                                    <span className="px-2 py-0.5 bg-[#991b1b] text-white text-xs font-serif rounded-full">
                                      {t.sessions.currentSession}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="font-serif text-xs text-[#8B4513]/70">
                                    {t.sessions.lastActive}: {formatLastActive(sessionItem.updatedAt)}
                                  </span>
                                  {sessionItem.ipAddress && (
                                    <span className="font-serif text-xs text-[#8B4513]/60 flex items-center gap-1">
                                      <Globe className="w-3 h-3" />
                                      {sessionItem.ipAddress}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!sessionItem.isCurrent && (
                              <Button
                                onClick={() => handleRevokeSession(sessionItem.token)}
                                disabled={revokingSession === sessionItem.token || revokingAll}
                                variant="outline"
                                size="sm"
                                className="font-serif border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 shrink-0"
                              >
                                {revokingSession === sessionItem.token ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    {t.sessions.revoking}
                                  </>
                                ) : (
                                  <>
                                    <LogOut className="w-4 h-4 mr-1" />
                                    {t.sessions.revoke}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                    <div className="p-8 text-center">
                      <Monitor className="w-12 h-12 text-[#8B4513]/30 mx-auto mb-3" />
                      <p className="font-serif text-sm text-[#8B4513]/60">
                        {t.sessions.noOtherSessions}
                      </p>
                      <Button
                        onClick={fetchSessions}
                        variant="outline"
                        size="sm"
                        className="font-serif mt-3 border-[#8B4513]/30 text-[#8B4513] hover:bg-[#8B4513]/5"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {language === "vi" ? "Làm Mới" : "Refresh"}
                      </Button>
                    </div>
                  )}

                  {/* Sign out all other devices button */}
                  {!sessionsLoading && !sessionsError && sessions.filter((s) => !s.isCurrent).length > 0 && (
                    <div className="pt-4 border-t border-[#8B4513]/10">
                      <Button
                        onClick={handleRevokeAllOtherSessions}
                        disabled={revokingAll || revokingSession !== null}
                        variant="outline"
                        className="w-full font-serif border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                      >
                        {revokingAll ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t.sessions.revokingAll}
                          </>
                        ) : (
                          <>
                            <LogOut className="w-4 h-4 mr-2" />
                            {t.sessions.revokeAll}
                          </>
                        )}
                      </Button>
                      <p className="font-serif text-xs text-[#8B4513]/60 text-center mt-2">
                        {language === "vi" ? "Thao tác này sẽ đăng xuất bạn khỏi tất cả thiết bị ngoại trừ thiết bị này." : "This will sign you out from all devices except this one."}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}

