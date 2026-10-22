import { NextResponse } from "next/server";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
export async function GET() {
  try {
    const { client, user } = await authenticatedClient();
    const { data, error } = await client
      .from("customer_delivery_updates")
      .select("id,delivery_id,body,published_at,read_at")
      .eq("customer_id", user.id)
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Updates unavailable";
    return NextResponse.json(
      { error: message },
      {
        status: message === "Sign in required" ? 401 : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
