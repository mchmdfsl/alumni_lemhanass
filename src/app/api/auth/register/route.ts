import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeProgramCategory } from "@/lib/admin-scope";
import { getR2Client, r2Bucket, r2PublicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024;
const EVIDENCE_TYPES = new Set([
  "KTM Alumni",
  "Sertifikat kelulusan",
  "Surat keterangan Lemhannas",
  "Dokumen pendukung lainnya",
]);

const FILE_TYPES: Record<string, { ext: string; valid: (buffer: Buffer) => boolean }> = {
  "application/pdf": {
    ext: "pdf",
    valid: (buffer) => buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-",
  },
  "image/jpeg": {
    ext: "jpg",
    valid: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  "image/png": {
    ext: "png",
    valid: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/webp": {
    ext: "webp",
    valid: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

export async function POST(request: NextRequest) {
  try {
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
    const body = isMultipart ? await request.formData() : await request.json();
    const getRaw = (key: string): unknown =>
      body instanceof FormData ? body.get(key) : (body as Record<string, unknown>)[key];
    const value = (key: string, max: number) =>
      typeof getRaw(key) === "string" ? String(getRaw(key)).trim().slice(0, max) : "";
    const passwordValue = getRaw("password");
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const email = value("email", 254).toLowerCase();

    if (value("action", 40) === "check_revision") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
        return NextResponse.json({ error: "Masukkan email dan password registrasi dengan benar." }, { status: 400 });
      }
      const rateLimit = await checkRateLimit(request, "register-revision-check", {
        identity: email, ipLimit: 15, identityLimit: 8, windowSeconds: 15 * 60,
      });
      if (rateLimit.limited) {
        return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa saat." }, { status: 429 });
      }
      const [pending] = await db()`
        SELECT id, password_hash AS "passwordHash", review_note AS "reviewNote",
          revision_requested_at AS "revisionRequestedAt",
          submitted_nama AS "submittedNama",
          submitted_kategori_program AS "submittedKategoriProgram",
          submitted_nomor_angkatan AS "submittedNomorAngkatan",
          submitted_tahun_angkatan AS "submittedTahunAngkatan",
          submitted_nomor_hp AS "submittedNomorHp",
          submitted_instansi AS "submittedInstansi",
          submitted_jabatan AS "submittedJabatan",
          submitted_wilayah AS "submittedWilayah",
          submitted_alamat AS "submittedAlamat"
        FROM alumni_account_requests
        WHERE lower(email) = ${email} AND request_type = 'register' AND status = 'Menunggu'
        ORDER BY created_at DESC LIMIT 1
      `;
      if (!pending || !pending.revisionRequestedAt) {
        return NextResponse.json({ error: "Tidak ditemukan catatan revisi aktif untuk email tersebut." }, { status: 404 });
      }
      if (!(await verifyPassword(password, String(pending.passwordHash || "")))) {
        return NextResponse.json({ error: "Email atau password tidak cocok." }, { status: 401 });
      }
      return NextResponse.json({
        ok: true,
        reviewNote: pending.reviewNote || "Admin meminta Anda memeriksa dan melengkapi kembali data.",
        submittedNama: pending.submittedNama,
        submittedKategoriProgram: pending.submittedKategoriProgram,
        submittedNomorAngkatan: pending.submittedNomorAngkatan,
        submittedTahunAngkatan: pending.submittedTahunAngkatan,
        submittedNomorHp: pending.submittedNomorHp,
        submittedInstansi: pending.submittedInstansi,
        submittedJabatan: pending.submittedJabatan,
        submittedWilayah: pending.submittedWilayah,
        submittedAlamat: pending.submittedAlamat,
      });
    }

    const nama = value("nama", 200);
    const kategoriProgram = normalizeProgramCategory(value("kategoriProgram", 80));
    const tahunAngkatanValue = getRaw("tahunAngkatan");
    const tahunAngkatanRaw =
      typeof tahunAngkatanValue === "number" && Number.isFinite(tahunAngkatanValue)
        ? String(tahunAngkatanValue)
        : typeof tahunAngkatanValue === "string"
          ? tahunAngkatanValue.trim()
          : "";
    const tahunAngkatan = /^\d{4}$/.test(tahunAngkatanRaw) ? Number(tahunAngkatanRaw) : NaN;
    const nomorHp = value("nomorHp", 50);
    const instansi = value("instansi", 250);
    const jabatan = value("jabatan", 200);
    const wilayah = value("wilayah", 150);
    const alamat = value("alamat", 5000);
    const evidenceType = value("evidenceType", 80);
    const evidenceFile = getRaw("buktiAlumni");

    const missingFields = [
      !nama ? "nama" : null,
      !kategoriProgram ? "kategori program" : null,
      !Number.isInteger(tahunAngkatan) ? "tahun angkatan (harus 4 digit)" : null,
      !email ? "email" : null,
      !password ? "password" : null,
      !EVIDENCE_TYPES.has(evidenceType) ? "jenis bukti alumni" : null,
      !(evidenceFile instanceof File) || evidenceFile.size === 0 ? "dokumen bukti alumni" : null,
    ].filter((field): field is string => field !== null);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Data wajib belum terbaca dengan benar: ${missingFields.join(", ")}. Periksa kembali kolom tersebut.` },
        { status: 400 },
      );
    }
    if (!/^[A-Z0-9]+(?:[ ][A-Z0-9]+){0,3}$/.test(kategoriProgram)) {
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
    if (!(evidenceFile instanceof File) || evidenceFile.size > MAX_EVIDENCE_SIZE) {
      return NextResponse.json({ error: "Dokumen bukti wajib diunggah dan maksimal berukuran 10 MB." }, { status: 413 });
    }

    const fileType = FILE_TYPES[evidenceFile.type];
    if (!fileType) {
      return NextResponse.json({ error: "Format dokumen harus PDF, JPG, PNG, atau WebP." }, { status: 400 });
    }
    const fileBuffer = Buffer.from(await evidenceFile.arrayBuffer());
    if (!fileType.valid(fileBuffer)) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan format dokumen yang dipilih." }, { status: 400 });
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

    if (!r2PublicUrl) {
      return NextResponse.json({ error: "Penyimpanan dokumen belum dikonfigurasi. Hubungi administrator." }, { status: 503 });
    }

    const passwordHash = await hashPassword(password);
    const evidenceKey = `registration-evidence/${randomUUID()}.${fileType.ext}`;
    await getR2Client().send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: evidenceKey,
      Body: fileBuffer,
      ContentType: evidenceFile.type,
      CacheControl: "private, no-store",
    }));
    const evidenceUrl = evidenceKey;
    const sql = db();

    const result = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"register-email:" + email}, 0))`;
      const existingAccount = await tx`SELECT id FROM alumni_accounts WHERE lower(email) = ${email} LIMIT 1`;
      if (existingAccount.length) return { kind: "existing_account" as const };

      const existingAlumniEmail = await tx`
        SELECT id FROM alumni WHERE lower(trim(coalesce(email, ''))) = ${email} LIMIT 1
      `;
      if (existingAlumniEmail.length) return { kind: "use_claim" as const };

      const pending = await tx`
        SELECT id, password_hash AS "passwordHash", revision_requested_at AS "revisionRequestedAt"
        FROM alumni_account_requests
        WHERE lower(email) = ${email} AND status = 'Menunggu' AND request_type = 'register'
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE
      `;
      if (pending.length) {
        const current = pending[0];
        if (!current.revisionRequestedAt) return { kind: "pending" as const };
        if (!(await verifyPassword(password, String(current.passwordHash || "")))) {
          return { kind: "revision_password_invalid" as const };
        }
        await tx`
          UPDATE alumni_account_requests
          SET password_hash = ${passwordHash},
              submitted_nama = ${nama},
              submitted_angkatan = ${kategoriProgram},
              submitted_kategori_program = ${kategoriProgram},
              submitted_nomor_angkatan = COALESCE(NULLIF(submitted_nomor_angkatan, ''), ${value("nomorAngkatan", 40)}),
              submitted_tahun_angkatan = ${tahunAngkatan},
              submitted_nomor_hp = ${nomorHp || null},
              submitted_instansi = ${instansi},
              submitted_jabatan = ${jabatan},
              submitted_wilayah = ${wilayah},
              submitted_alamat = ${alamat},
              submitted_bukti_url = ${evidenceUrl},
              submitted_bukti_nama = ${evidenceFile.name.slice(0, 255)},
              submitted_bukti_jenis = ${evidenceType},
              review_note = NULL, revision_requested_at = NULL,
              reviewed_by = NULL, reviewed_at = NULL, created_at = NOW()
          WHERE id = ${current.id}
        `;
        return { kind: "revision_updated" as const };
      }

      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"register-category:" + kategoriProgram}, 0))`;
      const cohortRows = await tx`
        SELECT COALESCE(NULLIF(trim(nomor_angkatan), ''), legacy.parts[2]) AS "nomorAngkatan"
        FROM alumni
        CROSS JOIN LATERAL (
          SELECT regexp_match(upper(trim(coalesce(angkatan, ''))), '^(PPNK KOLABORASI|KRA|PPRA|P4N|KSA|PPSA|P3N|TAPLAI|PPNK|TOT)[[:space:]]+([0-9]+)') AS parts
        ) legacy
        WHERE upper(trim(coalesce(
          CASE WHEN legacy.parts[1] IS NOT NULL
            AND upper(trim(coalesce(kategori_program, ''))) IN ('', upper(trim(coalesce(angkatan, ''))))
            THEN legacy.parts[1]
            ELSE NULLIF(trim(kategori_program), '') END,
          legacy.parts[1], angkatan, ''
        ))) = ${kategoriProgram}
        UNION ALL
        SELECT submitted_nomor_angkatan AS "nomorAngkatan"
        FROM alumni_account_requests
        WHERE status = 'Menunggu' AND request_type = 'register'
          AND upper(trim(coalesce(submitted_kategori_program, submitted_angkatan, ''))) = ${kategoriProgram}
      `;
      const highestCohort = cohortRows.reduce((highest, row) => {
        const raw = String(row.nomorAngkatan ?? "").trim();
        if (!/^\d+$/.test(raw)) return highest;
        const parsed = Number(raw);
        return Number.isSafeInteger(parsed) ? Math.max(highest, parsed) : highest;
      }, 0);
      const nomorAngkatan = String(highestCohort + 1);

      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"register-identity:" + [nama.toLocaleLowerCase("id-ID"), kategoriProgram, nomorAngkatan].join("|")}, 0))`;
      const pendingIdentity = await tx`
        SELECT id FROM alumni_account_requests
        WHERE status = 'Menunggu' AND request_type = 'register'
          AND lower(trim(coalesce(submitted_nama, ''))) = lower(${nama})
          AND upper(trim(coalesce(submitted_kategori_program, submitted_angkatan, ''))) = ${kategoriProgram}
          AND submitted_tahun_angkatan = ${tahunAngkatan}
        LIMIT 1
      `;
      if (pendingIdentity.length) return { kind: "identity_pending" as const };

      await tx`
        INSERT INTO alumni_account_requests (
          alumni_id, email, password_hash, request_type, status,
          submitted_nama, submitted_angkatan, submitted_kategori_program,
          submitted_nomor_angkatan, submitted_tahun_angkatan, submitted_nomor_hp,
          submitted_nomor_alumni, submitted_instansi, submitted_jabatan,
          submitted_wilayah, submitted_alamat, submitted_bukti_url,
          submitted_bukti_nama, submitted_bukti_jenis
        ) VALUES (
          NULL, ${email}, ${passwordHash}, 'register', 'Menunggu',
          ${nama}, ${kategoriProgram}, ${kategoriProgram}, ${nomorAngkatan}, ${tahunAngkatan},
          ${nomorHp || null}, NULL, ${instansi}, ${jabatan}, ${wilayah}, ${alamat},
          ${evidenceUrl}, ${evidenceFile.name.slice(0, 255)}, ${evidenceType}
        )
      `;
      return { kind: "created" as const, nomorAngkatan };
    });

    if (result.kind === "existing_account") {
      return NextResponse.json({ error: "Email sudah digunakan akun. Silakan login." }, { status: 409 });
    }
    if (result.kind === "use_claim") {
      return NextResponse.json({ error: "Email sudah tercatat pada data alumni. Silakan login menggunakan ID alumni jika akun Anda sudah diaktifkan admin." }, { status: 409 });
    }
    if (result.kind === "pending") {
      return NextResponse.json({ error: "Pengajuan dengan email ini masih menunggu pemeriksaan admin. Jika diminta revisi, periksa catatan Admin terlebih dahulu." }, { status: 409 });
    }
    if (result.kind === "revision_password_invalid") {
      return NextResponse.json({ error: "Password tidak cocok dengan pengajuan sebelumnya." }, { status: 401 });
    }
    if (result.kind === "identity_pending") {
      return NextResponse.json({ error: "Pengajuan dengan nama dan angkatan tersebut sudah menunggu pemeriksaan admin." }, { status: 409 });
    }
    if (result.kind === "revision_updated") {
      return NextResponse.json({ ok: true, status: "Menunggu", revisionUpdated: true, message: "Perbaikan pengajuan berhasil dikirim. Admin akan memeriksa kembali data dan dokumen Anda." }, { status: 202 });
    }

    return NextResponse.json({
      ok: true,
      status: "Menunggu",
      message: `Pengajuan alumni baru berhasil dikirim dan menunggu pemeriksaan admin. Nomor angkatan yang tercatat: ${result.nomorAngkatan}.`,
      nomorAngkatan: result.nomorAngkatan,
    }, { status: 202 });
  } catch (error) {
    console.error("POST /api/auth/register failed", error);
    return NextResponse.json({ error: "Registrasi gagal diproses oleh server." }, { status: 500 });
  }
}
