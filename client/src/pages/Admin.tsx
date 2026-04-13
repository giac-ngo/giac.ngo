import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Tag,
  MessageSquare,
  RefreshCw,
  ArrowLeft,
  LogOut,
  DollarSign,
  TrendingUp,
  UserPlus,
  Search,
  StickyNote,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Link, useLocation } from "@/lib/wouter-stub";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { queryClient } from "@/lib/queryClient";
import { useSession, signOut } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import {
  computeStats,
  computeFunnelData,
  computeSubscriptionDistribution,
  filterLeads,
  paymentStatusColors,
  planTierLabels,
} from "@/lib/admin-utils";
import type { Lead } from "@/lib/admin-utils";
import AdminOnboarding from "@/components/admin/AdminOnboarding";
import AdminClientMetrics from "@/components/admin/AdminClientMetrics";
import AdminTempleApis from "@/components/admin/AdminTempleApis";
import AdminExternalTempleStats from "@/components/admin/AdminExternalTempleStats";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  qualified: "bg-purple-100 text-purple-800 border-purple-200",
  converted: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

export default function Admin() {
  const { data: session } = useSession();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const inviteTempleAdminMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await fetch("/api/admin/invite-temple-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("This email is already registered");
        }
        throw new Error(json.message || "Failed to send invitation");
      }
      return json;
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: `An invitation email has been sent to ${inviteEmail}`,
      });
      setInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteError(null);
    },
    onError: (error: Error) => {
      setInviteError(error.message);
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Please fill in all fields");
      return;
    }
    inviteTempleAdminMutation.mutate({ name: inviteName.trim(), email: inviteEmail.trim() });
  };

  const handleInviteModalClose = () => {
    setInviteModalOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteError(null);
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

  const {
    data: leads = [],
    isLoading,
    refetch,
  } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch leads");
      const json = await response.json();
      return json.data;
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update lead");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const stats = computeStats(leads);
  const funnelData = computeFunnelData(leads);
  const subscriptionData = computeSubscriptionDistribution(leads);
  const filteredLeads = filterLeads(leads, search, statusFilter, paymentFilter);

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const startEditNotes = (lead: Lead) => {
    setEditingNotes(lead.id);
    setNotesValue(lead.notes || "");
  };

  const saveNotes = (id: string) => {
    updateLeadMutation.mutate({ id, notes: notesValue });
    setEditingNotes(null);
  };

  return (
    <div className="min-h-screen bg-[#EFE0BD]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#8B4513]/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#991b1b]/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-[#991b1b]" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-[#2c2c2c]">Lead Management</h1>
              <p className="font-serif text-xs text-[#8B4513]/70">
                {leads.length} total leads
                {session?.user?.name && ` · ${session.user.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm hover:bg-[#7a1515] transition-all"
            >
              <UserPlus className="w-4 h-4" /> Invite Temple Admin
            </button>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#8B4513] hover:bg-[#8B4513]/5 transition-all">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#8B4513] hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
            <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm hover:bg-[#7a1515] transition-all">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#991b1b] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* MRR Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-serif text-xs text-[#8B4513]/60">Total MRR</p>
                    <p className="font-serif text-2xl font-bold text-[#2c2c2c]">${stats.totalMRR.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-serif text-xs text-[#8B4513]/60">Active Subscriptions</p>
                    <p className="font-serif text-2xl font-bold text-[#2c2c2c]">{stats.activeCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-serif text-xs text-[#8B4513]/60">New This Month</p>
                    <p className="font-serif text-2xl font-bold text-[#2c2c2c]">{stats.newThisMonth}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pipeline Funnel */}
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
                <h2 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-4">Pipeline Funnel</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis type="category" dataKey="label" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Subscription Status */}
              <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-5">
                <h2 className="font-serif text-sm font-semibold text-[#2c2c2c] mb-4">Subscription Status</h2>
                {subscriptionData.every((d) => d.status === "unpaid" || d.count === 0) &&
                subscriptionData.find((d) => d.status === "unpaid")?.count === leads.length ? (
                  <div className="flex items-center justify-center h-[220px] text-[#8B4513]/40 font-serif text-sm">
                    No subscription data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={subscriptionData.filter((d) => d.count > 0)}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ label, count }: any) => `${label}: ${count}`}
                      >
                        {subscriptionData
                          .filter((d) => d.count > 0)
                          .map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B4513]/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50"
              >
                <option value="">All Payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="font-serif text-xs text-[#8B4513]/50">
                {filteredLeads.length} of {leads.length} leads
              </span>
            </div>

            {/* Lead List */}
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 bg-white/50 backdrop-blur-md rounded-2xl border border-[#8B4513]/20">
                <Users className="w-12 h-12 mx-auto mb-4 text-[#8B4513]/30" />
                <h2 className="font-serif text-xl font-semibold text-[#8B4513]/60">No leads found</h2>
                <p className="font-serif text-sm text-[#8B4513]/40 mt-2">
                  {leads.length === 0 ? "New subscription requests will appear here" : "Try adjusting your filters"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredLeads.map((lead) => (
                  <div key={lead.id} className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 p-6 hover:shadow-lg transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        {/* Name + Badges */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <h3 className="font-serif text-lg font-semibold text-[#2c2c2c]">{lead.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusColors[lead.status] || statusColors.new}`}>
                                {statusLabels[lead.status] || lead.status}
                              </span>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${paymentStatusColors[lead.paymentStatus || "unpaid"]}`}>
                                {(lead.paymentStatus || "unpaid").charAt(0).toUpperCase() + (lead.paymentStatus || "unpaid").slice(1)}
                              </span>
                              {lead.planTier && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-indigo-100 text-indigo-800 border-indigo-200">
                                  {planTierLabels[lead.planTier] || lead.planTier}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-[#991b1b]/10 rounded-full">
                            <Tag className="w-3 h-3 text-[#991b1b]" />
                            <span className="font-serif text-xs font-medium text-[#991b1b]">{lead.package}</span>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-[#8B4513]/70">
                            <Phone className="w-4 h-4 text-[#991b1b]" />
                            <a href={`tel:${lead.phone}`} className="font-serif hover:text-[#991b1b] transition-colors">{lead.phone}</a>
                          </div>
                          <div className="flex items-center gap-2 text-[#8B4513]/70">
                            <Mail className="w-4 h-4 text-[#991b1b]" />
                            <a href={`mailto:${lead.email}`} className="font-serif hover:text-[#991b1b] transition-colors truncate">{lead.email}</a>
                          </div>
                          <div className="flex items-center gap-2 text-[#8B4513]/70">
                            <Calendar className="w-4 h-4 text-[#991b1b]" />
                            <span className="font-serif">{formatDate(lead.createdAt)}</span>
                          </div>
                        </div>

                        {/* Interests */}
                        {lead.interests && (
                          <div className="flex items-start gap-2 p-3 bg-[#8B4513]/5 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-[#991b1b] flex-shrink-0 mt-0.5" />
                            <p className="font-serif text-sm text-[#8B4513]/80">{lead.interests}</p>
                          </div>
                        )}

                        {/* Notes */}
                        <div className="flex items-start gap-2">
                          <StickyNote className="w-4 h-4 text-[#991b1b] flex-shrink-0 mt-1" />
                          {editingNotes === lead.id ? (
                            <div className="flex-1 space-y-2">
                              <textarea
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50 resize-none"
                                placeholder="Add notes..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveNotes(lead.id)}
                                  disabled={updateLeadMutation.isPending}
                                  className="flex items-center gap-1 px-3 py-1 bg-[#991b1b] text-white rounded-lg font-serif text-xs hover:bg-[#7a1515] disabled:opacity-50"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingNotes(null)}
                                  className="flex items-center gap-1 px-3 py-1 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-xs text-[#8B4513] hover:bg-[#8B4513]/5"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditNotes(lead)}
                              className="font-serif text-sm text-[#8B4513]/60 hover:text-[#991b1b] transition-colors text-left"
                            >
                              {lead.notes || "Click to add notes..."}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div className="flex flex-wrap gap-2 lg:flex-col">
                        {Object.keys(statusLabels).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateLeadMutation.mutate({ id: lead.id, status })}
                            disabled={lead.status === status || updateLeadMutation.isPending}
                            className={`px-3 py-1.5 rounded-lg font-serif text-xs transition-all ${
                              lead.status === status
                                ? "bg-[#991b1b] text-white cursor-default"
                                : "bg-white border border-[#8B4513]/20 text-[#8B4513]/70 hover:border-[#991b1b] hover:text-[#991b1b]"
                            } disabled:opacity-50`}
                          >
                            {statusLabels[status]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Onboarding Submissions */}
            <AdminOnboarding />

            {/* Client Metrics */}
            <AdminClientMetrics />

            {/* External Temple Stats */}
            <AdminExternalTempleStats />

            {/* Temple API Management */}
            <AdminTempleApis />
          </>
        )}
      </main>

      {/* Invite Temple Admin Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={handleInviteModalClose}>
        <DialogContent className="bg-white border border-[#8B4513]/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#2c2c2c]">Invite Temple Admin</DialogTitle>
            <DialogDescription className="font-serif text-sm text-[#8B4513]/70">
              Send an invitation email to a new temple administrator.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-name" className="font-serif text-sm font-medium text-[#2c2c2c]">
                Name
              </label>
              <input
                id="invite-name"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Enter full name"
                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50"
                disabled={inviteTempleAdminMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invite-email" className="font-serif text-sm font-medium text-[#2c2c2c]">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#2c2c2c] placeholder:text-[#8B4513]/40 focus:outline-none focus:ring-2 focus:ring-[#991b1b]/50"
                disabled={inviteTempleAdminMutation.isPending}
              />
            </div>
            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-serif text-sm text-red-700">{inviteError}</p>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={handleInviteModalClose}
                disabled={inviteTempleAdminMutation.isPending}
                className="px-4 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm text-[#8B4513] hover:bg-[#8B4513]/5 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteTempleAdminMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg font-serif text-sm hover:bg-[#7a1515] transition-all disabled:opacity-50"
              >
                {inviteTempleAdminMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Send Invitation
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


