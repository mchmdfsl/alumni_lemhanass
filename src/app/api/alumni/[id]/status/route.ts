import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignAlumniNumber } from "@/lib/alumni-number";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "ID alumni tidak valid." }, { status: 400 });

  try {
    const body = await request.json();
    const status = body.status;
    if (!["Menunggu", "Terverifikasi", "Ditolak"].includes(status)) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    const reason = typeof body.alasanPenolakan === "string" ? body.alasanPenolakan.trim().slice(0, 1000) : "";
    if (status === "Ditolak" && !reason) return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });

    const result = await db().begin(async (tx) => {
      const [alumni] = await tx`
        SELECT id, nama, angkatan, COALESCE(nomor_alumni, '') AS "nomorAlumni"
        FROM alumni WHERE id = ${Number(id)} FOR UPDATE
      `;
      if (!alumni) return null;

      let nomorAlumni = alumni.nomorAlumni as string;
      if (status === "Terverifikasi") {
        nomorAlumni = await assignAlumniNumber(tx, Number(id), String(alumni.angkatan ?? ""), nomorAlumni || null);
      }

      const [updated] = await tx`
        UPDATE alumni
        SET status = ${status},
            nomor_alumni = ${nomorAlumni || null},
            alasan_penolakan = ${status === "Ditolak" ? reason : null},
            verified_at = ${status === "Terverifikasi" ? new Date() : null},
            updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING id, nama, angkatan, COALESCE(nomor_alumni, '') AS "nomorAlumni",
          status, alasan_penolakan AS "alasanPenolakan"
      `;
      if (updated) {
        await tx`INSERT INTO admin_audit_log (action, alumni_id, details) VALUES (${`status:${status}`}, ${Number(id)}, ${JSON.stringify({ alasan: reason, nomorAlumni })}::jsonb)`;
      }
      return updated;
    });

    if (!result) return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ data: result });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") return NextResponse.json({ error: "Nomor alumni atau email sudah terdaftar. Periksa data duplikat." }, { status: 409 });
    console.error("PATCH /api/alumni/[id]/status failed", error);
    return NextResponse.json({ error: "Gagal memperbarui status alumni." }, { status: 500 });
  }
}
