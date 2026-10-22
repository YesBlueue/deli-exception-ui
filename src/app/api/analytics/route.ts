import {
  analyticsStaff,
  loadAnalytics,
  analyticsFailure,
} from "@/infrastructure/portal/analytics.server";
export async function GET(request: Request) {
  try {
    const { client } = await analyticsStaff();
    return Response.json(await loadAnalytics(client, new URL(request.url).searchParams), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return analyticsFailure(error);
  }
}
