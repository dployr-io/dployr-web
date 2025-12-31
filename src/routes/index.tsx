// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import { Input } from "@/components/ui/input";
import { useForm } from "@tanstack/react-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { useEffect, useState } from "react";
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
        });
      } catch (error: any) {
        const message = error?.response?.data?.error?.message;
        console.error("Login failed:", error);
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
    <div className="flex min-h-screen flex-col items-center bg-[#FDFDFC] p-6 text-[#1b1b18] lg:justify-center lg:p-8 dark:bg-[#0a0a0a]">
      <div className="flex w-full items-center justify-center opacity-100 transition-opacity duration-750 lg:grow starting:opacity-0">
        <main className="flex w-full max-w-[335px] flex-col-reverse lg:max-w-4xl lg:flex-row">
          <div className="flex-1 rounded-br-lg rounded-bl-lg bg-white p-6 pb-12 text-[13px] leading-5 shadow-[inset_0px_0px_0px_1px_rgba(26,26,0,0.16)] lg:rounded-tl-lg lg:rounded-br-none lg:p-20 dark:bg-[#161615] dark:text-[#EDEDEC] dark:shadow-[inset_0px_0px_0px_1px_#fffaed2d]">
            <div className="flex flex-col gap-6 min-h-60">
              <div className="flex flex-col">
                {errorMessage && <AlertBanner message={errorMessage} helpLink="" onDismiss={() => setError({ authError: "" })} />}

                <div className="flex flex-col gap-2">
                  <div className="text-xl">{verifyOTP ? "Verify 2FA" : "Sign in"}</div>
                  <div>{verifyOTP ? "Enter the OTP sent to your email" : "Jump back into action!"}</div>
                </div>
              </div>

              {!verifyOTP && (
                <>
                  <div className="flex items-center ">
                    <div className="flex gap-4 justify-evenly">
                      <Button onClick={handleGoogleSignIn} className="w-fit" disabled={isSubmitting}>
                        <FaGoogle />
                      </Button>

                      <Button onClick={handleMicrosoftSignIn} className="w-fit" disabled={isSubmitting}>
                        <FaMicrosoft />
                      </Button>

                      <Button onClick={() => handleGitHubSignIn} className="w-fit" disabled={isSubmitting}>
                        <FaGithub />
                      </Button>
                    </div>
                  </div>
                  <div className="flex w-3/5 gap-2 align-middle items-center">
                    <div className="w-full">
                      <Separator />
                    </div>
                    <div>OR</div>
                    <div className="w-full">
                      <Separator />
                    </div>
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

                  <Button type="submit" className="mt-6 cursor-pointer" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Signing in" : "Sign in"}
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
        <a className="cursor-pointer" href="https://dployr.io/legal/terms-of-service.html">
          <p className="text-xs">Terms of service</p>
        </a>
        <a className="cursor-pointer" href="https://dployr.io/legal/privacy-policy.html">
          <p className="text-xs">Privacy policy</p>
        </a>
        <a className="cursor-pointer" href="https://dployr.io/docs/quickstart.html">
          <p className="text-xs">Docs</p>
        </a>
        <a className="cursor-pointer" href="https://dployr.io/changelog.html">
          <p className="text-xs">Changelog</p>
        </a>
      </footer>
    </div>
  );
}
