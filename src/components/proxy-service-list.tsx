// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Globe,
  Server,
  Folder,
  FileCode,
  Code2,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Activity,
} from "lucide-react";
import type { ProxyApps } from "@/types";

interface ProxyServiceListProps {
  apps: ProxyApps | null;
  onRemove?: (serviceName: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

// Template icons
const templateIcons: Record<string, typeof Globe> = {
  reverse_proxy: Server,
  static: Folder,
  php_fastcgi: FileCode,
};

const getTemplateIcon = (template: string) => {
  return templateIcons[template] || Code2;
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "running":
      return "default";
    case "stopped":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
};

export function ProxyServiceList({
  apps,
  onRemove,
  className,
}: ProxyServiceListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; domain: string | null }>({
    open: false,
    domain: null,
  });
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopiedDomain(domain);
      setTimeout(() => setCopiedDomain(null), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleDeleteClick = (domain: string) => {
    setDeleteDialog({ open: true, domain });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.domain || !onRemove) return;

    setIsDeleting(true);
    try {
      await onRemove(deleteDialog.domain);
      setDeleteDialog({ open: false, domain: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const appEntries = apps ? Object.entries(apps) : [];

  if (appEntries.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No proxy routes configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Proxy Routes
          </CardTitle>
          <CardDescription>
            {appEntries.length} route{appEntries.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Upstream</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {appEntries.map(([domain, app]) => {
                const Icon = getTemplateIcon(app.template);

                return (
                  <TableRow key={domain}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(domain)}
                            >
                              {copiedDomain === domain ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy domain</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">
                          {app.template.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {app.upstream}
                      </code>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://${domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open in browser
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(domain)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy domain
                          </DropdownMenuItem>
                          {onRemove && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(domain)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove route
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, domain: deleteDialog.domain })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove proxy route?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the route for <strong className="font-medium text-foreground">{deleteDialog.domain}</strong> from the proxy.
              The service will no longer be accessible through this domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}