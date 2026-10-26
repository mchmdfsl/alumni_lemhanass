import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!token || token.length > 200) {
      return NextResponse.json({ message: "Tautan reset tidak valid. Silakan minta tautan baru." }, { status: 400 });
    }
    if (password.length < 12) {
      return NextResponse.json({ message: "Password baru minimal 12 karakter." }, { status: 400 });
    }
    if (Buffer.byteLength(password, "utf8") > 1024) {
      return NextResponse.json({ message: "Password baru terlalu panjang." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Konfirmasi password tidak cocok." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await hashPassword(password);

    const outcome = await db().begin(async (tx) => {
      const [reset] = await tx`
        SELECT id, account_id AS "accountId"
        FROM alumni_password_reset_tokens
        WHERE token_hash = ${tokenHash}
          AND used_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      `;
      if (!reset) return false;

      const [account] = await tx`
        SELECT aa.id
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE aa.id = ${reset.accountId}
          AND aa.is_active = TRUE
          AND a.status = 'Terverifikasi'
        LIMIT 1
        FOR UPDATE OF aa
      `;
      if (!account) {
        await tx`UPDATE alumni_password_reset_tokens SET used_at = NOW() WHERE id = ${reset.id}`;
        return false;
      }

      await tx`
        UPDATE alumni_accounts
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${account.id}
      `;
      await tx`
        UPDATE alumni_password_reset_tokens
        SET used_at = NOW()
        WHERE account_id = ${account.id} AND used_at IS NULL
      `;
      return true;
    });

    if (!outcome) {
      return NextResponse.json({ message: "Tautan reset sudah digunakan, kedaluwarsa, atau tidak valid. Silakan minta tautan baru." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Password berhasil diatur ulang. Silakan login dengan password baru." });
  } catch (error) {
    console.error("POST /api/auth/reset-password failed:", error);
    return NextResponse.json({ message: "Gagal mengatur ulang password. Silakan coba lagi." }, { status: 500 });
  }
}
