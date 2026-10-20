import { describe, expect, it } from "vitest";
import { getSla, isActiveException } from "./sla";
import { canTransition } from "./lifecycle";
const openedAt = "2026-10-20T00:00:00Z";
describe("SLA defaults", () => {
  for (const [priority, hours] of [["CRITICAL", 2], ["HIGH", 8], ["MEDIUM", 24], ["LOW", 48]] as const) it(`${priority} expires after ${hours} hours`, () => { const x = { openedAt, priority, workflowStatus: "NEW" as const }; const deadline = Date.parse(openedAt) + hours * 36e5; expect(getSla(x, deadline - 1).breached).toBe(false); expect(getSla(x, deadline).breached).toBe(true); expect(getSla(x, deadline).remainingMs).toBe(0); });
  it("resolved and ignored exceptions do not breach", () => { for (const workflowStatus of ["RESOLVED", "IGNORED"] as const) { expect(isActiveException(workflowStatus)).toBe(false); expect(getSla({ openedAt, priority: "CRITICAL", workflowStatus }, Date.parse(openedAt) + 72 * 36e5).breached).toBe(false); } });
  it("allows ignoring active exceptions and reopening ignored ones", () => { expect(canTransition("NEW", "IGNORED")).toBe(true); expect(canTransition("IGNORED", "REOPENED")).toBe(true); });
});