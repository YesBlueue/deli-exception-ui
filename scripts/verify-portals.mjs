import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

// UI fixtures only: database authorization is exercised separately by portal_workflows.sql.
const base = process.env.PORTAL_TEST_URL ?? "http://localhost:3004";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const now = new Date().toISOString();
const orderId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const reportId = "44444444-4444-4444-8444-444444444444";
const deliveryUpdates = [];
const snapshot = {
  user: { id: userId, name: "Demo Customer", email: "customer@example.invalid" },
  isStaff: false,
  sellerId: null,
  customerOrderIds: [orderId],
  orders: [
    {
      id: orderId,
      seller_id: sellerId,
      seller_order_reference: "DEMO-001",
      status: "IN_TRANSIT",
      provenance: "DEMO",
    },
  ],
  sellers: [{ id: sellerId, name: "Lotus Home" }],
  exceptions: [],
  reports: [],
  replies: [],
  events: [],
  notes: [],
  history: [],
  updates: [],
  audit: [],
  staff: [],
  reads: [],
  attachments: [],
  sellerExceptions: [],
};
try {
  const unauthenticated = await context.request.get(`${base}/api/portal`);
  assert.equal(unauthenticated.status(), 401, "Real backend must deny unauthenticated data access");
  for (const path of ["/api/driver", "/api/delivery-updates"]) {
    assert.equal((await context.request.get(`${base}${path}`)).status(), 401);
  }
  await page.goto(`${base}/login`);
  await page.getByRole("button", { name: "Continue with Google" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mkdir("artifacts/phase3", { recursive: true });
  await page.screenshot({ path: "artifacts/phase3/google-login-mobile.png", fullPage: true });

  await page.route("**/api/delivery-updates", (route) => route.fulfill({ json: deliveryUpdates }));
  await page.route("**/api/driver", (route) => {
    const { action, input } = route.request().postDataJSON();
    assert.equal(action, "seen_update");
    deliveryUpdates.find((u) => u.id === input.id).read_at = now;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/portal", async (route) => {
    if (route.request().method() === "POST") {
      const { action, input } = route.request().postDataJSON();
      if (action === "seen") {
        snapshot.reads = [
          {
            user_id: userId,
            complaint_id: input.reportId,
            seen_at: new Date(Date.now() + 1000).toISOString(),
          },
        ];
      }
      if (action === "submit_report") {
        snapshot.reports.push({
          id: reportId,
          delivery_job_id: orderId,
          customer_user_id: userId,
          complaint_reference: "RPT-2026-000001",
          customer_description: input.description,
          category: "DELAY",
          status: "NEW",
          submitted_at: now,
        });
        snapshot.history.push({
          id: "history",
          complaint_id: reportId,
          status: "NEW",
          description: "Report submitted.",
          created_at: now,
        });
        return route.fulfill({ json: { ok: true, reportId } });
      }
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: snapshot });
  });
  await page.goto(`${base}/customer/complaint`);
  await page.getByRole("button", { name: /DEMO-001/ }).click();
  await page.getByLabel("Describe the issue").fill("My order is delayed and I need an update.");
  await page.getByRole("button", { name: "Submit report", exact: true }).click();
  await page.getByText("Report saved. Your status and replies will appear below.").waitFor();
  await page.getByText("RPT-2026-000001", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "artifacts/phase3/customer-report-mobile.png", fullPage: true });

  snapshot.reports[0].status = "IN_REVIEW";
  snapshot.replies.push({
    id: "reply",
    complaint_id: reportId,
    body: "We are sorry for the delay. Please check this portal for updates.",
    created_at: now,
  });
  await page.reload();
  await page.getByText("New update", { exact: true }).waitFor();
  await page.getByRole("button", { name: "View report and replies" }).click();
  await page
    .getByText("We are sorry for the delay. Please check this portal for updates.")
    .waitFor();
  await page.getByText("New update", { exact: true }).waitFor({ state: "hidden" });
  await page.screenshot({ path: "artifacts/phase3/customer-reply-mobile.png", fullPage: true });

  // A proactive portal update is visible without a customer complaint.
  snapshot.reports = [];
  snapshot.replies = [];
  deliveryUpdates.push({
    id: "notice",
    delivery_id: orderId,
    body: "Your delivery may be delayed. Please check this portal for updates.",
    published_at: now,
    read_at: null,
  });
  await page.reload();
  await page.getByText(deliveryUpdates[0].body, { exact: true }).waitFor();
  await page.getByText("New update", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await page.getByText("New update", { exact: true }).waitFor({ state: "hidden" });
  await page.reload();
  await page.getByText(deliveryUpdates[0].body, { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Mark as read" }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "artifacts/phase3/customer-proactive-mobile.png", fullPage: true });
  deliveryUpdates.length = 0;

  snapshot.sellerId = sellerId;
  snapshot.customerOrderIds = [];
  snapshot.reports = [];
  snapshot.replies = [];
  snapshot.history = [];
  snapshot.sellerExceptions.push({
    id: "exception",
    delivery_job_id: orderId,
    order_reference: "DEMO-001",
    exception_type: "DELAY",
    status: "IN_PROGRESS",
    detected_at: now,
    provenance: "DEMO",
  });
  snapshot.updates.push({
    id: "handoff",
    seller_id: sellerId,
    delivery_job_id: orderId,
    title: "Refund information received",
    body: "A customer requested refund review. No refund has been approved or processed.",
    created_at: now,
  });
  await page.goto(`${base}/seller`);
  await page.getByText("Refund information received", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "artifacts/phase3/seller-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "artifacts/phase3/seller-desktop.png", fullPage: true });
  assert.deepEqual(errors, [], "No client runtime errors");
  console.log(
    "PASS: real unauthenticated portal/driver/updates API denial; Google login UI; customer reports/replies and complaint-independent proactive updates/unread persistence; seller handoff UI; 390px overflow checks. Authenticated UI used explicit fixtures, not live sessions.",
  );
} finally {
  await browser.close();
}
