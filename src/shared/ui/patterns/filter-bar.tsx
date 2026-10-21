import { TextField } from "@radix-ui/themes";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

/** Search box with a leading icon; `label` is its accessible name. */
export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <TextField.Root type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} {...(placeholder && { placeholder })} className="min-w-0 flex-1">
      <TextField.Slot><Search className="size-4" aria-hidden /></TextField.Slot>
    </TextField.Root>
  );
}

/**
 * Search plus filter controls. "inline" (default, up to four filters): stacked on small screens,
 * one row from `xl`. "stacked" (many filters): search on its own row, filters in a grid below.
 */
export function FilterBar({ search, layout = "inline", children }: { search: ReactNode; layout?: "inline" | "stacked"; children: ReactNode }) {
  if (layout === "stacked")
    return (
      <div className="flex flex-col gap-2">
        {search}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{children}</div>
      </div>
    );
  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
      {search}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:shrink-0">{children}</div>
    </div>
  );
}
