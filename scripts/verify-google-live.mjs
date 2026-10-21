import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "playwright";

// Real participant-driven OAuth only. Never intercept requests or save browser state.
nextEnv.loadEnvConfig(process.cwd(), true);
const project = "gvutlnfsiytnayvdxqyb";
assert.equal(
  process.env.PORTAL_LIVE_PROJECT,
  project,
  "Confirm PORTAL_LIVE_PROJECT before running",
);
const base = new URL(process.env.PORTAL_TEST_URL ?? "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "Use a local application origin");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(new URL(url).hostname, `${project}.supabase.co`, "Unexpected database target");
assert.ok(key && !key.startsWith("sb_secret_"), "Public Supabase key required");

const report = {
  startedAt: new Date().toISOString(),
  project,
  origin: base.origin,
  checks: [],
  limitations: [
    "One participant account; cross-customer isolation requires a second participant.",
    "Unassociated-ID probe uses a fresh nonexistent UUID, not another customer's order.",
    "No report creation, evidence, staff/seller workflow, Gemini, or Phase 4 completion claim.",
  ],
};
const record = (check) => {
  report.checks.push(check);
  console.log(`PASS: ${check}`);
};
const browser = await chromium.launch({ channel: "chrome", headless: false });
const cancel = () => void browser.close();
process.once("SIGINT", cancel);
const context = await browser.newContext();
const page = await context.newPage();
const deadline = Date.now() + 15 * 60_000;
async function until(check, stage) {
  while (Date.now() < deadline) {
    assert.ok(browser.isConnected() && !page.isClosed(), "Verification browser closed early");
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ${stage}`);
}
async function snapshot() {
  const response = await context.request.get(new URL("/api/portal", base).href);
  if (response.status() === 401) return null;
  assert.equal(response.status(), 200, "Portal API unavailable");
  return response.json();
}
let stage = "unauthenticated boundary";
try {
  assert.equal((await context.request.get(new URL("/api/portal", base).href)).status(), 401);
  record("Fresh browser has no authenticated portal access");
  let callbackSeen = false;
  page.on("request", (request) => {
    const target = new URL(request.url());
    if (
      target.origin === base.origin &&
      target.pathname === "/auth/callback" &&
      target.searchParams.has("code")
    )
      callbackSeen = true;
  });
  await page.goto(new URL("/login", base).href);
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  console.log(
    "ACTION: Complete Google sign-in in the opened Chrome window. Do not share credentials here.",
  );
  stage = "participant Google callback";
  await until(
    async () =>
      callbackSeen &&
      page.url() === new URL("/customer/complaint", base).href &&
      !!(await snapshot()),
    stage,
  );
  record("Real OAuth code callback reaches authenticated customer portal");

  const client = createServerClient(url, key, {
    cookies: {
      getAll: async () =>
        (await context.cookies(base.origin)).map(({ name, value }) => ({ name, value })),
      setAll: () => {},
    },
  });
  const { data, error } = await client.auth.getUser();
  assert.equal(error, null, "Live user verification failed");
  assert.ok(data.user?.identities?.some((identity) => identity.provider === "google"));
  record("Supabase verifies a Google identity from the browser session");
  const initial = await snapshot();
  assert.equal(initial.user.id, data.user.id);
  assert.equal(initial.isStaff, false, "Use a customer account without staff privileges");
  assert.equal(initial.sellerId, null, "Use a customer account without seller membership");
  await page.reload();
  await page.getByRole("heading", { name: "Your orders and reports" }).waitFor();
  assert.equal((await snapshot()).user.id, data.user.id);
  record("Authenticated session survives a full page reload");

  console.log(
    "ACTION: If shown, choose Load my demo orders. Leave the customer portal open for access checks.",
  );
  stage = "account-associated demo orders";
  await until(async () => (await snapshot())?.customerOrderIds.length > 0, stage);
  const current = await snapshot();
  const access = await client
    .from("customer_delivery_access")
    .select("customer_user_id,delivery_job_id");
  assert.equal(access.error, null, "Association query failed");
  assert.ok(access.data.length > 0);
  assert.ok(access.data.every((row) => row.customer_user_id === data.user.id));
  const allowed = new Set(access.data.map((row) => row.delivery_job_id));
  assert.deepEqual([...current.customerOrderIds].sort(), [...allowed].sort());
  assert.equal(current.orders.length, allowed.size);
  assert.ok(current.orders.every((order) => allowed.has(order.id) && order.provenance === "DEMO"));
  assert.ok(
    current.reports.every(
      (item) => item.customer_user_id === data.user.id && allowed.has(item.delivery_job_id),
    ),
  );
  for (const order of current.orders) {
    await page.getByRole("button").filter({ hasText: order.seller_order_reference }).click();
    await page.getByLabel("Describe the issue").waitFor();
  }
  report.orderCount = allowed.size;
  record("Portal orders match backend-owned demo associations and are selectable");

  stage = "unassociated-order denial";
  const forbiddenId = randomUUID();
  const hidden = await client.from("delivery_jobs").select("id").eq("id", forbiddenId);
  assert.equal(hidden.error, null);
  assert.deepEqual(hidden.data, []);
  const denied = await context.request.post(new URL("/api/portal", base).href, {
    headers: { Origin: base.origin },
    data: {
      action: "submit_report",
      input: { deliveryId: forbiddenId, description: "Verification: my order is delayed." },
    },
  });
  assert.equal(denied.status(), 400);
  assert.equal((await denied.json()).error, "Order access denied");
  record("Backend denies reading/submitting against a fresh unassociated order ID");

  console.log("ACTION: Access checks passed. Click Sign out in the customer portal to finish.");
  stage = "participant sign-out";
  await until(async () => !(await snapshot()), stage);
  await page.goto(new URL("/customer/complaint", base).href);
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  assert.equal(await snapshot(), null);
  record("Sign-out removes API access and customer-page reload requires login");
  report.status = "passed-with-stated-limitations";
} catch {
  // Never serialize exceptions from auth/network libraries: they may contain sensitive URLs.
  report.status = "incomplete";
  report.blockedStage = stage;
  console.error(`INCOMPLETE: ${stage}. No live workflow completion is claimed.`);
  process.exitCode = 1;
} finally {
  process.removeListener("SIGINT", cancel);
  report.finishedAt = new Date().toISOString();
  await mkdir("artifacts/phase4", { recursive: true });
  await writeFile("artifacts/phase4/google-live.json", `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
