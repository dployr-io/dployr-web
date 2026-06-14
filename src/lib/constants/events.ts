export type EventType = { code: string; label: string };

export const EVENT_TYPES: Record<string, EventType[]> = {
  auth: [
    { code: "auth.session_created",          label: "Sign-in" },
    { code: "auth.session_revoked",           label: "Session revoked" },
    { code: "auth.api_token_created",         label: "API token created" },
    { code: "auth.api_token_revoked",         label: "API token revoked" },
    { code: "auth.api_token_key_revoked",     label: "API token key revoked" },
    { code: "auth.totp_enabled",              label: "Authenticator enabled" },
    { code: "auth.totp_disabled",             label: "Authenticator disabled" },
    { code: "auth.backup_codes_regenerated",  label: "Backup codes regenerated" },
  ],
  cluster: [
    { code: "cluster.modified",              label: "Cluster renamed" },
    { code: "cluster.user_invited",          label: "User invited" },
    { code: "cluster.invite_accepted",       label: "Invite accepted" },
    { code: "cluster.invite_declined",       label: "Invite declined" },
    { code: "cluster.invite_revoked",        label: "Invite revoked" },
    { code: "cluster.removed_user",          label: "User removed" },
    { code: "cluster.user_role_changed",     label: "Role changed" },
    { code: "cluster.ownership_transferred", label: "Ownership transferred" },
  ],
  deployment: [
    { code: "deployment.created",  label: "Deployment started" },
    { code: "deployment.finished", label: "Deployment finished" },
    { code: "deployment.deleted",  label: "Deployment deleted" },
  ],
  service: [
    { code: "service.updated",       label: "Service updated" },
    { code: "service.deleted",       label: "Service deleted" },
    { code: "service.stopped",       label: "Service stopped" },
    { code: "service.started",       label: "Service started" },
    { code: "service.unhealthy",     label: "Service unhealthy" },
    { code: "service.recovered",     label: "Service recovered" },
    { code: "service.icing_warning", label: "Icing warning" },
    { code: "service.iced",          label: "Service iced" },
  ],
  domain: [
    { code: "domain.created",  label: "Domain added" },
    { code: "domain.verified", label: "Domain verified" },
    { code: "domain.deleted",  label: "Domain removed" },
  ],
  integrations: [
    { code: "integrations.github_installed",    label: "GitHub connected" },
    { code: "integrations.gitlab_configured",   label: "GitLab connected" },
    { code: "integrations.bitbucket_configured",label: "Bitbucket connected" },
  ],
  user: [
    { code: "user.updated", label: "Profile updated" },
  ],
  billing: [
    { code: "billing.payment_successful",    label: "Payment successful" },
    { code: "billing.payment_failed",        label: "Payment failed" },
    { code: "billing.subscription_resumed",  label: "Subscription resumed" },
    { code: "billing.subscription_cancelled",label: "Subscription cancelled" },
    { code: "billing.subscription_expired",  label: "Subscription expired" },
  ],
  instance: [
    { code: "instance.created", label: "Instance created" },
    { code: "instance.updated", label: "Instance updated" },
    { code: "instance.deleted", label: "Instance deleted" },
  ],
};

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  auth:         "Auth",
  cluster:      "Cluster",
  deployment:   "Deployments",
  service:      "Services",
  domain:       "Domains",
  integrations: "Integrations",
  user:         "User",
  billing:      "Billing",
  instance:     "Instances",
};

const allEventTypes = Object.values(EVENT_TYPES).flat();

export function eventLabel(code: string): string {
  return allEventTypes.find((e) => e.code === code)?.label ?? code;
}
