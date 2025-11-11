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
        onSubmit: async ({ value }) => {
            const result = updateProfileSchema.safeParse(value);

            if (!result.success) {
                const fieldErrors = result.error.flatten().fieldErrors;
                setError(fieldErrors.name?.[0] || 'Validation failed');
                return false;
            }

            updateProfile({
                picture: value.picture || user?.picture || '',
                name: value.name || '',
            });
            setError('');
        },
    });

    return {
        form,
        error,
        setError,
    }
}