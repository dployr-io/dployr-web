import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { IntegrationUI } from "@/types";

interface Props {
    integration: IntegrationUI | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NotificationsConnectDialog({ integration, open, onOpenChange }: Props) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConnect = async () => {
        setIsSubmitting(true);
        setErrors({});

        // Add your submission logic here

        setIsSubmitting(false);
    };

    const handleOAuthConnect = () => {
        if (integration?.discord) {
            window.open(integration.discord.installUrl, "_blank");
        }
    };

    const handleFieldChange = (fieldId: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const isFormValid = () => {
        if (integration?.connectType === "oauth") return true;
        return integration?.fields?.every(field => !field.required || formData[field.id]?.trim()) ?? false;
    };

    if (!integration) return null;

    const Icon = integration.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {integration.name}
                    </DialogTitle>
                    <DialogDescription>{integration.description}</DialogDescription>
                </DialogHeader>

                {integration.connectType === "form" && integration.fields && (
                    <div className="space-y-4">
                        {integration.fields.map((field, index) => (
                            <Field key={field.id}>
                                <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
                                <Input
                                    id={field.id}
                                    type={field.type}
                                    value={formData[field.id] || ""}
                                    onChange={e => handleFieldChange(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    autoFocus={index === 0}
                                    disabled={isSubmitting}
                                />
                                {errors[field.id] && <FieldError errors={[{ message: errors[field.id] }]} />}
                            </Field>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        disabled={isSubmitting || !isFormValid()}
                        onClick={integration.connectType === "oauth" ? handleOAuthConnect : handleConnect}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Connect
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
