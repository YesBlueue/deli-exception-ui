import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toasts styled as theme panels: neutral surface, theme radius and shadow, and a colored edge
 * plus icon for the outcome (success green, error red, warning yellow, info navy).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-md border border-l-4 border-l-border bg-card p-3 text-sm text-card-foreground shadow-card font-sans",
          title: "font-medium",
          description: "mt-0.5 text-muted-foreground",
          icon: "mt-0.5 shrink-0 [&_svg]:size-4",
          success: "border-l-success [&_[data-icon]]:text-success",
          error: "border-l-critical [&_[data-icon]]:text-critical",
          warning: "border-l-medium [&_[data-icon]]:text-medium",
          info: "border-l-primary [&_[data-icon]]:text-primary",
          actionButton: "ml-auto rounded-md bg-cta px-2 py-1 text-xs font-medium text-cta-foreground",
          cancelButton: "rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
