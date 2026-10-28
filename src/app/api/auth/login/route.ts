
import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookie,
  verifyAdminCredentials,
  verifySuperAdminCredentials,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/password";
import {
  createAlumniSessionToken,
  alumniSessionCookie,
} from "@/lib/alumni-session";

export const runtime = "nodejs";

async function logAdminLogin(actor: string, role: "admin" | "super_admin") {
  try {
    await db()`
      INSERT INTO admin_audit_log (action, actor, details)
      VALUES (${"login"}, ${actor.slice(0, 254)}, ${JSON.stringify({ actorRole: role })}::jsonb)
    `;
  } catch (error) {
    // Audit logging must not prevent a valid login if the log table is temporarily unavailable.
    console.error("Gagal mencatat login admin:", error);
  }
}

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

    const rateLimit = await checkRateLimit(request, "login", {
      identity: identifier,
      ipLimit: 60,
      identityLimit: 10,
      windowSeconds: 15 * 60,
    });
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    // Kredensial Super Admin dari ENV selalu diperiksa lebih dahulu.
    try {
      if (verifySuperAdminCredentials(identifier, password)) {
        const response = NextResponse.json({ ok: true, role: "super_admin" });
        response.cookies.set(alumniSessionCookie.name, "", { ...alumniSessionCookie, maxAge: 0 });
        response.cookies.set(sessionCookie.name, createSessionToken("super_admin"), sessionCookie);
        await logAdminLogin(process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL || "super-admin", "super_admin");
        return response;
      }
    } catch (error) {
      console.error("Konfigurasi Super Admin bermasalah:", error);
      return NextResponse.json({ error: "Konfigurasi autentikasi admin belum lengkap." }, { status: 503 });
    }

    // Akun Admin database yang dibuat oleh Super Admin.
    try {
      const [databaseAdmin] = await db()`
        SELECT id, username, email, password_hash AS "passwordHash"
        FROM admin_users
        WHERE is_active = TRUE
          AND (lower(username) = lower(${identifier}) OR lower(email) = lower(${identifier}))
        LIMIT 1
      `;
      if (databaseAdmin && await verifyPassword(password, databaseAdmin.passwordHash)) {
        const response = NextResponse.json({ ok: true, role: "admin" });
        response.cookies.set(alumniSessionCookie.name, "", { ...alumniSessionCookie, maxAge: 0 });
        response.cookies.set(sessionCookie.name, createSessionToken("admin", Number(databaseAdmin.id)), sessionCookie);
        await logAdminLogin(String(databaseAdmin.username || databaseAdmin.email || "admin"), "admin");
        return response;
      }
    } catch (error) {
      console.error("Pemeriksaan akun admin database gagal:", error);
    }

    // Akun Admin lama dari ENV tetap didukung.
    try {
      if (verifyAdminCredentials(identifier, password)) {
        const response = NextResponse.json({ ok: true, role: "admin" });
        response.cookies.set(alumniSessionCookie.name, "", { ...alumniSessionCookie, maxAge: 0 });
        response.cookies.set(sessionCookie.name, createSessionToken("admin"), sessionCookie);
        await logAdminLogin(process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "admin", "admin");
        return response;
      }
    } catch (error) {
      console.error("Konfigurasi Admin bermasalah:", error);
      return NextResponse.json({ error: "Konfigurasi autentikasi admin belum lengkap." }, { status: 503 });
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
      lower(coalesce(nullif(trim(aa.email), ''), nullif(trim(a.email), ''), '')) = lower(${identifier})
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
