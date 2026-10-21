import { Card, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";
import { Skeleton } from "@/shared/ui/skeleton";

/** Value colors; status tones keep their fixed meanings (see globals.css). */
export type StatTone = "neutral" | "accent" | "critical" | "high" | "medium" | "success" | "info";

const TONE_CLASS: Record<StatTone, string> = {
  neutral: "text-foreground",
  accent: "text-primary",
  critical: "text-critical",
  high: "text-high",
  medium: "text-medium",
  success: "text-success",
  info: "text-info",
};

/** Row of headline numbers: two columns on phones, four from `lg`. */
export function StatGrid({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</section>;
}

/** One headline number. `value={null}` renders a loading placeholder. */
export function StatTile({ label, value, tone = "neutral" }: { label: ReactNode; value: ReactNode | null; tone?: StatTone }) {
  return (
    <Card size="2">
      <Text as="p" size="2" color="gray">{label}</Text>
      {value === null ? (
        <Skeleton className="mt-2 h-8 w-14" />
      ) : (
        <Text as="p" size="7" weight="bold" mt="1" className={cn("tabular-nums", TONE_CLASS[tone])}>{value}</Text>
      )}
    </Card>
  );
}
