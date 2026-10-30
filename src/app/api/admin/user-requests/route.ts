import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";
import { getAdminCategories, getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const data = await db()`
      SELECT r.id, r.alumni_id AS "alumniId", r.request_type AS "requestType",
        r.payload, r.message, r.status, r.admin_note AS "adminNote",
        r.created_at AS "createdAt", a.nama, a.nomor_alumni AS "nomorAlumni",
        a.angkatan, COALESCE(a.kategori_program, a.angkatan) AS "currentKategoriProgram",
        COALESCE(a.nomor_angkatan, '') AS "currentNomorAngkatan",
        a.tahun_angkatan AS "currentTahunAngkatan",
        a.nama AS "currentNama", a.angkatan AS "currentAngkatan",
        a.jabatan AS "currentJabatan", a.instansi AS "currentInstansi",
        a.wilayah AS "currentWilayah", a.nomor_hp AS "currentNomorHp",
        a.alamat AS "currentAlamat"
      FROM alumni_user_requests r
      INNER JOIN alumni a ON a.id = r.alumni_id
      WHERE r.request_type = 'delete_account'
        AND (${scope.role === "super_admin"} = TRUE OR upper(COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, '')) = ANY(${allowedCategories}))
      ORDER BY CASE WHEN r.status = 'Menunggu' THEN 0 ELSE 1 END,
        r.created_at DESC
      LIMIT 300
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET admin user requests failed:", error);
    const dbError = error as { code?: string; message?: string };
    if (dbError.code === "42P01" || (dbError.message ?? "").toLowerCase().includes("relation \"alumni_user_requests\" does not exist")) {
      return NextResponse.json({ error: "Tabel permintaan alumni belum tersedia di database. Jalankan migrasi db/migrations/002_alumni_user_requests.sql pada database yang dipakai Vercel, lalu muat ulang halaman." }, { status: 503 });
    }
    return NextResponse.json({ error: "Gagal mengambil permintaan alumni. Periksa koneksi database dan log server." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });

  const allowedCategories = getAdminCategories(scope) ?? [];
  try {
    const body = await request.json();
    const id = Number(body.id);
    const status = body.status;
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim().slice(0, 1000) : "";
    if (!Number.isSafeInteger(id) || id < 1 || !["Disetujui", "Ditolak"].includes(status)) {
      return NextResponse.json({ error: "Data keputusan permintaan tidak valid." }, { status: 400 });
    }
    if (status === "Ditolak" && !adminNote) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    }

    const result = await db().begin(async (tx) => {
      const [req] = await tx`
        SELECT id, alumni_id AS "alumniId", request_type AS "requestType",
          payload, status
        FROM alumni_user_requests
        WHERE id = ${id}
        FOR UPDATE
      `;
      if (!req) return "not_found";
      if (scope.role === "admin") {
        const [target] = await tx`SELECT id FROM alumni WHERE id = ${req.alumniId} AND upper(COALESCE(NULLIF(trim(kategori_program), ''), angkatan, '')) = ANY(${allowedCategories}) LIMIT 1`;
        if (!target) return "not_found";
      }
      if (req.status !== "Menunggu") return "already_reviewed";
      if (req.requestType !== "delete_account") return "unsupported_request";

      if (status === "Disetujui" && req.requestType === "delete_account") {
        await tx`UPDATE alumni_accounts SET is_active = FALSE WHERE alumni_id = ${req.alumniId}`;
      }

      await tx`
        UPDATE alumni_user_requests
        SET status = ${status}, admin_note = ${adminNote || null},
          reviewed_by = ${scope.role}, reviewed_at = NOW()
        WHERE id = ${id}
      `;
      return "saved";
    });

    if (result === "not_found") return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    if (result === "already_reviewed") return NextResponse.json({ error: "Permintaan sudah diproses sebelumnya." }, { status: 409 });
    if (result === "unsupported_request") return NextResponse.json({ error: "Jenis permintaan ini tidak lagi memerlukan verifikasi admin." }, { status: 400 });
    const actor = await getAdminActor();
    if (actor) await writeAdminAudit(actor, "user_request_reviewed", { requestId: id, status, adminNote: adminNote || null });
    return NextResponse.json({ ok: true, message: status === "Disetujui" ? "Permintaan disetujui." : "Permintaan ditolak." });
  } catch (error) {
    console.error("PATCH admin user request failed:", error);
    return NextResponse.json({ error: "Gagal memproses permintaan. Periksa data dan log server." }, { status: 500 });
  }
}
