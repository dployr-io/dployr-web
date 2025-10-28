import { createFileRoute, useRouter } from "@tanstack/react-router";
import "../css/app.css";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { setAuthToken, verifyOtp } from "@/lib/auth";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
    component: App,
});

function App() {
    const { login, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [verifyOTP, setVerifyOtp] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        defaultValues: {
            instance: "",
            email: "",
        },
        onSubmit: async ({ value }) => {
            try {
                setIsSubmitting(true);
                await login({
                    email: value.email,
                    expiry: "1h",
                    instance: value.instance
                });
                // setVerifyOtp(true);
            } catch (error) {
                toast.error(`Login failed: ${(error as Error).message}`);
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    useEffect(() => {
        if (isAuthenticated) {
            router.navigate({ to: '/dashboard' });
        }
    }, [isAuthenticated, router]);

    const handleOtpComplete = async (value: string) => {
        if (value.length === 6) {
            // TOOD: impl
            try {
                setIsSubmitting(true);
                const response = await verifyOtp({
                    otp: value,
                    email: form.state.values.email
                });
                setAuthToken(response.token);

                router.navigate({ to: '/dashboard' });
            } catch (error) {
                console.error('OTP verification failed:', error);
                setOtpValue("");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                     <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">

            <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
                <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
                    <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-5 shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
                        <div className="flex flex-col gap-6 min-h-60">
                            <div className="flex flex-col gap-2">
                                <div className="text-xl">
                                    {verifyOTP ? "Verify 2FA" : "Sign in"}
                                </div>
                                <div>
                                    {verifyOTP
                                        ? "Enter the OTP sent to your email"
                                        : "Jump back into action!"}
                                </div>
                            </div>

                            {verifyOTP ? (
                                <div className="flex flex-col justify-center flex-1">
                                    <InputOTP
                                        maxLength={6}
                                        value={otpValue}
                                        onChange={(value) => {
                                            setOtpValue(value);
                                            handleOtpComplete(value);
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} />
                                            <InputOTPSlot index={1} />
                                            <InputOTPSlot index={2} />
                                        </InputOTPGroup>
                                        <InputOTPSeparator />
                                        <InputOTPGroup>
                                            <InputOTPSlot index={3} />
                                            <InputOTPSlot index={4} />
                                            <InputOTPSlot index={5} />
                                        </InputOTPGroup>
                                    </InputOTP>

                                    <Button
                                        onClick={() => setVerifyOtp(false)}
                                        className="mt-12 w-fit"
                                        disabled={isSubmitting}
                                    >
                                        Back
                                    </Button>
                                </div>
                            ) : (
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
                                                    field.state.meta
                                                        .isTouched &&
                                                    !field.state.meta.isValid;
                                                return (
                                                    <Field
                                                        data-invalid={isInvalid}
                                                    >
                                                        <FieldLabel
                                                            htmlFor={field.name}
                                                        >
                                                            Instance
                                                        </FieldLabel>
                                                        <Input
                                                            id={field.name}
                                                            name={field.name}
                                                            value={
                                                                field.state
                                                                    .value
                                                            }
                                                            onBlur={
                                                                field.handleBlur
                                                            }
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            aria-invalid={
                                                                isInvalid
                                                            }
                                                            placeholder="http://acme.inc"
                                                            autoComplete="off"
                                                        />
                                                        {isInvalid && (
                                                            <FieldError
                                                                errors={
                                                                    field.state
                                                                        .meta
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
                                                    field.state.meta
                                                        .isTouched &&
                                                    !field.state.meta.isValid;
                                                return (
                                                    <Field
                                                        data-invalid={isInvalid}
                                                    >
                                                        <FieldLabel
                                                            htmlFor={field.name}
                                                        >
                                                            Email
                                                        </FieldLabel>
                                                        <Input
                                                            id={field.name}
                                                            name={field.name}
                                                            value={
                                                                field.state
                                                                    .value
                                                            }
                                                            onBlur={
                                                                field.handleBlur
                                                            }
                                                            onChange={(e) =>
                                                                field.handleChange(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            aria-invalid={
                                                                isInvalid
                                                            }
                                                            placeholder="admin@acme.inc"
                                                            autoComplete="off"
                                                        />
                                                        {isInvalid && (
                                                            <FieldError
                                                                errors={
                                                                    field.state
                                                                        .meta
                                                                        .errors
                                                                }
                                                            />
                                                        )}
                                                    </Field>
                                                );
                                            }}
                                        />
                                    </FieldGroup>

                                    <Button
                                        type="submit"
                                        className="mt-6"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                    <div className="relative -mb-px aspect-335/376 w-full shrink-0 overflow-hidden rounded-t-lg bg-[#fff2f2] lg:mb-0 lg:-ml-px lg:aspect-auto lg:w-[438px] lg:rounded-t-none lg:rounded-r-lg dark:bg-[#1D0002]">
                        <div className="absolute inset-0 rounded-t-lg shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-t-none lg:rounded-r-lg dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]" />
                    </div>
                </main>
            </div>
            <div className="hidden h-14.5 lg:block"></div>
            <footer className="flex gap-4 text-muted-foreground">
                <a className="cursor-pointer" href="https://dployr.dev">
                    <p className="text-xs">
                        Terms of use
                    </p>
                </a>
                <a className="cursor-pointer" href="https://dployr.dev">
                    <p className="text-xs">
                        Docs
                    </p>
                </a>
                <a className="cursor-pointer" href="https://dployr.dev">
                    <p className="text-xs">
                        Changelogs
                    </p>
                </a>
            </footer>
        </div>
    );
}
