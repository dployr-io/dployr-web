import { useState } from "react";

interface Use2FAOptions {
    enabled?: boolean;
    onVerify?: (code: string) => Promise<void>;
}

export function use2FA(options: Use2FAOptions = {}) {
    const { enabled = false, onVerify } = options;
    const [isOpen, setIsOpen] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(
        null,
    );

    const verify = async (code: string) => {
        setIsVerifying(true);
        try {
            // Custom verification logic if provided
            if (onVerify) {
                await onVerify(code);
            } else {
                // Default verification - simulate API call
                await new Promise((resolve) => setTimeout(resolve, 1000));
                if (code.length < 4) {
                    throw new Error("Invalid 2FA code");
                }
            }

            // Execute pending action after successful verification
            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }

            setIsOpen(false);
        } finally {
            setIsVerifying(false);
        }
    };

    const requireAuth = (action: () => void) => {
        if (enabled) {
            setPendingAction(() => action);
            setIsOpen(true);
        } else {
            action();
        }
    };

    const cancel = () => {
        setIsOpen(false);
        setPendingAction(null);
    };

    return {
        isOpen,
        isVerifying,
        verify,
        requireAuth,
        cancel,
        setIsOpen,
    };
}
