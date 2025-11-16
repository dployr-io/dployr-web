import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import type { IntegrationUI } from "@/types";

interface Props {
  integration: IntegrationUI | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoteConnectDialog({ integration, open, onOpenChange }: Props) {
  const { handleGitHubSignIn } = useAuth();


  const handleInstallApp = () => {
    if (integration?.url) {
      window.open(integration.url, "_blank");
    }
  };

  if (!integration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={integration.icon} alt={integration.name} className="h-5 w-5" />
            {integration.name}
          </DialogTitle>
          <DialogDescription>{integration.description}</DialogDescription>
        </DialogHeader>
        {integration.gitHub?.loginId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <div className="font-medium">{integration.gitHub.loginId}</div>
                  <div className="text-muted-foreground">{integration.gitHub.remotesCount} repo</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={handleGitHubSignIn}>
            {integration.gitHub?.loginId ? "Manage" : "Connect"} account
          </Button>
          <Button type="button" onClick={handleInstallApp}>
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
