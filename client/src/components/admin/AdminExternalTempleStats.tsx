import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Globe,
  Users,
  UserCheck,
  DollarSign,
  Activity,
  MessageCircle,
  HardDrive,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ExternalTempleStats {
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
    createdAt: string;
  } | null;
}

export default function AdminExternalTempleStats() {
  const { data: temples = [], isLoading } = useQuery<ExternalTempleStats[]>({
    queryKey: ["admin-external-temple-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/temple-external-stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Aggregate stats across all temples
  const totals = temples.reduce(
    (acc, t) => {
      if (t.stats) {
        acc.totalUsers += t.stats.totalUsers;
        acc.paidUsers += t.stats.paidUsers;
        acc.activeUsers += t.stats.activeUsers;
        acc.monthlyRevenue += t.stats.monthlyRevenue;
        acc.aiConversations += t.stats.aiConversations;
        acc.storageUsedMb += t.stats.storageUsedMb;
      }
      return acc;
    },
    { totalUsers: 0, paidUsers: 0, activeUsers: 0, monthlyRevenue: 0, aiConversations: 0, storageUsedMb: 0 }
  );

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-5">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
        </div>
      </Card>
    );
  }

  if (temples.length === 0) {
    return null; // Don't show if no external temples configured
  }

  return (
    <div className="space-y-4">
      {/* Aggregated Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Globe} label="Temples" value={temples.length} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Users} label="Total Users" value={totals.totalUsers} color="bg-blue-100 text-blue-600" />
        <StatCard icon={UserCheck} label="Paid Users" value={totals.paidUsers} color="bg-green-100 text-green-600" />
        <StatCard icon={Activity} label="Active" value={totals.activeUsers} color="bg-purple-100 text-purple-600" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${(totals.monthlyRevenue / 100).toFixed(0)}`} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={MessageCircle} label="AI Chats" value={totals.aiConversations} color="bg-violet-100 text-violet-600" />
      </div>

      {/* Per-Temple Stats */}
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-sm font-semibold text-[#2c2c2c]">External Temple Stats</h2>
        </div>
        <div className="space-y-3">
          {temples.map((temple) => (
            <div
              key={temple.api.id}
              className="p-4 rounded-lg border border-[#8B4513]/10 hover:border-[#991b1b]/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-serif text-sm font-semibold text-[#2c2c2c]">
                      {temple.api.templeName}
                    </h3>
                    <span className="px-2 py-0.5 bg-[#8B4513]/10 text-[#8B4513] rounded text-xs font-mono">
                      {temple.api.slug}
                    </span>
                    {temple.api.lastSyncStatus === "success" ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : temple.api.lastSyncStatus === "error" ? (
                      <XCircle className="w-3 h-3 text-red-600" />
                    ) : null}
                  </div>
                  {temple.api.lastSyncAt && (
                    <p className="font-serif text-xs text-[#8B4513]/50">
                      Last synced: {new Date(temple.api.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {temple.stats ? (
                  <div className="flex items-center gap-4 text-xs font-serif">
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Users</p>
                      <p className="font-bold text-[#2c2c2c]">{temple.stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Paid</p>
                      <p className="font-bold text-green-600">{temple.stats.paidUsers.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Revenue</p>
                      <p className="font-bold text-emerald-600">${(temple.stats.monthlyRevenue / 100).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">AI Chats</p>
                      <p className="font-bold text-violet-600">{temple.stats.aiConversations.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Storage</p>
                      <p className="font-bold text-slate-600">{temple.stats.storageUsedMb} MB</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-serif text-xs text-[#8B4513]/40">No stats yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-serif text-xs text-[#8B4513]/60">{label}</p>
          <p className="font-serif text-lg font-bold text-[#2c2c2c]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}
