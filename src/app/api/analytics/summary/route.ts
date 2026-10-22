import {
  analyticsStaff,
  loadAnalytics,
  analyticsFailure,
  AnalyticsError,
} from "@/infrastructure/portal/analytics.server";
import { summarizeAnalytics } from "@/infrastructure/ai/analytics.server";
// Best-effort per-process throttle; not a distributed production quota.
const recent = new Map<string, number>();
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return analyticsFailure(new AnalyticsError("Same-origin request required", 403));
  try {
    const { client, user } = await analyticsStaff();
    const now = Date.now();
    for (const [id, time] of recent) if (now - time >= 60000) recent.delete(id);
    if (recent.has(user.id))
      throw new AnalyticsError("Please wait a minute before generating another summary", 429);
    recent.set(user.id, now);
    const data = await loadAnalytics(client, new URL(request.url).searchParams);
    try {
      return Response.json(await summarizeAnalytics(data), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch {
      throw new AnalyticsError(
        "Groq summary unavailable. Check server configuration or retry later. Calculated insights remain available.",
        503,
      );
    }
  } catch (error) {
    return analyticsFailure(error);
  }
}
