import { useState, useEffect } from "react";
import { useSession, signIn, signUp, sendVerificationEmail } from "@/lib/auth-client";
import { Redirect, Link, useLocation } from "@/lib/wouter-stub";
import { Lock, ArrowLeft, Loader2, UserPlus, Mail, CheckCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authTranslations } from "@/translations/auth";

export default function Login() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const t = authTranslations[language].login;
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Resend verification email state
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!resendEmail || resendLoading || resendCooldown > 0) return;
    
    setResendLoading(true);
    setError("");
    setSuccess("");
    
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(t.verificationSent);
        setShowResendVerification(false);
      } else if (response.status === 429) {
        // Rate limited
        const retryAfter = data.retryAfter || 60;
        setResendCooldown(retryAfter);
        setError(t.tooManyRequests.replace("{minutes}", String(Math.ceil(retryAfter / 60))));
      } else {
        setError(data.message || t.authFailed);
      }
    } catch (err) {
      setError(t.authFailed);
    } finally {
      setResendLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#991b1b] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session) {
    const role = (session.user as any)?.role;
    if (role === "bodhi_admin") return <Redirect to="/admin" />;
    return <Redirect to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: "/login?verified=true",
        }, {
          onSuccess: async () => {
            // Send verification email manually (Better Auth's sendOnSignUp is unreliable)
            try {
              await sendVerificationEmail({
                email,
                callbackURL: "/login?verified=true",
              });
            } catch (err) {
              // Ignore errors - email might already be sent by Better Auth
              console.log("[Login] sendVerificationEmail result:", err);
            }
            
            setSuccess(t.accountCreated);
            setMode("signin");
            setPassword("");
          },
          onError: (ctx) => {
            setError(ctx.error.message || t.couldNotCreate);
          },
        });
      } else {
        await signIn.email({ email, password }, {
          onSuccess: (ctx) => {
            const userRole = (ctx.data?.user as any)?.role;
            if (userRole === "bodhi_admin") {
              setLocation("/admin");
            } else {
              setLocation("/dashboard");
            }
          },
          onError: (ctx) => {
            const errorMessage = ctx.error.message?.toLowerCase() || "";
            if (errorMessage.includes("verify") || errorMessage.includes("verification") || errorMessage.includes("not verified")) {
              setError(t.verifyEmail);
              setResendEmail(email);
              setShowResendVerification(true);
            } else {
              setError(ctx.error.message || t.invalidCredentials);
              setShowResendVerification(false);
            }
          },
        });
      }
    } catch (err: any) {
      setError(err?.message || t.authFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full border border-[#8B4513]/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#991b1b]/10 rounded-full flex items-center justify-center">
            {mode === "signin" ? (
              <Lock className="w-8 h-8 text-[#991b1b]" />
            ) : (
              <UserPlus className="w-8 h-8 text-[#991b1b]" />
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2c2c2c]">
            {mode === "signin" ? t.title : t.createAccount}
          </h1>
          <p className="font-serif text-sm text-[#8B4513]/70 mt-2">
            {mode === "signin" ? t.subtitle : t.createSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded-lg font-serif text-sm border border-red-200">
              {error}
            </div>
          )}

          {showResendVerification && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-serif text-sm text-amber-800 mb-3">
                    {t.resendVerification}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm font-medium hover:bg-[#7a1515] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.sending}
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        {t.wait} {resendCooldown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        {t.resendButton}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 text-green-800 rounded-lg font-serif text-sm border border-green-200 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label
                htmlFor="name"
                className="block font-serif text-sm font-medium text-[#2c2c2c] mb-1"
              >
                {t.name}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-3 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block font-serif text-sm font-medium text-[#2c2c2c] mb-1"
            >
              {t.email}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="w-full px-4 py-3 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="password"
                className="block font-serif text-sm font-medium text-[#2c2c2c]"
              >
                {t.password}
              </label>
              {mode === "signin" && (
                <Link
                  href="/forgot-password"
                  className="font-serif text-xs text-[#991b1b] hover:text-[#7a1515] transition-colors"
                >
                  {t.forgotPassword}
                </Link>
              )}
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? t.createPasswordPlaceholder : t.passwordPlaceholder}
              className="w-full px-4 py-3 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
              required
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              minLength={mode === "signup" ? 8 : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "signin" ? t.signingIn : t.creatingAccount}
              </>
            ) : mode === "signin" ? (
              t.signIn
            ) : (
              t.createAccount
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#8B4513]/20" />
          <span className="font-serif text-xs text-[#8B4513]/50">
            {mode === "signin" ? t.noAccount : t.haveAccount}
          </span>
          <div className="flex-1 h-px bg-[#8B4513]/20" />
        </div>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setSuccess("");
            setShowResendVerification(false);
            setResendEmail("");
          }}
          className="w-full px-6 py-3 bg-white border border-[#8B4513]/30 rounded-xl font-serif font-semibold text-[#2c2c2c] hover:bg-[#8B4513]/5 transition-all duration-300 shadow-sm"
        >
          {mode === "signin" ? t.createAccount : t.signInInstead}
        </button>

        <Link
          href="/"
          className="flex items-center justify-center gap-2 mt-6 text-[#8B4513]/60 hover:text-[#991b1b] transition-colors font-serif text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backToHome}
        </Link>
      </div>
    </div>
  );
}

