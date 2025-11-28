import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import type { Integrations, IntegrationUI } from "@/types";

interface Props {
  integration: IntegrationUI | null;
  integrations?: Integrations | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoteConnectDialog({ integration, integrations, open, onOpenChange }: Props) {
  const { handleGitHubSignIn } = useAuth();

  function handleInstallApp()  {
    if (integrations?.remote?.gitHub.installUrl) {
      window.open(integrations?.remote?.gitHub.installUrl, "_blank");
    }
  };

  if (!integration) return null;

  const Icon = integration.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {integration.name}
          </DialogTitle>
          <DialogDescription>{integration.description}</DialogDescription>
        </DialogHeader>
        {integrations?.remote?.gitHub?.loginId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <div className="font-medium">{integrations.remote?.gitHub.loginId}</div>
                  <div className="text-muted-foreground">{integrations.remote?.gitHub.remotesCount} repo</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              integrations?.remote?.gitHub?.loginId
                ? window.open(`${import.meta.env.VITE_BASE_URL}/v1/github/connection/manage`)
                : handleGitHubSignIn('/settings/integrations?appNotification={"message":"Successfully connected GitHub account!"}');
            }}
          >
            {integrations?.remote?.gitHub?.loginId ? "View" : "Connect"}
          </Button>
          <Button
            type="button"
            onClick={() => {
               handleInstallApp();
            }}
          >
            {integrations?.remote?.gitHub?.installationId ? "Manage" : "Install"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
