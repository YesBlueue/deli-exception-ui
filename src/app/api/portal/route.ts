import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
import type { Json } from "@/infrastructure/supabase/types";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const { client, user } = await authenticatedClient();
    const tables = [
      "staff_profiles",
      "seller_users",
      "delivery_jobs",
      "sellers",
      "delivery_exceptions",
      "complaints",
      "complaint_replies",
      "delivery_events",
      "exception_notes",
      "report_history",
      "seller_portal_updates",
      "activity_logs",
      "portal_reads",
      "complaint_attachments",
      "customer_delivery_access",
    ] as const;
    const results = await Promise.all(tables.map((table) => client.from(table).select("*")));
    const failure = results.find((r) => r.error)?.error;
    if (failure) throw new Error(failure.message);
    const get = <T>(name: (typeof tables)[number]) => results[tables.indexOf(name)]!.data as T[];
    const staff = get<{ user_id: string; role: string; is_active: boolean }>("staff_profiles");
    const member = get<{ seller_id: string; user_id: string; is_active: boolean }>(
      "seller_users",
    ).find((s) => s.user_id === user.id && s.is_active);
    const sellerContext = await client.rpc("seller_exception_context");
    if (sellerContext.error) throw new Error(sellerContext.error.message);
    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: String(user.user_metadata["full_name"] ?? "Customer"),
          email: user.email ?? "",
        },
        isStaff: staff.some(
          (s) => s.user_id === user.id && s.is_active && ["ADMIN", "OPERATIONS"].includes(s.role),
        ),
        sellerId: member?.seller_id ?? null,
        customerOrderIds: get<{ delivery_job_id: string }>("customer_delivery_access").map(
          (a) => a.delivery_job_id,
        ),
        orders: get("delivery_jobs"),
        sellers: get("sellers"),
        exceptions: get("delivery_exceptions"),
        reports: get("complaints"),
        replies: get("complaint_replies"),
        events: get("delivery_events"),
        notes: get("exception_notes"),
        history: get("report_history"),
        updates: get("seller_portal_updates"),
        audit: get("activity_logs"),
        staff: get("staff_profiles"),
        reads: get("portal_reads"),
        attachments: get("complaint_attachments"),
        sellerExceptions: sellerContext.data,
      },
      { headers },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load portal data";
    return NextResponse.json(
      { error: message },
      { status: message === "Sign in required" ? 401 : 503, headers },
    );
  }
}
const schema = z.object({
  action: z.enum([
    "provision_demo",
    "submit_report",
    "seen",
    "ingest",
    "note",
    "reply",
    "report_status",
    "exception_status",
    "assign",
    "correct_category",
    "handoff",
    "seller_update",
  ]),
  input: z.record(z.unknown()).default({}),
});
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Same-origin request required" }, { status: 403, headers });
  try {
    const { client } = await authenticatedClient();
    const raw = await request.text();
    if (raw.length > 20000) throw new Error("Request is too large");
    const { action, input } = schema.parse(JSON.parse(raw));
    const { data, error } = await client.rpc("portal_command", {
      command: action,
      input: input as Json,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Sign in required" ? 401 : 400, headers },
    );
  }
}
