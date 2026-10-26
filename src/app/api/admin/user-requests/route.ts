import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  try {
    const data = await db()`
      SELECT r.id, r.alumni_id AS "alumniId", r.request_type AS "requestType",
        r.payload, r.message, r.status, r.admin_note AS "adminNote",
        r.created_at AS "createdAt", a.nama, a.nomor_alumni AS "nomorAlumni",
        a.angkatan
      FROM alumni_user_requests r
      INNER JOIN alumni a ON a.id = r.alumni_id
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
  const role = await isAdminAuthenticated();
  if (!role) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });

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
      if (req.status !== "Menunggu") return "already_reviewed";

      if (status === "Disetujui" && req.requestType === "profile_update") {
        const payload = typeof req.payload === "string" ? JSON.parse(req.payload) : (req.payload ?? {});
        const nama = typeof payload.nama === "string" ? payload.nama.trim().slice(0, 200) : "";
        const angkatan = typeof payload.angkatan === "string" ? payload.angkatan.trim().slice(0, 100) : "";
        if (!nama || !angkatan) throw new Error("Payload perubahan profil tidak lengkap.");
        await tx`
          UPDATE alumni SET
            nama = ${nama},
            angkatan = ${angkatan},
            jabatan = ${String(payload.jabatan ?? "").trim().slice(0, 200)},
            instansi = ${String(payload.instansi ?? "").trim().slice(0, 250)},
            wilayah = ${String(payload.wilayah ?? "").trim().slice(0, 150)},
            alamat = ${String(payload.alamat ?? "").trim().slice(0, 5000)},
            nomor_hp = ${String(payload.nomorHp ?? "").trim().slice(0, 50)},
            updated_at = NOW()
          WHERE id = ${req.alumniId}
        `;
      }

      if (status === "Disetujui" && req.requestType === "delete_account") {
        await tx`UPDATE alumni_accounts SET is_active = FALSE WHERE alumni_id = ${req.alumniId}`;
      }

      await tx`
        UPDATE alumni_user_requests
        SET status = ${status}, admin_note = ${adminNote || null},
          reviewed_by = ${role}, reviewed_at = NOW()
        WHERE id = ${id}
      `;
      return "saved";
    });

    if (result === "not_found") return NextResponse.json({ error: "Permintaan tidak ditemukan." }, { status: 404 });
    if (result === "already_reviewed") return NextResponse.json({ error: "Permintaan sudah diproses sebelumnya." }, { status: 409 });
    const actor = await getAdminActor();
    if (actor) await writeAdminAudit(actor, "user_request_reviewed", { requestId: id, status, adminNote: adminNote || null });
    return NextResponse.json({ ok: true, message: status === "Disetujui" ? "Permintaan disetujui." : "Permintaan ditolak." });
  } catch (error) {
    console.error("PATCH admin user request failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memproses permintaan." }, { status: 500 });
  }
}
