import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  Loader2,
  ExternalLink,
  Building2,
  Palette,
  Globe,
  Bot,
  FileText,
} from "lucide-react";

interface OnboardingRecord {
  id: string;
  userId: string;
  email?: string;
  templeName: string;
  tradition: string;
  location: string | null;
  language: string;
  logoUrl: string | null;
  primaryColor: string | null;
  theme: string | null;
  contentDriveUrl: string | null;
  spaceType: string;
  customDomain: string | null;
  existingWebsite: string | null;
  doctrinalMode: string | null;
  responseStyle: string | null;
  aiNotes: string | null;
  notes: string | null;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  submitted: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

export default function AdminOnboarding() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const { data: records = [], isLoading } = useQuery<OnboardingRecord[]>({
    queryKey: ["admin-onboarding"],
    queryFn: async () => {
      const res = await fetch("/api/admin/onboarding", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/onboarding/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-onboarding"] });
    },
  });

  const selected = records.find((r) => r.id === selectedId);
  const traditions = (() => {
    try { return JSON.parse(selected?.tradition || "[]"); } catch { return []; }
  })() as string[];

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl border border-[#8B4513]/20 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[#991b1b]" />
          <div className="text-left">
            <h2 className="font-serif text-lg font-bold text-[#2c2c2c]">Onboarding Submissions</h2>
            <p className="font-serif text-xs text-[#8B4513]/70">
              {records.length} total · {records.filter((r) => r.status === "submitted").length} pending
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#8B4513]/50" /> : <ChevronDown className="w-4 h-4 text-[#8B4513]/50" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
            </div>
          ) : records.length === 0 ? (
            <p className="font-serif text-sm text-[#8B4513]/50 text-center py-6">No onboarding submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:bg-[#EFE0BD]/30 ${
                    selectedId === r.id ? "border-[#991b1b]/30 bg-[#991b1b]/5" : "border-[#8B4513]/10"
                  }`}
                  onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Building2 className="w-4 h-4 text-[#8B4513]/50 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-serif text-sm font-medium text-[#2c2c2c] truncate">{r.templeName || "Unnamed"}</p>
                      <p className="font-serif text-xs text-[#8B4513]/50 truncate">{r.email || r.userId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full font-serif text-xs border ${statusColors[r.status] || statusColors.draft}`}>
                      {r.status}
                    </span>
                    <span className="font-serif text-xs text-[#8B4513]/40">{formatDate(r.submittedAt || r.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail panel */}
          {selected && (
            <div className="mt-4 p-5 bg-[#EFE0BD]/30 rounded-xl border border-[#8B4513]/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#2c2c2c]">{selected.templeName}</h3>
                <button onClick={() => setSelectedId(null)} className="text-[#8B4513]/40 hover:text-[#8B4513]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status control */}
              <div className="flex items-center gap-2">
                <span className="font-serif text-xs text-[#8B4513]/60">Status:</span>
                <select
                  value={selected.status}
                  onChange={(e) => updateStatusMutation.mutate({ id: selected.id, status: e.target.value })}
                  className="px-2 py-1 bg-white border border-[#8B4513]/20 rounded font-serif text-xs"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                </select>
                {updateStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-[#991b1b]" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Temple Info */}
                <DetailSection icon={Building2} title="Temple Info">
                  <DetailRow label="Name" value={selected.templeName} />
                  <DetailRow label="Tradition" value={traditions.join(", ")} />
                  <DetailRow label="Location" value={selected.location} />
                  <DetailRow label="Language" value={selected.language} />
                  <DetailRow label="Email" value={selected.email} />
                </DetailSection>

                {/* Branding */}
                <DetailSection icon={Palette} title="Branding">
                  {selected.logoUrl && <img src={selected.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border border-[#8B4513]/20 mb-1" />}
                  <DetailRow label="Color" value={selected.primaryColor} />
                  <DetailRow label="Theme" value={selected.theme} />
                </DetailSection>

                {/* Content */}
                <DetailSection icon={FileText} title="Content">
                  {selected.contentDriveUrl ? (
                    <a href={selected.contentDriveUrl} target="_blank" rel="noopener noreferrer" className="font-serif text-xs text-[#991b1b] hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Open Drive Folder
                    </a>
                  ) : (
                    <span className="font-serif text-xs text-[#8B4513]/30 italic">No link provided</span>
                  )}
                </DetailSection>

                {/* Technical */}
                <DetailSection icon={Globe} title="Technical">
                  <DetailRow label="Website Type" value="Dedicated Website" />
                  <DetailRow label="Custom Domain" value={selected.customDomain} />
                  <DetailRow label="Existing Site" value={selected.existingWebsite} />
                </DetailSection>

                {/* AI */}
                <DetailSection icon={Bot} title="AI Preferences">
                  <DetailRow label="Doctrinal Mode" value={selected.doctrinalMode} />
                  <DetailRow label="Response Style" value={selected.responseStyle} />
                  <DetailRow label="Notes" value={selected.aiNotes} />
                </DetailSection>
              </div>

              <div className="flex gap-2 text-xs font-serif text-[#8B4513]/40 pt-2 border-t border-[#8B4513]/10">
                <span>Created: {formatDate(selected.createdAt)}</span>
                <span>·</span>
                <span>Submitted: {formatDate(selected.submittedAt)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#8B4513] mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 font-serif text-xs">
      <span className="text-[#8B4513]/50 min-w-[80px]">{label}:</span>
      <span className={value ? "text-[#2c2c2c]" : "text-[#8B4513]/30 italic"}>{value || "—"}</span>
    </div>
  );
}
