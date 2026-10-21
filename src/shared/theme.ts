import type { ThemeProps } from "@radix-ui/themes";

type ThemeSettings = Pick<ThemeProps, "accentColor" | "grayColor" | "radius" | "scaling" | "panelBackground" | "appearance">;

/**
 * Radix Themes settings, the single source of the app's look.
 * Tune them live with the development ThemePanel, then copy the chosen values here.
 * Brand 60-30-10: "indigo" and "orange" are overridden with brand navy and brand orange in
 * src/styles/globals.css; navy is the accent, orange is reserved for calls to action.
 * Avoid red/crimson/yellow/green accents: those colors carry priority and status meaning.
 */
export const STAFF_THEME: ThemeSettings = {
  accentColor: "indigo",
  grayColor: "auto",
  radius: "none",
  scaling: "90%",
  panelBackground: "solid",
  appearance: "light",
};

/** Customer support pages: same brand colors, softer corners and touch-first sizing. */
export const CUSTOMER_THEME: ThemeSettings = {
  accentColor: "indigo",
  grayColor: "auto",
  radius: "medium",
  scaling: "100%",
  panelBackground: "solid",
};
