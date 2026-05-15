// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { ProtectedRoute } from "@/components/protected-route";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useClusters } from "@/hooks/use-clusters";
import { TwoFactorDialog } from "@/components/two-factor-dialog";

export const Route = createFileRoute("/clusters/$clusterId/settings/profile")({
  component: System,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "System settings",
    href: "/settings/profile",
  },
];

function System() {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [emailVerificationOpen, setEmailVerificationOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [clusterName, setClusterName] = useState("");
  const [clusterNameError, setClusterNameError] = useState("");
  const { form, error, submit: submitProfile } = useSettingsForm();
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const { userCluster, renameCluster } = useClusters();

  function enterEditMode() {
    setClusterName(userCluster?.name ?? "");
    setClusterNameError("");
    setEditMode(true);
  }

  function cancelEditMode() {
    setEditMode(false);
    setEmailVerificationOpen(false);
    setPendingEmail("");
    setClusterNameError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = clusterName.trim();
    if (!trimmed) {
      setClusterNameError("Cluster name is required.");
      return;
    }

    const clusterNameChanged = trimmed !== (userCluster?.name ?? "");

    if (clusterNameChanged) {
      try {
        await renameCluster.mutateAsync(trimmed);
        setClusterNameError("");
      } catch (renameErr: any) {
        const message: string = renameErr?.response?.data?.error?.message ?? renameErr?.message ?? "Failed to rename cluster.";
        setClusterNameError(message);
        return;
      }
    }

    const profileResult = await submitProfile();
    if (typeof profileResult === "object" && profileResult?.verificationRequired) {
      setPendingEmail(profileResult.email);
      setEmailVerificationOpen(true);
      return;
    }

    if (!profileResult) {
      setEditMode(false);
    }
  }

  async function handleEmailVerify(code: string) {
    const profileResult = await submitProfile(code);
    if (profileResult) {
      throw new Error(typeof profileResult === "string" ? profileResult : "Verification is still required.");
    }
    setEmailVerificationOpen(false);
    setPendingEmail("");
    setEditMode(false);
  }

  const isSaving = renameCluster.isPending;

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-6">
            <div className="flex justify-between align-middle">
              <HeadingSmall title="Profile" description="Update your profile and cluster name" />

              {!editMode && (
                <Button className="flex items-center gap-2" onClick={enterEditMode}>
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSave}>
                <FieldGroup>
                  <form.Field
                    name="email"
                    children={field => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={e => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter email"
                            autoComplete="email"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }}
                  />

                  <form.Field
                    name="name"
                    children={field => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={e => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter fullname"
                            autoComplete="off"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          {!isInvalid && error && <p className="text-destructive text-sm">{error}</p>}
                        </Field>
                      );
                    }}
                  />

                  <Field data-invalid={!!clusterNameError}>
                    <FieldLabel htmlFor="cluster-name">Cluster name</FieldLabel>
                    <Input id="cluster-name" value={clusterName} onChange={e => setClusterName(e.target.value)} placeholder="Enter cluster name" autoComplete="off" aria-invalid={!!clusterNameError} />
                    {clusterNameError && <p className="text-destructive text-sm">{clusterNameError}</p>}
                  </Field>
                </FieldGroup>

                <form.Field
                  name="picture"
                  children={field => {
                    const avatars = [
                      { src: "/img/chess.png", alt: "chess" },
                      { src: "/img/circle.png", alt: "circle" },
                      { src: "/img/compass.png", alt: "compass" },
                      { src: "/img/hash.png", alt: "hash" },
                      { src: "/img/pause.png", alt: "pause" },
                      { src: "/img/play.png", alt: "play" },
                      { src: "/img/puzzle.png", alt: "puzzle" },
                      { src: "/img/rocket.png", alt: "rocket" },
                      { src: "/img/sphere.png", alt: "sphere" },
                      { src: "/img/target.png", alt: "target" },
                    ];

                    return (
                      <div className="mt-8 space-y-4">
                        <FieldLabel>Avatar</FieldLabel>
                        <div className="flex flex-wrap gap-4">
                          {avatars.map(avatar => (
                            <button
                              key={avatar.src}
                              type="button"
                              onClick={() => field.handleChange(avatar.src)}
                              className={cn("relative rounded-full transition-all", field.state.value === avatar.src ? "ring-2 ring-muted-foreground ring-offset-2" : "opacity-60 hover:opacity-100")}
                            >
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={avatar.src} alt={avatar.alt} />
                              </Avatar>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />

                <div className="mt-6 flex gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEditMode} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Display name</dt>
                  <dd className="mt-1 text-sm">{user?.name || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="mt-1 text-sm">{user?.email || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Cluster name</dt>
                  <dd className="mt-1 text-sm">{userCluster?.name || "Not set"}</dd>
                </div>
              </div>
            )}

            <TwoFactorDialog
              open={emailVerificationOpen}
              onOpenChange={setEmailVerificationOpen}
              onVerify={handleEmailVerify}
              email={pendingEmail}
              title="Verify Email"
              description={`Enter the code sent to ${pendingEmail}`}
            />
          </div>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
