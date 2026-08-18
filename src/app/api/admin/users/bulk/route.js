import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/session";

export async function POST(request) {
  try {
    await connectMongo();
    const adminUser = await getAuthenticatedUser(request);
    if (!adminUser || adminUser.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { users, role } = body;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Invalid users data" }, { status: 400 });
    }

    let createdCount = 0;

    for (const u of users) {
      if (!u.email) continue;
      
      const existingUser = await User.findOne({ email: u.email });
      if (existingUser) {
        continue;
      } else {
        await User.create({
          email: u.email,
          role: role || "Staff",
          name: u.name || "New User",
          managedSubjects: [],
        });
        createdCount++;
      }
    }

    return NextResponse.json({ success: true, count: createdCount });
  } catch (error) {
    console.error("Admin Bulk User Create Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
