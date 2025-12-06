// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorMessageWithLink } from "@/components/error-message-with-link";

interface AlertBannerProps {
  message: string;
  helpLink: string;
  variant?: "default" | "destructive" | "success";
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function AlertBanner({ message, helpLink, variant = "destructive", className, dismissible = true, onDismiss }: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const isDestructive = variant === "destructive";
  const isSuccess = variant === "success";

  return (
    <div
      className={cn(
        "relative flex items-center align-middle gap-3 px-4 py-2 rounded-lg border shadow-sm",
        "bg-background text-foreground",
        isDestructive && "border-destructive/50 bg-destructive/5",
        isSuccess && "border-green-500/50 bg-green-50 dark:border-green-400/50 dark:bg-green-950/20",
        className
      )}
    >
      <div className="h-full items-center align-middle">
        {isDestructive ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        ) : isSuccess ? (
          <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm font-medium leading-relaxed",
          isDestructive && "text-destructive",
          isSuccess && "text-green-700 dark:text-green-300"
        )}>
          <ErrorMessageWithLink message={message} helpLink={helpLink} />
        </div>
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 shrink-0 rounded-md transition-colors",
            isDestructive && "hover:bg-destructive/10 text-destructive/70 hover:text-destructive",
            isSuccess && "hover:bg-green-100/50 text-green-600/70 hover:text-green-600 dark:hover:bg-green-900/20 dark:text-green-400/70 dark:hover:text-green-400",
            !isDestructive && !isSuccess && "hover:bg-muted/50"
          )}
          onClick={handleDismiss}
          aria-label={isSuccess ? "Dismiss success message" : "Dismiss error message"}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
