import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCheck,
  Activity,
  UserPlus,
  Eye,
  Clock,
  BookOpen,
  ScrollText,
  MessageCircle,
  DollarSign,
  Heart,
  HardDrive,
  Loader2,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { metricsTranslations } from "@/translations/metrics";

interface MetricsData {
  current: {
    totalUsers: number;
    paidUsers: number;
    activeUsers: number;
    newUsersToday: number;
    totalSessions: number;
    pageViews: number;
    avgSessionDuration: number;
    totalSutras: number;
    totalDharmaContent: number;
    aiConversations: number;
    monthlyRevenue: number;
    totalDonations: number;
    storageUsedMb: number;
    date: string;
  } | null;
  history: Array<{
    date: string;
    totalUsers: number;
    activeUsers: number;
    pageViews: number;
    paidUsers: number;
  }>;
  limits: {
    maxUsers: number;
    maxStorageMb: number;
    maxAiConversations: number;
    maxDharmaContent: number;
    maxSutras: number;
    label: string;
  };
  planId: string;
}

function UsageBar({ current, max, label, t }: { current: number; max: number; label: string; t: any }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isOver = !isUnlimited && current > max;
  const isNear = !isUnlimited && !isOver && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-serif">
        <span className="text-[#8B4513]/70">{label}</span>
        <span className={`font-medium ${isOver ? "text-red-600" : isNear ? "text-amber-600" : "text-[#2c2c2c]"}`}>
          {current.toLocaleString()} {t.of} {isUnlimited ? t.unlimited : max.toLocaleString()}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={pct}
          className={`h-2 ${isOver ? "[&>div]:bg-red-500" : isNear ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
        />
      )}
      {isUnlimited && (
        <div className="h-2 bg-green-100 rounded-full">
          <div className="h-full bg-green-400 rounded-full" style={{ width: "5%" }} />
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subValue, color }: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-xs text-[#8B4513]/60 truncate">{label}</p>
          <p className="font-serif text-lg font-bold text-[#2c2c2c]">{typeof value === "number" ? value.toLocaleString() : value}</p>
          {subValue && <p className="font-serif text-xs text-[#8B4513]/50">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SiteMetrics() {
  const { language } = useLanguage();
  const t = metricsTranslations[language];

  const { data, isLoading, isError } = useQuery<MetricsData>({
    queryKey: ["temple-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/temple/metrics?days=30", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
        </div>
      </Card>
    );
  }

  if (isError || !data) {
    return null; // Silently hide if no metrics available
  }

  const m = data.current;
  const limits = data.limits;

  if (!m) {
    return (
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.siteMetrics}</h2>
        </div>
        <div className="text-center py-6">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-[#8B4513]/30" />
          <p className="font-serif text-sm text-[#8B4513]/70">{t.noMetrics}</p>
          <p className="font-serif text-xs text-[#8B4513]/50 mt-1">{t.noMetricsDesc}</p>
        </div>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}${t.seconds}`;
    return `${Math.round(seconds / 60)}${t.minutes}`;
  };

  const chartData = data.history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    users: h.totalUsers,
    active: h.activeUsers,
    views: h.pageViews,
  }));

  // Check for any over-limit warnings
  const warnings: string[] = [];
  if (limits.maxUsers !== -1 && m.totalUsers > limits.maxUsers) warnings.push(t.totalUsers);
  if (limits.maxStorageMb !== -1 && m.storageUsedMb > limits.maxStorageMb) warnings.push(t.storageUsed);
  if (limits.maxAiConversations !== -1 && m.aiConversations > limits.maxAiConversations) warnings.push(t.aiConversations);

  return (
    <>
      {/* Metrics Overview */}
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.siteMetrics}</h2>
          <span className="ml-auto font-serif text-xs text-[#8B4513]/50">
            {new Date(m.date).toLocaleDateString()}
          </span>
        </div>

        {warnings.length > 0 && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="font-serif text-sm text-red-700">
              {t.overLimit}: {warnings.join(", ")}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard icon={Users} label={t.totalUsers} value={m.totalUsers} color="bg-blue-100 text-blue-600" />
          <MetricCard icon={UserCheck} label={t.paidUsers} value={m.paidUsers} color="bg-green-100 text-green-600" />
          <MetricCard icon={Activity} label={t.activeUsers} value={m.activeUsers} color="bg-purple-100 text-purple-600" />
          <MetricCard icon={UserPlus} label={t.newUsersToday} value={m.newUsersToday} color="bg-cyan-100 text-cyan-600" />
          <MetricCard icon={Eye} label={t.pageViews} value={m.pageViews} color="bg-indigo-100 text-indigo-600" />
          <MetricCard icon={Clock} label={t.avgSessionDuration} value={formatDuration(m.avgSessionDuration)} color="bg-amber-100 text-amber-600" />
          <MetricCard icon={DollarSign} label={t.monthlyRevenue} value={`$${(m.monthlyRevenue / 100).toFixed(0)}`} color="bg-emerald-100 text-emerald-600" />
          <MetricCard icon={Heart} label={t.totalDonations} value={`$${(m.totalDonations / 100).toFixed(0)}`} color="bg-pink-100 text-pink-600" />
          <MetricCard icon={ScrollText} label={t.totalSutras} value={m.totalSutras} color="bg-orange-100 text-orange-600" />
          <MetricCard icon={BookOpen} label={t.totalDharmaContent} value={m.totalDharmaContent} color="bg-teal-100 text-teal-600" />
          <MetricCard icon={MessageCircle} label={t.aiConversations} value={m.aiConversations} color="bg-violet-100 text-violet-600" />
          <MetricCard icon={HardDrive} label={t.storageUsed} value={`${m.storageUsedMb} MB`} color="bg-slate-100 text-slate-600" />
        </div>
      </Card>

      {/* Usage Limits */}
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.usageLimits}</h2>
        </div>
        <p className="font-serif text-xs text-[#8B4513]/50 mb-4">{t.planLimit}: {limits.label}</p>
        <div className="space-y-4">
          <UsageBar current={m.totalUsers} max={limits.maxUsers} label={t.totalUsers} t={t} />
          <UsageBar current={m.storageUsedMb} max={limits.maxStorageMb} label={`${t.storageUsed} (MB)`} t={t} />
          <UsageBar current={m.aiConversations} max={limits.maxAiConversations} label={t.aiConversations} t={t} />
          <UsageBar current={m.totalDharmaContent} max={limits.maxDharmaContent} label={t.totalDharmaContent} t={t} />
          <UsageBar current={m.totalSutras} max={limits.maxSutras} label={t.totalSutras} t={t} />
        </div>
      </Card>

      {/* Trend Chart */}
      {chartData.length > 1 && (
        <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#991b1b]" />
            <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.userGrowth}</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#991b1b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#991b1b" fill="url(#colorUsers)" strokeWidth={2} />
              <Area type="monotone" dataKey="active" stroke="#7c3aed" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
