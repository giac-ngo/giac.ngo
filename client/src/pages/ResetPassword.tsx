import { useState, useEffect } from "react";
import { resetPassword } from "@/lib/auth-client";
import { Link, useLocation } from "@/lib/wouter-stub";
import { Lock, ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authTranslations } from "@/translations/auth";

export default function ResetPassword() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const t = authTranslations[language].resetPassword;
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    // Parse token from URL query params
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const urlError = params.get("error");
    
    if (urlError === "INVALID_TOKEN") {
      setTokenError(true);
    } else if (urlToken) {
      setToken(urlToken);
    } else {
      setTokenError(true);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }

    if (!token) {
      setError(t.resetFailed);
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        newPassword: password,
        token,
      }, {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (ctx) => {
          const msg = ctx.error.message || "";
          // If the token is invalid/expired, show the dedicated error page
          if (msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("token")) {
            setTokenError(true);
          } else if (msg === "INVALID_TOKEN" || ctx.error.code === "INVALID_TOKEN") {
            setTokenError(true);
          } else {
            setError(msg || t.resetFailed);
          }
        },
      });
    } catch (err: any) {
      setError(err?.message || t.resetFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full border border-[#8B4513]/20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2c2c2c] mb-2">
            {t.invalidToken}
          </h1>
          <p className="font-serif text-[#8B4513]/70 mb-6">
            {t.invalidTokenMessage}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md"
          >
            {t.requestNew}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full border border-[#8B4513]/20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2c2c2c] mb-2">
            {t.success}
          </h1>
          <p className="font-serif text-[#8B4513]/70 mb-6">
            {t.successMessage}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md"
          >
            {t.signIn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full border border-[#8B4513]/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#991b1b]/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#991b1b]" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2c2c2c]">
            {t.title}
          </h1>
          <p className="font-serif text-sm text-[#8B4513]/70 mt-2">
            {t.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded-lg font-serif text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block font-serif text-sm font-medium text-[#2c2c2c] mb-1"
            >
              {t.newPassword}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.newPasswordPlaceholder}
              className="w-full px-4 py-3 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block font-serif text-sm font-medium text-[#2c2c2c] mb-1"
            >
              {t.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              className="w-full px-4 py-3 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all"
              required
              minLength={8}
              autoComplete="new-password"
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
                {t.resetting}
              </>
            ) : (
              t.resetButton
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 mt-6 text-[#8B4513]/60 hover:text-[#991b1b] transition-colors font-serif text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backToSignIn}
        </Link>
      </div>
    </div>
  );
}

