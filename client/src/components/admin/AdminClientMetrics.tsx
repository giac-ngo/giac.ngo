import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  DollarSign,
  BarChart3,
  ArrowLeft,
  Loader2,
  Activity,
  Eye,
  MessageCircle,
  HardDrive,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ClientMetric {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  date: string;
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
}

interface ClientDetail {
  current: ClientMetric | null;
  history: ClientMetric[];
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

function ClientDetailView({ userId, userName, onBack }: { userId: string; userName: string; onBack: () => void }) {
  const { data, isLoading } = useQuery<ClientDetail>({
    queryKey: ["admin-client-detail", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/client-metrics/${userId}?days=30`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
      </div>
    );
  }

  const m = data?.current;
  const chartData = (data?.history || []).map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    users: h.totalUsers,
    paid: h.paidUsers,
    views: h.pageViews,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="font-serif text-xs">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <h3 className="font-serif text-lg font-semibold text-[#2c2c2c]">{userName}</h3>
        {data?.limits && (
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-serif">
            {data.limits.label}
          </span>
        )}
      </div>

      {!m ? (
        <p className="font-serif text-sm text-[#8B4513]/50 text-center py-6">No metrics data for this client.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox icon={Users} label="Total Users" value={m.totalUsers} color="bg-blue-100 text-blue-600" />
            <StatBox icon={UserCheck} label="Paid Users" value={m.paidUsers} color="bg-green-100 text-green-600" />
            <StatBox icon={Activity} label="Active" value={m.activeUsers} color="bg-purple-100 text-purple-600" />
            <StatBox icon={Eye} label="Page Views" value={m.pageViews} color="bg-indigo-100 text-indigo-600" />
            <StatBox icon={DollarSign} label="Revenue" value={`$${(m.monthlyRevenue / 100).toFixed(0)}`} color="bg-emerald-100 text-emerald-600" />
            <StatBox icon={MessageCircle} label="AI Chats" value={m.aiConversations} color="bg-violet-100 text-violet-600" />
            <StatBox icon={HardDrive} label="Storage" value={`${m.storageUsedMb} MB`} color="bg-slate-100 text-slate-600" />
            <StatBox icon={BarChart3} label="Sessions" value={m.totalSessions} color="bg-amber-100 text-amber-600" />
          </div>

          {/* Limits check */}
          {data?.limits && (
            <div className="bg-white/80 rounded-xl border border-[#8B4513]/20 p-4">
              <h4 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-3">Usage vs Limits</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-serif">
                <LimitRow label="Users" current={m.totalUsers} max={data.limits.maxUsers} />
                <LimitRow label="Storage (MB)" current={m.storageUsedMb} max={data.limits.maxStorageMb} />
                <LimitRow label="AI Conversations" current={m.aiConversations} max={data.limits.maxAiConversations} />
                <LimitRow label="Dharma Content" current={m.totalDharmaContent} max={data.limits.maxDharmaContent} />
              </div>
            </div>
          )}

          {chartData.length > 1 && (
            <div className="bg-white/80 rounded-xl border border-[#8B4513]/20 p-4">
              <h4 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-3">30-Day Trend</h4>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#991b1b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" stroke="#991b1b" fill="url(#colorU)" strokeWidth={2} />
                  <Area type="monotone" dataKey="paid" stroke="#22c55e" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/80 rounded-lg border border-[#8B4513]/10 p-3">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 ${color} rounded-full flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="font-serif text-xs text-[#8B4513]/60">{label}</p>
          <p className="font-serif text-sm font-bold text-[#2c2c2c]">{typeof value === "number" ? value.toLocaleString() : value}</p>
        </div>
      </div>
    </div>
  );
}

function LimitRow({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.round((current / max) * 100);
  const isOver = !isUnlimited && current > max;
  const isNear = !isUnlimited && !isOver && pct >= 80;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[#8B4513]/70">{label}</span>
      <span className={`font-medium ${isOver ? "text-red-600" : isNear ? "text-amber-600" : "text-[#2c2c2c]"}`}>
        {current.toLocaleString()} / {isUnlimited ? "∞" : max.toLocaleString()}
        {!isUnlimited && <span className="ml-1 text-[#8B4513]/40">({pct}%)</span>}
      </span>
    </div>
  );
}

export default function AdminClientMetrics() {
  const [selectedClient, setSelectedClient] = useState<{ userId: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery<ClientMetric[]>({
    queryKey: ["admin-all-client-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/client-metrics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json.data;
    },
  });

  if (selectedClient) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
        <ClientDetailView
          userId={selectedClient.userId}
          userName={selectedClient.name}
          onBack={() => setSelectedClient(null)}
        />
      </div>
    );
  }

  // Aggregate stats
  const totalClients = clients.length;
  const totalPaid = clients.reduce((sum, c) => sum + c.paidUsers, 0);
  const totalRevenue = clients.reduce((sum, c) => sum + c.monthlyRevenue, 0);

  const filtered = search
    ? clients.filter(
        (c) =>
          (c.userName || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.userEmail || "").toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-serif text-xs text-[#8B4513]/60">Total Clients</p>
              <p className="font-serif text-2xl font-bold text-[#2c2c2c]">{totalClients}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-serif text-xs text-[#8B4513]/60">Total Paid Users (all clients)</p>
              <p className="font-serif text-2xl font-bold text-[#2c2c2c]">{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-serif text-xs text-[#8B4513]/60">Total Revenue (all clients)</p>
              <p className="font-serif text-2xl font-bold text-[#2c2c2c]">${(totalRevenue / 100).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#991b1b]" />
            <h2 className="font-serif text-sm font-semibold text-[#2c2c2c]">Client Metrics</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[#8B4513]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 pr-3 py-1.5 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-xs text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 w-48"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-[#8B4513]/30" />
            <p className="font-serif text-sm text-[#8B4513]/60">
              {clients.length === 0 ? "No client metrics yet" : "No matching clients"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client) => (
              <button
                key={client.userId}
                onClick={() => setSelectedClient({ userId: client.userId, name: client.userName || client.userEmail || client.userId })}
                className="w-full text-left p-4 rounded-lg border border-[#8B4513]/10 hover:border-[#991b1b]/30 hover:bg-[#991b1b]/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif text-sm font-semibold text-[#2c2c2c]">
                      {client.userName || "Unknown"}
                    </p>
                    <p className="font-serif text-xs text-[#8B4513]/50">{client.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-serif">
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Users</p>
                      <p className="font-bold text-[#2c2c2c]">{client.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Paid</p>
                      <p className="font-bold text-green-600">{client.paidUsers.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Revenue</p>
                      <p className="font-bold text-emerald-600">${(client.monthlyRevenue / 100).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#8B4513]/50">Storage</p>
                      <p className="font-bold text-slate-600">{client.storageUsedMb} MB</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
