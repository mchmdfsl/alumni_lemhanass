import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }
  try {
    const rows = await db()`
      UPDATE alumni
      SET status = 'Terverifikasi',
          verified_at = COALESCE(verified_at, NOW()),
          updated_at = NOW()
      WHERE sumber_data = 'impor'
        AND status IS DISTINCT FROM 'Terverifikasi'
      RETURNING id
    `;
    return NextResponse.json({ message: "Data alumni hasil impor berhasil ditandai terverifikasi.", updated: rows.length });
  } catch (error) {
    console.error("POST /api/alumni/bulk-verify:", error);
    return NextResponse.json({ error: "Gagal memverifikasi data alumni hasil impor." }, { status: 500 });
  }
}