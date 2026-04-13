import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TempleApi {
  id: string;
  userId: string;
  templeName: string;
  slug: string;
  baseUrl: string;
  statsEndpoint: string;
  authType: string;
  authToken: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

interface TempleUser {
  id: string;
  name: string;
  email: string;
}

export default function AdminTempleApis() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<TempleApi | null>(null);
  const [formData, setFormData] = useState({
    templeName: "",
    slug: "",
    baseUrl: "",
    statsEndpoint: "/api/dashboard/stats",
    authType: "bearer",
    authToken: "",
    userId: "",
    isActive: true,
  });

  // Fetch temple APIs
  const { data: apis = [], isLoading, refetch } = useQuery<TempleApi[]>({
    queryKey: ["admin-temple-apis"],
    queryFn: async () => {
      const res = await fetch("/api/admin/temple-apis", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch temple admins for dropdown
  const { data: templeAdmins = [] } = useQuery<TempleUser[]>({
    queryKey: ["admin-temple-users"],
    queryFn: async () => {
      const res = await fetch("/api/leads", { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      // Filter to get unique users from leads who might be temple admins
      return json.data?.filter((l: any) => l.status === "converted") || [];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const url = data.id ? `/api/admin/temple-apis/${data.id}` : "/api/admin/temple-apis";
      const method = data.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: editingApi ? "Temple API updated" : "Temple API created" });
      queryClient.invalidateQueries({ queryKey: ["admin-temple-apis"] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/temple-apis/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Temple API removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-temple-apis"] });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/temple-apis/${id}/sync`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Sync failed");
      }
    },
    onSuccess: () => {
      toast({ title: "Synced", description: "Stats fetched successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-temple-apis"] });
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  // Sync all mutation
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/temple-apis/sync-all", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `${data.data.success}/${data.data.total} temples synced successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-temple-apis"] });
    },
  });

  const handleOpenModal = (api?: TempleApi) => {
    if (api) {
      setEditingApi(api);
      setFormData({
        templeName: api.templeName,
        slug: api.slug,
        baseUrl: api.baseUrl,
        statsEndpoint: api.statsEndpoint,
        authType: api.authType,
        authToken: "", // Don't show existing token
        userId: api.userId,
        isActive: api.isActive,
      });
    } else {
      setEditingApi(null);
      setFormData({
        templeName: "",
        slug: "",
        baseUrl: "",
        statsEndpoint: "/api/dashboard/stats",
        authType: "bearer",
        authToken: "",
        userId: "",
        isActive: true,
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingApi(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = editingApi ? { ...formData, id: editingApi.id } : formData;
    // Only include authToken if it's been changed
    if (editingApi && !formData.authToken) {
      delete (payload as any).authToken;
    }
    saveMutation.mutate(payload);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">Temple External APIs</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="font-serif text-xs"
          >
            {syncAllMutation.isPending ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Sync All
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenModal()}
            className="bg-[#991b1b] hover:bg-[#7a1515] font-serif text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Temple API
          </Button>
        </div>
      </div>

      {/* API List */}
      <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#991b1b]" />
          </div>
        ) : apis.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-10 h-10 mx-auto mb-3 text-[#8B4513]/30" />
            <p className="font-serif text-sm text-[#8B4513]/60">No temple APIs configured yet</p>
            <p className="font-serif text-xs text-[#8B4513]/40 mt-1">
              Add external temple APIs to fetch their stats
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apis.map((api) => (
              <div
                key={api.id}
                className="p-4 rounded-lg border border-[#8B4513]/10 hover:border-[#991b1b]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-serif text-sm font-semibold text-[#2c2c2c]">
                        {api.templeName}
                      </h3>
                      <span className="px-2 py-0.5 bg-[#8B4513]/10 text-[#8B4513] rounded text-xs font-mono">
                        {api.slug}
                      </span>
                      {api.isActive ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-xs text-[#8B4513]/60 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {api.baseUrl}{api.statsEndpoint}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs font-serif">
                      <span className="text-[#8B4513]/50">Auth: {api.authType}</span>
                      {api.lastSyncAt && (
                        <span className="flex items-center gap-1">
                          {api.lastSyncStatus === "success" ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                          )}
                          Last sync: {new Date(api.lastSyncAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {api.lastSyncError && (
                      <p className="text-xs text-red-600 mt-1">{api.lastSyncError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncMutation.mutate(api.id)}
                      disabled={syncMutation.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(api)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this temple API configuration?")) {
                          deleteMutation.mutate(api.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="bg-white border border-[#8B4513]/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#2c2c2c]">
              {editingApi ? "Edit Temple API" : "Add Temple API"}
            </DialogTitle>
            <DialogDescription className="font-serif text-sm text-[#8B4513]/70">
              Configure an external temple API to fetch their dashboard stats.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-serif text-sm font-medium text-[#2c2c2c]">Temple Name</label>
                <input
                  type="text"
                  value={formData.templeName}
                  onChange={(e) => setFormData({ ...formData, templeName: e.target.value })}
                  placeholder="Tathata Temple"
                  className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="font-serif text-sm font-medium text-[#2c2c2c]">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  placeholder="tathata"
                  className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm font-mono"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-serif text-sm font-medium text-[#2c2c2c]">Base URL</label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://tathata.bodhilab.io"
                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="font-serif text-sm font-medium text-[#2c2c2c]">Stats Endpoint</label>
              <input
                type="text"
                value={formData.statsEndpoint}
                onChange={(e) => setFormData({ ...formData, statsEndpoint: e.target.value })}
                placeholder="/api/dashboard/stats"
                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm font-mono"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-serif text-sm font-medium text-[#2c2c2c]">Auth Type</label>
                <select
                  value={formData.authType}
                  onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm"
                >
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key Header</option>
                  <option value="none">No Auth</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-serif text-sm font-medium text-[#2c2c2c]">
                  Auth Token {editingApi && "(leave blank to keep existing)"}
                </label>
                <input
                  type="password"
                  value={formData.authToken}
                  onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                  placeholder={editingApi ? "••••••••" : "Enter token"}
                  className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-serif text-sm font-medium text-[#2c2c2c]">Temple Admin User ID</label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="User ID of the temple admin"
                className="w-full px-3 py-2 bg-white border border-[#8B4513]/30 rounded-lg font-serif text-sm font-mono"
                required
              />
              <p className="text-xs text-[#8B4513]/50">
                The Bodhi user ID this temple belongs to (for temple admin dashboard access)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-[#8B4513]/30"
              />
              <label htmlFor="isActive" className="font-serif text-sm text-[#2c2c2c]">
                Active (enable syncing)
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="font-serif text-sm">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-[#991b1b] hover:bg-[#7a1515] font-serif text-sm"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                {editingApi ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
