// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod";
import { useAuth } from "./use-auth";

const updateProfileSchema = z.object({
    name: z.string().min(3, 'Name with a minimum of three (3) characters is required'),
    picture: z.string().optional(),
});

export function useSettingsForm() {
    const [error, setError] = useState<string>('');
    const { user, updateProfile } = useAuth();

    const form = useForm({
        defaultValues: {
            name: user?.name,
            picture: user?.picture || '/img/chess.png',
        },
    });

    // Returns null on success, or an error string on failure.
    async function submit(): Promise<string | null> {
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

        if (!nameChanged && !pictureChanged) {
            setError('');
            return null;
        }

        try {
            await updateProfile({
                picture: value.picture || user?.picture || '',
                name: value.name || '',
            });
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