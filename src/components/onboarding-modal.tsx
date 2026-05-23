// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { z } from "zod";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useClusters } from "@/hooks/use-clusters";
import type { OnboardingMetadata, User } from "@/types";
import { AVATARS } from "@/lib/constants";

type TeamSize = OnboardingMetadata["onboarding_team_size"];
type FirstDeploy = OnboardingMetadata["onboarding_first_deploy"];

const step1Schema = z.object({
  name: z.string().min(1, "Name is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
});

const step2Schema = z.object({
  teamSize: z.string().min(1, "Select your team size"),
  firstDeploy: z.string().min(1, "Select what you are deploying first"),
  source: z.string().min(1, "Let us know how you found Dployr"),
});

interface ToggleOption<T extends string> {
  value: T;
  label: string;
}

interface OnboardingProps {
  user: User;
  clusterName: string;
}

function OptionGroup<T extends string>({ options, value, onChange }: {
  options: ToggleOption<T>[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === opt.value
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function checkIsNewUser(user: User, clusterName: string) {
  const emailPrefix = user.email.split("@")[0];
  const ageInHours = (Date.now() - user.createdAt) / (1000 * 60 * 60);
  return (user.name === emailPrefix || !user.name) && clusterName === emailPrefix && ageInHours < 24;
}

function OnboardingSteps({ user, clusterName }: OnboardingProps) {
  const { updateProfile } = useAuth();
  const { renameCluster, updateMetadata } = useClusters();

  const emailPrefix = user.email.split("@")[0];

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState(user.name ?? emailPrefix);
  const [workspaceName, setWorkspaceName] = useState(clusterName);
  const [picture, setPicture] = useState(user.picture ?? "");

  const [teamSize, setTeamSize] = useState<TeamSize | "">("");
  const [firstDeploy, setFirstDeploy] = useState<FirstDeploy | "">("");
  const [replacing, setReplacing] = useState<OnboardingMetadata["onboarding_replacing"] | "">("");
  const [otherReplacing, setOtherReplacing] = useState("");
  const [source, setSource] = useState<OnboardingMetadata["onboarding_source"] | "">("");
  const [otherSource, setOtherSource] = useState("");
  const [feedbackCall, setFeedbackCall] = useState(false);

  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});

  function flattenErrors(issues: { path: PropertyKey[]; message: string }[]) {
    const errs: Record<string, string> = {};
    for (const issue of issues) {
      const field = issue.path[0] as string;
      if (!errs[field]) errs[field] = issue.message;
    }
    return errs;
  }

  function handleNext() {
    const result = step1Schema.safeParse({ name, workspaceName });
    if (!result.success) {
      setStep1Errors(flattenErrors(result.error.issues));
      return;
    }
    setStep1Errors({});
    setStep(2);
  }

  async function handleFinish() {
    const result = step2Schema.safeParse({ teamSize, firstDeploy, source });
    if (!result.success) {
      setStep2Errors(flattenErrors(result.error.issues));
      return;
    }
    setStep2Errors({});
    setIsSaving(true);
    try {
      const metadata: Record<string, string> = {
        onboarding_completed_at: new Date().toISOString(),
        onboarding_feedback_call: feedbackCall ? "true" : "false",
      };
      if (teamSize) metadata.onboarding_team_size = teamSize;
      if (firstDeploy) metadata.onboarding_first_deploy = firstDeploy;
      if (replacing) metadata.onboarding_replacing = replacing === "other" && otherReplacing.trim() ? `other (${otherReplacing.trim()})` : replacing;
      if (source) metadata.onboarding_source = source === "other" && otherSource.trim() ? `other (${otherSource.trim()})` : source;

      await Promise.all([
        updateProfile({ name: name.trim() || emailPrefix, picture }),
        workspaceName.trim() !== clusterName ? renameCluster.mutateAsync(workspaceName.trim() || emailPrefix) : Promise.resolve(),
        updateMetadata.mutateAsync(metadata),
      ]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="bg-background fixed top-[50%] left-[50%] z-50 flex flex-col w-full max-w-md max-h-[90dvh] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg overflow-hidden"
          onInteractOutside={(e: Event) => e.preventDefault()}
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
        >
          <div className="shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle>{step === 1 ? "Set up your workspace" : "Tell us about yourself"}</DialogTitle>
              <DialogDescription className="flex items-center justify-between">
                <span>{step === 1 ? "Quick setup. Change anything later." : "Helps us understand what you're building."}</span>
                <span className="text-xs tabular-nums">{step} / 2</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="onboarding-name">Your name</Label>
                <Input
                  id="onboarding-name"
                  value={name}
                  onChange={e => { setName(e.target.value); setStep1Errors(p => ({ ...p, name: "" })); }}
                  placeholder={emailPrefix}
                  autoComplete="off"
                />
                {step1Errors.name && <p className="text-destructive text-sm">{step1Errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-workspace">Workspace name</Label>
                <Input
                  id="onboarding-workspace"
                  value={workspaceName}
                  onChange={e => { setWorkspaceName(e.target.value); setStep1Errors(p => ({ ...p, workspaceName: "" })); }}
                  placeholder={emailPrefix}
                  autoComplete="off"
                />
                {step1Errors.workspaceName && <p className="text-destructive text-sm">{step1Errors.workspaceName}</p>}
              </div>

              <div className="space-y-3">
                <Label>Avatar</Label>
                <div className="flex flex-wrap gap-3">
                  {AVATARS.map(avatar => (
                    <button
                      key={avatar.src}
                      type="button"
                      onClick={() => setPicture(avatar.src)}
                      className={cn(
                        "rounded-full transition-all",
                        picture === avatar.src ? "ring-2 ring-foreground ring-offset-2" : "opacity-50 hover:opacity-100"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatar.src} alt={avatar.alt} />
                      </Avatar>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Team size</Label>
                <OptionGroup<TeamSize>
                  options={[
                    { value: "just-me", label: "Just me" },
                    { value: "2-5", label: "2–5" },
                    { value: "5-plus", label: "5+" },
                  ]}
                  value={teamSize}
                  onChange={v => { setTeamSize(v); setStep2Errors(p => ({ ...p, teamSize: "" })); }}
                />
                {step2Errors.teamSize && <p className="text-destructive text-sm">{step2Errors.teamSize}</p>}
              </div>

              <div className="space-y-2">
                <Label>What are you deploying first?</Label>
                <OptionGroup<FirstDeploy>
                  options={[
                    { value: "web-service", label: "Web service" },
                    { value: "static-site", label: "Static site" },
                    { value: "worker", label: "Background worker" },
                    { value: "not-sure", label: "Not sure yet" },
                  ]}
                  value={firstDeploy}
                  onChange={v => { setFirstDeploy(v); setStep2Errors(p => ({ ...p, firstDeploy: "" })); }}
                />
                {step2Errors.firstDeploy && <p className="text-destructive text-sm">{step2Errors.firstDeploy}</p>}
              </div>

              <div className="space-y-2">
                <Label>Moving away from?</Label>
                <Select value={replacing} onValueChange={v => { setReplacing(v as OnboardingMetadata["onboarding_replacing"]); setOtherReplacing(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heroku">Heroku</SelectItem>
                    <SelectItem value="render">Render</SelectItem>
                    <SelectItem value="railway">Railway</SelectItem>
                    <SelectItem value="fly">Fly.io</SelectItem>
                    <SelectItem value="digitalocean">DigitalOcean App Platform</SelectItem>
                    <SelectItem value="aws">AWS (ECS / EC2 / Fargate)</SelectItem>
                    <SelectItem value="coolify">Coolify</SelectItem>
                    <SelectItem value="self-managed">Self-managed (VPS / bare metal)</SelectItem>
                    <SelectItem value="fresh">Starting fresh</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {replacing === "other" && (
                  <Input
                    value={otherReplacing}
                    onChange={e => setOtherReplacing(e.target.value)}
                    placeholder="Tell us what you're moving from"
                    autoComplete="off"
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>How did you find Dployr?</Label>
                <Select value={source} onValueChange={v => { setSource(v as OnboardingMetadata["onboarding_source"]); setOtherSource(""); setStep2Errors(p => ({ ...p, source: "" })); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="search">Google / web search</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="ai">AI (ChatGPT, Claude, Gemini/Google AI Overview…)</SelectItem>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="hackernews">Hacker News</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                    <SelectItem value="friend">Friend or colleague</SelectItem>
                    <SelectItem value="producthunt">ProductHunt</SelectItem>
                    <SelectItem value="newsletter">Newsletter / blog</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {source === "other" && (
                  <Input
                    value={otherSource}
                    onChange={e => setOtherSource(e.target.value)}
                    placeholder="Where did you hear about us?"
                    autoComplete="off"
                    className="mt-2"
                  />
                )}
                {step2Errors.source && <p className="text-destructive text-sm">{step2Errors.source}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="feedback-call"
                  checked={feedbackCall}
                  onCheckedChange={v => setFeedbackCall(v === true)}
                />
                <Label htmlFor="feedback-call" className="cursor-pointer font-normal">
                  I'm open to a 15-minute feedback call
                </Label>
              </div>

            </div>
          )}
          </div>

          <div className="shrink-0 flex justify-between px-6 pb-6 pt-4 border-t">
            {step === 1 ? (
              <Button className="ml-auto" onClick={handleNext}>Next</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)} disabled={isSaving}>Back</Button>
                <Button onClick={handleFinish} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Let's go"}
                </Button>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function OnboardingModal() {
  const { user } = useAuth();
  const { userCluster } = useClusters();

  if (!user || !userCluster) return null;
  if (!checkIsNewUser(user, userCluster.name)) return null;

  return <OnboardingSteps user={user} clusterName={userCluster.name} />;
}
