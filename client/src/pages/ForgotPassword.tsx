import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import { Link } from "@/lib/wouter-stub";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { authTranslations } from "@/translations/auth";

export default function ForgotPassword() {
  const { language } = useLanguage();
  const t = authTranslations[language].forgotPassword;
  
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }, {
        onSuccess: () => {
          setSuccess(true);
        },
        onError: (ctx: any) => {
          setError(ctx.error.message || t.sendFailed);
        },
      });
    } catch (err: any) {
      setError(err?.message || t.sendFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#EFE0BD] flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full border border-[#8B4513]/20 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2c2c2c] mb-2">
            {t.checkEmail}
          </h1>
          <p className="font-serif text-[#8B4513]/70 mb-6">
            {t.sentInstructions.replace("{email}", email)}
          </p>
          <p className="font-serif text-sm text-[#8B4513]/50 mb-6">
            {t.didntReceive} {t.tryAgain}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[#991b1b] hover:text-[#7a1515] transition-colors font-serif"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToSignIn}
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
            <Mail className="w-8 h-8 text-[#991b1b]" />
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t.sending}
              </>
            ) : (
              t.sendLink
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

