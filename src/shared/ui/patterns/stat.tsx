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

/** Grid of BreakdownTiles: two columns on phones, up to four from `lg`. */
export function BreakdownGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="list" aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

/**
 * One slice of a breakdown (e.g. open exceptions per category). Deliberately unlike StatTile:
 * a filled gray surface, neutral number and a navy share bar instead of a bordered card with a
 * status-colored number. Empty slices are dimmed. `href` makes the tile a link.
 */
export function BreakdownTile({ label, value, total, href }: { label: ReactNode; value: number; total: number; href?: string }) {
  const share = total ? Math.round((value / total) * 100) : 0;
  const body = (
    <>
      <Text as="span" size="2" weight="medium" className="block">{label}</Text>
      <span className="mt-2 flex items-baseline justify-between gap-2">
        <Text as="span" size="6" weight="bold" className="tabular-nums">{value}</Text>
        <Text as="span" size="1" color="gray" className="tabular-nums">{share}%</Text>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
      </span>
    </>
  );
  const box = cn("block h-full rounded-md bg-muted p-4", !value && "opacity-60");
  return (
    <div role="listitem">
      {href ? (
        <Link href={href} className={cn(box, "transition-colors hover:bg-accent")}>{body}</Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </div>
  );
}
