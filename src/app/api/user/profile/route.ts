
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";

async function getVerifiedAlumni() {
  const session = await getAlumniSession();

  if (!session) return null;

  const [alumni] = await db()`
    SELECT
      a.id,
      a.nomor_alumni AS "nomorAlumni",
      a.nama,
      a.angkatan,
      a.jabatan,
      a.instansi,
      a.wilayah,
      a.alamat,
      a.nomor_hp AS "nomorHp",
      a.email,
      a.foto_profil AS "fotoProfil",
      a.status
    FROM alumni_accounts aa
    INNER JOIN alumni a ON a.id = aa.alumni_id
    WHERE aa.id = ${session.accountId}
      AND a.id = ${session.alumniId}
      AND aa.is_active = TRUE
      AND a.status = 'Terverifikasi'
    LIMIT 1
  `;

  return alumni ?? null;
}

export async function GET() {
  try {
    const alumni = await getVerifiedAlumni();

    if (!alumni) {
      return NextResponse.json(
        { message: "Sesi alumni tidak valid atau akun belum aktif." },
        { status: 401 }
      );
    }

    return NextResponse.json({ data: alumni });
  } catch (error) {
    console.error("GET /api/user/profile:", error);

    return NextResponse.json(
      { message: "Gagal mengambil profil alumni." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const alumni = await getVerifiedAlumni();

    if (!alumni) {
      return NextResponse.json(
        { message: "Sesi alumni tidak valid atau akun belum aktif." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const nama =
      typeof body.nama === "string" ? body.nama.trim() : "";

    const angkatan =
      typeof body.angkatan === "string" ||
      typeof body.angkatan === "number"
        ? String(body.angkatan).trim()
        : "";

    const jabatan =
      typeof body.jabatan === "string" ? body.jabatan.trim() : "";

    const instansi =
      typeof body.instansi === "string" ? body.instansi.trim() : "";
    const wilayah =
      typeof body.wilayah === "string" ? body.wilayah.trim() : "";
    const alamat =
      typeof body.alamat === "string" ? body.alamat.trim() : "";
    const nomorHp =
      typeof body.nomorHp === "string" ? body.nomorHp.trim() : "";

    if (!nama || nama.length > 200) {
      return NextResponse.json(
        { message: "Nama wajib diisi dan maksimal 200 karakter." },
        { status: 400 }
      );
    }

    if (!angkatan || angkatan.length > 100) {
      return NextResponse.json(
        { message: "Tahun angkatan wajib diisi." },
        { status: 400 }
      );
    }

    if (jabatan.length > 200 || instansi.length > 250 || wilayah.length > 150 || alamat.length > 5000 || nomorHp.length > 50) {
      return NextResponse.json(
        { message: "Jabatan maksimal 200, instansi 250, wilayah 150, nomor telepon 50, dan alamat 5000 karakter." },
        { status: 400 }
      );
    }

    const payload = {
      nama,
      angkatan,
      jabatan,
      instansi,
      wilayah,
      alamat,
      nomorHp,
    };

    const [result] = await db()`
      INSERT INTO alumni_user_requests (
        alumni_id,
        request_type,
        payload,
        message,
        status
      )
      VALUES (
        ${alumni.id},
        'profile_update',
        ${JSON.stringify(payload)}::jsonb,
        'Permintaan perubahan profil alumni',
        'Menunggu'
      )
      RETURNING
        id,
        status,
        created_at AS "createdAt"
    `;

    return NextResponse.json(
      {
        message: "Permintaan perubahan profil berhasil dikirim.",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PATCH /api/user/profile:", error);

    return NextResponse.json(
      { message: "Gagal mengirim perubahan profil." },
      { status: 500 }
    );
  }
        }
  
