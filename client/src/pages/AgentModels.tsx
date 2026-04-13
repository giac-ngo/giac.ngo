import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CompactAgentCard } from "@/components/CompactAgentCard";
import { AgentDialog } from "@/components/AgentDialog";
import { Search, ChevronDown } from "lucide-react";
import { buddhistAgents, vehicleInfo, type BuddhistAgent, type BuddhistVehicle } from "@/shared/buddhistAgents";
import { useLanguage } from "@/contexts/LanguageContext";
import { docsTranslations } from "@/translations/docs";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function AgentModels() {
  const { language } = useLanguage();
  const t = docsTranslations[language].agentModels;
  useDocumentTitle("AI Agent Models", "Explore Buddhist AI agents — dharma guidance, meditation coaching, and community support powered by tradition-aligned language models.");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<BuddhistVehicle>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<BuddhistAgent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vehicleFilterOpen, setVehicleFilterOpen] = useState(true);

  const filteredAgents = buddhistAgents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.monastery?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesVehicle = selectedVehicles.size === 0 || selectedVehicles.has(agent.vehicle);
    
    return matchesSearch && matchesVehicle;
  });

  const handleViewDetails = (agent: BuddhistAgent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const toggleVehicle = (vehicle: BuddhistVehicle) => {
    setSelectedVehicles(prev => {
      const next = new Set(prev);
      if (next.has(vehicle)) {
        next.delete(vehicle);
      } else {
        next.add(vehicle);
      }
      return next;
    });
  };

  const vehicleOptions: Array<{ value: BuddhistVehicle, label: string }> = [
    { value: "tiểu-thừa", label: t.filters.vehicles.tieu },
    { value: "trung-thừa", label: t.filters.vehicles.trung },
    { value: "đại-thừa", label: t.filters.vehicles.dai },
    { value: "phật-thừa", label: t.filters.vehicles.phat }
  ];

  return (
    <div className="min-h-screen">
      {/* Header Section - Centered */}
      <div className="text-center py-16 px-8 space-y-6 max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground" data-testid="heading-agent-models">
          {t.title}
        </h1>
        <p className="font-serif text-base md:text-lg text-muted-foreground leading-relaxed">
          {t.subtitle}
        </p>

        {/* Centered Search Bar */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-serif"
            data-testid="input-search-agents"
          />
        </div>
      </div>

      {/* Main Content - Sidebar + Grid */}
      <div className="max-w-7xl mx-auto px-8 pb-16">
        <div className="flex gap-8">
          {/* Left Sidebar - Filters */}
          <aside className="w-64 flex-shrink-0">
            <div className="space-y-6 sticky top-8">
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {t.filters.title}
              </h3>

              {/* Vehicle Filter */}
              <div className="space-y-3">
                <button
                  onClick={() => setVehicleFilterOpen(!vehicleFilterOpen)}
                  className="flex items-center justify-between w-full font-serif text-sm font-medium text-foreground hover-elevate"
                  data-testid="button-toggle-vehicle-filter"
                >
                  <span>{t.filters.vehicle}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${vehicleFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {vehicleFilterOpen && (
                  <div className="space-y-3 pl-1">
                    {vehicleOptions.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vehicle-${option.value}`}
                          checked={selectedVehicles.has(option.value)}
                          onCheckedChange={() => toggleVehicle(option.value)}
                          data-testid={`filter-vehicle-${option.value}`}
                        />
                        <label
                          htmlFor={`vehicle-${option.value}`}
                          className="font-serif text-sm text-foreground cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right Side - Agent Grid */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <p className="font-serif text-sm text-muted-foreground">
                {filteredAgents.length} {filteredAgents.length === 1 ? t.results.agent : t.results.agents} {t.results.found}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <CompactAgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={handleViewDetails}
                />
              ))}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-16">
                <p className="font-serif text-muted-foreground">
                  {t.emptyState}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AgentDialog
        agent={selectedAgent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}


