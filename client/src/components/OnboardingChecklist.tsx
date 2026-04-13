import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { dashboardOnboardingTranslations } from "@/translations/dashboard-onboarding";
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Upload,
  ExternalLink,
  Palette,
  Globe,
  Bot,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  Circle,
} from "lucide-react";

interface OnboardingData {
  id?: string;
  templeName: string;
  tradition: string;
  location: string;
  language: string;
  logoUrl: string | null;
  primaryColor: string | null;
  theme: string | null;
  contentDriveUrl: string | null;
  spaceType: string;
  customDomain: string | null;
  existingWebsite: string | null;
  doctrinalMode: string | null;
  responseStyle: string | null;
  aiNotes: string | null;
  notes: string | null;
  status: string;
  submittedAt: string | null;
}

const EMPTY_DATA: OnboardingData = {
  templeName: "",
  tradition: "[]",
  location: "",
  language: "vi",
  logoUrl: null,
  primaryColor: null,
  theme: null,
  contentDriveUrl: null,
  spaceType: "dedicated",
  customDomain: null,
  existingWebsite: null,
  doctrinalMode: null,
  responseStyle: null,
  aiNotes: null,
  notes: null,
  status: "draft",
  submittedAt: null,
};

const inputClass =
  "w-full px-4 py-2.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 focus:border-[#991b1b] transition-all";

export default function OnboardingChecklist() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const t = dashboardOnboardingTranslations[language];

  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingData>(EMPTY_DATA);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const totalSteps = 6;
  const stepKeys = ["templeInfo", "branding", "content", "technical", "aiPreferences", "review"] as const;

  const { data: serverData, isLoading } = useQuery<OnboardingData | null>({
    queryKey: ["temple-onboarding"],
    queryFn: async () => {
      const res = await fetch("/api/temple/onboarding", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (serverData) {
      setForm(serverData);
      if (serverData.status !== "draft") setExpanded(true);
    } else if (session?.user?.name) {
      setForm((prev) => ({ ...prev, templeName: prev.templeName || session.user.name || "" }));
    }
  }, [serverData, session]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<OnboardingData>) => {
      const res = await fetch("/api/temple/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      queryClient.invalidateQueries({ queryKey: ["temple-onboarding"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
      setSaveStatus("idle");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/temple/onboarding/submit", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submitted!", description: "Your onboarding information has been sent." });
      queryClient.invalidateQueries({ queryKey: ["temple-onboarding"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const autoSave = useCallback(() => {
    setSaveStatus("saving");
    saveMutation.mutate(form);
  }, [form]);

  const goNext = () => {
    if (step < totalSteps - 1) {
      autoSave();
      setStep(step + 1);
    }
  };
  const goPrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const traditions = (() => {
    try { return JSON.parse(form.tradition || "[]"); } catch { return []; }
  })() as string[];

  const toggleTradition = (val: string) => {
    const updated = traditions.includes(val) ? traditions.filter((t) => t !== val) : [...traditions, val];
    setForm((prev) => ({ ...prev, tradition: JSON.stringify(updated) }));
  };

  // Calculate progress
  const filledSections = [
    !!form.templeName,
    !!form.logoUrl || !!form.primaryColor || !!form.theme,
    !!form.contentDriveUrl,
    true, // space type always has default
    !!form.doctrinalMode || !!form.responseStyle,
  ];
  const progress = Math.round((filledSections.filter(Boolean).length / filledSections.length) * 100);

  const isSubmitted = form.status === "submitted" || form.status === "processing" || form.status === "completed";

  const stepIcons = [Building2, Palette, FileText, Globe, Bot, ClipboardList];

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#991b1b]" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[#991b1b]" />
          <div className="text-left">
            <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.title}</h2>
            <p className="font-serif text-xs text-[#8B4513]/60">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted && (
            <span className={`font-serif text-xs font-medium px-2.5 py-1 rounded-full ${
              form.status === "completed" ? "bg-green-100 text-green-700" :
              form.status === "processing" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {t.status[form.status as keyof typeof t.status]}
            </span>
          )}
          {!isSubmitted && (
            <span className="font-mono text-xs text-[#8B4513]/50">{progress}%</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[#8B4513]/50" /> : <ChevronDown className="w-4 h-4 text-[#8B4513]/50" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-6">
          {/* Submitted state */}
          {isSubmitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className={`w-12 h-12 mx-auto mb-3 ${
                form.status === "completed" ? "text-green-500" : "text-amber-500"
              }`} />
              <p className="font-serif text-sm text-[#8B4513]/70">
                {form.status === "completed" ? t.completedMessage :
                 form.status === "processing" ? t.processingMessage :
                 t.submittedMessage}
              </p>
            </div>
          ) : (
            <>
              {/* Step indicators */}
              <div className="flex items-center justify-between mb-6 overflow-x-auto">
                {stepKeys.map((key, i) => {
                  const Icon = stepIcons[i];
                  const isActive = i === step;
                  const isDone = i < step;
                  return (
                    <button
                      key={key}
                      onClick={() => { if (i < step) autoSave(); setStep(i); }}
                      className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${
                        isActive ? "text-[#991b1b]" : isDone ? "text-[#8B4513]/70" : "text-[#8B4513]/30"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? "bg-[#991b1b] text-white" : isDone ? "bg-[#8B4513]/10" : "bg-[#8B4513]/5"
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="font-serif text-[10px] leading-tight text-center">
                        {t.steps[key as keyof typeof t.steps]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Step 0: Temple Info */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.templeInfo.templeName} <span className="text-[#991b1b]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.templeName}
                      onChange={(e) => setForm({ ...form, templeName: e.target.value })}
                      className={inputClass}
                      placeholder={t.templeInfo.templeNamePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-2 block">
                      {t.templeInfo.tradition}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {t.templeInfo.traditionOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleTradition(opt)}
                          className={`px-3 py-1.5 rounded-full font-serif text-xs border transition-all ${
                            traditions.includes(opt)
                              ? "bg-[#991b1b]/10 border-[#991b1b]/40 text-[#991b1b]"
                              : "bg-white border-[#8B4513]/20 text-[#8B4513]/70 hover:border-[#8B4513]/40"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                        {t.templeInfo.location}
                      </label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className={inputClass}
                        placeholder={t.templeInfo.locationPlaceholder}
                      />
                    </div>
                    <div>
                      <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                        {t.templeInfo.language}
                      </label>
                      <select
                        value={form.language}
                        onChange={(e) => setForm({ ...form, language: e.target.value })}
                        className={inputClass}
                      >
                        <option value="vi">{t.templeInfo.languageOptions.vi}</option>
                        <option value="en">{t.templeInfo.languageOptions.en}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Branding */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.branding.logo}
                    </label>
                    <p className="font-serif text-xs text-[#8B4513]/50 mb-2">{t.branding.logoHint}</p>
                    <div className="flex items-center gap-4">
                      {form.logoUrl && (
                        <img src={form.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-[#8B4513]/20" />
                      )}
                      <label className="cursor-pointer px-4 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#8B4513] hover:bg-[#8B4513]/5 transition-all flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {form.logoUrl ? t.branding.logoChange : t.branding.logoUpload}
                        <input type="file" accept=".png,.svg,.webp" onChange={handleLogoUpload} className="sr-only" />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                        {t.branding.primaryColor}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primaryColor || "#991b1b"}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded border border-[#8B4513]/20 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={form.primaryColor || ""}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className={inputClass}
                          placeholder={t.branding.colorPlaceholder}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                        {t.branding.theme}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {t.branding.themeOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setForm({ ...form, theme: opt })}
                            className={`px-3 py-1.5 rounded-full font-serif text-xs border transition-all ${
                              form.theme === opt
                                ? "bg-[#991b1b]/10 border-[#991b1b]/40 text-[#991b1b]"
                                : "bg-white border-[#8B4513]/20 text-[#8B4513]/70 hover:border-[#8B4513]/40"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Content */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-[#EFE0BD]/50 rounded-xl p-4">
                    <h4 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-2">{t.content.title}</h4>
                    <p className="font-serif text-xs text-[#8B4513]/70 mb-3">{t.content.description}</p>
                    <div className="space-y-1.5 mb-3">
                      <p className="font-serif text-xs font-medium text-[#8B4513]">{t.content.guide}</p>
                      {t.content.folders.map((f, i) => (
                        <p key={i} className="font-serif text-xs text-[#8B4513]/60 pl-2">{f}</p>
                      ))}
                    </div>
                    <p className="font-serif text-xs text-[#991b1b]/70 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {t.content.tip}
                    </p>
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.content.driveUrl}
                    </label>
                    <input
                      type="url"
                      value={form.contentDriveUrl || ""}
                      onChange={(e) => setForm({ ...form, contentDriveUrl: e.target.value || null })}
                      className={inputClass}
                      placeholder={t.content.driveUrlPlaceholder}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Technical */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-green-200 bg-green-50">
                    <p className="font-serif text-sm font-semibold text-green-800">{t.technical.dedicatedSite}</p>
                    <p className="font-serif text-xs text-green-700 mt-1">{t.technical.dedicatedSiteDesc}</p>
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.technical.customDomain}
                    </label>
                    <input
                      type="text"
                      value={form.customDomain || ""}
                      onChange={(e) => setForm({ ...form, customDomain: e.target.value || null })}
                      className={inputClass}
                      placeholder={t.technical.customDomainPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.technical.existingWebsite}
                    </label>
                    <input
                      type="url"
                      value={form.existingWebsite || ""}
                      onChange={(e) => setForm({ ...form, existingWebsite: e.target.value || null })}
                      className={inputClass}
                      placeholder={t.technical.existingWebsitePlaceholder}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: AI Preferences */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-2 block">
                      {t.ai.doctrinalMode}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {t.ai.doctrinalOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setForm({ ...form, doctrinalMode: opt })}
                          className={`px-3 py-1.5 rounded-full font-serif text-xs border transition-all ${
                            form.doctrinalMode === opt
                              ? "bg-[#991b1b]/10 border-[#991b1b]/40 text-[#991b1b]"
                              : "bg-white border-[#8B4513]/20 text-[#8B4513]/70 hover:border-[#8B4513]/40"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-2 block">
                      {t.ai.responseStyle}
                    </label>
                    <div className="space-y-2">
                      {(Object.entries(t.ai.responseOptions) as [string, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm({ ...form, responseStyle: key })}
                          className={`w-full p-3 rounded-lg border text-left font-serif text-sm transition-all ${
                            form.responseStyle === key
                              ? "border-[#991b1b]/40 bg-[#991b1b]/5 text-[#991b1b]"
                              : "border-[#8B4513]/20 bg-white text-[#8B4513]/70 hover:border-[#8B4513]/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="font-serif text-sm font-medium text-[#2c2c2c] mb-1.5 block">
                      {t.ai.notes}
                    </label>
                    <textarea
                      value={form.aiNotes || ""}
                      onChange={(e) => setForm({ ...form, aiNotes: e.target.value || null })}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      placeholder={t.ai.notesPlaceholder}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {step === 5 && (
                <div className="space-y-4">
                  <h3 className="font-serif text-base font-semibold text-[#2c2c2c]">{t.review.title}</h3>
                  <div className="space-y-3">
                    {/* Temple Info */}
                    <ReviewSection
                      label={t.steps.templeInfo}
                      onEdit={() => setStep(0)}
                      editLabel={t.review.editStep}
                    >
                      <ReviewItem label={t.templeInfo.templeName} value={form.templeName} noData={t.review.noData} />
                      <ReviewItem label={t.templeInfo.tradition} value={traditions.length > 0 ? traditions.join(", ") : ""} noData={t.review.noData} />
                      <ReviewItem label={t.templeInfo.location} value={form.location} noData={t.review.noData} />
                      <ReviewItem label={t.templeInfo.language} value={form.language === "vi" ? "Tiếng Việt" : "English"} noData={t.review.noData} />
                    </ReviewSection>

                    {/* Branding */}
                    <ReviewSection label={t.steps.branding} onEdit={() => setStep(1)} editLabel={t.review.editStep}>
                      {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border border-[#8B4513]/20 mb-2" />}
                      <ReviewItem label={t.branding.primaryColor} value={form.primaryColor} noData={t.review.noData} />
                      <ReviewItem label={t.branding.theme} value={form.theme} noData={t.review.noData} />
                    </ReviewSection>

                    {/* Content */}
                    <ReviewSection label={t.steps.content} onEdit={() => setStep(2)} editLabel={t.review.editStep}>
                      <ReviewItem label={t.content.driveUrl} value={form.contentDriveUrl} noData={t.review.noData} />
                    </ReviewSection>

                    {/* Technical */}
                    <ReviewSection label={t.steps.technical} onEdit={() => setStep(3)} editLabel={t.review.editStep}>
                      <ReviewItem label={t.technical.dedicatedSite} value={t.technical.dedicatedSiteDesc} noData={t.review.noData} />
                      <ReviewItem label={t.technical.customDomain} value={form.customDomain} noData={t.review.noData} />
                      <ReviewItem label={t.technical.existingWebsite} value={form.existingWebsite} noData={t.review.noData} />
                    </ReviewSection>

                    {/* AI */}
                    <ReviewSection label={t.steps.aiPreferences} onEdit={() => setStep(4)} editLabel={t.review.editStep}>
                      <ReviewItem label={t.ai.doctrinalMode} value={form.doctrinalMode} noData={t.review.noData} />
                      <ReviewItem label={t.ai.responseStyle} value={form.responseStyle ? t.ai.responseOptions[form.responseStyle as keyof typeof t.ai.responseOptions] : null} noData={t.review.noData} />
                      <ReviewItem label={t.ai.notes} value={form.aiNotes} noData={t.review.noData} />
                    </ReviewSection>
                  </div>

                  <Button
                    onClick={() => {
                      autoSave();
                      submitMutation.mutate();
                    }}
                    disabled={submitMutation.isPending || !form.templeName}
                    className="w-full bg-[#991b1b] text-white hover:bg-[#7a1515] font-serif mt-4"
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t.review.submitting}</>
                    ) : (
                      t.review.submit
                    )}
                  </Button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6 pt-4 border-t border-[#8B4513]/10">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  className={`font-serif text-sm border-[#8B4513]/30 text-[#8B4513] ${step === 0 ? "opacity-0 pointer-events-none" : ""}`}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> {t.nav.previous}
                </Button>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-xs text-[#8B4513]/40">
                    {saveStatus === "saving" ? t.nav.saving : saveStatus === "saved" ? `✓ ${t.nav.saved}` : ""}
                  </span>
                  {step < totalSteps - 1 && (
                    <Button
                      onClick={goNext}
                      className="bg-[#991b1b] text-white hover:bg-[#7a1515] font-serif text-sm"
                    >
                      {t.nav.next} <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ReviewSection({ label, onEdit, editLabel, children }: { label: string; onEdit: () => void; editLabel: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#EFE0BD]/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513]">{label}</h4>
        <button onClick={onEdit} className="font-serif text-xs text-[#991b1b] hover:underline">{editLabel}</button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value, noData }: { label: string; value: string | null | undefined; noData: string }) {
  return (
    <div className="flex gap-2 font-serif text-sm">
      <span className="text-[#8B4513]/50 min-w-[120px] flex-shrink-0">{label}:</span>
      <span className={value ? "text-[#2c2c2c]" : "text-[#8B4513]/30 italic"}>{value || noData}</span>
    </div>
  );
}

