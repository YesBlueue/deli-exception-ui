import { Callout, Text } from "@radix-ui/themes";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

import { Label } from "@/shared/ui/label";

/** One form control with its label, optional hint below, and an inline error. */
export function Field({ label, htmlFor, hint, error, errorId, children }: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  errorId?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label {...(htmlFor && { htmlFor })}>{label}</Label>
      {children}
      {hint && <Text as="p" size="1" color="gray">{hint}</Text>}
      {error && <Text as="p" size="1" color="red" {...(errorId && { id: errorId })}>{error}</Text>}
    </div>
  );
}

const NOTICE = {
  error: { color: "red", Icon: AlertCircle },
  warning: { color: "yellow", Icon: AlertTriangle },
  info: { color: "indigo", Icon: Info },
  success: { color: "green", Icon: CheckCircle2 },
} as const;

/**
 * Message block for form results and page-level notes. Pass `role="alert"` for errors and
 * `role="status"` for confirmations so screen readers announce them.
 */
export function Notice({ tone = "info", role, title, children, className }: {
  tone?: keyof typeof NOTICE;
  role?: "alert" | "status";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { color, Icon } = NOTICE[tone];
  return (
    <Callout.Root color={color} variant="surface" size="1" {...(role && { role })} {...(className && { className })}>
      <Callout.Icon><Icon className="size-4" /></Callout.Icon>
      {title && <Callout.Text weight="medium">{title}</Callout.Text>}
      {children && <Callout.Text>{children}</Callout.Text>}
    </Callout.Root>
  );
}
