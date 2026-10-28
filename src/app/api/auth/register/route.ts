import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const value = (key: string, max: number) =>
      typeof body[key] === "string" ? body[key].trim().slice(0, max) : "";

    const nama = value("nama", 200);
    const kategoriProgram = value("kategoriProgram", 80).toLocaleUpperCase("id-ID");
    const tahunAngkatanRaw = value("tahunAngkatan", 4);
    const tahunAngkatan = /^\d{4}$/.test(tahunAngkatanRaw) ? Number(tahunAngkatanRaw) : NaN;
    const allowedCategories = new Set(["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK", "PPNK KOLABORASI", "TOT"]);
    const nomorHp = value("nomorHp", 50);
    const instansi = value("instansi", 250);
    const jabatan = value("jabatan", 200);
    const wilayah = value("wilayah", 150);
    const alamat = value("alamat", 5000);
    const email = value("email", 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!nama || !kategoriProgram || !Number.isInteger(tahunAngkatan) || !email || !password) {
      return NextResponse.json(
        { error: "Nama, kategori program, nomor angkatan, tahun angkatan, email, dan password wajib diisi." },
        { status: 400 },
      );
    }
    if (!allowedCategories.has(kategoriProgram)) {
      return NextResponse.json({ error: "Kategori program tidak valid." }, { status: 400 });
    }
    if (tahunAngkatan < 1900 || tahunAngkatan > new Date().getFullYear() + 5) {
      return NextResponse.json({ error: "Tahun angkatan tidak valid." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) {
      return NextResponse.json({ error: "Password minimal 12 karakter." }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(request, "register", {
      identity: email,
      ipLimit: 15,
      identityLimit: 5,
      windowSeconds: 15 * 60,
    });
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan registrasi. Silakan coba lagi beberapa saat." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const passwordHash = await hashPassword(password);
    const sql = db();

    const result = await sql.begin(async (tx) => {
      // Serialize by category so concurrent registrations cannot receive the same
      // next cohort number. The server recalculates the number; client input is never trusted.
      await tx`
        SELECT pg_advisory_xact_lock(hashtextextended(${"register-category:" + kategoriProgram}, 0))
      `;
      const cohortRows = await tx`
        SELECT nomor_angkatan AS "nomorAngkatan"
        FROM alumni
        WHERE upper(trim(coalesce(kategori_program, angkatan, ''))) = ${kategoriProgram}
        UNION ALL
        SELECT submitted_nomor_angkatan AS "nomorAngkatan"
        FROM alumni_account_requests
        WHERE status = 'Menunggu'
          AND request_type = 'register'
          AND upper(trim(coalesce(submitted_kategori_program, submitted_angkatan, ''))) = ${kategoriProgram}
      `;
      const highestCohort = cohortRows.reduce((highest, row) => {
        const raw = String(row.nomorAngkatan ?? "").trim();
        if (!/^\\d+$/.test(raw)) return highest;
        const parsed = Number(raw);
        return Number.isSafeInteger(parsed) ? Math.max(highest, parsed) : highest;
      }, 0);
      const nomorAngkatan = String(highestCohort + 1);

      // Also serialize requests with the same email and identity.
      await tx`
        SELECT pg_advisory_xact_lock(hashtextextended(${"register-email:" + email}, 0))
      `;
      const identityKey = [nama.toLocaleLowerCase("id-ID"), kategoriProgram, nomorAngkatan].join("|");
      await tx`
        SELECT pg_advisory_xact_lock(hashtextextended(${"register-identity:" + identityKey}, 0))
      `;

      const existingAccount = await tx`
        SELECT id FROM alumni_accounts WHERE lower(email) = ${email} LIMIT 1
      `;
      if (existingAccount.length) return { kind: "existing_account" as const };

      const existingAlumniEmail = await tx`
        SELECT id FROM alumni
        WHERE lower(trim(coalesce(email, ''))) = ${email}
        LIMIT 1
      `;
      if (existingAlumniEmail.length) return { kind: "use_claim" as const };

      const pending = await tx`
        SELECT id FROM alumni_account_requests
        WHERE lower(email) = ${email} AND status = 'Menunggu'
        LIMIT 1
      `;
      if (pending.length) return { kind: "pending" as const };

      const pendingIdentity = await tx`
        SELECT id FROM alumni_account_requests
        WHERE status = 'Menunggu'
          AND request_type = 'register'
          AND lower(trim(coalesce(submitted_nama, ''))) = lower(${nama})
          AND trim(coalesce(submitted_kategori_program, submitted_angkatan, '')) = ${kategoriProgram}
          AND trim(coalesce(submitted_nomor_angkatan, '')) = ${nomorAngkatan}
        LIMIT 1
      `;
      if (pendingIdentity.length) return { kind: "identity_pending" as const };

      await tx`
        INSERT INTO alumni_account_requests (
          alumni_id, email, password_hash, request_type, status,
          submitted_nama, submitted_angkatan, submitted_kategori_program,
          submitted_nomor_angkatan, submitted_tahun_angkatan, submitted_nomor_hp,
          submitted_nomor_alumni, submitted_instansi, submitted_jabatan,
          submitted_wilayah, submitted_alamat
        ) VALUES (
          NULL, ${email}, ${passwordHash}, 'register', 'Menunggu',
          ${nama}, ${kategoriProgram}, ${kategoriProgram}, ${nomorAngkatan}, ${tahunAngkatan},
          ${nomorHp || null}, NULL, ${instansi}, ${jabatan}, ${wilayah}, ${alamat}
        )
      `;
      return { kind: "created" as const };
    });

    if (result.kind === "existing_account") {
      return NextResponse.json({ error: "Email sudah digunakan akun. Silakan login." }, { status: 409 });
    }
    if (result.kind === "use_claim") {
      return NextResponse.json({ error: "Email sudah tercatat pada data alumni. Silakan login menggunakan ID alumni jika akun Anda sudah diaktifkan admin." }, { status: 409 });
    }
    if (result.kind === "pending") {
      return NextResponse.json({ error: "Pengajuan dengan email ini masih menunggu pemeriksaan admin." }, { status: 409 });
    }
    if (result.kind === "identity_pending") {
      return NextResponse.json({ error: "Pengajuan dengan nama dan angkatan tersebut sudah menunggu pemeriksaan admin." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      status: "Menunggu",
      message: "Pengajuan alumni baru berhasil dikirim dan menunggu pemeriksaan admin.",
    }, { status: 202 });
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return NextResponse.json({ error: "Registrasi gagal diproses oleh server." }, { status: 500 });
  }
}
