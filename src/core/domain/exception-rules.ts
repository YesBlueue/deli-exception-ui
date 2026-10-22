/** One-company exception guidance. Pure functions never execute an action. */
import { ATTEMPT_CATEGORIES } from "./driver-rules";
export const CATEGORY_LABELS = {
  DELAY: "Delivery delay",
  DAMAGE: "Damaged delivery",
  MISSING_ITEM: "Missing item",
  WRONG_ITEM: "Wrong item",
  PACKAGE_MISSING: "Delivery not received",
  OTHER: "Manual review",
} as const;
export type ReportCategory = keyof typeof CATEGORY_LABELS;
export const RULE_VERSION = "reports-v1";
export function classifyReport(description: string) {
  const rules: [ReportCategory, RegExp][] = [
    ["DELAY", /\b(delay|delayed|late|overdue)\b/i],
    ["DAMAGE", /\b(damage|damaged|broken|crushed|leaking)\b/i],
    ["MISSING_ITEM", /(missing item|item missing|missing items|incomplete)/i],
    ["WRONG_ITEM", /(wrong item|incorrect item|different item)/i],
    [
      "PACKAGE_MISSING",
      /(not received|never arrived|package missing|parcel missing|not delivered)/i,
    ],
  ];
  const matches = rules.filter(([, pattern]) => pattern.test(description));
  const category: ReportCategory = matches.length === 1 ? matches[0]![0] : "OTHER";
  return {
    category,
    refund: /\b(refund|reimburse|reimbursement)\b/i.test(description),
    needsReview: matches.length !== 1,
    version: RULE_VERSION,
    reason:
      matches.length === 1
        ? `Matched documented keyword rule for ${category}.`
        : "No single supported issue category; staff review required.",
  };
}
export interface GuidanceContext {
  category: string;
  sourceStatus: string;
  sourceUpdatedAt: string | null;
  refund: boolean;
  needsReview: boolean;
  confirmation: string | null;
  hasRelevantEvent: boolean;
}
export function nextAction(c: GuidanceContext, now: number) {
  const version = "guidance-v1";
  const sourceTime = c.sourceUpdatedAt ? Date.parse(c.sourceUpdatedAt) : NaN;
  if (
    !Number.isFinite(sourceTime) ||
    sourceTime > now ||
    now - sourceTime > 48 * 36e5 ||
    c.needsReview ||
    !c.hasRelevantEvent ||
    c.category === "OTHER" ||
    !Object.hasOwn(CATEGORY_LABELS, c.category) ||
    ![
      "CREATED",
      "PICKED_UP",
      "IN_TRANSIT",
      "OUT_FOR_DELIVERY",
      "DELIVERY_FAILED",
      "DELIVERED",
      "RETURNED",
    ].includes(c.sourceStatus) ||
    (c.category === "DELAY" && c.sourceStatus === "DELIVERED") ||
    (["DAMAGE", "MISSING_ITEM", "WRONG_ITEM"].includes(c.category) &&
      c.sourceStatus !== "DELIVERED")
  )
    return {
      rule: "MANUAL_CONTEXT",
      version,
      action: "Review the available information manually.",
      reason: "Context is missing, stale, ambiguous, or unsupported.",
    };
  if (c.refund)
    return {
      rule: "REFUND_HANDOFF",
      version,
      action: "Review the delivery findings and prepare a seller handoff.",
      reason:
        "Refund intent is separate from the delivery issue. No refund is approved by this system.",
    };
  if (c.category === "PACKAGE_MISSING" && c.sourceStatus === "DELIVERED")
    return c.confirmation
      ? {
          rule: "DELIVERY_CONFIRMATION",
          version,
          action: "Check delivery confirmation details.",
          reason: "The customer reports non-receipt although the source marks delivery complete.",
        }
      : {
          rule: "MANUAL_CONFIRMATION",
          version,
          action: "Review the available information manually.",
          reason: "Delivery confirmation details are not available.",
        };
  if (c.category === "DELAY")
    return {
      rule: "DELAY_UPDATE",
      version,
      action: "Review the latest delivery event.",
      reason: "A delay was reported; inspect the received source context before responding.",
    };
  return {
    rule: "INVESTIGATE_REPORT",
    version,
    action: "Review the report and permitted evidence.",
    reason: "Staff must establish findings before publishing an update.",
  };
}
export function exceptionSummary(
  order: string | null,
  seller: string,
  category: string,
  status: string,
) {
  return `${CATEGORY_LABELS[category as ReportCategory] ?? ATTEMPT_CATEGORIES[category as keyof typeof ATTEMPT_CATEGORIES] ?? "Manual review"} · ${order ?? "Order reference unavailable"} · ${seller}. Source status: ${status.replaceAll("_", " ").toLowerCase()}.`;
}
export const EXCEPTION_TRANSITIONS: Record<string, string[]> = {
  NEW: ["IN_PROGRESS", "AWAITING_CUSTOMER", "AWAITING_SELLER", "RESOLVED"],
  ACTION_REQUIRED: ["IN_PROGRESS", "AWAITING_CUSTOMER", "AWAITING_SELLER", "RESOLVED"],
  REOPENED: ["IN_PROGRESS", "AWAITING_CUSTOMER", "AWAITING_SELLER", "RESOLVED"],
  IN_PROGRESS: ["AWAITING_CUSTOMER", "AWAITING_SELLER", "RESOLVED"],
  AWAITING_CUSTOMER: ["IN_PROGRESS", "RESOLVED"],
  AWAITING_SELLER: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["REOPENED"],
};
export function exceptionSla(
  e: { detected_at: string; priority: string; status: string },
  now: number,
) {
  if (e.status === "RESOLVED") return { label: "Closed", breached: false };
  const hours =
    ({ CRITICAL: 2, HIGH: 8, MEDIUM: 24, LOW: 48 } as Record<string, number>)[e.priority] ?? 24;
  const left = Date.parse(e.detected_at) + hours * 36e5 - now;
  return {
    label: `${left < 0 ? "Overdue " : ""}${Math.floor(Math.abs(left) / 36e5)}h ${Math.floor(Math.abs(left) / 60000) % 60}m`,
    breached: left < 0,
  };
}
