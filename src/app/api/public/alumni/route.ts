import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nama = typeof body.nama === "string" ? body.nama.trim() : "";
    const angkatan = typeof body.angkatan === "string" ? body.angkatan.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (nama.length < 2 || nama.length > 200 || !angkatan || angkatan.length > 100 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Nama, angkatan, dan email valid wajib diisi." }, { status: 400 });
    }
    const [row] = await db()`INSERT INTO alumni (nama,angkatan,instansi,jabatan,wilayah,alamat,email,nomor_hp,status,sumber_data)
      VALUES (${nama},${angkatan},${String(body.instansi ?? '').trim().slice(0,250)},${String(body.jabatan ?? '').trim().slice(0,200)},${String(body.wilayah ?? '').trim().slice(0,150)},${String(body.alamat ?? '').trim().slice(0,3000)},${email},${String(body.nomorHp ?? '').trim().slice(0,50)},'Menunggu','pengajuan')
      RETURNING id, status`;
    return NextResponse.json({ message: "Pengajuan berhasil dikirim dan menunggu verifikasi admin.", data: row }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") return NextResponse.json({ error: "Email tersebut sudah pernah terdaftar." }, { status: 409 });
    console.error("POST /api/public/alumni failed", error);
    return NextResponse.json({ error: "Pengajuan belum dapat diproses. Silakan coba lagi nanti." }, { status: 500 });
  }
}
