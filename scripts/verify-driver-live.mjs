// Real password-authenticated browser/API checks against explicit Phase 4 DEMO
// records. No mocked requests, Google impersonation, or privileged browser keys.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import sharp from "sharp";
const base = process.env.PORTAL_TEST_URL ?? "http://localhost:3000";
const accounts = JSON.parse(await readFile("artifacts/driver-test-accounts.json", "utf8"));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const contexts = [];
const errors = [];
const result = { checks: [], reports: [], conditions: [], evidenceId: null };
const localTime = (value) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
async function command(context, action, input) {
  return context.request.post(`${base}/api/driver`, {
    headers: { origin: base },
    data: { action, input },
  });
}
async function workspace(context) {
  const r = await context.request.get(`${base}/api/driver`);
  assert.equal(r.status(), 200);
  return r.json();
}
async function select(page, label, name) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name }).click();
}
async function denied(context, input) {
  const r = await command(context, "submit", input);
  assert.equal(r.status(), 400);
  assert.match((await r.json()).error, /assignment|assigned|occurrence/i);
}
try {
  await mkdir("artifacts/phase4", { recursive: true });
  for (const a of accounts) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/driver-test-login`);
    await page.getByLabel("Email", { exact: true }).fill(a.email);
    await page.getByLabel("Password", { exact: true }).fill(a.password);
    await page.getByRole("button", { name: "Sign in as test driver" }).click();
    await page.getByRole("heading", { name: "Report delivery problems" }).waitFor();
  }
  const [a, b] = await Promise.all(contexts.map(workspace));
  assert.ok(a.isDriver && !a.isStaff && b.isDriver && !b.isStaff);
  const transfer = a.assignments.find((v) => v.order_reference === "P4-DRIVER-TRANSFER");
  const other = b.assignments.find((v) => v.order_reference === "P4-DRIVER-OTHER_DRIVER");
  assert.ok(transfer && other, "Provision explicit Phase 4 assignment fixtures first");
  const historical = new Date(Date.parse(transfer.valid_to) - 3600000).toISOString();
  const payload = {
    kind: "ATTEMPT",
    category: "CUSTOMER_UNAVAILABLE",
    occurredAt: historical,
    details: "Phase 4 live verification: the building number could not be confirmed.",
  };
  await denied(contexts[0], { ...payload, deliveryId: other.delivery_id });
  await denied(contexts[1], { ...payload, deliveryId: transfer.delivery_id });
  await denied(contexts[0], {
    ...payload,
    deliveryId: transfer.delivery_id,
    occurredAt: new Date().toISOString(),
  });
  result.checks.push("real HTTP cross-driver and reassignment-time write denial");
  const page = contexts[0].pages()[0];
  let attempt = a.reports.find((r) => r.details === payload.details);
  if (!attempt) {
    await page.getByLabel("When did it occur?", { exact: true }).fill(localTime(historical));
    await select(page, "Assigned package at that time", /P4-DRIVER-TRANSFER/);
    await page.getByLabel("What happened?", { exact: true }).fill(payload.details);
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#dddddd" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Optional private image", { exact: true })
      .setInputFiles({ name: "phase4-driver-evidence.png", mimeType: "image/png", buffer: image });
    const submitted = page.waitForResponse(
      (r) => r.url() === `${base}/api/driver` && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Submit report", exact: true }).click();
    assert.equal((await submitted).status(), 200);
    await page.getByRole("link", { name: "phase4-driver-evidence.png" }).waitFor();
    attempt = (await workspace(contexts[0])).reports.find((r) => r.details === payload.details);
  }
  assert.ok(attempt);
  // Structured input is authoritative; free text does not reclassify the report.
  assert.equal(attempt.category, payload.category);
  result.reports.push(attempt.id);
  await page.reload();
  await page.getByText(payload.details, { exact: true }).waitFor();
  let snapshot = await workspace(contexts[0]);
  const evidence = snapshot.evidence.find((e) => e.report_id === attempt.id);
  assert.ok(evidence);
  result.evidenceId = evidence.id;
  const ownImage = await contexts[0].request.get(`${base}/api/driver/evidence?id=${evidence.id}`);
  assert.equal(ownImage.status(), 200);
  assert.match(ownImage.headers()["content-type"], /image\/webp/);
  const otherImage = await contexts[1].request.get(`${base}/api/driver/evidence?id=${evidence.id}`);
  assert.ok([403, 404].includes(otherImage.status()));
  result.checks.push(
    "real driver attempt submission, reload persistence, image upload/reopen, cross-driver evidence denial",
  );
  for (let i = 0; i < 2; i++) {
    const p = contexts[i].pages()[0];
    snapshot = await workspace(contexts[i]);
    const details = `Phase 4 live verification: driver ${i + 1} congestion on the historically assigned route. No ETA is known.`;
    let condition = snapshot.reports.find((r) => r.details === details);
    if (!condition) {
      await select(p, "Report type", "Route condition");
      await p.getByLabel("When did it occur?", { exact: true }).fill(localTime(historical));
      await p.getByLabel("What happened?", { exact: true }).fill(details);
      const submitted = p.waitForResponse(
        (r) => r.url() === `${base}/api/driver` && r.request().method() === "POST",
      );
      await p.getByRole("button", { name: "Submit report", exact: true }).click();
      assert.equal((await submitted).status(), 200);
      await p.getByText(details, { exact: true }).waitFor();
      condition = (await workspace(contexts[i])).reports.find((r) => r.details === details);
    }
    assert.ok(condition);
    result.conditions.push(condition.id);
    const duplicate = await command(contexts[i], "submit", {
      kind: "CONDITION",
      category: "CONGESTION",
      occurredAt: historical,
      details,
    });
    assert.equal(duplicate.status(), 400);
    assert.match((await duplicate.json()).error, /ongoing condition/i);
    const forbidden = await command(contexts[i], "publish", { reviewId: condition.id });
    assert.equal(forbidden.status(), 400);
    assert.match((await forbidden.json()).error, /Operations access required/);
    await p.reload();
    await p.getByText(details, { exact: true }).waitFor();
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.screenshot({ path: `artifacts/phase4/driver-${i + 1}-mobile.png`, fullPage: true });
    await p.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.screenshot({ path: `artifacts/phase4/driver-${i + 1}-desktop.png`, fullPage: true });
  }
  const [finalA, finalB] = await Promise.all(contexts.map(workspace));
  assert.ok(!finalA.reports.some((r) => result.conditions[1] === r.id));
  assert.ok(!finalB.reports.some((r) => result.conditions[0] === r.id));
  assert.equal(finalA.reviews.length, 0);
  assert.equal(finalB.reviews.length, 0);
  result.checks.push(
    "real route-condition submissions, duplicate rejection, private-review isolation, no driver publication, mobile/desktop overflow",
  );
  assert.deepEqual(errors, []);
  await writeFile("artifacts/phase4/driver-live.json", JSON.stringify(result, null, 2));
  console.log("PASS: " + result.checks.join("; "));
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
