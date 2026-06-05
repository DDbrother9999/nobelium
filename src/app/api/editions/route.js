import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Edition from "@/models/Edition";
import User from "@/models/User";
import slugify from "slugify";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function GET(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    await adminAuth.verifySessionCookie(session);
    // Any authenticated user can list editions

    await connectMongo();
    const editions = await Edition.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ editions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    await connectMongo();
    
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    if (!user || (user.role !== "Admin" && user.role !== "Subject Editor")) {
      return NextResponse.json({ error: "Forbidden: Admins or Subject Editors only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, releaseDate } = body;
    
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    let baseSlug = slugify(name, { lower: true, strict: true }) || "untitled-edition";
    let slug = baseSlug;
    let counter = 1;
    while (await Edition.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const edition = await Edition.create({
      name,
      slug,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
    });

    return NextResponse.json({ success: true, edition });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
