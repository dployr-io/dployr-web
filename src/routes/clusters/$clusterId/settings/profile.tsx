import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { ProtectedRoute } from "@/components/protected-route";
import { useSettings } from "@/hooks/use-settings";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";

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
  const { editMode, setEditMode } = useSettings();
  const { form, error } = useSettingsForm();
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-6">
            <div className="flex justify-between align-middle">
              <HeadingSmall title="Profile information" description="Update your name and email address" />

              {!editMode && (
                <Button className="flex items-center gap-2" onClick={() => setEditMode(true)}>
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>

            {editMode ? (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  form.handleSubmit();
                  setEditMode(false);
                }}
              >
                <FieldGroup>
                  <form.Field
                    name="name"
                    children={field => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>
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
                        </Field>
                      );
                    }}
                  />

                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input value={user?.email || ""} readOnly placeholder="Enter email" autoComplete="off" />
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

                {error && (
                  <div className="my-5">
                    <p className="text-sm font-medium text-red-500">{error}</p>
                  </div>
                )}

                <Button type="submit" className="mt-6">
                  Save
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                  <dd className="mt-1 text-sm">{user?.name || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="mt-1 text-sm">{user?.email || "Not set"}</dd>
                </div>
              </div>
            )}
          </div>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
