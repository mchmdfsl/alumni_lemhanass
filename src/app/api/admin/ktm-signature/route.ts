import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminScope, getAdminCategories, adminCanManageCategory } from "@/lib/admin-scope";
import { getR2Client, r2Bucket, r2PublicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = {
  "image/png": { ext: "png", check: (b: Buffer) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/jpeg": { ext: "jpg", check: (b: Buffer) => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 },
  "image/webp": { ext: "webp", check: (b: Buffer) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
};

async function ensureTable() {
  await db()`
    CREATE TABLE IF NOT EXISTS ktm_signature_settings (
      id BIGSERIAL PRIMARY KEY,
      kategori_program TEXT NOT NULL UNIQUE,
      nama_deputi TEXT NOT NULL DEFAULT '',
      jabatan_deputi TEXT NOT NULL DEFAULT 'Deputi',
      signature_url TEXT,
      format_ttd TEXT NOT NULL DEFAULT 'standard' CHECK (format_ttd IN ('standard', 'tot_white')),
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function normalizeCategory(value: unknown) {
  return typeof value === "string" ? value.trim().toLocaleUpperCase("id-ID") : "";
}

export async function GET() {
  try {
    await ensureTable();
    const scope = await getAdminScope();
    if (scope) {
      const categories = getAdminCategories(scope);
      const rows = categories === null
        ? await db()`SELECT kategori_program AS "kategoriProgram", nama_deputi AS "namaDeputi", jabatan_deputi AS "jabatanDeputi", signature_url AS "signatureUrl", format_ttd AS "formatTtd", updated_at AS "updatedAt" FROM ktm_signature_settings ORDER BY kategori_program`
        : await db()`SELECT kategori_program AS "kategoriProgram", nama_deputi AS "namaDeputi", jabatan_deputi AS "jabatanDeputi", signature_url AS "signatureUrl", format_ttd AS "formatTtd", updated_at AS "updatedAt" FROM ktm_signature_settings WHERE kategori_program = ANY(${categories}) ORDER BY kategori_program`;
      return NextResponse.json({ data: rows, categories });
    }

    const { getAlumniSession } = await import("@/lib/alumni-session");
    const session = await getAlumniSession();
    if (!session) return NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 });
    const [alumni] = await db()`
      SELECT COALESCE(a.kategori_program, a.angkatan) AS kategori
      FROM alumni_accounts aa JOIN alumni a ON a.id = aa.alumni_id
      WHERE aa.id = ${session.accountId} AND a.id = ${session.alumniId}
        AND aa.is_active = TRUE AND a.status = 'Terverifikasi' LIMIT 1
    `;
    if (!alumni?.kategori) return NextResponse.json({ message: "Data alumni tidak ditemukan." }, { status: 404 });
    const [setting] = await db()`
      SELECT kategori_program AS "kategoriProgram", nama_deputi AS "namaDeputi",
        jabatan_deputi AS "jabatanDeputi", signature_url AS "signatureUrl",
        format_ttd AS "formatTtd"
      FROM ktm_signature_settings WHERE kategori_program = ${normalizeCategory(alumni.kategori)} LIMIT 1
    `;
    return NextResponse.json({ data: setting ?? null });
  } catch (error) {
    console.error("GET /api/admin/ktm-signature:", error);
    return NextResponse.json({ message: "Gagal memuat pengaturan tanda tangan KTM." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureTable();
    const scope = await getAdminScope();
    if (!scope) return NextResponse.json({ message: "Akses admin diperlukan." }, { status: 401 });
    const body = await request.json();
    const kategori = normalizeCategory(body.kategoriProgram);
    const namaDeputi = typeof body.namaDeputi === "string" ? body.namaDeputi.trim() : "";
    const jabatanDeputi = typeof body.jabatanDeputi === "string" ? body.jabatanDeputi.trim() : "Deputi";
    const formatTtd = body.formatTtd === "tot_white" ? "tot_white" : "standard";
    if (!kategori || !adminCanManageCategory(scope, kategori)) return NextResponse.json({ message: "Anda tidak memiliki akses untuk mengatur kategori ini." }, { status: 403 });
    if (!namaDeputi || namaDeputi.length > 200 || !jabatanDeputi || jabatanDeputi.length > 200) return NextResponse.json({ message: "Nama Deputi dan jabatan wajib diisi, maksimal 200 karakter." }, { status: 400 });
    const [row] = await db()`
      INSERT INTO ktm_signature_settings (kategori_program, nama_deputi, jabatan_deputi, format_ttd, updated_by, updated_at)
      VALUES (${kategori}, ${namaDeputi}, ${jabatanDeputi}, ${formatTtd}, ${scope.role}, NOW())
      ON CONFLICT (kategori_program) DO UPDATE SET
        nama_deputi = EXCLUDED.nama_deputi, jabatan_deputi = EXCLUDED.jabatan_deputi,
        format_ttd = EXCLUDED.format_ttd, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      RETURNING kategori_program AS "kategoriProgram", nama_deputi AS "namaDeputi",
        jabatan_deputi AS "jabatanDeputi", signature_url AS "signatureUrl", format_ttd AS "formatTtd"
    `;
    return NextResponse.json({ message: "Identitas Deputi berhasil disimpan.", data: row });
  } catch (error) {
    console.error("PATCH /api/admin/ktm-signature:", error);
    return NextResponse.json({ message: "Gagal menyimpan identitas Deputi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;
  try {
    await ensureTable();
    const scope = await getAdminScope();
    if (!scope) return NextResponse.json({ message: "Akses admin diperlukan." }, { status: 401 });
    if (!r2PublicUrl) return NextResponse.json({ message: "Cloudflare R2 belum dikonfigurasi." }, { status: 503 });
    const form = await request.formData();
    const kategori = normalizeCategory(form.get("kategoriProgram"));
    const file = form.get("signature");
    if (!kategori || !adminCanManageCategory(scope, kategori)) return NextResponse.json({ message: "Anda tidak memiliki akses untuk kategori ini." }, { status: 403 });
    if (!(file instanceof File) || file.size < 1 || file.size > 3 * 1024 * 1024) return NextResponse.json({ message: "File tanda tangan wajib diisi dan maksimal 3 MB." }, { status: 400 });
    const type = allowedTypes[file.type as keyof typeof allowedTypes];
    if (!type) return NextResponse.json({ message: "Format tanda tangan harus PNG, JPG, atau WebP." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!type.check(buffer)) return NextResponse.json({ message: "File bukan gambar yang valid." }, { status: 400 });
    const key = `ktm-signatures/${kategori.toLowerCase().replace(/[^a-z0-9-]/g, "-")}/${randomUUID()}.${type.ext}`;
    await getR2Client().send(new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: buffer, ContentType: file.type, CacheControl: "public, max-age=31536000, immutable" }));
    uploadedKey = key;
    const url = `${r2PublicUrl}/${key}`;
    const [row] = await db()`
      INSERT INTO ktm_signature_settings (kategori_program, nama_deputi, jabatan_deputi, signature_url, format_ttd, updated_by, updated_at)
      VALUES (${kategori}, '', 'Deputi', ${url}, ${kategori === "TOT" ? "tot_white" : "standard"}, ${scope.role}, NOW())
      ON CONFLICT (kategori_program) DO UPDATE SET signature_url = EXCLUDED.signature_url, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      RETURNING kategori_program AS "kategoriProgram", signature_url AS "signatureUrl"
    `;
    return NextResponse.json({ message: "Gambar tanda tangan berhasil diunggah.", data: row });
  } catch (error) {
    console.error("POST /api/admin/ktm-signature:", error);
    if (uploadedKey) { try { await getR2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: uploadedKey })); } catch {} }
    return NextResponse.json({ message: "Gagal mengunggah gambar tanda tangan." }, { status: 500 });
  }
}
