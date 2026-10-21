"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/utils";

/** Radix Select items cannot use "" as a value; this stands in for an empty ("All…" / "None") choice. */
const EMPTY = "__empty__";

export interface Option {
  value: string;
  label: string;
}

/**
 * Themed single-choice dropdown for a plain list of options. Supports an empty value (`""`) via
 * `emptyLabel`, so call sites can keep string state where "" means "all" or "none".
 */
export function OptionSelect({ id, label, value, onValueChange, options, emptyLabel, placeholder, disabled, className }: {
  id?: string;
  /** Accessible name when no visible <label htmlFor> points at `id`. */
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  /** Label for the "" choice; omit when an empty value is not selectable. */
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selectValue = value === "" ? (emptyLabel !== undefined ? EMPTY : "") : value;
  return (
    <Select value={selectValue} onValueChange={(v) => onValueChange(v === EMPTY ? "" : v)} {...(disabled !== undefined && { disabled })}>
      <SelectTrigger {...(id && { id })} {...(label && { "aria-label": label })} className={cn(className)}>
        <SelectValue {...(placeholder && { placeholder })} />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel !== undefined && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
