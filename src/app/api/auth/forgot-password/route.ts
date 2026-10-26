import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Masukkan alamat email yang valid." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.PASSWORD_RESET_FROM || process.env.EMAIL_FROM;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!apiKey || !from || !appUrl) {
      console.error("Password reset email belum dikonfigurasi. Atur RESEND_API_KEY, PASSWORD_RESET_FROM (atau EMAIL_FROM), dan NEXT_PUBLIC_APP_URL.");
      return NextResponse.json({ message: "Fitur pemulihan password belum dikonfigurasi di server. Silakan hubungi administrator." }, { status: 503 });
    }

    const [account] = await db()`
      SELECT aa.id, aa.email, a.nama
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE lower(aa.email) = ${email}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
      LIMIT 1
    `;

    // Always use the same success message when the request is valid to avoid
    // revealing whether an email address belongs to an account.
    if (!account) {
      return NextResponse.json({ ok: true, message: "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa juga folder spam." });
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await db().begin(async (tx) => {
      await tx`UPDATE alumni_password_reset_tokens SET used_at = NOW() WHERE account_id = ${account.id} AND used_at IS NULL`;
      await tx`
        INSERT INTO alumni_password_reset_tokens (account_id, token_hash, expires_at)
        VALUES (${account.id}, ${tokenHash}, NOW() + INTERVAL '30 minutes')
      `;
    });

    const baseUrl = appUrl.replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [account.email],
        subject: "Pemulihan Password Alumni Lemhannas",
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Permintaan pemulihan password</h2><p>Halo ${escapeHtml(String(account.nama || "Alumni"))},</p><p>Kami menerima permintaan untuk mengganti password akun Alumni Lemhannas. Tautan berikut hanya berlaku selama 30 menit dan dapat digunakan satu kali.</p><p><a href="${resetUrl}" style="display:inline-block;background:#0b1f3a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Atur Password Baru</a></p><p>Jika tombol tidak bisa dibuka, salin tautan ini ke browser:<br><a href="${resetUrl}">${resetUrl}</a></p><p>Jika Anda tidak meminta penggantian password, abaikan email ini.</p></div>`,
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text();
      console.error("Gagal mengirim email reset password:", emailResponse.status, details);
      await db()`UPDATE alumni_password_reset_tokens SET used_at = NOW() WHERE token_hash = ${tokenHash}`;
      return NextResponse.json({ message: "Email pemulihan gagal dikirim. Silakan coba lagi atau hubungi administrator." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa juga folder spam." });
  } catch (error) {
    console.error("POST /api/auth/forgot-password failed:", error);
    return NextResponse.json({ message: "Permintaan pemulihan tidak dapat diproses. Silakan coba lagi." }, { status: 500 });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}
