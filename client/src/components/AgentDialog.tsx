import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { BuddhistAgent } from "@/shared/buddhistAgents";

interface AgentDialogProps {
  agent: BuddhistAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDialog({ agent, open, onOpenChange }: AgentDialogProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid={`dialog-agent-${agent.id}`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${agent.accentColor}20` }}
            >
              <Sparkles className="w-6 h-6" style={{ color: agent.accentColor }} />
            </div>
            <div>
              <DialogTitle className="font-serif text-3xl" data-testid={`text-dialog-title-${agent.id}`}>
                {agent.name}
              </DialogTitle>
              <p className="font-serif text-base italic text-muted-foreground mt-1">
                {agent.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {agent.model}
            </Badge>
            <Badge variant="outline" style={{ borderColor: agent.accentColor, color: agent.accentColor }}>
              Buddhist Agent
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div>
            <h3 className="font-serif text-lg font-semibold mb-3">Purpose</h3>
            <p className="text-foreground leading-relaxed">{agent.purpose}</p>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold mb-3">Key Capabilities</h3>
            <ul className="space-y-2">
              {agent.capabilities.map((capability, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: agent.accentColor }}
                  />
                  <span className="text-foreground">{capability}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold mb-3">System Prompt</h3>
            <div className="bg-muted/50 rounded-lg p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-x-auto">
              <code className="text-foreground">{agent.system}</code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

