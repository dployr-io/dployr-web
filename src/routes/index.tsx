// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { useEffect, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAuth } from "@/hooks/use-auth";
import { useUrlState } from "@/hooks/use-url-state";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FaGithub, FaGoogle, FaMicrosoft } from "react-icons/fa6";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { AlertBanner } from "@/components/ui/alert-banner";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { login, verifyOtp, isAuthenticated, verifyOTP, setVerifyOtp, otpValue, setOtpValue, isSubmitting, handleGoogleSignIn, handleMicrosoftSignIn, handleGitHubSignIn } = useAuth();
  const router = useRouter();
  const { useAuthError } = useUrlState();
  const [{ authError }, setError] = useAuthError();

  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const turnstileEnabled = !!turnstileSiteKey;

  const errorMessage = authError || "";
  const clearError = () => {
    setError({ authError: "" });
  };

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        setEmail(email);
        clearError();

        await login({
          email: value.email,
          ...(turnstileToken ? { turnstileToken } : {}),
        });
      } catch (error: any) {
        const message = error?.response?.data?.error?.message;
        console.error("Login failed:", error);
        // Reset the widget so the user can retry
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        if (message) {
          setError({ authError: message });
        }
      }
    },
  });

  const handleOtpComplete = async (value: string) => {
    if (value.length === 6) {
      try {
        if (!email) {
          console.error("Attempt to verify otp without existing email");
          return;
        }

        await verifyOtp({
          code: value,
          email: email,
        });
        router.navigate({ to: "/clusters" });
      } catch (error: any) {
        const message = error?.response?.data?.error?.message;
        console.error("OTP verification failed:", error);
        if (message) {
          setError({ authError: message });
        }
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.navigate({ to: "/clusters" });
    }
  }, [isAuthenticated, router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-[#1b1b18] dark:text-white"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          WebkitMaskImage: "radial-gradient(circle at 50% 42%, transparent 320px, black 560px)",
          maskImage: "radial-gradient(circle at 50% 42%, transparent 320px, black 560px)",
          opacity: 0.13,
        }}
      />
      <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
        <main className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <a href="https://dployr.io">
              <img src="/img/wordmark.png" alt="dployr" className="h-8 dark:invert" />
            </a>
          </div>
          <div className="rounded-lg bg-white p-8 text-[13px] leading-5 shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col">
                {errorMessage && <AlertBanner message={errorMessage} helpLink="" onDismiss={() => setError({ authError: "" })} />}

                <div className="flex flex-col gap-1">
                  <div className="text-xl font-bold">{verifyOTP ? "Verify your email" : "Sign in"}</div>
                  <div className="text-[#878580]">{verifyOTP ? "Enter the code we sent to your inbox" : "Welcome back"}</div>
                </div>
              </div>

              {!verifyOTP && (
                <>
                  <div className="flex justify-center gap-3">
                    <Button onClick={handleGoogleSignIn} size="icon" variant="outline" disabled={isSubmitting}>
                      <FaGoogle />
                    </Button>
                    <Button onClick={handleMicrosoftSignIn} size="icon" variant="outline" disabled={isSubmitting}>
                      <FaMicrosoft />
                    </Button>
                    <Button onClick={() => handleGitHubSignIn("")} size="icon" variant="outline" disabled={isSubmitting}>
                      <FaGithub />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1"><Separator /></div>
                    <div className="text-[#878580]">OR</div>
                    <div className="flex-1"><Separator /></div>
                  </div>
                </>
              )}
              {verifyOTP ? (
                <div className="flex flex-col justify-center flex-1">
                  <InputOTP
                    maxLength={6}
                    value={otpValue}
                    onChange={value => {
                      setOtpValue(value);
                      if (value.length === 6) {
                        handleOtpComplete(value);
                      }
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

                  <Button onClick={() => setVerifyOtp(false)} className="mt-6 cursor-pointer w-fit" disabled={isSubmitting}>
                    <ChevronLeft /> Back
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                >
                  <FieldGroup>
                    <form.Field
                      name="email"
                      validators={{
                        onChange: ({ value }) => {
                          const result = loginSchema.shape.email.safeParse(value);
                          setEmail(value);
                          return result.success ? undefined : result.error.issues[0].message;
                        },
                      }}
                      children={field => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={e => field.handleChange(e.target.value)}
                              aria-invalid={isInvalid}
                              placeholder="admin@acme.org"
                              autoComplete="off"
                            />
                            {isInvalid && (
                              <FieldError
                                errors={
                                  field.state.meta.errors?.map(error => ({
                                    message: error,
                                  })) || []
                                }
                              />
                            )}
                          </Field>
                        );
                      }}
                    />
                  </FieldGroup>

                  {turnstileEnabled && (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={turnstileSiteKey!}
                      className="mt-4"
                      onSuccess={setTurnstileToken}
                      onExpire={() => setTurnstileToken(null)}
                      onError={() => setTurnstileToken(null)}
                    />
                  )}

                  <Button
                    type="submit"
                    className="mt-6 w-full cursor-pointer"
                    disabled={isSubmitting || (turnstileEnabled && !turnstileToken)}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Signing in" : "Sign in"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
      <div className="hidden h-14.5 lg:block"></div>
      <footer className="flex gap-4 text-muted-foreground">
        <a className="text-xs" href="https://dployr.io/legal/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of service</a>
        <a className="text-xs" href="https://dployr.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy</a>
        <a className="text-xs" href="https://dployr.io/docs/quickstart" target="_blank" rel="noopener noreferrer">Docs</a>
        <a className="text-xs" href="https://dployr.io/changelog" target="_blank" rel="noopener noreferrer">Changelog</a>
      </footer>
    </div>
  );
}
