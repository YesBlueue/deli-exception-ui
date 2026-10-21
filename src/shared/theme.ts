import type { ThemeProps } from "@radix-ui/themes";

type ThemeSettings = Pick<ThemeProps, "accentColor" | "grayColor" | "radius" | "scaling" | "panelBackground" | "appearance">;

/**
 * Radix Themes settings, the single source of the app's look.
 * Tune them live with the development ThemePanel, then copy the chosen values here.
 * Avoid red/orange/amber/green accents: those colors carry priority and status meaning.
 */
export const STAFF_THEME: ThemeSettings = {
  accentColor: "indigo",
  grayColor: "auto",
  radius: "small",
  scaling: "95%",
  panelBackground: "solid",
  appearance: "light",
};

/** Customer support pages: friendlier and touch-first, separate from the staff workspace. */
export const CUSTOMER_THEME: ThemeSettings = {
  accentColor: "jade",
  grayColor: "auto",
  radius: "medium",
  scaling: "100%",
  panelBackground: "solid",
};
