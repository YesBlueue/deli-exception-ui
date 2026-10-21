import type { ReactNode } from "react";
import { AppShell } from "@/features/operations-shell/components/AppShell";
import { DevThemePanel } from "@/shared/DevThemePanel";

/** Operations workspace pages share the staff shell; customer pages live outside this group. */
export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <DevThemePanel />
    </>
  );
}
