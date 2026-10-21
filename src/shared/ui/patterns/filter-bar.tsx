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

/** Search plus filter controls: stacked on small screens, a single row from `xl`. */
export function FilterBar({ search, children }: { search: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
      {search}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:shrink-0">{children}</div>
    </div>
  );
}
