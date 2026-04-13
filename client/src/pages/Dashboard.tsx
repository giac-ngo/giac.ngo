import { useSession, signOut } from "@/lib/auth-client";
import { useCustomer } from "@/lib/autumn-stub";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "@/lib/wouter-stub";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  LogOut,
  MessageCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  getWelcomeMessage,
  getSubscriptionDisplayStatus,
  type SubscriptionInfo,
} from "@/lib/dashboard-utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { authTranslations } from "@/translations/auth";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import SiteMetrics from "@/components/admin/SiteMetrics";
import ApiKeyManager from "@/components/ApiKeyManager";
import TempleExternalStats from "@/components/TempleExternalStats";

export default function Dashboard() {
  const { data: session } = useSession();
  const { openBillingPortal } = useCustomer();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = authTranslations[language].dashboard;

  const {
    data: subscription,
    isLoading: subLoading,
    isError: subError,
    refetch: refetchSub,
  } = useQuery<SubscriptionInfo>({
    queryKey: ["temple-subscription"],
    queryFn: async () => {
      const res = await fetch("/api/temple/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const json = await res.json();
      return json.data;
    },
  });

  const displayStatus = subscription
    ? getSubscriptionDisplayStatus(subscription)
    : null;

  const handleManageBilling = async () => {
    try {
      await openBillingPortal({ returnUrl: window.location.href });
    } catch {
      toast({
        title: "Error",
        description: "Unable to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setLocation("/login");
    } catch {
      toast({
        title: "Error",
        description: "Sign out failed. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#8B4513]/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-[#2c2c2c]">
            {getWelcomeMessage(session?.user?.name)}
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              asChild
              className="flex items-center gap-2 font-serif text-sm border-[#8B4513]/30 text-[#8B4513] hover:bg-[#8B4513]/5"
            >
              <Link to="/">{t.home}</Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="flex items-center gap-2 font-serif text-sm border-[#8B4513]/30 text-[#8B4513] hover:bg-[#8B4513]/5"
            >
              <LogOut className="w-4 h-4" />
              {t.signOut}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscription Card */}
          <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-[#991b1b]" />
              <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">
                {t.subscription}
              </h2>
            </div>

            {subLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
              </div>
            ) : subError ? (
              <div className="text-center py-6">
                <p className="font-serif text-sm text-red-600 mb-3">
                  {t.couldNotLoad}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSub()}
                  className="font-serif text-sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> {t.retry}
                </Button>
              </div>
            ) : displayStatus?.hasActivePlan ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-serif text-sm text-[#8B4513]/60">{t.currentPlan}</p>
                    <p className="font-serif text-2xl font-bold text-[#2c2c2c]">
                      {displayStatus.planLabel}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-serif text-sm text-[#8B4513]/60">
                      {displayStatus.isCancelling ? t.endsOn : t.renewalDate}
                    </p>
                    <p className="font-serif text-base font-medium text-[#2c2c2c]">
                      {displayStatus.renewalLabel}
                    </p>
                  </div>
                </div>

                {/* Cancellation Warning */}
                {displayStatus.isCancelling && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="font-serif text-sm font-medium text-amber-800">
                        {t.subscriptionEnding}
                      </p>
                      <p className="font-serif text-xs text-amber-700">
                        {t.subscriptionEndingDesc.replace("{date}", displayStatus.renewalLabel)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Scheduled Change */}
                {displayStatus.hasScheduledChange && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-serif text-sm font-medium text-blue-800">
                        {t.planChangeScheduled}
                      </p>
                      <p className="font-serif text-xs text-blue-700">
                        {t.planChangeScheduledDesc.replace("{plan}", displayStatus.scheduledPlanLabel || "").replace("{date}", displayStatus.renewalLabel)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleManageBilling}
                    className="bg-[#991b1b] text-white hover:bg-[#7a1515] font-serif"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t.manageBilling}
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="font-serif border-[#8B4513]/30 text-[#8B4513] hover:bg-[#8B4513]/5"
                  >
                    <Link to="/pricing">{t.changePlan}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="font-serif text-[#8B4513]/70 mb-4">
                  {t.noPlanDesc}
                </p>
                <Button asChild className="bg-[#991b1b] text-white hover:bg-[#7a1515] font-serif">
                  <Link to="/pricing">
                    {t.viewPlans} <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </Card>

          {/* Site Metrics */}
          <SiteMetrics />

          {/* External Temple Stats (from temple's own site) */}
          <TempleExternalStats />

          {/* Onboarding Checklist */}
          <OnboardingChecklist />

          {/* Support Card */}
          <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5 text-[#991b1b]" />
              <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">
                {t.support}
              </h2>
            </div>
            <p className="font-serif text-sm text-[#8B4513]/70 mb-4">
              {t.supportDesc}
            </p>
            <Button
              variant="outline"
              asChild
              className="font-serif border-[#8B4513]/30 text-[#8B4513] hover:bg-[#8B4513]/5"
            >
              <Link to="/contact">
                {t.contactUs} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </Card>

          {/* API Keys */}
          <ApiKeyManager />
        </div>
      </main>
    </div>
  );
}


