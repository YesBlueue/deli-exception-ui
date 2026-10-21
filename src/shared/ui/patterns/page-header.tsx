import { Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

/** Top of every page: optional context line, the page title, a one-line description and page actions. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Text as="p" size="2" color="gray" mb="1">{eyebrow}</Text>}
        <Heading as="h1" size="7" weight="bold">{title}</Heading>
        {description && <Text as="p" size="2" color="gray" mt="1">{description}</Text>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
