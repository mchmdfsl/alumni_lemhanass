import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
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
    const [row] = await db().begin(async (tx) => {
      const updated = await tx`UPDATE alumni SET status = ${status}, alasan_penolakan = ${status === "Ditolak" ? reason : null}, verified_at = ${status === "Terverifikasi" ? new Date() : null}, updated_at = NOW() WHERE id = ${Number(id)} RETURNING id, nama, status, alasan_penolakan AS "alasanPenolakan"`;
      if (updated[0]) await tx`INSERT INTO admin_audit_log (action, alumni_id, details) VALUES (${`status:${status}`}, ${Number(id)}, ${JSON.stringify({ alasan: reason })}::jsonb)`;
      return updated;
    });
    if (!row) return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ data: row });
  } catch (error) {
    console.error("PATCH /api/alumni/[id]/status failed", error);
    return NextResponse.json({ error: "Gagal memperbarui status alumni." }, { status: 500 });
  }
}
