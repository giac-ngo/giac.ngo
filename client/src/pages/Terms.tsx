import { Link, useNavigate } from "react-router-dom";
import sutraIcon from "../assets/sutra-scroll-icon.webp";
import bellIcon from "../assets/bell-icon.webp";
import bodhiLogo from "../assets/bodhi-technology-lab-logo.webp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { termsTranslations } from "@/translations/terms";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Terms() {
  const { language } = useLanguage();
  const t = termsTranslations[language];
  useDocumentTitle("Terms of Service", "Bodhi Technology Lab terms of service and conditions of use.");
  return (
    <div className="min-h-screen bg-[#EFE0BD] text-[#8B4513]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EFE0BD] via-[#E5D5B7] to-[#EFE0BD]"></div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(rgba(139, 69, 19, 0.3) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        ></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#EFE0BD]/80 border-b border-[#8B4513]/20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center" data-testid="link-brand">
              <img src={bodhiLogo} alt="Bodhi Technology Lab" className="h-12 brightness-110 contrast-125" />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-home">
                  {t.footer.terms}
</Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src={sutraIcon} alt="Sutra" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#991b1b] mb-6" data-testid="text-terms-title">
              {t.hero.title}
            </h1>
            <p className="font-serif text-lg text-[#8B4513]/80 mb-4">
              {t.hero.effectiveDate}
            </p>
            <p className="font-serif text-lg text-[#8B4513]/80 max-w-3xl mx-auto">
              {t.hero.subtitle}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Acceptance */}
            <div data-testid="section-acceptance">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.acceptance.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.acceptance.text1}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  {t.acceptance.text2}
                </p>
              </div>
            </div>

            {/* Eligibility */}
            <div data-testid="section-eligibility">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.eligibility.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.eligibility.text1}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  {t.eligibility.text2}
                </p>
              </div>
            </div>

            {/* Account Responsibilities */}
            <div data-testid="section-accounts">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.account.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.account.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span><strong>{point.label}</strong> {point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Acceptable Use */}
            <div data-testid="section-acceptable-use">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.acceptableUse.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.acceptableUse.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.acceptableUse.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-serif text-[#2c2c2c] mt-4">
                  {t.acceptableUse.outro}
                </p>
              </div>
            </div>

            {/* AI Agent Guidelines */}
            <div data-testid="section-ai">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.ai.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.ai.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.ai.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Intellectual Property */}
            <div data-testid="section-ip">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.ip.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.ip.ourContent.label}</strong> {t.ip.ourContent.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.ip.yourContent.label}</strong> {t.ip.yourContent.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.ip.dharmaTeachings.label}</strong> {t.ip.dharmaTeachings.text}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  <strong>{t.ip.openSource.label}</strong> {t.ip.openSource.text}
                </p>
              </div>
            </div>

            {/* Payment & Donations */}
            <div data-testid="section-payment">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.payment.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.payment.subscription.label}</strong> {t.payment.subscription.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.payment.donationProcessing.label}</strong> {t.payment.donationProcessing.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.payment.refunds.label}</strong> {t.payment.refunds.text}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  <strong>{t.payment.taxReceipts.label}</strong> {t.payment.taxReceipts.text}
                </p>
              </div>
            </div>

            {/* Termination */}
            <div data-testid="section-termination">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.termination.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.termination.byYou.label}</strong> {t.termination.byYou.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.termination.byUs.label}</strong> {t.termination.byUs.text}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  <strong>{t.termination.dataRetention.label}</strong> {t.termination.dataRetention.text}
                </p>
              </div>
            </div>

            {/* Disclaimers */}
            <div data-testid="section-disclaimers">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.disclaimers.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.disclaimers.asIs.label}</strong> {t.disclaimers.asIs.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.disclaimers.noProfessionalAdvice.label}</strong> {t.disclaimers.noProfessionalAdvice.text}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.disclaimers.limitationOfLiability.label}</strong> {t.disclaimers.limitationOfLiability.text}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  <strong>{t.disclaimers.thirdPartyServices.label}</strong> {t.disclaimers.thirdPartyServices.text}
                </p>
              </div>
            </div>

            {/* Indemnification */}
            <div data-testid="section-indemnification">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.indemnification.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c]">
                  {t.indemnification.text}
                </p>
              </div>
            </div>

            {/* Dispute Resolution */}
            <div data-testid="section-disputes">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.disputes.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.disputes.informal.label}</strong> {t.disputes.informal.text} <a href="mailto:privacy@boddhilab.io" className="text-[#991b1b] underline font-semibold">{t.disputes.email}</a> {t.disputes.informalOutro}
                </p>
                <p className="font-serif text-[#2c2c2c] mb-4">
                  <strong>{t.disputes.arbitration.label}</strong> {t.disputes.arbitration.text}
                </p>
                <p className="font-serif text-[#2c2c2c]">
                  <strong>{t.disputes.governingLaw.label}</strong> {t.disputes.governingLaw.text}
                </p>
              </div>
            </div>

            {/* Changes to Terms */}
            <div data-testid="section-changes">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.changes.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c]">
                  {t.changes.text}
                </p>
              </div>
            </div>

            {/* Severability */}
            <div data-testid="section-severability">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.miscellaneous.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.miscellaneous.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span><strong>{point.label}</strong> {point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gradient-to-br from-[#991b1b]/10 to-[#8B4513]/10 rounded-2xl border-2 border-[#991b1b]/30 p-8 text-center" data-testid="section-contact">
              <img src={bellIcon} alt="Bell" className="w-12 h-12 object-contain mx-auto mb-4" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-4">{t.contact.title}</h2>
              <p className="font-serif text-[#2c2c2c] mb-6">
                {t.contact.subtitle}
              </p>
              <div className="space-y-2 font-serif text-[#2c2c2c]">
                <p><strong>Email:</strong> <a href="mailto:privacy@boddhilab.io" className="text-[#991b1b] underline font-semibold" data-testid="link-email-legal">{t.contact.email}</a></p>
                <p><strong>{t.contact.company}</strong></p>
                <p className="text-sm text-[#8B4513]/70">{t.contact.tagline}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-[#8B4513]/20">
          <div className="max-w-6xl mx-auto text-center">
            <p className="font-serif text-[#8B4513]/60 mb-4">
              {t.footer.copyright}
            </p>
            <div className="flex justify-center gap-6">
              <Link to="/career" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] transition-colors" data-testid="link-footer-career">
                  {t.footer.career}
</Link>
              <Link to="/privacy" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] transition-colors" data-testid="link-footer-privacy">
                  {t.footer.privacy}
</Link>
              <Link to="/terms" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] transition-colors" data-testid="link-footer-terms">
                  {t.footer.terms}
</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


