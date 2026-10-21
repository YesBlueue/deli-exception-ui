import Link from "next/link";
import { Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

/** Divided list of navigable rows; put it in a flush Panel. */
export function LinkList({ label, children }: { label?: string; children: ReactNode }) {
  return <ul aria-label={label} className="divide-y">{children}</ul>;
}

export function LinkRow({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <li>
      <Link href={href} className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent", className)}>{children}</Link>
    </li>
  );
}

/** Label/number pairs, numbers right-aligned. */
export function StatList({ items }: { items: { key: string; label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div key={item.key} className="flex justify-between gap-3 px-4 py-2.5">
          <dt><Text size="2">{item.label}</Text></dt>
          <dd><Text size="2" weight="medium" className="tabular-nums">{item.value}</Text></dd>
        </div>
      ))}
    </dl>
  );
}

/** Chronological entries, newest first, each with a timestamp and optional metadata. */
export function Timeline({ items, empty }: { items: { key: string; time: ReactNode; meta?: ReactNode; body: ReactNode }[]; empty?: ReactNode }) {
  if (!items.length) return empty ? <Text as="p" size="2" color="gray" className="px-4 py-3">{empty}</Text> : null;
  return (
    <ol className="divide-y">
      {items.map((item) => (
        <li key={item.key} className="px-4 py-2.5">
          <Text as="div" size="2">{item.body}</Text>
          <Text as="div" size="1" color="gray" mt="1" className="flex flex-wrap items-center gap-x-2 gap-y-1">{item.time}{item.meta}</Text>
        </li>
      ))}
    </ol>
  );
}
