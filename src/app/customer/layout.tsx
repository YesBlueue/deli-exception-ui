import { Theme } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { DevThemePanel } from "@/shared/DevThemePanel";
import { CUSTOMER_THEME } from "@/shared/theme";

/** Customer support pages get their own nested theme, separate from the staff workspace. */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <Theme {...CUSTOMER_THEME}>
      {children}
      <DevThemePanel />
    </Theme>
  );
}
