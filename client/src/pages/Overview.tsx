import { Card } from "@/components/ui/card";
import { Sparkles, Shield, Users, Heart, Zap, BookOpen, Calendar, HandHeart, MessageCircle, BarChart3, Globe, Lock, Leaf, FileCheck, Award, Database } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations } from "@/translations/docs";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function Overview() {
  const { language } = useLanguage();
  const t = docsTranslations[language].overview;
  useDocumentTitle("Platform Overview", "Comprehensive overview of Bodhi Technology Lab's AI-powered platform for Buddhist communities.");

  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      {/* Hero Section */}
      <div className="space-y-6 text-center mb-16">
        <h1 className="font-serif text-5xl font-bold text-foreground" data-testid="heading-overview">
          {t.title}
        </h1>
        <p className="font-serif text-2xl text-primary italic">
          {t.subtitle}
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="bg-card border-2 border-border rounded-2xl p-8 mb-16" data-testid="nav-table-of-contents">
        <h2 className="font-serif text-2xl font-bold text-foreground mb-6">{t.tableOfContents.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <a href="#mission" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-mission">
              {t.tableOfContents.ourMission}
            </a>
            <a href="#principles" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-principles">
              {t.tableOfContents.ourPrinciples}
            </a>
            <a href="#methods" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-methods">
              {t.tableOfContents.ourMethods}
            </a>
            <a href="#capabilities" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-capabilities">
              {t.tableOfContents.platformCapabilities}
            </a>
          </div>
          <div className="space-y-2">
            <a href="#why-partner" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-why-partner">
              {t.tableOfContents.whyPartner}
            </a>
            <a href="#infrastructure" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-infrastructure">
              {t.tableOfContents.infrastructure}
            </a>
            <a href="#join" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-join">
              {t.tableOfContents.join}
            </a>
            <a href="#fourth-grace" className="block text-primary hover:underline font-serif text-base" data-testid="link-toc-fourth-grace">
              {t.tableOfContents.fourthGrace}
            </a>
          </div>
        </div>
      </nav>

      <div className="space-y-16">
        {/* Opening Statement */}
        <section className="space-y-4">
          <p className="text-base leading-relaxed text-foreground">
            {t.opening}
          </p>
        </section>

        {/* Our Mission */}
        <section id="mission" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.mission.title}
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t.mission.recreateMandalas.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.mission.recreateMandalas.text}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t.mission.flourish.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.mission.flourish.text}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {t.mission.respond.title}
              </h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.mission.respond.text}
              </p>
            </div>
          </div>
        </section>

        {/* Our Principles */}
        <section id="principles" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.principles.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 space-y-2">
              <h3 className="font-serif text-lg font-semibold">{t.principles.buildFast.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.principles.buildFast.text}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <h3 className="font-serif text-lg font-semibold">{t.principles.noUse.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.principles.noUse.text}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <h3 className="font-serif text-lg font-semibold">{t.principles.presence.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.principles.presence.text}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <h3 className="font-serif text-lg font-semibold">{t.principles.transparency.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.principles.transparency.text}
              </p>
            </Card>
            <Card className="p-6 space-y-2">
              <h3 className="font-serif text-lg font-semibold">{t.principles.censorship.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.principles.censorship.text}
              </p>
            </Card>
          </div>
        </section>

        {/* Our Methods */}
        <section id="methods" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.methods.title}
          </h2>
          <p className="text-base leading-relaxed text-foreground">
            {t.methods.intro}
          </p>
          <div className="space-y-4">
            <div className="border-l-4 border-primary pl-4 space-y-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">{t.methods.scope.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.methods.scope.text}
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4 space-y-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">{t.methods.assemble.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.methods.assemble.text}
              </p>
            </div>
            <div className="border-l-4 border-primary pl-4 space-y-2">
              <h3 className="font-serif text-lg font-semibold text-foreground">{t.methods.ship.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t.methods.ship.text}
              </p>
            </div>
          </div>
        </section>

        {/* Platform Capabilities */}
        <section id="capabilities" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.capabilities.title}
          </h2>
          <p className="text-base leading-relaxed text-foreground mb-6">
            {t.capabilities.intro}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.customBranding.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.customBranding.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <HandHeart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.donationTools.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.donationTools.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.eventCalendar.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.eventCalendar.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.aiGuidance.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.aiGuidance.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.documentLibrary.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.documentLibrary.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.communityForum.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.communityForum.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold">{t.capabilities.analytics.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.capabilities.analytics.text}
              </p>
            </Card>
          </div>
        </section>

        {/* Why Partner */}
        <section id="why-partner" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.whyPartner.title}
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold">{t.whyPartner.trusted.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t.whyPartner.trusted.text}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Zap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold">{t.whyPartner.economics.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t.whyPartner.economics.text}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Lock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold">{t.whyPartner.privacy.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t.whyPartner.privacy.text}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Heart className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold">{t.whyPartner.partnership.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t.whyPartner.partnership.text}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="font-serif text-lg font-semibold">{t.whyPartner.censorship.title}</h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {t.whyPartner.censorship.text}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sustainable Dharma Infrastructure */}
        <section id="infrastructure" className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            {t.infrastructure.title}
          </h2>
          <p className="text-base leading-relaxed text-foreground mb-6">
            {t.infrastructure.intro}
          </p>

          <div className="space-y-6">
            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.decentralisation.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.decentralisation.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.economics.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.economics.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.impermanence.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.impermanence.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.consent.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.consent.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Leaf className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.ecological.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.ecological.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <FileCheck className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.auditTrail.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.auditTrail.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.reputation.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.reputation.text}
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" />
                <h3 className="font-serif text-xl font-semibold">{t.infrastructure.privacyByDesign.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.infrastructure.privacyByDesign.text}
              </p>
            </Card>
          </div>
        </section>

        {/* Join the Lab */}
        <section id="join" className="space-y-6 bg-primary/5 rounded-2xl p-8 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground text-center">
            {t.join.title}
          </h2>
          <p className="text-base leading-relaxed text-center text-foreground max-w-3xl mx-auto">
            {t.join.text}
          </p>
          
          <div className="space-y-4 max-w-2xl mx-auto pt-4">
            <h3 className="font-serif text-xl font-semibold text-foreground text-center">Ready to begin?</h3>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <a href="/#services" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-serif font-semibold hover:bg-primary/90 transition-colors" data-testid="button-start-sprint">
                Start a Sprint
              </a>
              <a href="/#services" className="inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-primary rounded-lg font-serif font-semibold hover:bg-primary/10 transition-colors" data-testid="button-hire-pod">
                Hire a Pod
              </a>
              <a href="/#services" className="inline-flex items-center justify-center px-6 py-3 border-2 border-primary text-primary rounded-lg font-serif font-semibold hover:bg-primary/10 transition-colors" data-testid="button-deploy">
                Deploy
              </a>
            </div>
            <p className="text-center text-muted-foreground font-serif italic pt-4">
              Let's co‑create technology that points to freedom.
            </p>
          </div>
        </section>

        {/* Call to the Buddha Family */}
        <section className="space-y-6 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground border-b pb-3">
            A Call to the Buddha Family
          </h2>
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-foreground">
              <span className="font-semibold">To monasteries:</span> Take command of your digital fate. Build with us, on your terms.
            </p>
            <p className="text-base leading-relaxed text-foreground">
              <span className="font-semibold">To technologists:</span> Lay down your swords of code in defence of the Dharma.
            </p>
            <p className="text-base leading-relaxed text-foreground">
              <span className="font-semibold">To practitioners:</span> Prepare. These are the weapons and shields for the coming Dharma war.
            </p>
            <p className="text-base leading-relaxed text-foreground italic pt-4">
              The wheel of Dharma is turning, now in binary. The time to respond is now.
            </p>
          </div>
        </section>

        {/* The Fourth Grace Mandala */}
        <section id="fourth-grace" className="space-y-6 text-center border-t pt-12 scroll-mt-24">
          <h2 className="font-serif text-3xl font-bold text-foreground">
            {t.fourthGrace.title}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground max-w-3xl mx-auto">
            {t.fourthGrace.text}
          </p>
        </section>
      </div>
    </div>
  );
}

