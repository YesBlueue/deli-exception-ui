import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
import { draftApology } from "@/infrastructure/ai/apology.server";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    const { client, user } = await authenticatedClient();
    const member = await client
      .from("staff_profiles")
      .select("role,is_active")
      .eq("user_id", user.id)
      .single();
    if (!member.data?.is_active || !["ADMIN", "OPERATIONS"].includes(member.data.role))
      return NextResponse.json({ error: "Operations access required" }, { status: 403 });
    const { reportId } = z.object({ reportId: z.string().uuid() }).parse(await request.json());
    const report = await client
      .from("complaints")
      .select("category,customer_description,status")
      .eq("id", reportId)
      .single();
    if (report.error) throw new Error("Report not found");
    const recent = await client
      .from("apology_drafts")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", user.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (recent.error) throw new Error(recent.error.message);
    if ((recent.count ?? 0) >= 5)
      throw new Error("Please wait a minute before generating another apology.");
    const draft = await draftApology({
      category: report.data.category,
      description: report.data.customer_description,
      status: report.data.status,
    });
    const saved = await client.rpc("portal_command", {
      command: "save_draft",
      input: { reportId, text: draft.text, model: draft.model },
    });
    if (saved.error) throw new Error(saved.error.message);
    return NextResponse.json(draft, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Draft generation failed" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
