// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2 } from "lucide-react";

interface TwoFactorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onVerify: (code: string) => Promise<void>;
    email?: string;
    isSubmitting?: boolean;
}

export function TwoFactorDialog({
    open,
    onOpenChange,
    onVerify,
    email,
    isSubmitting = false,
}: TwoFactorDialogProps) {
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Reset code when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setCode("");
            setError(null);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!code.trim()) {
            setError("Please enter the 2FA code");
            return;
        }

        try {
            await onVerify(code);
            setCode("");
            onOpenChange(false);
        } catch (err) {
            setError(
                (err as Error).message || "Invalid code. Please check and try again.",
            );
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only alphanumeric characters
        const sanitized = value.replace(/[^a-zA-Z0-9]/g, "");
        setCode(sanitized);
        setError(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Verify Code</DialogTitle>
                    <DialogDescription>
                        {email
                            ? `Enter the 2FA code sent to ${email}`
                            : "Enter the 2FA code from your authenticator app"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Field>
                        <FieldLabel htmlFor="code">Code</FieldLabel>
                        <Input
                            id="code"
                            type="text"
                            value={code}
                            onChange={handleCodeChange}
                            placeholder="Enter code"
                            autoComplete="one-time-code"
                            autoFocus
                            disabled={isSubmitting}
                            className="text-center text-lg tracking-widest font-mono"
                            maxLength={20}
                        />
                        {error && <FieldError errors={[{ message: error }]} />}
                    </Field>
                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !code.trim()}
                        >
                            {isSubmitting && (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            Verify
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
