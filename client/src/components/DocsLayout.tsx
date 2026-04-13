import { useState } from "react";
import { DocsNav } from "@/components/DocsNav";
import { Button } from "@/components/ui/button";
import { TracingBeam } from "@/components/TracingBeam";
import { Download, Share2, Menu, X, BookOpen, Coins, Server, Bot } from "lucide-react";
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

  const navigation = [
    {
      id: "overview",
      title: t.layout.navigation.overview.title,
      icon: BookOpen,
      children: [
        { id: "mission", title: t.layout.navigation.overview.sections.mission, href: "/docs/overview#mission" },
        { id: "principles", title: t.layout.navigation.overview.sections.principles, href: "/docs/overview#principles" },
        { id: "methods", title: t.layout.navigation.overview.sections.methods, href: "/docs/overview#methods" },
        { id: "capabilities", title: t.layout.navigation.overview.sections.capabilities, href: "/docs/overview#capabilities" },
        { id: "why-partner", title: t.layout.navigation.overview.sections.whyPartner, href: "/docs/overview#why-partner" },
        { id: "infrastructure", title: t.layout.navigation.overview.sections.infrastructure, href: "/docs/overview#infrastructure" },
        { id: "join", title: t.layout.navigation.overview.sections.join, href: "/docs/overview#join" },
        { id: "fourth-grace", title: t.layout.navigation.overview.sections.fourthGrace, href: "/docs/overview#fourth-grace" },
      ],
    },
    {
      id: "tech-stack",
      title: t.layout.navigation.techStack.title,
      icon: Server,
      children: [
        { id: "vision", title: t.layout.navigation.techStack.sections.vision, href: "/docs/tech-stack#vision-mission" },
        { id: "compute", title: t.layout.navigation.techStack.sections.compute, href: "/docs/tech-stack#compute-mandala" },
        { id: "ledger", title: t.layout.navigation.techStack.sections.ledger, href: "/docs/tech-stack#mandala-ledger" },
        { id: "protocol", title: t.layout.navigation.techStack.sections.protocol, href: "/docs/tech-stack#merit-protocol" },
        { id: "primitives", title: t.layout.navigation.techStack.sections.primitives, href: "/docs/tech-stack#primitives" },
        { id: "privacy", title: t.layout.navigation.techStack.sections.privacy, href: "/docs/tech-stack#privacy-dharma" },
      ],
    },
    {
      id: "agents",
      title: t.layout.navigation.agents.title,
      icon: Bot,
      children: [
        { id: "models", title: t.layout.navigation.agents.sections.models, href: "/docs/models" },
        { id: "quick-start", title: t.layout.navigation.agents.sections.quickStart, href: "/docs/quick-start" },
        { id: "pricing", title: t.layout.navigation.agents.sections.pricing, href: "/docs/pricing" },
      ],
    },
  ];

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
          <DocsNav navigation={navigation} />
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

