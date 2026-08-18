import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_NEXT_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
  normalizeNextPath,
} from "@/lib/googleOAuth";

export async function GET(request) {
  try {
    if (new URL(request.url).searchParams.has("_rsc")) {
      return NextResponse.json({ error: "Use a browser navigation to start Google login." }, { status: 400 });
    }

    const { clientId, redirectUri } = getGoogleOAuthConfig(request.url);
    const state = crypto.randomBytes(32).toString("base64url");
    const nextPath = normalizeNextPath(new URL(request.url).searchParams.get("next"));
    const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state });
    const response = NextResponse.redirect(authUrl);

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set(GOOGLE_OAUTH_NEXT_COOKIE, nextPath, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth Start Error:", error);
    return NextResponse.redirect(new URL("/staff/login?error=oauth_config", request.url));
  }
}
