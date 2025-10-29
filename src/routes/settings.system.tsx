import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { ProtectedRoute } from "@/components/protected-route";

export const Route = createFileRoute("/settings/system")({
    component: System,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "System settings",
        href: "/settings/profile",
    },
];

function System() {
    const form = useForm({
        defaultValues: {
            instance: "",
            email: "",
        },
        onSubmit: async ({ value }) => {
            // Do something with form data
            console.log(value);
        },
    });

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout>
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Profile information"
                            description="Update your name and email address"
                        />

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.handleSubmit();
                            }}
                        >
                            <FieldGroup>
                                <form.Field
                                    name="instance"
                                    children={(field) => {
                                        const isInvalid =
                                            field.state.meta.isTouched &&
                                            !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel
                                                    htmlFor={field.name}
                                                >
                                                    Instance
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder="http://acme.inc"
                                                    autoComplete="off"
                                                />
                                                {isInvalid && (
                                                    <FieldError
                                                        errors={
                                                            field.state.meta
                                                                .errors
                                                        }
                                                    />
                                                )}
                                            </Field>
                                        );
                                    }}
                                />

                                <form.Field
                                    name="email"
                                    children={(field) => {
                                        const isInvalid =
                                            field.state.meta.isTouched &&
                                            !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid}>
                                                <FieldLabel
                                                    htmlFor={field.name}
                                                >
                                                    Email
                                                </FieldLabel>
                                                <Input
                                                    id={field.name}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) =>
                                                        field.handleChange(
                                                            e.target.value,
                                                        )
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder="admin@acme.inc"
                                                    autoComplete="off"
                                                />
                                                {isInvalid && (
                                                    <FieldError
                                                        errors={
                                                            field.state.meta
                                                                .errors
                                                        }
                                                    />
                                                )}
                                            </Field>
                                        );
                                    }}
                                />
                            </FieldGroup>

                            <Button type="submit" className="mt-6">
                                Save
                            </Button>
                        </form>
                    </div>
                </SettingsLayout>
            </AppLayout>
        </ProtectedRoute>
    );
}
