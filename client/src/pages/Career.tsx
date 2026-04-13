import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import lotusIcon from "../assets/lotus-icon.webp";
import bellIcon from "../assets/bell-icon.webp";
import buddhaIcon from "../assets/buddha-icon.webp";
import sutraIcon from "../assets/sutra-scroll-icon.webp";
import bodhiLogo from "../assets/bodhi-technology-lab-logo.webp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { careerTranslations } from "@/translations/career";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Career() {
  const { language } = useLanguage();
  const t = careerTranslations[language];
  useDocumentTitle("Careers", "Join Bodhi Technology Lab. Build technology that empowers Buddhist communities worldwide.");
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
                  {t.footer.home}
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
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#991b1b] mb-6" data-testid="text-career-title">
              {t.hero.title}
            </h1>
            <p className="font-serif text-xl text-[#8B4513]/80 mb-8 max-w-3xl mx-auto">
              {t.hero.subtitle}
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#991b1b] to-transparent mx-auto"></div>
          </div>
        </section>

        {/* Our Culture */}
        <section className="py-16 px-4 bg-[#EFE0BD]/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-[#991b1b] mb-12 text-center" data-testid="text-culture-title">
              {t.culture.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 space-y-4" data-testid="card-culture-intentional">
                <div className="flex items-center gap-3">
                  <img src={lotusIcon} alt="Lotus" className="w-12 h-12 object-contain" />
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c]">{t.culture.intentional.title}</h3>
                </div>
                <p className="font-serif text-sm text-[#8B4513]/70">
                  {t.culture.intentional.text}
                </p>
              </div>

              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 space-y-4" data-testid="card-culture-distributed">
                <div className="flex items-center gap-3">
                  <img src={bellIcon} alt="Bell" className="w-12 h-12 object-contain" />
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c]">{t.culture.distributed.title}</h3>
                </div>
                <p className="font-serif text-sm text-[#8B4513]/70">
                  {t.culture.distributed.text}
                </p>
              </div>

              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-6 space-y-4" data-testid="card-culture-contemplative">
                <div className="flex items-center gap-3">
                  <img src={buddhaIcon} alt="Buddha" className="w-12 h-12 object-contain" />
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c]">{t.culture.contemplative.title}</h3>
                </div>
                <p className="font-serif text-sm text-[#8B4513]/70">
                  {t.culture.contemplative.text}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-[#991b1b] mb-4 text-center" data-testid="text-positions-title">
              {t.positions.title}
            </h2>
            <p className="font-serif text-lg text-[#8B4513]/70 text-center mb-12 max-w-2xl mx-auto">
              {t.positions.subtitle}
            </p>

            <div className="space-y-6">
              {/* Senior Full-Stack Engineer */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-8 hover:border-[#991b1b]/40 transition-all duration-300 hover:shadow-xl" data-testid="card-job-fullstack">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2">{t.positions.fullstack.title}</h3>
                    <p className="font-serif text-sm text-[#8B4513]/70">{t.positions.fullstack.location}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-[#991b1b]/10 text-[#991b1b] font-serif font-semibold text-sm whitespace-nowrap">
                    {t.positions.fullstack.status}
                  </span>
                </div>
                <p className="font-serif text-[#2c2c2c] mb-6">
                  {t.positions.fullstack.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">React</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">TypeScript</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Node.js</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">PostgreSQL</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">AI/LLMs</span>
                </div>
                <a
                  href="mailto:talent@boddhilab.io?subject=Application: Senior Full-Stack Engineer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#991b1b] text-white font-serif font-semibold rounded-xl hover:bg-[#7a1515] transition-all duration-300 shadow-md"
                  data-testid="button-apply-fullstack"
                >
                  {t.positions.applyNow}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* AI/ML Engineer */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-8 hover:border-[#991b1b]/40 transition-all duration-300 hover:shadow-xl" data-testid="card-job-ai">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2">{t.positions.ai.title}</h3>
                    <p className="font-serif text-sm text-[#8B4513]/70">{t.positions.ai.location}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-[#991b1b]/10 text-[#991b1b] font-serif font-semibold text-sm whitespace-nowrap">
                    {t.positions.ai.status}
                  </span>
                </div>
                <p className="font-serif text-[#2c2c2c] mb-6">
                  {t.positions.ai.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Python</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">LangChain</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Vector DBs</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">RAG</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Fine-tuning</span>
                </div>
                <a
                  href="mailto:talent@boddhilab.io?subject=Application: AI/ML Engineer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#991b1b] text-white font-serif font-semibold rounded-xl hover:bg-[#7a1515] transition-all duration-300 shadow-md"
                  data-testid="button-apply-ai"
                >
                  {t.positions.applyNow}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Product Designer */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-8 hover:border-[#991b1b]/40 transition-all duration-300 hover:shadow-xl" data-testid="card-job-designer">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2">{t.positions.product.title}</h3>
                    <p className="font-serif text-sm text-[#8B4513]/70">{t.positions.product.location}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-[#991b1b]/10 text-[#991b1b] font-serif font-semibold text-sm whitespace-nowrap">
                    {t.positions.product.status}
                  </span>
                </div>
                <p className="font-serif text-[#2c2c2c] mb-6">
                  {t.positions.product.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Figma</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">UI/UX</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Design Systems</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Accessibility</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Bilingual</span>
                </div>
                <a
                  href="mailto:talent@boddhilab.io?subject=Application: Product Designer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#991b1b] text-white font-serif font-semibold rounded-xl hover:bg-[#7a1515] transition-all duration-300 shadow-md"
                  data-testid="button-apply-designer"
                >
                  {t.positions.applyNow}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* DevOps Engineer */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 p-8 hover:border-[#991b1b]/40 transition-all duration-300 hover:shadow-xl" data-testid="card-job-devops">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#991b1b] mb-2">{t.positions.devops.title}</h3>
                    <p className="font-serif text-sm text-[#8B4513]/70">{t.positions.devops.location}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-[#991b1b]/10 text-[#991b1b] font-serif font-semibold text-sm whitespace-nowrap">
                    {t.positions.devops.status}
                  </span>
                </div>
                <p className="font-serif text-[#2c2c2c] mb-6">
                  {t.positions.devops.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Kubernetes</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Docker</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">CI/CD</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Terraform</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-sans bg-[#991b1b]/10 text-[#991b1b]">Monitoring</span>
                </div>
                <a
                  href="mailto:talent@boddhilab.io?subject=Application: DevOps Engineer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#991b1b] text-white font-serif font-semibold rounded-xl hover:bg-[#7a1515] transition-all duration-300 shadow-md"
                  data-testid="button-apply-devops"
                >
                  {t.positions.applyNow}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-4 bg-[#EFE0BD]/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-[#991b1b] mb-12 text-center" data-testid="text-benefits-title">
              {t.benefits.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4" data-testid="card-benefit-compensation">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.compensation.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.compensation.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="card-benefit-retreat">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.retreat.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.retreat.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="card-benefit-flexible">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.flexible.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.flexible.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="card-benefit-learning">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.learning.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.learning.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="card-benefit-health">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.health.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.health.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-4" data-testid="card-benefit-sabbatical">
                <img src={lotusIcon} alt="Lotus" className="w-6 h-6 object-contain flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2c2c2c] mb-2">{t.benefits.sabbatical.title}</h3>
                  <p className="font-serif text-sm text-[#8B4513]/70">
                    {t.benefits.sabbatical.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Application Process */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-4xl font-bold text-[#991b1b] mb-12 text-center" data-testid="text-process-title">
              {t.process.title}
            </h2>
            <div className="space-y-8">
              <div className="flex gap-6" data-testid="card-step-1">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-serif font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-2">{t.process.step1.title}</h3>
                  <p className="font-serif text-[#8B4513]/70">
                    {t.process.step1.text} <a href="mailto:talent@boddhilab.io" className="text-[#991b1b] underline font-semibold" data-testid="link-email-talent">talent@boddhilab.io</a>
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="card-step-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-serif font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-2">{t.process.step2.title}</h3>
                  <p className="font-serif text-[#8B4513]/70">
                    {t.process.step2.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="card-step-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-serif font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-2">{t.process.step3.title}</h3>
                  <p className="font-serif text-[#8B4513]/70">
                    {t.process.step3.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="card-step-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-serif font-bold text-lg">
                  4
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-2">{t.process.step4.title}</h3>
                  <p className="font-serif text-[#8B4513]/70">
                    {t.process.step4.text}
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="card-step-5">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#991b1b] text-white flex items-center justify-center font-serif font-bold text-lg">
                  5
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#2c2c2c] mb-2">{t.process.step5.title}</h3>
                  <p className="font-serif text-[#8B4513]/70">
                    {t.process.step5.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 px-4 bg-gradient-to-br from-[#991b1b]/10 to-[#8B4513]/10">
          <div className="max-w-4xl mx-auto text-center">
            <img src={bellIcon} alt="Bell" className="w-16 h-16 object-contain mx-auto mb-6" />
            <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-4" data-testid="text-contact-title">
              {t.contact.title}
            </h2>
            <p className="font-serif text-lg text-[#8B4513]/80 mb-8 max-w-2xl mx-auto">
              {t.contact.text}
            </p>
            <a
              href="mailto:talent@boddhilab.io?subject=General Inquiry"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#991b1b] text-white font-serif font-semibold text-lg rounded-xl hover:bg-[#7a1515] transition-all duration-300 shadow-xl"
              data-testid="button-contact-general"
            >
              {t.contact.button}
              <ArrowRight className="w-5 h-5" />
            </a>
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


