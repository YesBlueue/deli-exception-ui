import { AlertOctagon, AlertTriangle, ArrowDown, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/shared/utils";
import { STATUS_LABEL } from "@/core/domain/lifecycle";
import type { ExceptionType, Priority, WorkflowStatus } from "@/core/domain/types";

const P: Record<Priority, { cls: string; label: string; Icon: typeof Circle }> = {
  CRITICAL: { cls: "bg-critical-soft text-critical border-critical/30", label: "Critical", Icon: AlertOctagon },
  HIGH: { cls: "bg-high-soft text-high border-high/30", label: "High", Icon: AlertTriangle },
  MEDIUM: { cls: "bg-medium-soft text-medium border-medium/30", label: "Medium", Icon: Circle },
  LOW: { cls: "bg-low-soft text-low border-low/30", label: "Low", Icon: ArrowDown },
};

export function PriorityBadge({ p, className }: { p: Priority; className?: string }) {
  const { cls, label, Icon } = P[p];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}

const S: Record<WorkflowStatus, string> = {
  NEW: "bg-info-soft text-info border-info/30",
  ACTION_REQUIRED: "bg-critical-soft text-critical border-critical/30",
  AWAITING_CUSTOMER: "bg-medium-soft text-medium border-medium/30",
  AWAITING_CARRIER: "bg-medium-soft text-medium border-medium/30",
  IN_PROGRESS: "bg-accent text-accent-foreground border-primary/30",
  RESOLVED: "bg-success-soft text-success border-success/30",
  REOPENED: "bg-high-soft text-high border-high/30",
  IGNORED: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ s }: { s: WorkflowStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", S[s])}>
      {s === "RESOLVED" && <CheckCircle2 className="h-3 w-3" aria-hidden />}
      {STATUS_LABEL[s]}
    </span>
  );
}

export const TYPE_LABEL: Record<ExceptionType, string> = {
  DELAYED: "Delayed",
  INVALID_ADDRESS: "Invalid address",
  FAILED_DELIVERY: "Failed delivery",
  LOST: "Lost",
  DAMAGED: "Damaged",
};

export function SimBadge({ children = "Simulated" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-demo/30 bg-demo-soft px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-demo">
      {children}
    </span>
  );
}

export function ago(iso: string, now = Date.now()) {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
