import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Building2, User, Mail, Phone, MapPin, Users, Globe, Wrench, FileText, ClipboardList, PhoneCall, Settings, Rocket, Check, ArrowRight, ArrowLeft, Video, MessageSquare, Monitor, HeadphonesIcon, XCircle, AlertTriangle } from "lucide-react";
import { TracingBeam } from "@/components/TracingBeam";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { processTranslations } from "@/translations/process";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Turnstile } from "../lib/turnstile-stub";

const stepIcons = [ClipboardList, PhoneCall, Settings, Rocket];
const commIcons = [Video, MessageSquare, Monitor, HeadphonesIcon];

export default function Process() {
  const { language } = useLanguage();
  const t = processTranslations[language];
  useDocumentTitle("How It Works", "Learn how Bodhi Technology Lab onboards your temple — from consultation to launch.");

  const [formStep, setFormStep] = useState(0);
  const totalFormSteps = 4;

  const [formData, setFormData] = useState({
    templeName: "",
    contactName: "",
    email: "",
    phone: "",
    location: "",
    communitySize: "",
    digitalPresence: [] as string[],
    servicesNeeded: [] as string[],
    notes: "",
  });

  const handleCheckbox = (field: "digitalPresence" | "servicesNeeded", value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.templeName || !formData.contactName || !formData.email) return;

    setIsSubmitting(true);
    const nameParts = formData.contactName.trim().split(" ");
    const firstName = nameParts[0] || formData.contactName;
    const lastName = nameParts.slice(1).join(" ") || "";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: formData.email,
          organizationName: formData.templeName,
          role: "",
          organizationType: "",
          communitySize: formData.communitySize,
          cfTurnstileToken: turnstileToken,
          message: [
            formData.location && `Location: ${formData.location}`,
            formData.digitalPresence.length && `Digital presence: ${formData.digitalPresence.join(", ")}`,
            formData.servicesNeeded.length && `Services needed: ${formData.servicesNeeded.join(", ")}`,
            formData.notes && `Notes: ${formData.notes}`,
          ].filter(Boolean).join("\n"),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Request Sent!", description: "We'll be in touch within 24 hours." });
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to send. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [t.steps.step1, t.steps.step2, t.steps.step3, t.steps.step4] as Array<{
    label: string; title: string; timeline: string; description: string; deliverables: string[]; price?: string;
    weHandle: string[]; youProvide: string[]; notIncluded?: string[];
  }>;

  const inputClass = "w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all";

  return (
    <div className="min-h-screen bg-[#EFE0BD] text-[#8B4513] overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EFE0BD] via-[#E5D5B7] to-[#EFE0BD]"></div>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(rgba(139, 69, 19, 0.3) 1px, transparent 1px)`, backgroundSize: "30px 30px" }}></div>
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#991b1b]/10 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[#8B4513]/10 blur-[80px] animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#EFE0BD]/80 border-b border-[#8B4513]/20">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="relative group">
              <Link to="/"><a className="flex items-center" data-testid="link-brand"><span className="font-serif font-bold text-[#991b1b] text-lg">{t.header.brand}</span></a></Link>
              <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-out transform group-hover:translate-y-0 -translate-y-2">
                <div className="bg-gradient-to-br from-[#EFE0BD] to-[#E5D5B7] backdrop-blur-xl border border-[#8B4513]/30 rounded-3xl shadow-2xl overflow-hidden w-[250px]" style={{ boxShadow: 'inset 0 1px 2px rgba(139, 69, 19, 0.1), 0 20px 60px rgba(139, 69, 19, 0.15)' }}>
                  <div className="p-6">
                    <h3 className="font-serif font-bold text-[#991b1b] mb-5 text-xs uppercase tracking-wider flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#991b1b]/10 flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 text-[#991b1b]" /></div>
                      {t.header.company}
                    </h3>
                    <div className="space-y-3">
                      <Link to="/career"><a className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10"><div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>{t.header.companyDropdown.career}</a></Link>
                      <Link to="/terms"><a className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10"><div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>{t.header.companyDropdown.terms}</a></Link>
                      <Link to="/privacy"><a className="group/item flex items-center gap-2 font-serif text-[#8B4513]/80 hover:text-[#991b1b] transition-all text-sm py-1.5 px-2 rounded-lg hover:bg-[#991b1b]/10"><div className="w-1 h-1 rounded-full bg-[#8B4513]/40 group-hover/item:bg-[#991b1b]"></div>{t.header.companyDropdown.privacy}</a></Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/platform"><a className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors">{t.header.nav.platform}</a></Link>
              <a href="/#capabilities" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors">{t.header.nav.services}</a>
              <a href="/#services" className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors">{t.header.nav.pricing}</a>
              <Link to="/discovery"><a className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors">{t.header.nav.discovery}</a></Link>
              <Link to="/docs/overview"><a className="font-serif text-[#8B4513]/70 hover:text-[#991b1b] px-4 py-2 rounded-full hover:bg-[#8B4513]/5 transition-colors">{t.header.nav.docs}</a></Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        <TracingBeam className="pt-24">
          {/* Hero */}
          <section className="px-4 pt-16 pb-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 text-[#991b1b] leading-tight" data-testid="text-process-title">
                {t.hero.title}
              </h1>
              <p className="font-serif text-lg md:text-xl text-[#8B4513]/70 max-w-2xl mx-auto">
                {t.hero.subtitle}
              </p>
            </div>
          </section>

          {/* Horizontal Timeline Visualization */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-serif text-2xl font-bold text-[#2c2c2c] text-center mb-10">{t.timeline.title}</h2>
              <div className="relative">
                {/* Connection line */}
                <div className="absolute top-8 left-0 right-0 h-0.5 bg-[#8B4513]/20 hidden md:block"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {t.timeline.nodes.map((node, index) => {
                    const Icon = stepIcons[index];
                    return (
                      <div key={index} className="flex flex-col items-center text-center" data-testid={`timeline-node-${index}`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center relative z-10 shadow-lg mb-3 ${
                          index === 0 ? "bg-[#991b1b] text-white" : "bg-white border-2 border-[#8B4513]/30 text-[#8B4513]"
                        }`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <span className="font-serif font-bold text-[#2c2c2c] text-sm">{node.label}</span>
                        <span className="font-mono text-xs text-[#991b1b] font-semibold mt-1">{node.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Steps */}
          <section className="px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {steps.map((step, index) => {
                const Icon = stepIcons[index];
                return (
                  <div key={index} className="bg-white/50 backdrop-blur-md rounded-2xl border border-[#8B4513]/20 shadow-lg overflow-hidden" data-testid={`step-${index + 1}`}>
                    <div className="p-6 md:p-8">
                      {/* Step header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          index === 0 ? "bg-[#991b1b] text-white" : "bg-[#8B4513]/10 text-[#8B4513]"
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#991b1b]">{step.label}</span>
                          <h3 className="font-serif text-xl md:text-2xl font-bold text-[#2c2c2c]">{step.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-full bg-[#8B4513]/10 text-[#8B4513]">{step.timeline}</span>
                          {step.price && (
                            <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-full bg-[#991b1b]/10 text-[#991b1b]">{step.price}</span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="font-serif text-sm md:text-base text-[#8B4513]/70 leading-relaxed mb-5">
                        {step.description}
                      </p>

                      {/* Deliverables */}
                      <div className="bg-[#EFE0BD]/50 rounded-xl p-5 mb-4">
                        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513] mb-3">{language === 'en' ? 'Deliverables' : 'Sản Phẩm Bàn Giao'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {step.deliverables.map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-[#991b1b] flex-shrink-0 mt-0.5" />
                              <span className="font-serif text-sm text-[#2c2c2c]">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Per-step responsibilities */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* We Handle */}
                        <div className="bg-[#991b1b]/5 rounded-xl p-5 border border-[#991b1b]/10">
                          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#991b1b] mb-3 flex items-center gap-1.5">
                            <Rocket className="w-3.5 h-3.5" />
                            {language === 'en' ? 'We Handle' : 'Chúng Tôi Lo Liệu'}
                          </h4>
                          <div className="space-y-2">
                            {step.weHandle.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-[#991b1b] flex-shrink-0 mt-0.5" />
                                <span className="font-serif text-xs text-[#2c2c2c]">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* You Provide */}
                        <div className="bg-[#8B4513]/5 rounded-xl p-5 border border-[#8B4513]/10">
                          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513] mb-3 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {language === 'en' ? 'You Provide' : 'Bạn Cung Cấp'}
                          </h4>
                          <div className="space-y-2">
                            {step.youProvide.map((item, i) => {
                              const isHeader = item.startsWith('🏠') || item.startsWith('🤖') || item.startsWith('👤');
                              return isHeader ? (
                                <div key={i} className={`font-serif text-xs font-bold text-[#8B4513] ${i > 0 ? 'mt-3 pt-3 border-t border-[#8B4513]/10' : ''}`}>
                                  {item}
                                </div>
                              ) : (
                                <div key={i} className="flex items-start gap-2 pl-1">
                                  <Check className="w-3.5 h-3.5 text-[#8B4513] flex-shrink-0 mt-0.5" />
                                  <span className="font-serif text-xs text-[#2c2c2c]">{item}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Not Included (only for steps that have it) */}
                      {step.notIncluded && step.notIncluded.length > 0 && (
                        <div className="bg-[#f5f0e8] rounded-xl p-5 border border-dashed border-[#8B4513]/20">
                          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513]/60 mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {language === 'en' ? 'Not Included (Available as Add-Ons)' : 'Không Bao Gồm (Có Thể Thêm)'}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {step.notIncluded.map((item, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <XCircle className="w-3.5 h-3.5 text-[#8B4513]/40 flex-shrink-0 mt-0.5" />
                                <span className="font-serif text-xs text-[#8B4513]/60">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Responsibility Matrix — Full Scope Summary */}
          <section className="px-4 py-12">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-serif text-3xl font-bold text-[#2c2c2c] text-center mb-2">{t.responsibilities.title}</h2>
              <p className="font-serif text-base text-[#8B4513]/60 text-center mb-10">{(t.responsibilities as any).subtitle}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* We Handle */}
                <div className="bg-gradient-to-br from-[#991b1b]/10 to-[#8B4513]/5 backdrop-blur-md rounded-2xl border-2 border-[#991b1b]/30 p-6" data-testid="card-we-handle">
                  <h3 className="font-serif text-lg font-bold text-[#991b1b] mb-5 flex items-center gap-2">
                    <Rocket className="w-5 h-5" />
                    {t.responsibilities.weHandle.title}
                  </h3>
                  <div className="space-y-2.5">
                    {t.responsibilities.weHandle.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#991b1b] flex-shrink-0 mt-0.5" />
                        <span className="font-serif text-sm text-[#2c2c2c]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* You Provide */}
                <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-[#8B4513]/20 p-6" data-testid="card-you-provide">
                  <h3 className="font-serif text-lg font-bold text-[#8B4513] mb-5 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {t.responsibilities.youProvide.title}
                  </h3>
                  <div className="space-y-2.5">
                    {t.responsibilities.youProvide.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#8B4513] flex-shrink-0 mt-0.5" />
                        <span className="font-serif text-sm text-[#2c2c2c]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Not Included */}
                <div className="bg-[#f5f0e8]/80 backdrop-blur-md rounded-2xl border border-dashed border-[#8B4513]/20 p-6" data-testid="card-not-included">
                  <h3 className="font-serif text-lg font-bold text-[#8B4513]/60 mb-5 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {(t.responsibilities as any).notIncluded.title}
                  </h3>
                  <div className="space-y-2.5">
                    {((t.responsibilities as any).notIncluded.items as string[]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-[#8B4513]/40 flex-shrink-0 mt-0.5" />
                        <span className="font-serif text-sm text-[#8B4513]/60">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Communication Section */}
          <section className="px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-serif text-3xl font-bold text-[#2c2c2c] text-center mb-10">{t.communication.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {t.communication.channels.map((channel, index) => {
                  const CommIcon = commIcons[index];
                  return (
                    <div key={index} className="bg-white/50 backdrop-blur-md rounded-2xl border border-[#8B4513]/20 p-6 flex items-start gap-4" data-testid={`comm-${index}`}>
                      <div className="w-10 h-10 rounded-full bg-[#991b1b]/10 flex items-center justify-center flex-shrink-0">
                        <CommIcon className="w-5 h-5 text-[#991b1b]" />
                      </div>
                      <div>
                        <h4 className="font-serif text-base font-bold text-[#2c2c2c] mb-1">{channel.title}</h4>
                        <p className="font-serif text-sm text-[#8B4513]/70">{channel.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Multi-Step Discovery Form */}
          <section className="px-4 py-12" id="form">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl font-bold text-[#991b1b] mb-2" data-testid="text-form-title">{t.formSection.title}</h2>
                <p className="font-serif text-lg text-[#8B4513]/70">{t.formSection.subtitle}</p>
              </div>

              <div className="bg-white/50 backdrop-blur-md rounded-2xl border-2 border-[#8B4513]/20 shadow-xl p-8 md:p-10">
                {/* Progress bar */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#8B4513]">
                      {t.formSection.step} {formStep + 1} {t.formSection.of} {totalFormSteps}
                    </span>
                    <span className="font-serif text-sm font-semibold text-[#991b1b]">{t.formSection.stepLabels[formStep]}</span>
                  </div>
                  <div className="w-full h-2 bg-[#8B4513]/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#991b1b] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((formStep + 1) / totalFormSteps) * 100}%` }}
                    />
                  </div>
                  {/* Step indicators */}
                  <div className="flex justify-between mt-3">
                    {t.formSection.stepLabels.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setFormStep(i)}
                        className={`font-serif text-xs transition-colors ${
                          i === formStep ? "text-[#991b1b] font-bold" : i < formStep ? "text-[#8B4513]/70" : "text-[#8B4513]/30"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleFormSubmit}>
                  {/* Step 1: Temple Info */}
                  {formStep === 0 && (
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                          <Building2 className="w-4 h-4 text-[#991b1b]" />
                          {t.form.templeName} <span className="text-[#991b1b]">*</span>
                        </label>
                        <input type="text" value={formData.templeName} onChange={(e) => setFormData({ ...formData, templeName: e.target.value })} className={inputClass} placeholder={t.form.templeNamePlaceholder} required data-testid="input-temple-name" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                          <MapPin className="w-4 h-4 text-[#991b1b]" />
                          {t.form.location}
                        </label>
                        <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={inputClass} placeholder={t.form.locationPlaceholder} data-testid="input-location" />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                          <Users className="w-4 h-4 text-[#991b1b]" />
                          {t.form.communitySize}
                        </label>
                        <select value={formData.communitySize} onChange={(e) => setFormData({ ...formData, communitySize: e.target.value })} className={inputClass} data-testid="select-community-size">
                          <option value="" disabled>{t.form.communitySizePlaceholder}</option>
                          {t.form.communitySizeOptions.map((option, i) => (<option key={i} value={option}>{option}</option>))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Contact Details */}
                  {formStep === 1 && (
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                          <User className="w-4 h-4 text-[#991b1b]" />
                          {t.form.contactName} <span className="text-[#991b1b]">*</span>
                        </label>
                        <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className={inputClass} placeholder={t.form.contactNamePlaceholder} required data-testid="input-contact-name" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                            <Mail className="w-4 h-4 text-[#991b1b]" />
                            {t.form.email} <span className="text-[#991b1b]">*</span>
                          </label>
                          <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder={t.form.emailPlaceholder} required data-testid="input-email" />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                            <Phone className="w-4 h-4 text-[#991b1b]" />
                            {t.form.phone}
                          </label>
                          <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder={t.form.phonePlaceholder} data-testid="input-phone" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Your Needs */}
                  {formStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-3">
                          <Globe className="w-4 h-4 text-[#991b1b]" />
                          {t.form.digitalPresence}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {t.form.digitalPresenceOptions.map((option, i) => (
                            <label key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all font-serif text-sm ${formData.digitalPresence.includes(option) ? "bg-[#991b1b]/10 border-[#991b1b]/40 text-[#991b1b]" : "bg-white border-[#8B4513]/20 text-[#2c2c2c] hover:border-[#8B4513]/40"}`}>
                              <input type="checkbox" checked={formData.digitalPresence.includes(option)} onChange={() => handleCheckbox("digitalPresence", option)} className="sr-only" />
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${formData.digitalPresence.includes(option) ? "bg-[#991b1b] border-[#991b1b]" : "border-[#8B4513]/30"}`}>
                                {formData.digitalPresence.includes(option) && (<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>)}
                              </div>
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-3">
                          <Wrench className="w-4 h-4 text-[#991b1b]" />
                          {t.form.servicesNeeded}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {t.form.servicesNeededOptions.map((option, i) => (
                            <label key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all font-serif text-sm ${formData.servicesNeeded.includes(option) ? "bg-[#991b1b]/10 border-[#991b1b]/40 text-[#991b1b]" : "bg-white border-[#8B4513]/20 text-[#2c2c2c] hover:border-[#8B4513]/40"}`}>
                              <input type="checkbox" checked={formData.servicesNeeded.includes(option)} onChange={() => handleCheckbox("servicesNeeded", option)} className="sr-only" />
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${formData.servicesNeeded.includes(option) ? "bg-[#991b1b] border-[#991b1b]" : "border-[#8B4513]/30"}`}>
                                {formData.servicesNeeded.includes(option) && (<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>)}
                              </div>
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Review & Submit */}
                  {formStep === 3 && (
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center gap-2 font-serif text-sm font-medium text-[#2c2c2c] mb-1.5">
                          <FileText className="w-4 h-4 text-[#991b1b]" />
                          {t.form.notes}
                        </label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className={`${inputClass} resize-none`} placeholder={t.form.notesPlaceholder} data-testid="textarea-notes" />
                      </div>

                      {/* Review summary */}
                      <div className="bg-[#EFE0BD]/50 rounded-xl p-5 space-y-3">
                        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513] mb-3">Summary</h4>
                        {formData.templeName && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.templeName}:</span><span className="text-[#2c2c2c] font-medium">{formData.templeName}</span></div>}
                        {formData.contactName && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.contactName}:</span><span className="text-[#2c2c2c] font-medium">{formData.contactName}</span></div>}
                        {formData.email && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.email}:</span><span className="text-[#2c2c2c] font-medium">{formData.email}</span></div>}
                        {formData.phone && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.phone}:</span><span className="text-[#2c2c2c] font-medium">{formData.phone}</span></div>}
                        {formData.location && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.location}:</span><span className="text-[#2c2c2c] font-medium">{formData.location}</span></div>}
                        {formData.communitySize && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.communitySize}:</span><span className="text-[#2c2c2c] font-medium">{formData.communitySize}</span></div>}
                        {formData.servicesNeeded.length > 0 && <div className="flex gap-2 font-serif text-sm"><span className="text-[#8B4513]/50 w-28 flex-shrink-0">{t.form.servicesNeeded}:</span><span className="text-[#2c2c2c] font-medium">{formData.servicesNeeded.join(", ")}</span></div>}
                      </div>

                      {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                        <Turnstile
                          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                          onSuccess={setTurnstileToken}
                          onExpire={() => setTurnstileToken(null)}
                        />
                      )}

                      {submitted ? (
                        <div className="p-4 bg-green-100 border border-green-200 rounded-xl text-center font-serif text-green-800">
                          ✓ Request sent! We'll contact you within 24 hours.
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting || !formData.templeName || !formData.contactName || !formData.email || (!!import.meta.env.VITE_TURNSTILE_SITE_KEY && !turnstileToken)}
                          className="w-full px-6 py-3 bg-[#991b1b] text-white rounded-xl font-serif font-semibold hover:bg-[#7a1515] transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-submit-process"
                        >
                          {isSubmitting ? "Sending..." : t.form.submit}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex justify-between mt-8">
                    <button
                      type="button"
                      onClick={() => setFormStep((s) => Math.max(0, s - 1))}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-serif font-semibold text-sm transition-all ${
                        formStep === 0 ? "opacity-0 pointer-events-none" : "bg-[#8B4513]/10 text-[#8B4513] hover:bg-[#8B4513]/20"
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t.formSection.previous}
                    </button>
                    {formStep < totalFormSteps - 1 && (
                      <button
                        type="button"
                        onClick={() => setFormStep((s) => Math.min(totalFormSteps - 1, s + 1))}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#991b1b] text-white rounded-xl font-serif font-semibold text-sm hover:bg-[#7a1515] transition-all"
                      >
                        {t.formSection.next}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </section>
        </TracingBeam>

        {/* Footer */}
        <footer className="border-t border-[#8B4513]/20 py-8 bg-[#EFE0BD]/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="font-serif font-bold text-[#991b1b]">{t.footer.brand}</span>
              <div className="flex gap-6">
                <Link to="/" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">{t.footer.platform}</Link>
                <Link to="/" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">{t.footer.services}</Link>
                <Link to="/discovery" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">{t.footer.discovery}</Link>
                <Link to="/docs/overview" className="font-serif text-[#8B4513]/50 hover:text-[#991b1b] transition-colors">{t.footer.docs}</Link>
              </div>
              <div className="font-serif text-[#8B4513]/50">{t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


