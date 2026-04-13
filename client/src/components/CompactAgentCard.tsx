import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Users, Heart } from "lucide-react";
import type { BuddhistAgent } from "@/shared/buddhistAgents";

interface CompactAgentCardProps {
  agent: BuddhistAgent;
  onClick?: (agent: BuddhistAgent) => void;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function CompactAgentCard({ agent, onClick }: CompactAgentCardProps) {
  return (
    <Card
      className="overflow-visible hover-elevate active-elevate-2 cursor-pointer transition-all"
      onClick={() => onClick?.(agent)}
      data-testid={`card-agent-compact-${agent.id}`}
    >
      <div className="p-6 space-y-4">
        {/* Main content */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${agent.accentColor}20` }}
          >
            <Sparkles className="w-6 h-6" style={{ color: agent.accentColor }} />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-lg font-semibold text-foreground" data-testid={`text-agent-name-${agent.id}`}>
                {agent.name}
              </h3>
              <Badge
                variant="secondary"
                className="font-mono text-xs"
                data-testid={`badge-model-${agent.id}`}
              >
                {agent.model}
              </Badge>
            </div>
            
            <p className="font-serif text-sm italic text-muted-foreground line-clamp-2" data-testid={`text-tagline-${agent.id}`}>
              {agent.tagline}
            </p>
          </div>
        </div>

        {/* Publisher info */}
        {agent.monastery && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="font-serif text-xs" style={{ backgroundColor: `${agent.accentColor}15`, color: agent.accentColor }}>
                {agent.monastery.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-3">
              <span className="font-serif text-sm text-foreground" data-testid={`text-monastery-${agent.id}`}>
                {agent.monastery}
              </span>
              {agent.users !== undefined && agent.likes !== undefined && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{formatCount(agent.users)}</span>
                  </div>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{formatCount(agent.likes)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

