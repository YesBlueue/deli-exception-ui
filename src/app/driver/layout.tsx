import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { sessionClient } from "@/infrastructure/supabase/session.server";
import { EmptyState } from "@/shared/ui/patterns";
import { ShieldAlert } from "lucide-react";
export default async function DriverLayout({ children }: { children: ReactNode }) {
  const client = await sessionClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  const member = await client
    .from("staff_profiles")
    .select("role,is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (member.error) throw new Error("Unable to verify driver membership");
  if (!member.data?.is_active || member.data.role !== "DELIVERY_PERSON")
    return (
      <main className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={ShieldAlert}
          title="Driver access required"
          titleAs="h1"
          description="An administrator must assign this account an active delivery staff membership."
        />
      </main>
    );
  return children;
}
