import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Globe,
  Users,
  UserCheck,
  Activity,
  Eye,
  MessageCircle,
  DollarSign,
  Heart,
  HardDrive,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExternalStats {
  api: {
    id: string;
    templeName: string;
    slug: string;
    baseUrl: string;
    isActive: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
  };
  stats: {
    totalUsers: number;
    paidUsers: number;
    activeUsers: number;
    totalSessions: number;
    pageViews: number;
    aiConversations: number;
    monthlyRevenue: number;
    totalDonations: number;
    storageUsedMb: number;
    rawResponse?: string;
    createdAt: string;
  } | null;
}

interface TathataTopAI {
  id: number;
  name: string;
  conversationCount?: string | number;
  totalLikes?: number;
  totalDislikes?: number;
}

interface TathataRawData {
  totalConversations?: number;
  totalAiConfigs?: number;
  interactingUsers?: number;
  topAIs?: TathataTopAI[];
  // Legacy flat fields
  conversationCount?: string | number;
  totalLikes?: number;
  totalDislikes?: number;
  recentConversations?: any[];
}

const translations = {
  en: {
    externalStats: "Your Temple Stats",
    fromSite: "Data from your temple site",
    totalUsers: "Total Users",
    paidUsers: "Paid Users",
    activeUsers: "Active Users",
    pageViews: "Page Views",
    aiConversations: "AI Conversations",
    monthlyRevenue: "Monthly Revenue",
    donations: "Donations",
    storage: "Storage",
    likes: "Likes",
    dislikes: "Dislikes",
    lastSync: "Last synced",
    noStats: "No stats available yet",
    noStatsDesc: "Stats will appear once your temple site starts sending data",
    syncError: "Last sync failed",
  },
  vi: {
    externalStats: "Thống Kê Chùa",
    fromSite: "Dữ liệu từ trang web chùa của bạn",
    totalUsers: "Tổng Người Dùng",
    paidUsers: "Người Dùng Trả Phí",
    activeUsers: "Đang Hoạt Động",
    pageViews: "Lượt Xem",
    aiConversations: "Hội Thoại AI",
    monthlyRevenue: "Doanh Thu Tháng",
    donations: "Cúng Dường",
    storage: "Lưu Trữ",
    likes: "Thích",
    dislikes: "Không Thích",
    lastSync: "Đồng bộ lần cuối",
    noStats: "Chưa có thống kê",
    noStatsDesc: "Thống kê sẽ xuất hiện khi trang web chùa bắt đầu gửi dữ liệu",
    syncError: "Đồng bộ lần cuối thất bại",
  },
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white/60 rounded-lg border border-[#8B4513]/10 p-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-xs text-[#8B4513]/60 truncate">{label}</p>
          <p className="font-serif text-base font-bold text-[#2c2c2c]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ stats, t }: { stats: NonNullable<ExternalStats["stats"]>; t: typeof translations.en }) {
  // Parse raw response for Tathata-specific fields
  let rawData: TathataRawData = {};
  try {
    if (stats.rawResponse) {
      rawData = JSON.parse(stats.rawResponse);
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  // Aggregate likes/dislikes from topAIs array or use flat fields
  let totalLikes = 0;
  let totalDislikes = 0;
  if (Array.isArray(rawData.topAIs)) {
    for (const ai of rawData.topAIs) {
      totalLikes += ai.totalLikes ?? 0;
      totalDislikes += ai.totalDislikes ?? 0;
    }
  } else {
    totalLikes = rawData.totalLikes ?? 0;
    totalDislikes = rawData.totalDislikes ?? 0;
  }
  
  const hasTathataData = totalLikes > 0 || totalDislikes > 0 || Array.isArray(rawData.topAIs);
  const aiConfigCount = rawData.totalAiConfigs ?? 0;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Show AI Conversations */}
      <StatCard icon={MessageCircle} label={t.aiConversations} value={stats.aiConversations} color="bg-violet-100 text-violet-600" />
      
      {/* Show Tathata-specific likes/dislikes if available */}
      {hasTathataData && (
        <>
          <StatCard icon={ThumbsUp} label={t.likes} value={totalLikes} color="bg-green-100 text-green-600" />
          <StatCard icon={ThumbsDown} label={t.dislikes} value={totalDislikes} color="bg-red-100 text-red-600" />
        </>
      )}
      
      {/* Show standard metrics only if they have values */}
      {stats.totalUsers > 0 && (
        <StatCard icon={Users} label={t.totalUsers} value={stats.totalUsers} color="bg-blue-100 text-blue-600" />
      )}
      {stats.paidUsers > 0 && (
        <StatCard icon={UserCheck} label={t.paidUsers} value={stats.paidUsers} color="bg-green-100 text-green-600" />
      )}
      {stats.activeUsers > 0 && (
        <StatCard icon={Activity} label={t.activeUsers} value={stats.activeUsers} color="bg-purple-100 text-purple-600" />
      )}
      {stats.pageViews > 0 && !hasTathataData && (
        <StatCard icon={Eye} label={t.pageViews} value={stats.pageViews} color="bg-indigo-100 text-indigo-600" />
      )}
      {stats.monthlyRevenue > 0 && (
        <StatCard icon={DollarSign} label={t.monthlyRevenue} value={`${(stats.monthlyRevenue / 100).toFixed(0)}`} color="bg-emerald-100 text-emerald-600" />
      )}
      {stats.totalDonations > 0 && (
        <StatCard icon={Heart} label={t.donations} value={`${(stats.totalDonations / 100).toFixed(0)}`} color="bg-pink-100 text-pink-600" />
      )}
      {stats.storageUsedMb > 0 && (
        <StatCard icon={HardDrive} label={t.storage} value={`${stats.storageUsedMb} MB`} color="bg-slate-100 text-slate-600" />
      )}
    </div>
  );
}

export default function TempleExternalStats() {
  const { language } = useLanguage();
  const t = translations[language];

  const { data, isLoading, isError } = useQuery<ExternalStats | null>({
    queryKey: ["temple-external-stats"],
    queryFn: async () => {
      const res = await fetch("/api/temple/external-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60000,
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
    return null;
  }

  const { api, stats } = data;

  return (
    <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#991b1b]" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.externalStats}</h2>
            <p className="font-serif text-xs text-[#8B4513]/50">{t.fromSite}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={api.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-[#8B4513]/10 rounded text-xs font-serif text-[#8B4513] hover:bg-[#8B4513]/20 transition-colors"
          >
            {api.templeName}
            <ExternalLink className="w-3 h-3" />
          </a>
          {api.lastSyncStatus === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : api.lastSyncStatus === "error" ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : null}
        </div>
      </div>

      {api.lastSyncAt && (
        <p className="font-serif text-xs text-[#8B4513]/50 mb-4">
          {t.lastSync}: {new Date(api.lastSyncAt).toLocaleString()}
          {api.lastSyncStatus === "error" && (
            <span className="text-red-600 ml-2">({t.syncError})</span>
          )}
        </p>
      )}

      {!stats ? (
        <div className="text-center py-6">
          <Globe className="w-10 h-10 mx-auto mb-3 text-[#8B4513]/30" />
          <p className="font-serif text-sm text-[#8B4513]/70">{t.noStats}</p>
          <p className="font-serif text-xs text-[#8B4513]/50 mt-1">{t.noStatsDesc}</p>
        </div>
      ) : (
        <StatsGrid stats={stats} t={t} />
      )}
    </Card>
  );
}
