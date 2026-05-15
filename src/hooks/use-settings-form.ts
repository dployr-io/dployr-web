// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod";
import { useAuth } from "./use-auth";

const updateProfileSchema = z.object({
    email: z.email('A valid email is required'),
    name: z.string().min(3, 'Name with a minimum of three (3) characters is required'),
    picture: z.string().optional(),
});

export type SettingsSubmitResult = null | string | { verificationRequired: true; email: string };

export function useSettingsForm() {
    const [error, setError] = useState<string>('');
    const { user, updateProfile } = useAuth();

    const form = useForm({
        defaultValues: {
            email: user?.email || '',
            name: user?.name,
            picture: user?.picture || '/img/chess.png',
        },
    });

    // Returns null on success, or an error string on failure.
    async function submit(code?: string): Promise<SettingsSubmitResult> {
        const value = form.state.values;
        const result = updateProfileSchema.safeParse(value);

        if (!result.success) {
            const fieldErrors = result.error.flatten().fieldErrors;
            const message = fieldErrors.name?.[0] || 'Validation failed';
            setError(message);
            return message;
        }

        const nameChanged = value.name !== user?.name;
        const pictureChanged = value.picture !== (user?.picture || '/img/chess.png');
        const emailChanged = value.email !== user?.email;

        if (!nameChanged && !pictureChanged && !emailChanged) {
            setError('');
            return null;
        }

        try {
            const response = await updateProfile({
                email: emailChanged ? value.email : undefined,
                code,
                picture: value.picture || user?.picture || '',
                name: value.name || '',
            });
            if (response?.data?.verificationRequired) {
                setError('');
                return { verificationRequired: true, email: response.data.email };
            }
            setError('');
            return null;
        } catch (err: any) {
            const message: string = err?.response?.data?.error?.message ?? err?.message ?? 'Failed to update profile.';
            setError(message);
            return message;
        }
    }

    return {
        form,
        error,
        setError,
        submit,
    }
}
