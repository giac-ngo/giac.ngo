import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Copy, Loader2, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { metricsTranslations } from "@/translations/metrics";

interface ApiKey {
  id: string;
  apiKey: string;
  domain: string | null;
  label: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeyManager() {
  const { language } = useLanguage();
  const t = metricsTranslations[language];
  const { toast } = useToast();
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["temple-api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/temple/api-keys", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const json = await res.json();
      return json.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/temple/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: "Production" }),
      });
      if (!res.ok) throw new Error("Failed to generate API key");
      return res.json();
    },
    onSuccess: (data) => {
      setNewKeyValue(data.data.apiKey);
      queryClient.invalidateQueries({ queryKey: ["temple-api-keys"] });
      toast({ title: t.keyGenerated });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/temple/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temple-api-keys"] });
      toast({ title: t.keyRevoked });
    },
  });

  const copyKey = () => {
    if (newKeyValue) {
      navigator.clipboard.writeText(newKeyValue);
      toast({ title: t.keyCopied });
    }
  };

  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <Card className="bg-white/80 backdrop-blur-md border-[#8B4513]/20 p-6 col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-[#991b1b]" />
          <h2 className="font-serif text-lg font-semibold text-[#2c2c2c]">{t.apiKeys}</h2>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          size="sm"
          className="bg-[#991b1b] text-white hover:bg-[#7a1515] font-serif text-xs"
        >
          {generateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
          {t.generateKey}
        </Button>
      </div>

      <p className="font-serif text-xs text-[#8B4513]/60 mb-4">{t.apiKeysDesc}</p>

      {/* Show newly generated key */}
      {newKeyValue && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-600" />
            <p className="font-serif text-sm font-medium text-green-800">{t.keyCopied.split("!")[0]}!</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-green-200 font-mono break-all">
              {newKeyValue}
            </code>
            <Button variant="outline" size="sm" onClick={copyKey} className="flex-shrink-0">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#991b1b]" />
        </div>
      ) : keys.length === 0 ? (
        <p className="font-serif text-sm text-[#8B4513]/50 text-center py-4">
          No API keys yet. Generate one to connect your site.
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                key.revokedAt
                  ? "bg-gray-50 border-gray-200 opacity-60"
                  : "bg-white border-[#8B4513]/10"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs text-[#2c2c2c]">{key.apiKey}</code>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-serif ${
                    key.revokedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {key.revokedAt ? t.revoked : t.active}
                  </span>
                </div>
                <div className="flex gap-4 mt-1">
                  <span className="font-serif text-xs text-[#8B4513]/50">
                    {t.created}: {new Date(key.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-serif text-xs text-[#8B4513]/50">
                    {t.lastUsed}: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : t.never}
                  </span>
                </div>
              </div>
              {!key.revokedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(t.revokeConfirm)) {
                      revokeMutation.mutate(key.id);
                    }
                  }}
                  disabled={revokeMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
