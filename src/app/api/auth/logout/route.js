import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.has(SESSION_COOKIE_NAME)) {
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
    
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
