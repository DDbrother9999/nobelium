import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/session";

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, pronouns, graduationYear, bio, avatarUrl } = body;

    const updateFields = {};
    if (typeof name !== "undefined") updateFields.name = name;
    if (typeof pronouns !== "undefined") updateFields.pronouns = pronouns;
    if (typeof graduationYear !== "undefined") updateFields.graduationYear = graduationYear;
    if (typeof bio !== "undefined") updateFields.bio = bio;
    if (typeof avatarUrl !== "undefined") updateFields.avatarUrl = avatarUrl;

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: updateFields },
      { new: true }
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
