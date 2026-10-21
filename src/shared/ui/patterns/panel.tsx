import { Card, Heading } from "@radix-ui/themes";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

/**
 * The single container for page content: an optional titled header row, then the body.
 * Use `flush` when the body is a table or list that draws its own row padding.
 */
export function Panel({ title, aside, toolbar, flush = false, className, children }: {
  title?: ReactNode;
  aside?: ReactNode;
  /** Controls row under the header, e.g. a FilterBar. */
  toolbar?: ReactNode;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card size="1" className={cn("min-w-0 !p-0", className)}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <Heading as="h2" size="3">{title}</Heading>
          {aside}
        </div>
      )}
      {toolbar && <div className="border-b p-3">{toolbar}</div>}
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </Card>
  );
}
