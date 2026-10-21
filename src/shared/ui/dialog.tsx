"use client";

import * as React from "react";
import { Dialog as ThemeDialog, IconButton } from "@radix-ui/themes";
import { X } from "lucide-react";

import { cn } from "@/shared/utils";

const Dialog = ThemeDialog.Root;
const DialogTrigger = ThemeDialog.Trigger;
const DialogClose = ThemeDialog.Close;

/** Radix Themes dialog panel with a top-right close button. Content must include a <DialogTitle>. */
const DialogContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof ThemeDialog.Content>>(
  ({ className, children, ...props }, ref) => (
    <ThemeDialog.Content ref={ref} className={cn("relative", className)} {...props}>
      {children}
      <ThemeDialog.Close>
        <IconButton variant="ghost" color="gray" size="1" className="!absolute right-4 top-4 [&_svg]:size-4" aria-label="Close">
          <X />
        </IconButton>
      </ThemeDialog.Close>
    </ThemeDialog.Content>
  ),
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof ThemeDialog.Title>>((props, ref) => (
  <ThemeDialog.Title ref={ref} size="5" mb="0" {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof ThemeDialog.Description>>((props, ref) => (
  <ThemeDialog.Description ref={ref} size="2" color="gray" {...props} />
));
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
