import Image from "next/image";
import { Text } from "@radix-ui/themes";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

export const PRODUCT_NAME = "ResolveMate";

/**
 * The ResolveMate logo and name, with an optional label for the portal (e.g. "Seller updates").
 * The label is hidden on phones to leave room for the header navigation.
 */
export function ProductMark({ section, compact = false }: { section?: string; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Image
        src="/brand/resolvemate-logo.png"
        alt=""
        width={408}
        height={160}
        priority
        className="h-7 w-auto shrink-0"
      />
      <Text size={compact ? "2" : "3"} weight="bold" className="whitespace-nowrap">
        {PRODUCT_NAME}
      </Text>
      {section && (
        <Text size="2" color="gray" className="hidden whitespace-nowrap border-l pl-2 sm:inline">
          {section}
        </Text>
      )}
    </span>
  );
}

/** Icon and name for a page that is not branded as ResolveMate (legacy demo storefront). */
export function BrandMark({ icon: Icon, name }: { icon: LucideIcon; name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-5 text-primary" aria-hidden />
      <Text size="3" weight="bold">
        {name}
      </Text>
    </span>
  );
}

/**
 * Frame for customer-facing pages, which do not use the staff shell:
 * brand header, optional notice banner, a centered single column and a footer.
 */
export function SiteShell({
  brand,
  headerAside,
  banner,
  footer,
  width = "md",
  children,
}: {
  brand: ReactNode;
  headerAside?: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
  /** sm 32rem (single form), md 48rem (reading column), lg 64rem (lists). */
  width?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const column = cn(
    "mx-auto w-full px-4",
    { sm: "max-w-lg", md: "max-w-3xl", lg: "max-w-5xl" }[width],
  );
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className={cn(column, "flex min-h-14 items-center gap-2 py-3")}>
          {brand}
          {headerAside && <div className="ml-auto">{headerAside}</div>}
        </div>
      </header>
      {banner && (
        <div className="border-b border-demo/20 bg-demo-soft px-4 py-2 text-center text-xs text-demo">
          {banner}
        </div>
      )}
      <main className={cn(column, "flex-1 py-8 sm:py-10")}>{children}</main>
      {footer && (
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          <div className={column}>{footer}</div>
        </footer>
      )}
    </div>
  );
}
