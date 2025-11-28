import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Settings, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { IntegrationUI } from "@/types";
import { use2FA } from "@/hooks/use-2fa";

interface Props {
  integration: IntegrationUI;
  isConnected: boolean;
  onToggle: (id: string) => void;
  onConnect: (id: string) => void;
  onSettings: (id: string) => void;
  twoFactor: ReturnType<typeof use2FA>;
}

export function IntegrationCard({ integration, isConnected, onConnect, twoFactor }: Props) {
	const Icon = integration.icon;
  return (
    <Card className={cn("transition-all hover:shadow-md", isConnected && "border-primary/50 border-2")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2", isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    twoFactor.requireAuth(() => {
                      onConnect(integration.id);
                    })
                  }
                  aria-label={isConnected ? "Manage" : "Connect"}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isConnected ? "Manage" : "Connect"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <CardDescription className="mt-2">{integration.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
