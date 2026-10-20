import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookie, verifyAdminCredentials } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!identifier || !password || identifier.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: "Email/username dan password wajib diisi." }, { status: 400 });
    }
    if (!verifyAdminCredentials(identifier, password)) {
      return NextResponse.json({ error: "Email/username atau password salah." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie.name, createSessionToken(), sessionCookie);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses login.";
    const status = message.includes("wajib dikonfigurasi") ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? "Konfigurasi autentikasi server belum lengkap." : "Terjadi kesalahan server." }, { status });
  }
}
