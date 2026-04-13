// Lead type (local stub — shared/schema not available in this client)
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  paymentStatus?: string;
  monthlyAmount?: number;
  planTier?: string;
  package: string;
  interests?: string;
  notes?: string;
  createdAt: string | Date;
}

// ─── Stats ───

export interface AdminStats {
  totalMRR: number;
  activeCount: number;
  newThisMonth: number;
}

export function computeStats(leads: Lead[]): AdminStats {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let totalMRR = 0;
  let activeCount = 0;
  let newThisMonth = 0;

  for (const lead of leads) {
    if (lead.paymentStatus === "active") {
      activeCount++;
      totalMRR += lead.monthlyAmount || 0;
    }
    const d = new Date(lead.createdAt);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      newThisMonth++;
    }
  }

  return { totalMRR, activeCount, newThisMonth };
}

// ─── Pipeline Funnel ───

export interface FunnelEntry {
  status: string;
  label: string;
  count: number;
  color: string;
}

const PIPELINE_ORDER = [
  { status: "new", label: "New", color: "#3b82f6" },
  { status: "contacted", label: "Contacted", color: "#eab308" },
  { status: "qualified", label: "Qualified", color: "#a855f7" },
  { status: "converted", label: "Converted", color: "#22c55e" },
  { status: "lost", label: "Lost", color: "#6b7280" },
];

export function computeFunnelData(leads: Lead[]): FunnelEntry[] {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    counts[lead.status] = (counts[lead.status] || 0) + 1;
  }
  return PIPELINE_ORDER.map((p) => ({
    ...p,
    count: counts[p.status] || 0,
  }));
}

// ─── Subscription Distribution ───

export interface DistributionEntry {
  status: string;
  label: string;
  count: number;
  color: string;
}

const PAYMENT_STATUSES = [
  { status: "unpaid", label: "Unpaid", color: "#9ca3af" },
  { status: "active", label: "Active", color: "#22c55e" },
  { status: "overdue", label: "Overdue", color: "#f97316" },
  { status: "cancelled", label: "Cancelled", color: "#ef4444" },
];

export function computeSubscriptionDistribution(leads: Lead[]): DistributionEntry[] {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    const ps = lead.paymentStatus || "unpaid";
    counts[ps] = (counts[ps] || 0) + 1;
  }
  return PAYMENT_STATUSES.map((p) => ({
    ...p,
    count: counts[p.status] || 0,
  }));
}

// ─── Filtering ───

export function filterLeads(
  leads: Lead[],
  search: string,
  statusFilter: string,
  paymentFilter: string
): Lead[] {
  const q = search.toLowerCase();
  return leads.filter((lead) => {
    const matchesSearch =
      !q ||
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.phone.includes(q);
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    const matchesPayment =
      !paymentFilter || (lead.paymentStatus || "unpaid") === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });
}

// ─── Badge Colors ───

export const paymentStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  overdue: "bg-orange-100 text-orange-800 border-orange-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  unpaid: "bg-gray-100 text-gray-600 border-gray-200",
};

export const planTierLabels: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

