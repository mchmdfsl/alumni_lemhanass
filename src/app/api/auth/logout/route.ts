
import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
import { alumniSessionCookie } from "@/lib/alumni-session";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function POST() {
  const actor = await getAdminActor().catch(() => null);
  if (actor) {
    try { await writeAdminAudit(actor, "logout", {}); }
    catch (error) { console.error("Gagal mencatat logout admin:", error); }
  }
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
