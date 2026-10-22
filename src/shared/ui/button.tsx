import * as React from "react";
import { Button as ThemeButton, IconButton } from "@radix-ui/themes";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/utils";

/**
 * Class recipe kept for shadcn primitives that style non-button elements as buttons
 * (calendar, pagination). Application code uses <Button>, which renders Radix Themes.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-cta text-cta-foreground shadow hover:bg-cta/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

type Variant = NonNullable<ButtonProps["variant"]>;
type Size = NonNullable<ButtonProps["size"]>;

/**
 * 60-30-10: `default` is the orange call to action; every other variant stays neutral gray so
 * orange keeps meaning "the main thing to do here". Navy (accent) shows through focus and links.
 */
const THEME_VARIANT = {
  default: { variant: "solid", color: "orange" },
  destructive: { variant: "solid", color: "red" },
  outline: { variant: "outline", color: "gray", highContrast: true },
  secondary: { variant: "soft", color: "gray", highContrast: true },
  ghost: { variant: "ghost", color: "gray", highContrast: true },
} as const satisfies Record<Exclude<Variant, "link">, object>;

const THEME_SIZE = { default: "2", sm: "1", lg: "3", icon: "2" } as const satisfies Record<Size, string>;

const ICON_CLASSES = "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, color: _color, ...props }, ref) => {
    const v = variant ?? "default";
    const s = size ?? "default";
    if (v === "link") {
      // Radix Themes has no link-styled button; keep a navy text button.
      return <button ref={ref} className={cn(buttonVariants({ variant: "link", size: s }), "h-auto", className)} {...props} />;
    }
    // highContrast is only typed for some Radix variants; the combinations above are all valid at runtime.
    const themeProps = { ...THEME_VARIANT[v], size: THEME_SIZE[s], asChild, className: cn(ICON_CLASSES, className) } as React.ComponentProps<typeof ThemeButton>;
    if (s === "icon") return <IconButton ref={ref} {...(themeProps as React.ComponentProps<typeof IconButton>)} {...props} />;
    return <ThemeButton ref={ref} {...themeProps} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
