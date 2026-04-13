import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles } from "lucide-react";
import type { BuddhistAgent } from "@/shared/buddhistAgents";

interface AgentCardProps {
  agent: BuddhistAgent;
  onViewDetails?: (agent: BuddhistAgent) => void;
}

export function AgentCard({ agent, onViewDetails }: AgentCardProps) {
  return (
    <Card
      className="relative overflow-visible hover-elevate transition-all"
      style={{
        borderLeft: `4px solid ${agent.accentColor}`
      }}
      data-testid={`card-agent-${agent.id}`}
    >
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${agent.accentColor}20` }}
              >
                <Sparkles className="w-5 h-5" style={{ color: agent.accentColor }} />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-foreground" data-testid={`text-agent-name-${agent.id}`}>
                {agent.name}
              </h3>
            </div>
            <Badge
              variant="secondary"
              className="font-mono text-xs whitespace-nowrap"
              data-testid={`badge-model-${agent.id}`}
            >
              {agent.model}
            </Badge>
          </div>
          
          <p className="font-serif text-base italic text-muted-foreground" data-testid={`text-tagline-${agent.id}`}>
            {agent.tagline}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-foreground" data-testid={`text-purpose-${agent.id}`}>
          {agent.purpose}
        </p>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide font-sans font-semibold text-muted-foreground">
            Key Capabilities
          </p>
          <ul className="space-y-2">
            {agent.capabilities.slice(0, 3).map((capability, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground"
                data-testid={`list-capability-${agent.id}-${idx}`}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: agent.accentColor }}
                />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant="outline"
          className="w-full group"
          onClick={() => onViewDetails?.(agent)}
          data-testid={`button-view-details-${agent.id}`}
        >
          <span>View Full System Prompt</span>
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </Card>
  );
}

