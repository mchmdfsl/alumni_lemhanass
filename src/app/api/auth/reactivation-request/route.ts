import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = typeof body.identifier === "string" ? body.identifier.trim().slice(0, 254) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";

    if (!identifier || !password || !reason || reason.length < 5 || Buffer.byteLength(password, "utf8") > 1024) {
      return NextResponse.json({ error: "Email/nomor alumni, password akun lama, dan alasan wajib diisi." }, { status: 400 });
    }

    const limit = await checkRateLimit(request, "reactivation-request", {
      identity: identifier,
      ipLimit: 15,
      identityLimit: 5,
      windowSeconds: 15 * 60,
    });
    if (limit.limited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const [account] = await db()`
      SELECT aa.id AS "accountId", aa.alumni_id AS "alumniId",
        aa.password_hash AS "passwordHash", aa.is_active AS "isActive",
        a.status AS "alumniStatus"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE (
        lower(trim(coalesce(aa.email, ''))) = lower(trim(${identifier}))
        OR lower(trim(coalesce(a.email, ''))) = lower(trim(${identifier}))
        OR upper(trim(coalesce(a.nomor_alumni, ''))) = upper(trim(${identifier}))
      )
      ORDER BY aa.id DESC
      LIMIT 1
    `;

    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      return NextResponse.json({ error: "Data akun atau password tidak cocok. Periksa kembali kredensial akun lama." }, { status: 401 });
    }
    if (account.alumniStatus !== "Terverifikasi") {
      return NextResponse.json({ error: "Data alumni belum terverifikasi. Hubungi Admin untuk bantuan." }, { status: 409 });
    }
    if (account.isActive) {
      return NextResponse.json({ error: "Akun masih aktif. Silakan masuk melalui halaman login." }, { status: 409 });
    }

    const [created] = await db()`
      INSERT INTO alumni_account_reactivation_requests (account_id, alumni_id, reason)
      VALUES (${Number(account.accountId)}, ${Number(account.alumniId)}, ${reason})
      ON CONFLICT (account_id) WHERE status = 'Menunggu' DO NOTHING
      RETURNING id
    `;

    if (!created) {
      return NextResponse.json({ ok: true, message: "Pengajuan aktivasi kembali untuk akun ini sudah tercatat dan sedang menunggu pemeriksaan Admin." }, { status: 202 });
    }

    return NextResponse.json({
      ok: true,
      message: "Pengajuan aktivasi kembali berhasil dikirim. Admin akan meninjau permintaan Anda.",
    }, { status: 202 });
  } catch (error) {
    console.error("POST /api/auth/reactivation-request failed:", error);
    return NextResponse.json({ error: "Pengajuan aktivasi kembali gagal diproses. Silakan coba lagi." }, { status: 500 });
  }
}
