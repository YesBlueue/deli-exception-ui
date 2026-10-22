"use client";

import { useEffect, useState } from "react";
import { getSla, isActiveException } from "@/core/domain/sla";
import type { DeliveryException } from "@/core/domain/types";
export function SlaCountdown({ exception }: { exception: DeliveryException }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (!isActiveException(exception.workflowStatus)) return <span className="text-muted-foreground">Closed</span>;
  if (now === null) return <span>—</span>;
  const sla = getSla(exception, now); const minutes = Math.ceil(Math.abs(sla.remainingMs) / 60000);
  return <span className={`whitespace-nowrap text-xs tabular-nums ${sla.breached ? "text-destructive" : "text-muted-foreground"}`}>{Math.floor(minutes / 60)}h {minutes % 60}m {sla.breached ? "overdue" : "remaining"}</span>;
}