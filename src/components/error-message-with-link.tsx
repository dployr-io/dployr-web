// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { ExternalLink } from "lucide-react";

interface ErrorMessageWithLinkProps {
    message: string;
    helpLink?: string | undefined;
    className?: string;
    breakLine?: boolean;
}

export function ErrorMessageWithLink({
    message,
    helpLink,
    className = "",
    breakLine = false,
}: ErrorMessageWithLinkProps) {
    if (!message) return null;

    return (
        <span className={className}>
            {message} {breakLine && <br />}
            {helpLink && (
                <a
                    href={helpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center align-middle gap-1 text-primary hover:text-primary/80 underline underline-offset-2 cursor-pointer transition-colors font-medium"
                    aria-label="Open support link in new tab"
                >
                    Get Support
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
        </span>
    );
}
