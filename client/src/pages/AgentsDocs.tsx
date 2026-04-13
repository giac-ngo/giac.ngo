import { useState } from "react";
import { DocsNav } from "@/components/DocsNav";
import { CompactAgentCard } from "@/components/CompactAgentCard";
import { AgentDialog } from "@/components/AgentDialog";
import { PricingTable } from "@/components/PricingTable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, DollarSign, BookOpen, Zap, Download, Share2, Menu, X, Code2 } from "lucide-react";
import { buddhistAgents, modelPricing, type BuddhistAgent } from "@/shared/buddhistAgents";

export default function AgentsDocs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<BuddhistAgent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const navigation = [
    {
      id: "agents",
      title: "Agents",
      icon: Sparkles,
      children: [
        { id: "overview", title: "Overview", href: "#overview" },
        { id: "models", title: "Agent Models", href: "#models" },
        { id: "quick-start", title: "Quick Start", href: "#quick-start" },
      ],
    },
    {
      id: "pricing",
      title: "Pricing",
      icon: DollarSign,
      children: [
        { id: "pricing-overview", title: "Token Pricing", href: "#pricing" },
      ],
    },
  ];

  const handleViewDetails = (agent: BuddhistAgent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover-elevate rounded-lg transition-all"
              data-testid="button-sidebar-toggle"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-serif text-lg font-bold text-primary">Buddhist Agents</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="hidden sm:flex" data-testid="button-download">
              <Download className="w-3.5 h-3.5 mr-2" />
              <span>Export PDF</span>
            </Button>
            <Button size="sm" data-testid="button-share">
              <Share2 className="w-3.5 h-3.5 mr-2" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-[57px]">
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <aside className="fixed top-[57px] left-0 h-[calc(100vh-57px)] w-80 bg-sidebar border-r overflow-y-auto z-30 lg:block">
            <DocsNav navigation={navigation} />
          </aside>
        )}

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 lg:ml-80">
          <div className="max-w-6xl mx-auto px-8 py-16 space-y-20">
            <section id="overview" className="space-y-8">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-semibold text-foreground" data-testid="heading-overview">
                  Buddhist AI Agents
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                  Specialized AI assistants grounded in Buddhist wisdom, each designed for specific aspects of spiritual practice—from gentle healing to direct awakening.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">6 Specialized Agents</h3>
                  <p className="text-sm text-muted-foreground">
                    Each agent embodies a unique approach to spiritual guidance, from compassionate healing to sudden awakening.
                  </p>
                </Card>
                <Card className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-2/20 flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-chart-2" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">Advanced Models</h3>
                  <p className="text-sm text-muted-foreground">
                    Powered by GPT-4o and GPT-5, combining cutting-edge AI with timeless dharma teachings.
                  </p>
                </Card>
                <Card className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-chart-3" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">Sacred Economics</h3>
                  <p className="text-sm text-muted-foreground">
                    Merit-based pricing that honors both computational reality and spiritual intention.
                  </p>
                </Card>
              </div>
            </section>

            <section id="models" className="space-y-8">
              <div className="space-y-4">
                <h2 className="font-serif text-3xl font-semibold text-foreground" data-testid="heading-models">
                  Agent Models
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                  Each Buddhist agent is carefully designed with specific system prompts, methodologies, and purposes. Select an agent to view full details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buddhistAgents.map((agent) => (
                  <CompactAgentCard
                    key={agent.id}
                    agent={agent}
                    onClick={handleViewDetails}
                  />
                ))}
              </div>
            </section>

            <section id="quick-start" className="space-y-8">
              <div className="space-y-4">
                <h2 className="font-serif text-3xl font-semibold text-foreground" data-testid="heading-quick-start">
                  Quick Start
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                  Begin your journey with Buddhist AI agents using simple API integration.
                </p>
              </div>

              <Card className="p-8 space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-semibold mb-4">Initialize an Agent</h3>
                  <div className="bg-muted/50 rounded-lg p-6 font-mono text-sm overflow-x-auto">
                    <code className="text-foreground whitespace-pre">{`import { buddhistAgents } from '@/lib/agents';

// Select an agent
const giacNgo = buddhistAgents.find(a => a.id === 'giac-ngo');

// Use with your preferred LLM client
const response = await openai.chat.completions.create({
  model: giacNgo.model,
  messages: [
    { role: "system", content: giacNgo.system },
    { role: "user", content: "What is the path to awakening?" }
  ]
});`}</code>
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-semibold mb-4">Available Agents</h3>
                  <div className="flex flex-wrap gap-2">
                    {buddhistAgents.map((agent) => (
                      <Badge
                        key={agent.id}
                        variant="secondary"
                        className="font-mono"
                        data-testid={`badge-quick-start-${agent.id}`}
                      >
                        {agent.id}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            <section id="pricing" className="space-y-8">
              <PricingTable />
            </section>
          </div>
        </main>
      </div>

      <AgentDialog
        agent={selectedAgent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

