import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Edition from "@/models/Edition";
import User from "@/models/User";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function PATCH(request, { params }) {
  try {
    const session = request.cookies.get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedClaims = await adminAuth.verifySessionCookie(session);
    await connectMongo();
    
    const user = await User.findOne({ firebaseUid: decodedClaims.uid });
    if (!user || (user.role !== "Admin" && user.role !== "Subject Editor")) {
      return NextResponse.json({ error: "Forbidden: Admins or Subject Editors only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { releaseDate } = body;

    const edition = await Edition.findById(id);
    if (!edition) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    if (releaseDate !== undefined) {
      edition.releaseDate = releaseDate ? new Date(releaseDate) : null;
    }

    await edition.save();

    return NextResponse.json({ success: true, edition });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
