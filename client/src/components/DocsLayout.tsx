import { useState } from "react";
import { DocsNav } from "@/components/DocsNav";
import { Button } from "@/components/ui/button";
import { TracingBeam } from "@/components/TracingBeam";
import { Download, Share2, Menu, X } from "lucide-react";
import sutraIcon from "@/assets/sutra-icon.webp";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { docsTranslations } from "@/translations/docs";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const { language } = useLanguage();
  const t = docsTranslations[language];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover-elevate rounded-lg transition-all"
              data-testid="button-sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <img src={sutraIcon} alt="Sutra" className="w-6 h-6" />
              <span className="font-serif text-base sm:text-lg font-bold text-primary">{t.layout.header.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="hidden sm:flex" data-testid="button-download">
              <Download className="w-3.5 h-3.5 mr-2" />
              <span>{t.layout.header.exportPdf}</span>
            </Button>
            <Button size="sm" data-testid="button-share">
              <Share2 className="w-3.5 h-3.5 mr-2" />
              <span>{t.layout.header.share}</span>
            </Button>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="flex pt-[57px]">
        <aside className={`fixed top-[57px] left-0 h-[calc(100vh-57px)] w-80 bg-sidebar border-r overflow-y-auto z-30 lg:block ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <DocsNav language="vi" setLanguage={() => {}} />
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 lg:ml-80">
          <TracingBeam className="py-8 px-4">
            {children}
          </TracingBeam>
        </main>
      </div>
    </div>
  );
}

