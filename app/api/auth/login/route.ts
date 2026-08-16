import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
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