import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
import type { Json } from "@/infrastructure/supabase/types";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const { client } = await authenticatedClient();
    const { data, error } = await client.rpc("driver_workspace");
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { headers });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Same-origin request required" }, { status: 403, headers });
  try {
    const { client } = await authenticatedClient();
    const raw = await request.text();
    if (raw.length > 20000) throw new Error("Request too large");
    const { action, input } = z
      .object({
        action: z.enum([
          "submit",
          "correct",
          "prepare",
          "publish",
          "close",
          "request_correction",
          "revise",
          "seen_update",
          "demo_assignments",
        ]),
        input: z.record(z.unknown()).default({}),
      })
      .parse(JSON.parse(raw));
    const { data, error } = await client.rpc("driver_command", {
      command: action,
      input: input as Json,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { headers });
  } catch (e) {
    return fail(e);
  }
}
function fail(e: unknown) {
  const message = e instanceof Error ? e.message : "Driver workflow unavailable";
  return NextResponse.json(
    { error: message },
    { status: message === "Sign in required" ? 401 : 400, headers },
  );
}
