import { Link, useNavigate } from "react-router-dom";
import lotusIcon from "../assets/lotus-icon.webp";
import bellIcon from "../assets/bell-icon.webp";
import buddhaIcon from "../assets/buddha-icon.webp";
import sutraIcon from "../assets/sutra-scroll-icon.webp";
import bodhiLogo from "../assets/bodhi-technology-lab-logo.webp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { aboutTranslations } from "@/translations/about";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function About() {
  const { language } = useLanguage();
  const t = aboutTranslations[language];
  useDocumentTitle("About Us", "Learn about Bodhi Technology Lab's mission to empower Buddhist temples, monasteries, and dharma centers with modern technology.");
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
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#EFE0BD]/80 border-b border-[#8B4513]/20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center" data-testid="link-brand">
              <img src={bodhiLogo} alt="Bodhi Technology Lab" className="h-12 brightness-110 contrast-125" />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/platform" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-platform">
                  Platform
              </Link>
              <Link to="/discovery" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors" data-testid="link-discovery">
                  Discovery
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 pt-32 py-16 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src={lotusIcon} alt="Lotus" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#991b1b] mb-6" data-testid="text-about-title">
              {t.title}
            </h1>
            <p className="font-serif text-xl text-[#8B4513]/80 leading-relaxed max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-white/50 backdrop-blur-md rounded-3xl border-2 border-[#8B4513]/20 p-8 md:p-12 mb-12" data-testid="section-mission">
            <div className="flex items-center gap-3 mb-6">
              <img src={bellIcon} alt="Bell" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b]">{t.mission.title}</h2>
            </div>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed mb-6">
              {t.mission.para1}
            </p>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed">
              {t.mission.para2}
            </p>
          </div>

          {/* Values Section */}
          <div className="bg-white/50 backdrop-blur-md rounded-3xl border-2 border-[#8B4513]/20 p-8 md:p-12 mb-12" data-testid="section-values">
            <div className="flex items-center gap-3 mb-8">
              <img src={buddhaIcon} alt="Buddha" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b]">{t.values.title}</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.values.tradition.title}</h3>
                <p className="font-serif text-[#8B4513]/80">
                  {t.values.tradition.text}
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.values.sovereignty.title}</h3>
                <p className="font-serif text-[#8B4513]/80">
                  {t.values.sovereignty.text}
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.values.ethics.title}</h3>
                <p className="font-serif text-[#8B4513]/80">
                  {t.values.ethics.text}
                </p>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-3">{t.values.accessible.title}</h3>
                <p className="font-serif text-[#8B4513]/80">
                  {t.values.accessible.text}
                </p>
              </div>
            </div>
          </div>

          {/* Philosophy Section */}
          <div className="bg-gradient-to-br from-[#991b1b]/10 to-[#8B4513]/10 rounded-3xl border-2 border-[#991b1b]/30 p-8 md:p-12 mb-12" data-testid="section-philosophy">
            <div className="flex items-center gap-3 mb-6">
              <img src={lotusIcon} alt="Lotus" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b]">{t.philosophy.title}</h2>
            </div>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed mb-6">
              {t.philosophy.para1}
            </p>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed mb-6">
              {t.philosophy.para2}
            </p>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed">
              {t.philosophy.para3}
            </p>
          </div>

          {/* What We Do Section */}
          <div className="bg-white/50 backdrop-blur-md rounded-3xl border-2 border-[#8B4513]/20 p-8 md:p-12 mb-12" data-testid="section-what-we-do">
            <div className="flex items-center gap-3 mb-8">
              <img src={sutraIcon} alt="Sutra" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b]">{t.whatWeBuild.title}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-[#EFE0BD]/50 to-[#E5D5B7]/30 rounded-2xl p-6 border border-[#8B4513]/20">
                <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-3">{t.whatWeBuild.community.title}</h3>
                <p className="font-serif text-sm text-[#8B4513]/80">
                  {t.whatWeBuild.community.text}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#EFE0BD]/50 to-[#E5D5B7]/30 rounded-2xl p-6 border border-[#8B4513]/20">
                <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-3">{t.whatWeBuild.ai.title}</h3>
                <p className="font-serif text-sm text-[#8B4513]/80">
                  {t.whatWeBuild.ai.text}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#EFE0BD]/50 to-[#E5D5B7]/30 rounded-2xl p-6 border border-[#8B4513]/20">
                <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-3">{t.whatWeBuild.donation.title}</h3>
                <p className="font-serif text-sm text-[#8B4513]/80">
                  {t.whatWeBuild.donation.text}
                </p>
              </div>

              <div className="bg-gradient-to-br from-[#EFE0BD]/50 to-[#E5D5B7]/30 rounded-2xl p-6 border border-[#8B4513]/20">
                <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-3">{t.whatWeBuild.library.title}</h3>
                <p className="font-serif text-sm text-[#8B4513]/80">
                  {t.whatWeBuild.library.text}
                </p>
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className="bg-gradient-to-br from-[#991b1b]/10 to-[#8B4513]/10 rounded-3xl border-2 border-[#991b1b]/30 p-8 md:p-12 mb-12" data-testid="section-team">
            <div className="flex items-center gap-3 mb-6">
              <img src={lotusIcon} alt="Lotus" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#2c2c2c]">{t.team.title}</h2>
            </div>
            <p className="font-serif text-lg text-[#8B4513]/80 leading-relaxed mb-6">
              {t.team.para1}
            </p>
            <p className="font-serif text-lg text-[#8B4513]/80 leading-relaxed">
              {t.team.para2}
            </p>
          </div>

          {/* Global Reach Section */}
          <div className="bg-white/50 backdrop-blur-md rounded-3xl border-2 border-[#8B4513]/20 p-8 md:p-12 mb-12" data-testid="section-reach">
            <div className="flex items-center gap-3 mb-6">
              <img src={bellIcon} alt="Bell" className="w-12 h-12 object-contain" />
              <h2 className="font-serif text-3xl font-bold text-[#991b1b]">{t.reach.title}</h2>
            </div>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed mb-6">
              {t.reach.para1}
            </p>
            <p className="font-serif text-lg text-[#2c2c2c] leading-relaxed">
              {t.reach.para2}
            </p>
          </div>

          {/* Contact CTA */}
          <div className="bg-gradient-to-r from-[#991b1b] to-[#7a1515] rounded-3xl p-8 md:p-12 text-center" data-testid="section-contact">
            <h2 className="font-serif text-3xl font-bold text-white mb-4">{t.cta.title}</h2>
            <p className="font-serif text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/platform" className="px-8 py-4 bg-white text-[#991b1b] font-serif font-bold text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300" data-testid="button-explore-platform">
                  {t.cta.explorePlatform}
              </Link>
              <Link to="/career" className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white text-white font-serif font-bold text-lg rounded-full hover:bg-white/20 transition-all duration-300" data-testid="button-view-careers">
                  {t.cta.viewCareers}
              </Link>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#8B4513]/20 py-8 bg-[#EFE0BD]/50 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <img src={bodhiLogo} alt="Bodhi Technology Lab" className="h-11 brightness-110 contrast-125" />
              <div className="flex gap-6">
                <Link to="/about" className="font-serif text-[#991b1b] underline transition-colors" data-testid="link-footer-about">
                    {t.footer.about}
                </Link>
                <Link to="/career" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors" data-testid="link-footer-career">
                    {t.footer.career}
                </Link>
                <Link to="/terms" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors" data-testid="link-footer-terms">
                    {t.footer.terms}
                </Link>
                <Link to="/privacy" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors" data-testid="link-footer-privacy">
                    {t.footer.privacy}
                </Link>
              </div>
              <div className="font-serif text-[#8B4513]/50">© {new Date().getFullYear()} Bodhi Technology Lab</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


