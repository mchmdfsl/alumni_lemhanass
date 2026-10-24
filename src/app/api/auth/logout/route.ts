
import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
import { alumniSessionCookie } from "@/lib/alumni-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(sessionCookie.name, "", {
    ...sessionCookie,
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(alumniSessionCookie.name, "", {
    ...alumniSessionCookie,
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
