// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import type { TwoFaMethod } from "@/hooks/use-2fa";

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (code: string) => Promise<void>;
  onSendEmailCode?: () => Promise<void>;
  method?: TwoFaMethod;
  email?: string;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
  isSending?: boolean;
}

export function TwoFactorDialog({
  open,
  onOpenChange,
  onVerify,
  onSendEmailCode,
  method = "email",
  email,
  title = "Verify your identity",
  description: descriptionProp,
  isSubmitting = false,
  isSending = false,
}: TwoFactorDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      setCodeSent(false);
    }
  }, [open]);

  const handleSend = async () => {
    if (!onSendEmailCode) return;
    try {
      await onSendEmailCode();
      setCodeSent(true);
    } catch {
      // error already toasted by the hook
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Please enter the code");
      return;
    }

    try {
      await onVerify(code);
      setCode("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Invalid code. Please try again.");
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow digits, letters, and dashes (for backup codes like XXXXX-XXXXX)
    const sanitized = value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
    setCode(sanitized);
    setError(null);
  };

  const isEmail = method === "email";

  const description = descriptionProp ?? (isEmail
    ? codeSent
      ? `Code sent to ${email ?? "your email"}. It expires in a few minutes.`
      : `We'll send a one-time code to ${email ?? "your email"}.`
    : "Enter the 6-digit code from your authenticator app. You can also use a backup code.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isEmail ? (
              <Mail className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {isEmail && onSendEmailCode && !codeSent ? (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="w-full"
              >
                {isSending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send code
              </Button>
            </div>
          ) : (
            <Field>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder={isEmail ? "Enter code" : "000000 or XXXXX-XXXXX"}
                autoComplete="one-time-code"
                autoFocus
                disabled={isSubmitting}
                className="h-8 text-center text-lg tracking-widest font-mono"
                maxLength={15}
              />
              {error && <FieldError errors={[{ message: error }]} className="text-[10px]" />}
            </Field>
          )}

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs mr-2"
            >
              Cancel
            </Button>

            {isEmail && codeSent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setCodeSent(false); setCode(""); }}
                disabled={isSubmitting || isSending}
                className="h-8 text-xs mr-auto"
              >
                Resend
              </Button>
            )}

            {(!isEmail || codeSent) && (
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !code.trim()}
                className="h-8 text-xs"
              >
                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                Verify
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
