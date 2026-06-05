import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import { s3Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    await connectMongo();
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    if (!user || !["Admin", "Subject Editor", "Staff"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Unauthorized role" }, { status: 403 });
    }

    const { fileName, fileType, articleSlug, editionSlug } = await request.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing file metadata" }, { status: 400 });
    }

    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    
    let s3Key;
    if (articleSlug && editionSlug) {
      s3Key = `uploads/editions/${editionSlug}/${articleSlug}/${safeFileName}`;
    } else {
      s3Key = `uploads/editor/${safeFileName}`;
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL}/${s3Key}`;

    return NextResponse.json({ success: true, presignedUrl, url: publicUrl });
  } catch (error) {
    console.error("Upload Image Presigned URL Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
