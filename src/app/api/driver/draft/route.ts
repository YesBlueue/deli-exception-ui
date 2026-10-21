import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
import { draftApology } from "@/infrastructure/ai/apology.server";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Same-origin request required" }, { status: 403, headers });
  try {
    const { client, user } = await authenticatedClient();
    const member = await client
      .from("staff_profiles")
      .select("role,is_active")
      .eq("user_id", user.id)
      .single();
    if (!member.data?.is_active || !["ADMIN", "OPERATIONS"].includes(member.data.role))
      return NextResponse.json({ error: "Operations access required" }, { status: 403, headers });
    const { reviewId } = z.object({ reviewId: z.string().uuid() }).parse(await request.json());
    const review = await client
      .from("notification_reviews")
      .select("report_id,state")
      .eq("id", reviewId)
      .single();
    if (review.error || review.data.state !== "PREPARED")
      throw new Error("Refresh the prepared review first");
    const report = await client
      .from("driver_reports")
      .select("category,state")
      .eq("id", review.data.report_id)
      .single();
    if (report.error || report.data.state !== "RECEIVED")
      throw new Error("Condition is unavailable for drafting");
    const recent = await client
      .from("notification_reviews")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("origin", "GROQ")
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (recent.error) throw new Error(recent.error.message);
    if ((recent.count ?? 0) >= 5) throw new Error("Please wait a minute before drafting again");
    // Structured category and cautious uncertainty only; no raw report, notes, PII,
    // addresses, recipient identities, or assignment information goes to Groq.
    const draft = await draftApology({
      category: report.data.category,
      description:
        "A driver-reported route condition may delay delivery. Its extent and delivery timing are unconfirmed. Draft a short cautious portal update; do not state that delivery will succeed or that an ETA exists.",
      status: "POTENTIAL_DELAY_UNCONFIRMED",
    });
    const saved = await client.rpc("driver_command", {
      command: "prepare",
      input: {
        reportId: review.data.report_id,
        expectedReviewId: reviewId,
        body: draft.text,
        origin: "GROQ",
        model: draft.model,
      },
    });
    if (saved.error) throw new Error(saved.error.message);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Draft unavailable; use the template or compose manually",
      },
      { status: 400, headers },
    );
  }
}
