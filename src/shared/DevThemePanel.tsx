"use client";

import { ThemePanel } from "@radix-ui/themes";

/** Live theme tuning for the nearest Radix <Theme> (press T to show); never rendered in production builds. */
export function DevThemePanel() {
  if (process.env.NODE_ENV === "production") return null;
  return <ThemePanel defaultOpen={false} />;
}
