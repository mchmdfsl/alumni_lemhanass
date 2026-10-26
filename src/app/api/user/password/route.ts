import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";
import { hashPassword, verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = await getAlumniSession();
  if (!session) {
    return NextResponse.json({ message: "Silakan login kembali." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: "Semua kolom password wajib diisi." }, { status: 400 });
    }
    if (newPassword.length < 12) {
      return NextResponse.json({ message: "Password baru minimal 12 karakter." }, { status: 400 });
    }
    if (Buffer.byteLength(newPassword, "utf8") > 1024) {
      return NextResponse.json({ message: "Password baru terlalu panjang." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: "Konfirmasi password baru tidak cocok." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ message: "Password baru harus berbeda dari password lama." }, { status: 400 });
    }

    const sql = db();
    const [account] = await sql`
      SELECT aa.id, aa.password_hash AS "passwordHash"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE aa.id = ${session.accountId}
        AND a.id = ${session.alumniId}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
      LIMIT 1
    `;

    if (!account) {
      return NextResponse.json({ message: "Akun tidak aktif atau sesi tidak valid." }, { status: 401 });
    }

    const valid = await verifyPassword(currentPassword, account.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: "Password lama tidak benar." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await sql`
      UPDATE alumni_accounts
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE id = ${session.accountId}
    `;

    return NextResponse.json({ ok: true, message: "Password berhasil diganti." });
  } catch (error) {
    console.error("PATCH /api/user/password failed:", error);
    return NextResponse.json({ message: "Gagal mengganti password. Silakan coba lagi." }, { status: 500 });
  }
}
