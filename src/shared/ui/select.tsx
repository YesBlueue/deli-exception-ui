"use client";

import * as React from "react";
import { Select as ThemeSelect } from "@radix-ui/themes";

import { cn } from "@/shared/utils";

const Select = (props: React.ComponentProps<typeof ThemeSelect.Root>) => <ThemeSelect.Root size="2" {...props} />;

/**
 * Marker for the selected value. Radix Themes renders the value inside its trigger, so the
 * trigger reads `placeholder` from this element instead of rendering it.
 */
function SelectValue(_props: { placeholder?: string }) {
  return null;
}

function placeholderOf(children: React.ReactNode): string | undefined {
  let placeholder: string | undefined;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ placeholder?: string }>(child) && child.type === SelectValue) placeholder = child.props.placeholder;
  });
  return placeholder;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, Omit<React.ComponentPropsWithoutRef<typeof ThemeSelect.Trigger>, "placeholder">>(
  ({ className, children, ...props }, ref) => {
    const placeholder = placeholderOf(children);
    return <ThemeSelect.Trigger ref={ref} className={cn("w-full", className)} {...(placeholder !== undefined && { placeholder })} {...props} />;
  },
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ThemeSelect.Content>>((props, ref) => (
  <ThemeSelect.Content ref={ref} position="popper" {...props} />
));
SelectContent.displayName = "SelectContent";

const SelectItem = ThemeSelect.Item;
const SelectGroup = ThemeSelect.Group;
const SelectLabel = ThemeSelect.Label;
const SelectSeparator = ThemeSelect.Separator;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };
