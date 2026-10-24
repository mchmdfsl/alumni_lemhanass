
import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookie,
  verifyAdminCredentials,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  createAlumniSessionToken,
  alumniSessionCookie,
} from "@/lib/alumni-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !identifier ||
      !password ||
      identifier.length > 254 ||
      Buffer.byteLength(password, "utf8") > 1024
    ) {
      return NextResponse.json(
        { error: "Email/ID alumni dan password wajib diisi." },
        { status: 400 },
      );
    }

    // 1. Coba autentikasi admin terlebih dahulu.
    let isAdmin = false;

    try {
      isAdmin = verifyAdminCredentials(identifier, password);
    } catch (error) {
      console.error("Konfigurasi login admin bermasalah:", error);
      return NextResponse.json(
        { error: "Konfigurasi autentikasi admin belum lengkap." },
        { status: 503 },
      );
    }

    if (isAdmin) {
      const response = NextResponse.json({
        ok: true,
        role: "admin",
      });

      response.cookies.set(
        alumniSessionCookie.name,
        "",
        { ...alumniSessionCookie, maxAge: 0 },
      );

      response.cookies.set(
        sessionCookie.name,
        createSessionToken(),
        sessionCookie,
      );

      return response;
    }

    // 2. Jika bukan admin, periksa akun alumni.
    const sql = db();

    const [account] = await sql`
  SELECT
    aa.id AS "accountId",
    aa.alumni_id AS "alumniId",
    aa.password_hash AS "passwordHash"
  FROM alumni_accounts aa
  INNER JOIN alumni a ON a.id = aa.alumni_id
  WHERE
    (
      lower(aa.email) = lower(${identifier})
      OR a.nomor_alumni = ${identifier}
    )
    AND aa.is_active = TRUE
    AND a.status = 'Terverifikasi'
  LIMIT 1
`;
    if (!account) {
      return NextResponse.json(
        { error: "Email/ID alumni atau password salah, atau akun belum aktif." },
        { status: 401 },
      );
    }

    const passwordValid = await verifyPassword(
      password,
      account.passwordHash,
    );

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Email/ID alumni atau password salah." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      role: "alumni",
    });

    response.cookies.set(
      sessionCookie.name,
      "",
      { ...sessionCookie, maxAge: 0 },
    );

    response.cookies.set(
      alumniSessionCookie.name,
      createAlumniSessionToken(
        Number(account.accountId),
        Number(account.alumniId),
      ),
      alumniSessionCookie,
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);

    return NextResponse.json(
      { error: "Login gagal diproses oleh server." },
      { status: 500 },
    );
  }
}
