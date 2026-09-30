import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Windows expire on their own, so the map is bounded in practice. This is a
// backstop for the long tail of one-off source IPs, which would otherwise
// accumulate for the lifetime of the process.
function pruneExpired(now: number): void {
  if (loginAttempts.size < 1000) return;
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}

function getClientIp(request: Request): string {
  // Caddy overwrites X-Real-IP with the real peer address (see Caddyfile), so
  // this value cannot be spoofed. X-Forwarded-For is deliberately ignored: it is
  // client-supplied, and trusting it lets an attacker mint a fresh rate-limit
  // bucket per request by rotating the header.
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    pruneExpired(now);
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 5;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  if (username !== expectedUsername || !verifyPassword(password, expectedPassword)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
