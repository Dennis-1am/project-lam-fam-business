import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_session";
const SESSION_DAYS = 7;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: openssl rand -hex 32",
    );
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function createSessionToken(): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${body}.${sign(body)}`;
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      exp?: number;
    };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await getSession())) {
    redirect("/admin/login");
  }
}

export function verifyPassword(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}