import { adminAuth } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    
    // Validate token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    const email = decodedToken.email || "no-email@nobelium.com";
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];

    const updateData = {
      name: decodedToken.name || "Nobelium Author", 
      email, 
      avatarUrl: decodedToken.picture || ""
    };

    if (adminEmails.includes(email)) {
      updateData.role = "Admin";
    }

    // Sync to MongoDB
    await connectMongo();
    await User.findOneAndUpdate(
      { firebaseUid: decodedToken.uid },
      updateData,
      { upsert: true, new: true }
    );
    
    // Create session cookie (expires in 5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ status: "success", uid: decodedToken.uid });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
