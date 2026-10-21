import { NextResponse } from "next/server";
import { prepareEvidence } from "@/infrastructure/portal/evidence.server";
import { z } from "zod";
import { authenticatedClient } from "@/infrastructure/supabase/session.server";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    const { client, user } = await authenticatedClient();
    if (Number(request.headers.get("content-length") ?? 0) > 2300000)
      throw new Error("Each image must be 2 MB or smaller");
    const form = await request.formData();
    const reportId = z.string().uuid().parse(form.get("reportId"));
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 2097152
    )
      throw new Error("Upload a JPEG, PNG or WebP image up to 2 MB");
    const report = await client
      .from("complaints")
      .select("id,customer_user_id")
      .eq("id", reportId)
      .single();
    if (report.error || report.data.customer_user_id !== user.id)
      throw new Error("Report access denied");
    const bytes = await prepareEvidence(Buffer.from(await file.arrayBuffer()), file.type);
    const path = `${user.id}/${reportId}/${crypto.randomUUID()}.webp`;
    const upload = await client.storage
      .from("report-evidence")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const saved = await client.rpc("register_evidence", {
      report_id: reportId,
      path,
      filename: file.name.slice(0, 200),
      mime: "image/webp",
      size_bytes: bytes.length,
    });
    if (saved.error)
      throw new Error(
        `Report saved, but this attachment could not be registered: ${saved.error.message}`,
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Evidence upload failed" },
      { status: 400 },
    );
  }
}
export async function GET(request: Request) {
  try {
    const { client } = await authenticatedClient();
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    const evidence = await client
      .from("complaint_attachments")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (evidence.error)
      return NextResponse.json({ error: "Evidence unavailable" }, { status: 404 });
    const signed = await client.storage
      .from("report-evidence")
      .createSignedUrl(evidence.data.storage_path, 60);
    if (signed.error) throw new Error("Unable to authorize evidence download");
    return NextResponse.redirect(signed.data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Evidence access denied" }, { status: 403 });
  }
}
