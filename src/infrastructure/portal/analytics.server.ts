import "server-only";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
import {
  calculateAnalytics,
  companyDate,
  type AnalyticsInput,
} from "@/core/domain/complaint-analytics";
import { CATEGORY_LABELS } from "@/core/domain/exception-rules";

export class AnalyticsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const schema = z
  .object({
    period: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .default(() => companyDate()),
    seller: z.union([z.literal(""), z.string().uuid()]).default(""),
    category: z
      .string()
      .refine((v) => !v || Object.hasOwn(CATEGORY_LABELS, v))
      .default(""),
    status: z.enum(["", "NEW", "IN_REVIEW", "WAITING_FOR_SELLER", "RESOLVED"]).default(""),
    bucket: z.union([z.literal(""), z.string().datetime()]).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();
export async function analyticsStaff() {
  const { client, user } = await authenticatedClient();
  const result = await client
    .from("staff_profiles")
    .select("role,is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) throw new AnalyticsError("Unable to verify operations access", 503);
  if (!result.data?.is_active || !["ADMIN", "OPERATIONS"].includes(result.data.role))
    throw new AnalyticsError("Operations access required", 403);
  return { client, user };
}
/** Metadata only. Page every table so the Data API row limit cannot silently truncate totals.
 * Bounded server aggregation avoids a schema change for the hackathon dataset.
 * Move aggregation to a guarded database function before large-data rollout.
 */
export async function loadAnalytics(
  client: Awaited<ReturnType<typeof analyticsStaff>>["client"],
  params: URLSearchParams,
) {
  const parsed = schema.safeParse(Object.fromEntries(params));
  if (!parsed.success) throw new AnalyticsError("Invalid analytics filters", 400);
  const selectors = {
    reports: [
      "complaints",
      "id,complaint_reference,submitted_at,category,status,delivery_job_id,exception_id",
    ],
    orders: ["delivery_jobs", "id,seller_id,provenance"],
    sellers: ["sellers", "id,name"],
    replies: ["complaint_replies", "id,complaint_id,created_at"],
    history: ["report_history", "id,complaint_id,status,description,created_at"],
  } as const;
  const input: Partial<AnalyticsInput> = {};
  await Promise.all(
    Object.entries(selectors).map(async ([key, [table, columns]]) => {
      const rows: unknown[] = [];
      let cursor: string | undefined;
      for (;;) {
        let query = client.from(table).select(columns).order("id").limit(500);
        if (cursor) query = query.gt("id", cursor);
        const result = await query;
        if (result.error || !result.data)
          throw new AnalyticsError("Analytics data unavailable. Retry later.", 503);
        if (!result.data.length) break;
        rows.push(...result.data);
        if (rows.length > 20000)
          throw new AnalyticsError(
            "Dataset exceeds the analytics limit. Database aggregation is required; no partial totals are shown.",
            503,
          );
        cursor = (result.data.at(-1) as unknown as { id: string }).id;
      }
      Object.assign(input, { [key]: rows });
    }),
  );
  try {
    return calculateAnalytics(input as AnalyticsInput, parsed.data, Date.now());
  } catch {
    throw new AnalyticsError("Choose a valid current or past reporting date", 400);
  }
}
export function analyticsFailure(error: unknown) {
  const status =
    error instanceof AnalyticsError
      ? error.status
      : error instanceof Error && error.message === "Sign in required"
        ? 401
        : 503;
  return Response.json(
    {
      error:
        error instanceof AnalyticsError
          ? error.message
          : status === 401
            ? "Sign in required"
            : "Analytics unavailable. Please retry.",
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
