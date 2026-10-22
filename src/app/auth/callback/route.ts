import { NextResponse } from "next/server";
import { sessionClient } from "@/infrastructure/supabase/session.server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Fixed destination avoids open redirects and invitation-based access.
  if (code) {
    const client = await sessionClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/customer/complaint", url.origin), {
        headers: { "Cache-Control": "no-store" },
      });
    // Log only structured diagnostics; OAuth codes, tokens and provider text stay private.
    console.warn("[Auth] OAuth code exchange failed", {
      code: error.code ?? "unknown",
      status: error.status ?? 0,
    });
  }
  return NextResponse.redirect(new URL("/login?error=oauth", url.origin), {
    headers: { "Cache-Control": "no-store" },
  });
}
