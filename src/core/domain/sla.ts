import { SLA_HOURS } from "./config";
import type { DeliveryException, WorkflowStatus } from "./types";
export const isActiveException = (status: WorkflowStatus) => status !== "RESOLVED" && status !== "IGNORED";
/** Deadline is based on original opening and current priority, never the rendering clock. */
export function getSla(exception: Pick<DeliveryException, "openedAt" | "priority" | "workflowStatus">, nowMs: number) {
  const deadline = new Date(exception.openedAt).getTime() + SLA_HOURS[exception.priority] * 36e5;
  const remainingMs = deadline - nowMs;
  return { deadline, remainingMs, breached: isActiveException(exception.workflowStatus) && remainingMs <= 0 };
}