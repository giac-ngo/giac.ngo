// Dashboard utility functions for temple_admin

export interface SubscriptionInfo {
  productId: string | null;
  productName: string | null;
  renewalDate: string | null;
  status: string | null;
  cancelAtPeriodEnd?: boolean;
  scheduledProductId?: string | null;
  scheduledProductName?: string | null;
}

export interface DisplayStatus {
  hasActivePlan: boolean;
  planLabel: string;
  renewalLabel: string;
  isCancelling: boolean;
  hasScheduledChange: boolean;
  scheduledPlanLabel: string | null;
}

/**
 * Returns the redirect path based on user role.
 */
export function getRedirectPath(role: string): string {
  if (role === "temple_admin") return "/dashboard";
  if (role === "bodhi_admin") return "/admin";
  return "/";
}

/**
 * Returns a welcome message with the user's name, or a default greeting.
 */
export function getWelcomeMessage(name: string | null | undefined): string {
  if (!name || name.trim() === "") return "Welcome to your Dashboard";
  return `Welcome, ${name}`;
}

/**
 * Formats an ISO date string to a locale display string.
 */
export function formatRenewalDate(isoDate: string | null): string {
  if (!isoDate) return "N/A";
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

/**
 * Determines display status from subscription info.
 */
export function getSubscriptionDisplayStatus(sub: SubscriptionInfo): DisplayStatus {
  const planNames: Record<string, string> = {
    basic: "Lay Practitioner",
    standard: "Devoted Practitioner",
    premium: "Sangha Community",
  };

  if (!sub.productId || (sub.status !== "active" && sub.status !== "past_due")) {
    return { 
      hasActivePlan: false, 
      planLabel: "No active plan", 
      renewalLabel: "N/A",
      isCancelling: false,
      hasScheduledChange: false,
      scheduledPlanLabel: null,
    };
  }

  return {
    hasActivePlan: true,
    planLabel: sub.productName || planNames[sub.productId] || sub.productId,
    renewalLabel: formatRenewalDate(sub.renewalDate),
    isCancelling: sub.cancelAtPeriodEnd || false,
    hasScheduledChange: !!sub.scheduledProductId,
    scheduledPlanLabel: sub.scheduledProductName || (sub.scheduledProductId ? planNames[sub.scheduledProductId] : null),
  };
}
