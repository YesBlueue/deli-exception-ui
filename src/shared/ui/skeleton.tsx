import { Skeleton as ThemeSkeleton } from "@radix-ui/themes";

import { cn } from "@/shared/utils";

/** Loading placeholder; full width by default, height from `className`. */
function Skeleton({ className, color: _color, ...props }: React.ComponentProps<"span">) {
  return <ThemeSkeleton className={cn("block w-full", className)} {...props} />;
}

export { Skeleton };
