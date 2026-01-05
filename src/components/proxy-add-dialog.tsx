// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, ArrowLeftRight, FileCode, Code2, Info } from "lucide-react";
import { SiPhp } from "react-icons/si";

interface ProxyAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    serviceName: string;
    upstream: string;
    domain?: string;
    root?: string;
    template?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  services?: Array<{ id: string; name: string; port: number }>;
}

const templates = [
  { value: "reverse_proxy", label: "Reverse Proxy", icon: ArrowLeftRight, description: "Forward requests to an upstream server" },
  { value: "static", label: "Static Files", icon: FileCode, description: "Serve static files from a directory" },
  { value: "php_fastcgi", label: "PHP FastCGI", icon: SiPhp, description: "PHP applications via FastCGI" },
  { value: "custom", label: "Custom", icon: Code2, description: "Custom configuration" },
];

export function ProxyAddDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  services = [],
}: ProxyAddDialogProps) {
  const [serviceName, setServiceName] = useState("");
  const [domain, setDomain] = useState("");
  const [upstream, setUpstream] = useState("");
  const [root, setRoot] = useState("");
  const [template, setTemplate] = useState("reverse_proxy");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!serviceName.trim()) {
      newErrors.serviceName = "Service is required";
    }

    if (!domain.trim()) {
      newErrors.domain = "Domain is required";
    } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(domain)) {
      newErrors.domain = "Invalid domain format";
    }

    if (template === "reverse_proxy" || template === "php_fastcgi") {
      if (!upstream.trim()) {
        newErrors.upstream = "Upstream is required for this template";
      } else if (!/^(https?:\/\/|)[a-z0-9.-]+(:\d+)?(\/.*)?$/.test(upstream)) {
        newErrors.upstream = "Invalid upstream format (e.g., http://localhost:3000)";
      }
    }

    if (template === "static" || template === "php_fastcgi") {
      if (!root.trim()) {
        newErrors.root = "Root directory is required for this template";
      } else if (!root.startsWith("/")) {
        newErrors.root = "Root must be an absolute path";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit({
        serviceName,
        upstream,
        domain: domain || undefined,
        root: root || undefined,
        template,
      });

      // Reset form on success
      setServiceName("");
      setDomain("");
      setUpstream("");
      setRoot("");
      setTemplate("reverse_proxy");
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const handleClose = () => {
    setErrors({});
    onOpenChange(false);
  };

  const selectedTemplate = templates.find((t) => t.value === template);
  const showUpstream = template === "reverse_proxy" || template === "php_fastcgi" || template === "custom";
  const showRoot = template === "static" || template === "php_fastcgi" || template === "custom";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Proxy</DialogTitle>
            <DialogDescription className="text-xs">
              Configure a new proxy to your service
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Service Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="serviceName" className="text-xs">Service</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select the backend service to route traffic to</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={serviceName} onValueChange={setServiceName} disabled={isSubmitting}>
                  <SelectTrigger id="serviceName" className="h-8 text-xs">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name} className="text-xs">
                        <span className="truncate">{service.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FieldLabel className="text-xs">Template</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{selectedTemplate?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select value={template} onValueChange={setTemplate} disabled={isSubmitting}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        <div className="flex items-center gap-2">
                          <t.icon className="h-3 w-3" />
                          <span>{t.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Domain */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="domain" className="text-xs">Domain</FieldLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The domain name for this proxy (e.g. api.example.com)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                placeholder="api.example.com"
                disabled={isSubmitting}
                className="h-8 text-xs"
              />
              {errors.domain && <FieldError className="text-[10px]">{errors.domain}</FieldError>}
            </div>

            {/* Upstream (conditional) */}
            {showUpstream && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="upstream" className="text-xs">Upstream</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {template === "php_fastcgi"
                          ? "PHP-FPM socket address (host:port)"
                          : "Backend server URL to forward requests to"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="upstream"
                  value={upstream}
                  onChange={(e) => setUpstream(e.target.value)}
                  placeholder={template === "php_fastcgi" ? "127.0.0.1:9000" : "http://localhost:3000"}
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                />
                {errors.upstream && <FieldError className="text-[10px]">{errors.upstream}</FieldError>}
              </div>
            )}

            {/* Root Directory (conditional) */}
            {showRoot && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="root" className="text-xs">Root</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Absolute path to serve files from</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="root"
                  value={root}
                  onChange={(e) => setRoot(e.target.value)}
                  placeholder="/var/www/html"
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                />
                {errors.root && <FieldError className="text-[10px]">{errors.root}</FieldError>}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs">
              {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
              {isSubmitting ? "Adding" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}