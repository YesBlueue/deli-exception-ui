import "server-only";
import sharp from "sharp";
export async function prepareEvidence(bytes: Buffer, claimedType: string) {
  if (
    !bytes.length ||
    bytes.length > 2097152 ||
    !["image/jpeg", "image/png", "image/webp"].includes(claimedType)
  )
    throw new Error("Upload a JPEG, PNG or WebP image up to 2 MB");
  const image = sharp(bytes, { limitInputPixels: 25000000, animated: false });
  const metadata = await image.metadata();
  const formatType = (
    { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>
  )[metadata.format ?? ""];
  if (!formatType || formatType !== claimedType)
    throw new Error("Image contents do not match the file type");
  const output = await image
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  if (output.length > 2097152) throw new Error("Image is too large after processing");
  return output;
}
