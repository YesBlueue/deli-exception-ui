import { Text } from "@radix-ui/themes";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

/** Logo mark and product name for customer-facing pages. */
export function BrandMark({ icon: Icon, name }: { icon: LucideIcon; name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-5 text-primary" aria-hidden />
      <Text size="3" weight="bold">{name}</Text>
    </span>
  );
}

/**
 * Frame for customer-facing pages, which do not use the staff shell:
 * brand header, optional notice banner, a centered single column and a footer.
 */
export function SiteShell({ brand, headerAside, banner, footer, width = "md", children }: {
  brand: ReactNode;
  headerAside?: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md";
  children: ReactNode;
}) {
  const column = cn("mx-auto w-full px-4", width === "sm" ? "max-w-lg" : "max-w-2xl");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className={cn(column, "flex min-h-14 items-center gap-2 py-3")}>
          {brand}
          {headerAside && <div className="ml-auto">{headerAside}</div>}
        </div>
      </header>
      {banner && <div className="border-b border-demo/20 bg-demo-soft px-4 py-2 text-center text-xs text-demo">{banner}</div>}
      <main className={cn(column, "flex-1 py-8 sm:py-10")}>{children}</main>
      {footer && (
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          <div className={column}>{footer}</div>
        </footer>
      )}
    </div>
  );
}
