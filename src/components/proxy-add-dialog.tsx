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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2, Server, Globe, Folder, FileCode, Code2 } from "lucide-react";

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
  { value: "reverse_proxy", label: "Reverse Proxy", icon: Server, description: "Forward requests to an upstream server" },
  { value: "static", label: "Static Files", icon: Folder, description: "Serve static files from a directory" },
  { value: "php_fastcgi", label: "PHP FastCGI", icon: FileCode, description: "PHP applications via FastCGI" },
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add Proxy Route
            </DialogTitle>
            <DialogDescription>
              Configure a new service route in the proxy
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Service Selection */}
            <Field>
              <FieldLabel htmlFor="serviceName">Service</FieldLabel>
              <Select value={serviceName} onValueChange={setServiceName} disabled={isSubmitting}>
                <SelectTrigger id="serviceName">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span>{service.name}</span>
                        <span className="text-xs text-muted-foreground">:{service.port}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {services.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No services available
                </p>
              )}
              {errors.serviceName && <FieldError>{errors.serviceName}</FieldError>}
            </Field>

            {/* Domain */}
            <Field>
              <FieldLabel htmlFor="domain">Domain</FieldLabel>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase())}
                placeholder="api.example.com"
                disabled={isSubmitting}
              />
              {errors.domain && <FieldError>{errors.domain}</FieldError>}
            </Field>

            {/* Template */}
            <Field>
              <FieldLabel>Template</FieldLabel>
              <Select value={template} onValueChange={setTemplate} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTemplate.description}
                </p>
              )}
            </Field>

            {/* Upstream (conditional) */}
            {showUpstream && (
              <Field>
                <FieldLabel htmlFor="upstream">Upstream</FieldLabel>
                <Input
                  id="upstream"
                  value={upstream}
                  onChange={(e) => setUpstream(e.target.value)}
                  placeholder={template === "php_fastcgi" ? "127.0.0.1:9000" : "http://localhost:3000"}
                  disabled={isSubmitting}
                />
                {errors.upstream && <FieldError>{errors.upstream}</FieldError>}
                <p className="text-xs text-muted-foreground mt-1">
                  {template === "php_fastcgi"
                    ? "PHP-FPM socket address (host:port)"
                    : "Backend server URL to forward requests to"}
                </p>
              </Field>
            )}

            {/* Root Directory (conditional) */}
            {showRoot && (
              <Field>
                <FieldLabel htmlFor="root">Root Directory</FieldLabel>
                <Input
                  id="root"
                  value={root}
                  onChange={(e) => setRoot(e.target.value)}
                  placeholder="/var/www/html"
                  disabled={isSubmitting}
                />
                {errors.root && <FieldError>{errors.root}</FieldError>}
                <p className="text-xs text-muted-foreground mt-1">
                  Absolute path to serve files from
                </p>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Adding..." : "New Proxy Route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}