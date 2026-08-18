import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  getGoogleOAuthConfig,
  getGoogleUserInfo,
  normalizeNextPath,
} from "@/lib/googleOAuth";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/session";

function getAdminEmails() {
  return process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [];
}

function expireOAuthCookie(response, name) {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request) {
  const callbackUrl = new URL(request.url);
  const loginUrl = new URL("/staff/login", request.url);

  try {
    const code = callbackUrl.searchParams.get("code");
    const state = callbackUrl.searchParams.get("state");
    const storedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
    const nextPath = normalizeNextPath(request.cookies.get(GOOGLE_OAUTH_NEXT_COOKIE)?.value);

    if (!code || !state || !storedState || state !== storedState) {
      loginUrl.searchParams.set("error", "oauth_state");
      return NextResponse.redirect(loginUrl);
    }

    const config = getGoogleOAuthConfig(request.url);
    const tokens = await exchangeGoogleCode({ code, ...config });
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    const email = googleUser.email?.toLowerCase();

    if (!email) {
      loginUrl.searchParams.set("error", "missing_email");
      return NextResponse.redirect(loginUrl);
    }

    if (googleUser.verified_email !== true) {
      loginUrl.searchParams.set("error", "unverified_email");
      return NextResponse.redirect(loginUrl);
    }

    await connectMongo();
    const user = await User.findOne({ email });

    if (!user) {
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    const updateData = {
      name: user.name && user.name !== "New User" ? user.name : googleUser.name,
      avatarUrl: user.avatarUrl || googleUser.picture,
    };

    if (getAdminEmails().includes(email) && user.role !== "Admin") {
      updateData.role = "Admin";
    }

    await User.updateOne({ _id: user._id }, { $set: updateData });

    const sessionToken = createSessionToken({
      userId: user._id.toString(),
      email,
    });

    const response = NextResponse.redirect(new URL(nextPath, request.url));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    expireOAuthCookie(response, GOOGLE_OAUTH_STATE_COOKIE);
    expireOAuthCookie(response, GOOGLE_OAUTH_NEXT_COOKIE);

    return response;
  } catch (error) {
    console.error("Google OAuth Callback Error:", error);
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }
}
