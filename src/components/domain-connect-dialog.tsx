// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { DnsDomain, DnsSetupResponse } from "@/hooks/use-dns";

interface Props {
    setupDetails: DnsSetupResponse | null;
    domains: DnsDomain[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface RecordRowProps {
    label: string;
    value: string;
    mono?: boolean;
}

function RecordRow({ label, value, mono = true }: RecordRowProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // clipboard unavailable (HTTP / permissions denied) — silent fail
        }
    };

    return (
        <div className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
            <span className={`text-xs flex-1 truncate ${mono ? "font-mono" : ""}`}>{value}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
        </div>
    );
}

export function DomainConnectDialog({ setupDetails, domains, open, onOpenChange }: Props) {
    const [verified, setVerified] = useState(false);

    // Keep a stable ref so the auto-close timer never needs onOpenChange in deps
    const onOpenChangeRef = useRef(onOpenChange);
    useEffect(() => { onOpenChangeRef.current = onOpenChange; });

    // Reset verified state when dialog closes/reopens for a new domain
    // Auto-close 1.5 s after the domain transitions to active
    useEffect(() => {
        if (!open) {
            setVerified(false);
            return;
        }
        if (!setupDetails) return;
        const isNowActive = domains.some(d => d.domain === setupDetails.domain && d.status === "active");
        if (!isNowActive) return;
        setVerified(true);
        const t = setTimeout(() => onOpenChangeRef.current(false), 1500);
        return () => clearTimeout(t);
    }, [domains, setupDetails, open]);

    if (!setupDetails) return null;

    const { domain, records, verification, manualGuideUrl } = setupDetails;
    const isApex = records.some(r => r.type === "A" || r.type === "AAAA");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {verified && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {verified ? "Domain verified!" : `Connect ${domain}`}
                    </DialogTitle>
                    <DialogDescription>
                        {verified
                            ? `${domain} is now active and routing traffic.`
                            : "Add these records in your DNS provider. The dialog will close automatically once verified."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Routing records */}
                    <div className="rounded-lg border">
                        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                            <span className="text-xs font-medium">
                                {isApex ? "Point your domain" : "Create CNAME record"}
                            </span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-auto">
                                {isApex ? "A / AAAA" : "CNAME"}
                            </Badge>
                        </div>
                        <div className="px-3 divide-y">
                            {records.map((record, i) => (
                                <div key={i} className="py-2 space-y-0.5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">{record.type}</Badge>
                                    </div>
                                    <RecordRow label="Name" value={record.name} />
                                    <RecordRow label="Value" value={record.value} />
                                    {record.ttl && <RecordRow label="TTL" value={String(record.ttl)} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TXT verification record */}
                    <div className="rounded-lg border">
                        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                            <span className="text-xs font-medium">Verify ownership</span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-auto">TXT</Badge>
                        </div>
                        <div className="px-3">
                            <RecordRow label="Name" value={verification.name} />
                            <RecordRow label="Value" value={verification.value} />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {manualGuideUrl && (
                        <Button variant="ghost" size="sm" asChild className="mr-auto">
                            <a href={manualGuideUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Manual guide
                            </a>
                        </Button>
                    )}
                    <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
