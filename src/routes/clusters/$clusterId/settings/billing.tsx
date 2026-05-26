// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import HeadingSmall from "@/components/heading-small";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useBilling } from "@/hooks/use-billing";
import { Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useUrlState } from "@/hooks/use-url-state";

export const Route = createFileRoute("/clusters/$clusterId/settings/billing")({
  component: BillingPage,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Billing",
    href: "/settings/billing",
  },
];

// Tier order — used to sort plans and enforce compare column order
const TIER_ORDER = ["hobby", "indie", "pro"];

// Only the features that are NEW in each tier (not repeated from lower tiers)
const PLAN_NEW_FEATURES: Record<string, string[]> = {
  hobby: [
    "512MB RAM · 1 vCPU · 10GB disk",
    "1 workload (sleeps when idle)",
    "All runtimes",
    "CLI + dashboard",
    "Blueprints",
    "GitHub Actions",
    "Log streaming",
    "RBAC + audit log",
    "30-day log retention",
  ],
  indie: ["1GB RAM · 1 vCPU · 25GB disk", "Shared always-on instance", "Up to 5 workloads", "5 seats", "Slack / Discord / webhooks", "Migration support", "12-month log retention"],
  pro: ["2GB RAM · 1 vCPU · 50GB disk", "Dedicated instance", "Up to 25 workloads", "36-month log retention", "25 seats", "Priority support", "Console access", "File explorer", "Watchdog"],
};

// For the compare dialog — structured rows with a value per plan
interface FeatureRow {
  label: string;
  values: Record<string, string | boolean>;
}

const FEATURE_ROWS: FeatureRow[] = [
  { label: "Specifications", values: { hobby: "512MB · 1vCPU · 10GB", indie: "1GB · 1vCPU · 10GB", pro: "2GB · 1vCPU· 10GB" } },
  { label: "Workloads", values: { hobby: "1", indie: "5", pro: "25" } },
  { label: "Seats", values: { hobby: "1", indie: "5", pro: "25" } },
  { label: "Instance", values: { hobby: "Sleeps when idle", indie: "Shared always-on", pro: "Dedicated" } },
  { label: "Log retention", values: { hobby: "30 days", indie: "12 months", pro: "36 months" } },
  { label: "All runtimes", values: { hobby: true, indie: true, pro: true } },
  { label: "CLI + dashboard", values: { hobby: true, indie: true, pro: true } },
  { label: "Blueprints", values: { hobby: true, indie: true, pro: true } },
  { label: "GitHub Actions", values: { hobby: true, indie: true, pro: true } },
  { label: "Log streaming", values: { hobby: true, indie: true, pro: true } },
  { label: "RBAC + audit log", values: { hobby: true, indie: true, pro: true } },
  { label: "Slack / Discord / webhooks", values: { hobby: false, indie: true, pro: true } },
  { label: "Migration support", values: { hobby: false, indie: true, pro: true } },
  { label: "Console access", values: { hobby: false, indie: false, pro: true } },
  { label: "File explorer", values: { hobby: false, indie: false, pro: true } },
  { label: "Watchdog", values: { hobby: false, indie: false, pro: true } },
  { label: "Priority support", values: { hobby: false, indie: false, pro: true } },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="h-3.5 w-3.5 text-green-500 mx-auto" />;
  if (value === false) return <span className="text-muted-foreground/30 text-sm">—</span>;
  return <span className="font-medium">{value}</span>;
}

interface ComparePlan {
  id: string;
  name: string;
  price: number;
  interval: string | null;
}

function CompareDialog({
  open,
  onOpenChange,
  plans,
  selected,
  onSelectedChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: ComparePlan[];
  selected: string[];
  onSelectedChange: (v: string[]) => void;
}) {
  // Sort plans by tier order
  const orderedPlans = [...plans].sort((a, b) => TIER_ORDER.indexOf(a.id) - TIER_ORDER.indexOf(b.id));

  function toggle(id: string) {
    if (selected.includes(id)) {
      if (selected.length === 2) onSelectedChange([id === selected[0] ? selected[1] : selected[0]]);
    } else {
      const next = [...selected, id].slice(-2);
      next.sort((x, y) => TIER_ORDER.indexOf(x) - TIER_ORDER.indexOf(y));
      onSelectedChange(next);
    }
  }

  const [idA, idB] = selected.length === 2 ? selected : [selected[0], null];
  const planA = orderedPlans.find(p => p.id === idA);
  const planB = idB ? orderedPlans.find(p => p.id === idB) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compare plans</DialogTitle>
        </DialogHeader>

        {/* Plan selector chips */}
        <div className="flex items-center gap-2 flex-wrap mt-0">
          <span className="text-xs text-muted-foreground mr-1">Comparing:</span>
          {orderedPlans.map(p => {
            const isSelected = selected.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected ? "bg-foreground text-background border-foreground" : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            );
          })}
          {selected.length === 1 && <span className="text-xs text-muted-foreground italic">Select one more plan</span>}
        </div>

        <Separator />

        {/* Comparison table */}
        {planA && planB && (
          <div className="overflow-y-auto max-h-[55vh]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Feature</th>
                  <th className="pb-2 text-center font-medium w-28">
                    <div>{planA.name}</div>
                    <div className="text-muted-foreground font-normal">{planA.price === 0 ? "Free" : `$${planA.price}/${planA.interval}`}</div>
                  </th>
                  <th className="pb-2 text-center font-medium w-28">
                    <div>{planB.name}</div>
                    <div className="text-muted-foreground font-normal">{planB.price === 0 ? "Free" : `$${planB.price}/${planB.interval}`}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "" : "bg-muted/10"}>
                    <td className="py-1.5 pr-4 text-muted-foreground">{row.label}</td>
                    <td className="py-1.5 text-center">
                      <FeatureValue value={row.values[planA.id] ?? false} />
                    </td>
                    <td className="py-1.5 text-center">
                      <FeatureValue value={row.values[planB.id] ?? false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BillingPage() {
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const { plans, isLoadingPlans, billingStatus, checkout, portalUrl } = useBilling();
  const { useBillingUrlState } = useUrlState();
  const [{ compare }, setBillingState] = useBillingUrlState();
  const [compareOpen, setCompareOpen] = useState(compare);
  const [compareSelection, setCompareSelection] = useState<string[]>(compare ? ["hobby", "pro"] : []);

  const currentPlanId = billingStatus?.plan ?? "hobby";
  const successUrl = `${window.location.origin}${window.location.pathname}`;

  const hasActiveSubscription = billingStatus?.subscription != null && billingStatus.subscription.status === "active" && billingStatus.subscription.polarSubscriptionId != null;
  const [checkingOutPlan, setCheckingOutPlan] = useState<string | null>(null);

  // Sort plans by tier order for display
  const sortedPlans = [...(plans ?? [])].sort((a, b) => TIER_ORDER.indexOf(a.id) - TIER_ORDER.indexOf(b.id));

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-6 pb-8">
            <HeadingSmall title="Billing" description="Manage your plan and subscription" />

            {/* Plan cards */}
            <div>
              <div className="flex items-center justify-end mb-3">
                {!isLoadingPlans && sortedPlans.length >= 2 && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => {
                      if (compareSelection.length === 0) setCompareSelection(["hobby", "pro"]);
                      setCompareOpen(true);
                      setBillingState({ compare: true });
                    }}>
                    Compare plans
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoadingPlans
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-lg border p-5 space-y-3">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="h-4 w-full" />
                        <div className="space-y-1.5 pt-2">
                          {Array.from({ length: 3 }).map((_, j) => (
                            <Skeleton key={j} className="h-3 w-3/4" />
                          ))}
                        </div>
                        <Skeleton className="h-9 w-full rounded-md mt-2" />
                      </div>
                    ))
                  : sortedPlans.map((plan, idx) => {
                      const isCurrent = plan.id === currentPlanId;
                      const isUpgrade = plan.price > (billingStatus?.planDetails?.price ?? 0);
                      const newFeatures = PLAN_NEW_FEATURES[plan.id] ?? [];
                      const prevPlan = idx > 0 ? sortedPlans[idx - 1] : null;

                      return (
                        <div
                          key={plan.id}
                          className={`rounded-lg border p-5 flex flex-col gap-4 transition-colors ${isCurrent ? "border-foreground/40 bg-muted/30" : "border-border hover:border-foreground/20"}`}
                        >
                          {/* Name + current badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{plan.name}</span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium">
                                <Check className="h-3 w-3" /> Current
                              </span>
                            )}
                          </div>

                          {/* Price */}
                          <div>
                            {plan.price === 0 ? (
                              <span className="text-2xl font-bold">Free</span>
                            ) : (
                              <span className="text-2xl font-bold">
                                ${plan.price}
                                <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground">{plan.description}</p>

                          {/* Features */}
                          <div className="flex-1 space-y-2.5">
                            {/* "Everything in X, plus:" label for non-first tiers */}
                            {prevPlan && <p className="text-xs text-muted-foreground">Everything in {prevPlan.name}, plus:</p>}
                            <ul className="space-y-1.5">
                              {newFeatures.map(feature => (
                                <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Action */}
                          <div>
                            {isCurrent ? (
                              <Button variant="outline" size="sm" className="w-full" disabled>
                                Current plan
                              </Button>
                            ) : isUpgrade ? (
                              <Button
                                size="sm"
                                className="w-full"
                                disabled={checkout.isPending}
                                onClick={() => {
                                  setCheckingOutPlan(plan.id);
                                  checkout.mutate({ plan: plan.id, successUrl });
                                }}
                              >
                                {checkingOutPlan === plan.id && checkout.isPending ? "Redirecting…" : `Upgrade to ${plan.name}`}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" disabled>
                                Downgrade
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>

            {/* Manage subscription — only shown when there is a real paid active subscription */}
            {hasActiveSubscription && (
              <>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Manage subscription</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Update payment details, download invoices, or cancel your subscription.</p>
                  </div>
                  <a href={portalUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Manage subscription
                    </Button>
                  </a>
                </div>
              </>
            )}
          </div>

          {!isLoadingPlans && sortedPlans.length >= 2 && (
            <CompareDialog
              open={compareOpen}
              onOpenChange={v => { setCompareOpen(v); setBillingState({ compare: v || null }); }}
              plans={sortedPlans}
              selected={compareSelection}
              onSelectedChange={setCompareSelection}
            />
          )}
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
