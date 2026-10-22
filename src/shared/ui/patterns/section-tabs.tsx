"use client";
import { Tabs, Text } from "@radix-ui/themes";
import { useState, type ReactNode } from "react";

/**
 * Splits a long record page into named sections shown one at a time.
 * Every section stays mounted (only hidden), so unsaved form input survives switching tabs.
 * The tab row scrolls sideways on phones instead of wrapping.
 */
export function SectionTabs({
  label,
  defaultValue,
  sections,
}: {
  label: string;
  defaultValue?: string;
  sections: { value: string; label: ReactNode; count?: number; content: ReactNode }[];
}) {
  const [open, setOpen] = useState(defaultValue ?? sections[0]?.value ?? "");
  return (
    <Tabs.Root value={open} onValueChange={setOpen}>
      <Tabs.List aria-label={label} className="overflow-x-auto max-sm:scroll-fade-x">
        {sections.map((section) => (
          <Tabs.Trigger key={section.value} value={section.value} className="shrink-0">
            {section.label}
            {section.count !== undefined && (
              <Text size="1" color="gray" className="ml-1.5 tabular-nums">
                {section.count}
              </Text>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {sections.map((section) => (
        <Tabs.Content
          key={section.value}
          value={section.value}
          forceMount
          hidden={section.value !== open}
          className="pt-4"
        >
          {section.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
