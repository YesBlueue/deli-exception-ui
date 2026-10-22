"use client";

import * as React from "react";
import { AlertDialog as ThemeAlertDialog } from "@radix-ui/themes";

import { cn } from "@/shared/utils";
import { Button } from "@/shared/ui/button";

const AlertDialog = ThemeAlertDialog.Root;
const AlertDialogTrigger = ThemeAlertDialog.Trigger;

const AlertDialogContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ThemeAlertDialog.Content>>(
  ({ maxWidth = "480px", ...props }, ref) => <ThemeAlertDialog.Content ref={ref} maxWidth={maxWidth} {...props} />,
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-4 flex flex-col gap-2", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof ThemeAlertDialog.Title>>((props, ref) => (
  <ThemeAlertDialog.Title ref={ref} size="5" mb="0" {...props} />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof ThemeAlertDialog.Description>>(
  (props, ref) => <ThemeAlertDialog.Description ref={ref} size="2" color="gray" {...props} />,
);
AlertDialogDescription.displayName = "AlertDialogDescription";

/** Confirms and closes the dialog; the orange call to action. */
const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>((props, ref) => (
  <ThemeAlertDialog.Action>
    <Button ref={ref} {...props} />
  </ThemeAlertDialog.Action>
));
AlertDialogAction.displayName = "AlertDialogAction";

/** Closes the dialog without acting. */
const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ variant = "secondary", ...props }, ref) => (
    <ThemeAlertDialog.Cancel>
      <Button ref={ref} variant={variant} {...props} />
    </ThemeAlertDialog.Cancel>
  ),
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
