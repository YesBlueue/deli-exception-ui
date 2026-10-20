/** All priority thresholds live here so they are easy to change. */
export const PRIORITY_CONFIG = {
  highValueMMK: 100_000,
  highValueDelayHours: 72,
  delayHours: 24,
  reopenResolvedOnNewEvent: true,
};

export const CURRENT_ORG = "org_shwe_market";
export const CURRENT_USER = "Thida Aung (CS rep)";
export const COMPLAINT_REFERENCE_YEAR = 2026;
export const SLA_HOURS = { CRITICAL: 2, HIGH: 8, MEDIUM: 24, LOW: 48 } as const;
