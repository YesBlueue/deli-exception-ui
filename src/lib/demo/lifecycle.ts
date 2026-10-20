import type { WorkflowStatus } from "./types";

const ACTIVE: WorkflowStatus[] = ["IN_PROGRESS", "AWAITING_CUSTOMER", "AWAITING_CARRIER", "RESOLVED"];

export const TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  NEW: ["ACTION_REQUIRED", ...ACTIVE],
  ACTION_REQUIRED: ACTIVE,
  IN_PROGRESS: ["AWAITING_CUSTOMER", "AWAITING_CARRIER", "RESOLVED"],
  AWAITING_CUSTOMER: ["IN_PROGRESS", "AWAITING_CARRIER", "RESOLVED"],
  AWAITING_CARRIER: ["IN_PROGRESS", "AWAITING_CUSTOMER", "RESOLVED"],
  RESOLVED: ["REOPENED"],
  REOPENED: ["ACTION_REQUIRED", ...ACTIVE],
};

export function canTransition(from: WorkflowStatus, to: WorkflowStatus) {
  return TRANSITIONS[from].includes(to);
}

export const STATUS_LABEL: Record<WorkflowStatus, string> = {
  NEW: "New",
  ACTION_REQUIRED: "Action required",
  AWAITING_CUSTOMER: "Awaiting customer",
  AWAITING_CARRIER: "Awaiting carrier",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
};
