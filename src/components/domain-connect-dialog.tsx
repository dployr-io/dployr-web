import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { IntegrationUI } from "@/types";

interface Props {
    integration: IntegrationUI | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DomainConnectDialog({ integration, open, onOpenChange }: Props) {
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleAutoSetup = () => {
        if (integration?.url) {
            window.open(integration.url, "_blank");
        }
    };

    if (!integration) return null;

    const cnameRecords = [
        { name: "www", value: "cname.example.com" },
        { name: "@", value: "cname.example.com" },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <img src={integration.icon} alt={integration.name} className="h-5 w-5" />
                        {integration.name}
                    </DialogTitle>
                    <DialogDescription>Add these CNAME records to your DNS provider</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {cnameRecords.map((record, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Name</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(record.name, `name-${index}`)}
                                >
                                    {copied === `name-${index}` ? "Copied" : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <code className="block text-sm bg-muted p-2 rounded">{record.name}</code>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Value</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(record.value, `value-${index}`)}
                                >
                                    {copied === `value-${index}` ? "Copied" : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <code className="block text-sm bg-muted p-2 rounded">{record.value}</code>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleAutoSetup}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Setup automatically
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
