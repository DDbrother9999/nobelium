import crypto from "node:crypto";
import connectMongo from "@/lib/mongodb";
import User from "@/models/User";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Please define SESSION_SECRET in .env.dev");
  }
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long");
  }
  return secret;
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  return `${encodedBody}.${sign(encodedBody)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const [encodedBody, signature] = token.split(".");
  if (!encodedBody || !signature) return null;

  const expectedSignature = sign(encodedBody);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedBody));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export async function getAuthenticatedUser(request) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(session);
  if (!payload?.email) return null;

  await connectMongo();

  const query = payload.userId
    ? { _id: payload.userId, email: payload.email }
    : { email: payload.email };

  return User.findOne(query);
}

export function getSessionCookieOptions() {
  return {
    maxAge: SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  };
}
