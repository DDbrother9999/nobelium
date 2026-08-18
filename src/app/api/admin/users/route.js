import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthenticatedUser } from "@/lib/session";

export async function GET(request) {
  try {
    await connectMongo();
    const adminUser = await getAuthenticatedUser(request);
    if (!adminUser || adminUser.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectMongo();
    const adminUser = await getAuthenticatedUser(request);
    if (!adminUser || adminUser.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role, managedSubjects } = body;

    if (!email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Update existing user
      existingUser.role = role;
      if (role === "Subject Editor") {
        existingUser.managedSubjects = managedSubjects || [];
      } else {
        existingUser.managedSubjects = [];
      }
      await existingUser.save();
      return NextResponse.json({ success: true, user: existingUser });
    }

    // Create new whitelisted user
    const newUser = await User.create({
      email,
      role,
      name: "New User",
      managedSubjects: role === "Subject Editor" ? (managedSubjects || []) : [],
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Admin User Create/Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectMongo();
    const adminUser = await getAuthenticatedUser(request);
    if (!adminUser || adminUser.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, role, managedSubjects } = body;

    if (!id || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    existingUser.name = name || existingUser.name;
    existingUser.email = email;
    existingUser.role = role;
    if (role === "Subject Editor") {
      existingUser.managedSubjects = managedSubjects || [];
    } else {
      existingUser.managedSubjects = [];
    }
    await existingUser.save();
    return NextResponse.json({ success: true, user: existingUser });
  } catch (error) {
    console.error("Admin User Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
