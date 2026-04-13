import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Key, User, Settings, Zap, Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations } from "@/translations/docs";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function QuickStart() {
  const { language, setLanguage } = useLanguage();
  const t = docsTranslations[language].quickStart;
  useDocumentTitle("Quick Start Guide", "Get started with Bodhi Technology Lab. Set up your temple's digital platform in minutes.");

  return (
    <div className="max-w-6xl mx-auto px-8 py-16 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-4 flex-1">
          <h1 className="font-serif text-4xl font-semibold text-foreground" data-testid="heading-quick-start">
            {t.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t.subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          size="default"
          onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
          className="gap-2"
          data-testid="button-language-toggle"
        >
          <Languages className="w-4 h-4" />
          {t.languageToggle}
        </Button>
      </div>

      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-serif text-2xl font-semibold">{t.understanding.title}</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {t.understanding.description}
        </p>
      </Card>

      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Key className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="font-serif text-xl font-semibold">{t.systemKey.title}</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t.systemKey.description}
          </p>
          
          <div>
            <h4 className="text-sm font-semibold mb-3">{t.systemKey.features}</h4>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.systemKey.adminOnly.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.systemKey.adminOnly.title}</p>
                  <p className="text-sm text-muted-foreground">{t.systemKey.adminOnly.description}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.systemKey.default.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.systemKey.default.title}</p>
                  <p className="text-sm text-muted-foreground">{t.systemKey.default.description}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.systemKey.cost.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.systemKey.cost.title}</p>
                  <p className="text-sm text-muted-foreground">{t.systemKey.cost.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
            <User className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="font-serif text-xl font-semibold">{t.personalKey.title}</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {t.personalKey.description}
          </p>
          
          <div>
            <h4 className="text-sm font-semibold mb-3">{t.personalKey.features}</h4>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.personalKey.anyUser.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.personalKey.anyUser.title}</p>
                  <p className="text-sm text-muted-foreground">{t.personalKey.anyUser.description}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.personalKey.quota.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.personalKey.quota.title}</p>
                  <p className="text-sm text-muted-foreground">{t.personalKey.quota.description}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Badge variant="secondary" className="mt-0.5">{t.personalKey.cost.badge}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{t.personalKey.cost.title}</p>
                  <p className="text-sm text-muted-foreground">{t.personalKey.cost.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="font-serif text-xl font-semibold">{t.priority.title}</h3>
        </div>
        
        <p className="text-muted-foreground leading-relaxed">
          {t.priority.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-4 p-5 rounded-lg bg-muted/50 border-l-4 border-green-500">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-semibold text-sm shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-2">{t.priority.level1.title}</p>
              <p className="text-sm text-muted-foreground">
                {t.priority.level1.description}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-lg bg-muted/50 border-l-4 border-blue-500">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-semibold text-sm shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-2">{t.priority.level2.title}</p>
              <p className="text-sm text-muted-foreground">
                {t.priority.level2.description}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-lg bg-muted/50 border-l-4 border-orange-500">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white font-semibold text-sm shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-2">{t.priority.level3.title}</p>
              <p className="text-sm text-muted-foreground">
                {t.priority.level3.description}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-lg bg-muted/50 border-l-4 border-red-500">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-semibold text-sm shrink-0">
              ✕
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-2">{t.priority.error.title}</p>
              <p className="text-sm text-muted-foreground">
                {t.priority.error.description}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div>
          <h3 className="font-serif text-xl font-semibold mb-4">{t.features.title}</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-mono text-sm font-semibold mb-2">{t.features.chat.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.features.chat.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {t.features.chat.badges.map((badge, i) => (
                  <Badge key={i} variant="outline">{badge}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-sm font-semibold mb-2">{t.features.weaviate.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.features.weaviate.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {t.features.weaviate.badges.map((badge, i) => (
                  <Badge key={i} variant="outline">{badge}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-sm font-semibold mb-2">{t.features.models.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.features.models.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {t.features.models.badges.map((badge, i) => (
                  <Badge key={i} variant="outline">{badge}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-sm font-semibold mb-2">{t.features.liveChat.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t.features.liveChat.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {t.features.liveChat.badges.map((badge, i) => (
                  <Badge key={i} variant="outline">{badge}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-8 space-y-6">
        <div>
          <h3 className="font-serif text-xl font-semibold mb-4">{t.comparison.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {t.comparison.headers.map((header, i) => (
                    <th key={i} className="text-left py-3 px-4 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {t.comparison.rows.map((row, i) => (
                  <tr key={i} className="hover-elevate">
                    <td className="py-3 px-4 font-medium">{row[0]}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row[1]}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

