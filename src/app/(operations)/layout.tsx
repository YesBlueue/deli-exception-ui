import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionClient } from "@/infrastructure/supabase/session.server";
import { AppShell } from "@/features/operations-shell/components/AppShell";
import Link from "next/link";
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
      <main className="mx-auto max-w-lg space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Operations access required</h1>
        <p className="text-sm text-muted-foreground">
          An administrator must assign this Google account an active staff membership.
        </p>
        <Link href="/customer/complaint" className="text-primary">
          Open customer portal
        </Link>
      </main>
    );
  return <AppShell>{children}</AppShell>;
}
