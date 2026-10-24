
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 },
      );
    }

    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 1024
    ) {
      return NextResponse.json(
        { error: "Password minimal 12 karakter." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const sql = db();

    const result = await sql.begin(async (tx) => {
      const existing = await tx`
        SELECT id
        FROM alumni_accounts
        WHERE lower(email) = ${email}
        LIMIT 1
      `;

      if (existing.length) {
        return { kind: "existing" as const };
      }

      const pending = await tx`
        SELECT id
        FROM alumni_account_requests
        WHERE lower(email) = ${email}
          AND status = 'Menunggu'
        LIMIT 1
      `;

      if (pending.length) {
        return { kind: "pending" as const };
      }

      const candidates = await tx`
        SELECT id
        FROM alumni
        WHERE lower(trim(coalesce(email, ''))) = ${email}
        LIMIT 2
      `;

      // Hanya tautkan permintaan ke kandidat bila tepat satu
      // baris ditemukan. Kecocokan email bukan bukti kepemilikan.
      const alumniId =
        candidates.length === 1 ? Number(candidates[0].id) : null;

      await tx`
        INSERT INTO alumni_account_requests
          (alumni_id, email, password_hash, request_type, status)
        VALUES
          (${alumniId}, ${email}, ${passwordHash}, 'register', 'Menunggu')
      `;

      return {
        kind: "created" as const,
        candidateFound: alumniId !== null,
      };
    });

    if (result.kind === "existing") {
      return NextResponse.json(
        { error: "Permintaan tidak dapat diproses. Silakan login atau hubungi admin." },
        { status: 409 },
      );
    }

    if (result.kind === "pending") {
      return NextResponse.json(
        { error: "Permintaan dengan email ini sedang menunggu pemeriksaan." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: "Menunggu",
        message:
          "Permintaan registrasi diterima dan menunggu verifikasi admin.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("POST /api/auth/register failed", error);

    return NextResponse.json(
      { error: "Registrasi gagal diproses oleh server." },
      { status: 500 },
    );
  }
      }
      
