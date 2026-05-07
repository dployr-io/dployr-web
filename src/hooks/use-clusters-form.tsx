// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import z from "zod";
import { useClusters } from "@/hooks/use-clusters";
import { useUrlState } from "@/hooks/use-url-state";
import type { use2FA } from "@/hooks/use-2fa";

const addUsersSchema = z.object({
  users: z.array(z.email()),
});

export function useClustersForm(twoFactor: ReturnType<typeof use2FA>) {
  const { useInviteUserDialog } = useUrlState();
  const [formError, setFormError] = useState<string>("");
  const [, setInviteDialogOpen] = useInviteUserDialog();
  const { setUsersToAdd, addUsers } = useClusters();

  const form = useForm({
    defaultValues: { users: [] as string[] },
    onSubmit: async ({ value }) => {
      const result = addUsersSchema.safeParse(value);

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        setFormError(fieldErrors.users?.[0] || "Validation failed");
        return;
      }

      try {
        twoFactor.requireAuth(async () => {
          await addUsers.mutateAsync(value.users);
        });

        setUsersToAdd(value.users);
        setFormError("");
        setInviteDialogOpen({ inviteOpen: false });
      } catch (error) {
        // Error is handled by the mutation's onError
      }
    },
  });

  return {
    form,
    formError,
  };
}
