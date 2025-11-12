import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import z from "zod";
import { useClusters } from "./use-clusters";

const addUsersSchema = z.object({
    users: z.array(z.email()),
});

export function useClustersForm() {
    const [error, setError] = useState<string>("");
    const { addUsers } = useClusters();

    const addUsersForm = useForm({
        defaultValues: { users: [] },
        onSubmit: async ({ value }) => {
            const result = addUsersSchema.safeParse(value);

            if (!result.success) {
                const fieldErrors = result.error.flatten().fieldErrors;
                setError(fieldErrors.users?.[0] || "Validation failed");
                return false;
            }

            addUsers(value)
            setError("");
        },
    });

    return {
        addUsersForm,
        error,
        setError,
    };
}
