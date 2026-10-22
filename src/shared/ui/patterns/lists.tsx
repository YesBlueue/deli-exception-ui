import Link from "next/link";
import { Text } from "@radix-ui/themes";
import { Fragment, type ReactNode } from "react";

import { cn } from "@/shared/utils";

/** Divided list of navigable rows; put it in a flush Panel. */
export function LinkList({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y">
      {children}
    </ul>
  );
}

export function LinkRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent",
          className,
        )}
      >
        {children}
      </Link>
    </li>
  );
}

/** Like LinkRow, for rows that open something in place (a dialog) instead of navigating. */
export function ButtonRow({
  onClick,
  selected = false,
  children,
}: {
  onClick: () => void;
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
          selected && "bg-accent",
        )}
      >
        {children}
      </button>
    </li>
  );
}

/** Label/number pairs, numbers right-aligned. */
export function StatList({
  items,
}: {
  items: { key: string; label: ReactNode; value: ReactNode }[];
}) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div key={item.key} className="flex justify-between gap-3 px-4 py-2.5">
          <dt>
            <Text size="2">{item.label}</Text>
          </dt>
          <dd>
            <Text size="2" weight="medium" className="tabular-nums">
              {item.value}
            </Text>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Chronological entries, newest first, each with a timestamp and optional metadata. */
export function Timeline({
  items,
  empty,
}: {
  items: { key: string; time: ReactNode; meta?: ReactNode; body: ReactNode }[];
  empty?: ReactNode;
}) {
  if (!items.length)
    return empty ? (
      <Text as="p" size="2" color="gray" className="px-4 py-3">
        {empty}
      </Text>
    ) : null;
  return (
    <ol className="divide-y">
      {items.map((item) => (
        <li key={item.key} className="px-4 py-2.5">
          <Text as="div" size="2">
            {item.body}
          </Text>
          <Text
            as="div"
            size="1"
            color="gray"
            mt="1"
            className="flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            {item.time}
            {item.meta}
          </Text>
        </li>
      ))}
    </ol>
  );
}

/** Secondary facts on one wrapping gray line, separated by dots. Empty items are skipped. */
export function MetaLine({ items, className }: { items: ReactNode[]; className?: string }) {
  const shown = items.filter(
    (item) => item !== null && item !== undefined && item !== false && item !== "",
  );
  if (!shown.length) return null;
  return (
    <Text
      as="div"
      size="1"
      color="gray"
      className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}
    >
      {shown.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden>·</span>}
          <span className="min-w-0 break-words">{item}</span>
        </Fragment>
      ))}
    </Text>
  );
}

/**
 * Content of one record in a list, in reading order: `lead` (e.g. priority) in a fixed column,
 * a bold title with its badges, the identifying `meta` line, optional body, then `trailing`
 * (e.g. a due time) on the right. On phones `lead` sits above the title and `trailing` below. Use inside LinkRow, ButtonRow or a plain list item.
 */
export function RecordSummary({
  lead,
  title,
  badges,
  meta,
  trailing,
  children,
}: {
  lead?: ReactNode;
  title: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode[];
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-start gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-64 flex-col items-start gap-1.5 sm:flex-row sm:gap-3">
        {lead && <div className="shrink-0 sm:w-16 sm:pt-0.5">{lead}</div>}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Text as="p" size="3" weight="bold" className="min-w-0 break-words">
              {title}
            </Text>
            {badges}
          </div>
          {meta && <MetaLine items={meta} />}
          {children && <div className="space-y-1 pt-1">{children}</div>}
        </div>
      </div>
      {trailing && <div className="shrink-0 sm:ml-auto">{trailing}</div>}
    </div>
  );
}
