import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionClient } from "@/infrastructure/supabase/session.server";
import { AppShell } from "@/features/operations-shell/components/AppShell";
import { DevThemePanel } from "@/shared/DevThemePanel";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/shared/ui/patterns";
import { Button } from "@/shared/ui/button";
export default async function OperationsLayout({ children }: { children: ReactNode }) {
  const client = await sessionClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  const member = await client
    .from("staff_profiles")
    .select("role,is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (member.error) throw new Error("Unable to verify staff membership. Please retry.");
  if (!member.data?.is_active || !["ADMIN", "OPERATIONS"].includes(member.data.role))
    return (
      <main className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={ShieldAlert}
          titleAs="h1"
          title="Operations access required"
          description="An administrator must assign this Google account an active staff membership."
          action={
            <Button asChild variant="outline">
              <Link href="/customer/complaint">Open customer portal</Link>
            </Button>
          }
        />
      </main>
    );
  return (
    <>
      <AppShell>{children}</AppShell>
      <DevThemePanel />
    </>
  );
}
