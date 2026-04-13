import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full p-1 border border-[#8B4513]/20">
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 rounded-full font-serif text-sm transition-all ${
          language === "en"
            ? "bg-[#991b1b] text-white"
            : "text-[#8B4513]/70 hover:text-[#991b1b]"
        }`}
        data-testid="button-lang-en"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("vi")}
        className={`px-3 py-1.5 rounded-full font-serif text-sm transition-all ${
          language === "vi"
            ? "bg-[#991b1b] text-white"
            : "text-[#8B4513]/70 hover:text-[#991b1b]"
        }`}
        data-testid="button-lang-vi"
      >
        VI
      </button>
    </div>
  );
}

