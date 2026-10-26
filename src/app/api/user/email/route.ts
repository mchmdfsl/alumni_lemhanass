import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const session = await getAlumniSession();
  if (!session) {
    return NextResponse.json({ message: "Silakan login kembali." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ message: "Format email tidak valid." }, { status: 400 });
    }

    const result = await db().begin(async (tx) => {
      const [account] = await tx`
        SELECT aa.id, aa.alumni_id AS "alumniId"
        FROM alumni_accounts aa
        INNER JOIN alumni a ON a.id = aa.alumni_id
        WHERE aa.id = ${session.accountId}
          AND a.id = ${session.alumniId}
          AND aa.is_active = TRUE
          AND a.status = 'Terverifikasi'
        FOR UPDATE OF aa
      `;
      if (!account) return { kind: "unauthorized" as const };

      if (email) {
        const duplicateAccount = await tx`
          SELECT id FROM alumni_accounts
          WHERE lower(email) = ${email} AND id <> ${session.accountId}
          LIMIT 1
        `;
        if (duplicateAccount.length) return { kind: "duplicate" as const };

        const duplicateAlumni = await tx`
          SELECT id FROM alumni
          WHERE lower(trim(coalesce(email, ''))) = ${email}
            AND id <> ${session.alumniId}
          LIMIT 1
        `;
        if (duplicateAlumni.length) return { kind: "duplicate" as const };
      }

      await tx`UPDATE alumni_accounts SET email = ${email || null} WHERE id = ${session.accountId}`;
      await tx`UPDATE alumni SET email = ${email || null}, updated_at = NOW() WHERE id = ${session.alumniId}`;
      return { kind: "saved" as const };
    });

    if (result.kind === "unauthorized") {
      return NextResponse.json({ message: "Akun tidak aktif atau sesi tidak valid." }, { status: 401 });
    }
    if (result.kind === "duplicate") {
      return NextResponse.json({ message: "Email sudah digunakan akun alumni lain." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      message: email ? "Email berhasil disimpan." : "Email berhasil dikosongkan.",
      email: email || "",
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json({ message: "Email sudah digunakan akun alumni lain." }, { status: 409 });
    }
    console.error("PATCH /api/user/email failed:", error);
    return NextResponse.json({ message: "Gagal menyimpan email." }, { status: 500 });
  }
}
