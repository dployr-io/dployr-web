import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link, Unlink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Integration } from "@/types";
import { use2FA } from "@/hooks/use-2fa";
import { TwoFactorDialog } from "@/components/two-factor-dialog";

interface Props {
    integration: Integration;
    isConnected: boolean;
    onToggle: (id: string) => void;
    onSettings: (id: string) => void;
}

export function IntegrationCard({
    integration,
    isConnected,
    onToggle,
    onSettings,
}: Props) {
     const twoFactor = use2FA({ enabled: true });

    return (
        <Card
            className={cn(
                "transition-all hover:shadow-md",
                isConnected && "border-primary/50",
            )}
        >
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "rounded-lg p-2",
                                isConnected
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground",
                            )}
                        >
                            {integration.icon}
                        </div>
                        <div>
                            <CardTitle className="text-base">
                                {integration.name}
                            </CardTitle>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isConnected && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        onClick={() => onSettings(integration.id)}
                                        aria-label="Integration settings"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Settings
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 shrink-0 cursor-pointer",
                                        isConnected
                                            ? "text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                    onClick={() =>
                                        twoFactor.requireAuth(() => {
                                            onToggle(integration.id);
                                        })
                                    }
                                    aria-label={isConnected ? "Disconnect integration" : "Connect integration"}
                                >
                                    {isConnected ? (
                                        <Unlink className="h-4 w-4" />
                                    ) : (
                                        <Link className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isConnected ? "Disconnect" : "Connect"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <CardDescription className="mt-2">
                    {integration.description}
                </CardDescription>
            </CardHeader>

            {/* 2FA Dialog */}
            <TwoFactorDialog
                open={twoFactor.isOpen}
                onOpenChange={twoFactor.setIsOpen}
                onVerify={twoFactor.verify}
                isSubmitting={twoFactor.isVerifying}
            />
        </Card>
    );
}