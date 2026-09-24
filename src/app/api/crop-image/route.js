import { NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { getAuthenticatedUser } from "@/lib/session";

const OUTPUT_FORMATS = {
  jpeg: { ext: "jpg", contentType: "image/jpeg", options: { quality: 90 } },
  png: { ext: "png", contentType: "image/png", options: {} },
  webp: { ext: "webp", contentType: "image/webp", options: { quality: 90 } },
  gif: { ext: "gif", contentType: "image/gif", options: {} },
};

function keyFromSrc(src) {
  if (typeof src !== "string") return null;
  const clean = src.split(/[?#]/)[0];
  const publicBase = `${R2_PUBLIC_URL.replace(/\/$/, "")}/`;
  const legacyBase = "/api/uploads/";

  let key = null;
  if (clean.startsWith(publicBase)) key = clean.slice(publicBase.length);
  else if (clean.startsWith(legacyBase)) key = `uploads/${clean.slice(legacyBase.length)}`;
  if (!key) return null;

  try {
    key = decodeURIComponent(key);
  } catch {
    return null;
  }
  if (key.split("/").some(segment => segment === "" || segment === "." || segment === "..")) return null;
  return key;
}

function parseCrop(crop) {
  if (!crop || typeof crop !== "object") return null;
  const values = ["x", "y", "width", "height"].map(k => Number(crop[k]));
  if (!values.every(Number.isFinite)) return null;
  const [x, y, width, height] = values;
  if (x < 0 || y < 0 || width <= 0 || height <= 0) return null;
  if (x + width > 1.001 || y + height > 1.001) return null;
  return { x, y, width, height };
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["Admin", "Subject Editor", "Staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const { src, crop } = await request.json();

    const sourceKey = keyFromSrc(src);
    if (!sourceKey) {
      return NextResponse.json({ error: "Only images uploaded to Nobelium can be cropped" }, { status: 400 });
    }

    const rect = parseCrop(crop);
    if (!rect) {
      return NextResponse.json({ error: "Invalid crop area" }, { status: 400 });
    }

    let input;
    try {
      const object = await s3Client.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: sourceKey }));
      input = Buffer.from(await object.Body.transformToByteArray());
    } catch (error) {
      if (error?.name === "NoSuchKey") {
        return NextResponse.json({ error: "Original image not found" }, { status: 404 });
      }
      throw error;
    }

    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: "Unsupported image" }, { status: 400 });
    }

    const rotated = (meta.orientation || 1) >= 5;
    const fullWidth = rotated ? meta.height : meta.width;
    const fullHeight = rotated ? meta.width : meta.height;

    const left = Math.min(fullWidth - 1, Math.round(rect.x * fullWidth));
    const top = Math.min(fullHeight - 1, Math.round(rect.y * fullHeight));
    const width = Math.max(1, Math.min(fullWidth - left, Math.round(rect.width * fullWidth)));
    const height = Math.max(1, Math.min(fullHeight - top, Math.round(rect.height * fullHeight)));

    const format = OUTPUT_FORMATS[meta.format] ? meta.format : "png";
    const output = OUTPUT_FORMATS[format];
    const cropped = await sharp(input)
      .rotate()
      .extract({ left, top, width, height })
      .toFormat(format, output.options)
      .toBuffer();

    const dir = path.posix.dirname(sourceKey);
    const baseName = path.posix
      .basename(sourceKey, path.posix.extname(sourceKey))
      .replace(/^(?:\d+-(?:crop-)?)+/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
    const targetKey = `${dir === "." ? "uploads/editor" : dir}/${Date.now()}-crop-${baseName}.${output.ext}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: targetKey,
      Body: cropped,
      ContentType: output.contentType,
    }));

    return NextResponse.json({
      success: true,
      url: `${R2_PUBLIC_URL}/${targetKey}`,
      width,
      height,
    });
  } catch (error) {
    console.error("Crop Image Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
