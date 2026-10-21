import { expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { prepareEvidence } from "./evidence.server";
it("decodes real images and returns a stripped WebP file", async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  const result = await prepareEvidence(png, "image/png");
  expect((await sharp(result).metadata()).format).toBe("webp");
});
it("rejects disguised non-images and mismatched MIME types", async () => {
  await expect(
    prepareEvidence(Buffer.from("<html>not an image</html>"), "image/jpeg"),
  ).rejects.toThrow();
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  await expect(prepareEvidence(png, "image/jpeg")).rejects.toThrow("do not match");
});
it("rejects empty or oversized content before decoding", async () => {
  await expect(prepareEvidence(Buffer.alloc(0), "image/png")).rejects.toThrow("2 MB");
  await expect(prepareEvidence(Buffer.alloc(2097153), "image/png")).rejects.toThrow("2 MB");
});
