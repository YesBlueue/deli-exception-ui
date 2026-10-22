import Link from "next/link";
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
  return (
    <section aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {children}
    </section>
  );
}

/**
 * One headline number. `value={null}` renders a loading placeholder.
 * Pass `onClick` to make it a button (e.g. apply a filter), or `href` to make it a link.
 */
export function StatTile({
  label,
  value,
  tone = "neutral",
  onClick,
  href,
}: {
  label: ReactNode;
  value: ReactNode | null;
  tone?: StatTone;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <Text as="span" size="2" color="gray" className="block">
        {label}
      </Text>
      {value === null ? (
        <Skeleton className="mt-2 h-8 w-14" />
      ) : (
        <Text
          as="span"
          size="7"
          weight="bold"
          mt="1"
          className={cn("block tabular-nums", TONE_CLASS[tone])}
        >
          {value}
        </Text>
      )}
    </>
  );
  const interactive = "w-full text-left";
  if (href)
    return (
      <Card size="2" asChild className={interactive}>
        <Link href={href}>{body}</Link>
      </Card>
    );
  if (onClick)
    return (
      <Card size="2" asChild className={interactive}>
        <button type="button" onClick={onClick}>
          {body}
        </button>
      </Card>
    );
  return <Card size="2">{body}</Card>;
}
