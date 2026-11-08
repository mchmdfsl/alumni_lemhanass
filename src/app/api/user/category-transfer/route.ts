import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";
import { normalizeProgramCategory } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowed = new Set(["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "TAPLAI", "PPNK", "PPNK KOLABORASI", "TOT"]);

export async function GET() {
  const session = await getAlumniSession();
  if (!session) return NextResponse.json({ error: "Silakan login sebagai alumni." }, { status: 401 });
  try {
    const data = await db()`
      SELECT id, current_kategori_program AS "currentKategoriProgram",
        requested_kategori_program AS "requestedKategoriProgram", reason, status,
        admin_note AS "adminNote", created_at AS "createdAt", reviewed_at AS "reviewedAt"
      FROM alumni_category_transfer_requests
      WHERE alumni_id = ${session.alumniId}
      ORDER BY created_at DESC LIMIT 50
    `;
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET category transfer requests failed:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat perpindahan kategori." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAlumniSession();
  if (!session) return NextResponse.json({ error: "Silakan login sebagai alumni." }, { status: 401 });
  try {
    const body = await request.json();
    const requested = normalizeProgramCategory(body.requestedKategoriProgram);
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
    if (!allowed.has(requested) || !reason) {
      return NextResponse.json({ error: "Kategori tujuan dan alasan wajib diisi dengan benar." }, { status: 400 });
    }
    const result = await db().begin(async (tx) => {
      const [alumni] = await tx`
        SELECT id, kategori_program AS kategori
        FROM alumni
        WHERE id = ${session.alumniId} AND status = 'Terverifikasi'
        FOR UPDATE
      `;
      if (!alumni) return { kind: "not_found" as const };
      const current = normalizeProgramCategory(alumni.kategori);
      if (!current || !allowed.has(current)) return { kind: "invalid_current" as const };
      if (current === requested) return { kind: "same" as const };
      const [pending] = await tx`
        SELECT id FROM alumni_category_transfer_requests
        WHERE alumni_id = ${session.alumniId} AND status = 'Menunggu' LIMIT 1
      `;
      if (pending) return { kind: "pending" as const };
      const [created] = await tx`
        INSERT INTO alumni_category_transfer_requests
          (alumni_id, current_kategori_program, requested_kategori_program, reason)
        VALUES (${session.alumniId}, ${current}, ${requested}, ${reason})
        RETURNING id, status
      `;
      return { kind: "created" as const, id: Number(created.id), status: created.status };
    });
    if (result.kind === "not_found") return NextResponse.json({ error: "Data alumni terverifikasi tidak ditemukan." }, { status: 404 });
    if (result.kind === "invalid_current") return NextResponse.json({ error: "Kategori alumni saat ini belum valid. Hubungi Admin." }, { status: 409 });
    if (result.kind === "same") return NextResponse.json({ error: "Kategori tujuan sama dengan kategori saat ini." }, { status: 400 });
    if (result.kind === "pending") return NextResponse.json({ error: "Masih ada pengajuan perpindahan kategori yang menunggu keputusan." }, { status: 409 });
    return NextResponse.json({ ok: true, message: "Pengajuan perpindahan kategori berhasil dikirim untuk ditinjau.", data: result }, { status: 201 });
  } catch (error) {
    console.error("POST category transfer request failed:", error);
    return NextResponse.json({ error: "Gagal mengirim pengajuan perpindahan kategori." }, { status: 500 });
  }
}
