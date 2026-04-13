import { Link, useNavigate } from "react-router-dom";
import buddhaIcon from "../assets/buddha-icon.webp";
import bellIcon from "../assets/bell-icon.webp";
import bodhiLogo from "../assets/bodhi-technology-lab-logo.webp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { privacyTranslations } from "@/translations/privacy";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Privacy() {
  const { language } = useLanguage();
  const t = privacyTranslations[language];
  useDocumentTitle("Privacy Policy", "Bodhi Technology Lab privacy policy. How we protect your temple and community data.");
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
                  {t.footer.home || "Home"}
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-32 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src={buddhaIcon} alt="Buddha" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#991b1b] mb-6" data-testid="text-privacy-title">
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
            {/* Our Commitment */}
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-[#991b1b]/30 p-8" data-testid="section-commitment">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.commitment.title}</h2>
              <div className="space-y-4 font-serif text-[#2c2c2c]">
                <p className="text-lg">
                  {t.commitment.text}
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  {t.commitment.points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Information We Collect */}
            <div data-testid="section-collection">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.collection.title}</h2>
              
              <div className="space-y-6">
                <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.collection.account.title}</h3>
                  <p className="font-serif text-[#8B4513]/80">
                    {t.collection.account.text}
                  </p>
                </div>

                <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.collection.usage.title}</h3>
                  <p className="font-serif text-[#8B4513]/80">
                    {t.collection.usage.text}
                  </p>
                </div>

                <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.collection.ai.title}</h3>
                  <p className="font-serif text-[#8B4513]/80">
                    {t.collection.ai.text}
                  </p>
                </div>

                <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.collection.payment.title}</h3>
                  <p className="font-serif text-[#8B4513]/80">
                    {t.collection.payment.text}
                  </p>
                </div>

                <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.collection.communications.title}</h3>
                  <p className="font-serif text-[#8B4513]/80">
                    {t.collection.communications.text}
                  </p>
                </div>
              </div>
            </div>

            {/* How We Use Information */}
            <div data-testid="section-usage">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.usage.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.usage.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Data Sharing */}
            <div data-testid="section-sharing">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.sharing.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.sharing.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.sharing.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span><strong>{point.label}</strong> {point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Data Security */}
            <div data-testid="section-security">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.security.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.security.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.security.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Your Rights */}
            <div data-testid="section-rights">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.rights.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.rights.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.rights.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span><strong>{point.label}</strong> {point.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-serif text-[#2c2c2c] mt-6">
                  {t.rights.contact} <a href="mailto:privacy@boddhilab.io" className="text-[#991b1b] underline font-semibold" data-testid="link-email-privacy">privacy@boddhilab.io</a>
                </p>
              </div>
            </div>

            {/* Cookies */}
            <div data-testid="section-cookies">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.cookies.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c] mb-4">
                  {t.cookies.intro}
                </p>
                <ul className="space-y-3 font-serif text-[#2c2c2c]">
                  {t.cookies.points.map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#991b1b] font-bold">•</span>
                      <span><strong>{point.label}</strong> {point.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-serif text-[#2c2c2c] mt-4">
                  {t.cookies.outro}
                </p>
              </div>
            </div>

            {/* Children's Privacy */}
            <div data-testid="section-children">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.children.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c]">
                  {t.children.text} <a href="mailto:privacy@boddhilab.io" className="text-[#991b1b] underline font-semibold">privacy@boddhilab.io</a> {t.children.outro}
                </p>
              </div>
            </div>

            {/* International Users */}
            <div data-testid="section-international">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.international.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c]">
                  {t.international.text}
                </p>
              </div>
            </div>

            {/* Changes to Policy */}
            <div data-testid="section-changes">
              <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-6">{t.changes.title}</h2>
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6">
                <p className="font-serif text-[#2c2c2c]">
                  {t.changes.text}
                </p>
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
                <p><strong>{t.contact.emailLabel}</strong> <a href="mailto:privacy@boddhilab.io" className="text-[#991b1b] underline font-semibold">privacy@boddhilab.io</a></p>
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


