
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
      COALESCE(a.kategori_program, a.angkatan) AS "kategoriProgram",
      COALESCE(a.nomor_angkatan, '') AS "nomorAngkatan",
      a.tahun_angkatan AS "tahunAngkatan",
      a.jabatan,
      a.instansi,
      a.wilayah,
      a.alamat,
      a.nomor_hp AS "nomorHp",
      a.email,
      to_jsonb(a)->>'foto_profil' AS "fotoProfil",
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

    const kategoriProgram = typeof body.kategoriProgram === "string" ? body.kategoriProgram.trim().toLocaleUpperCase("id-ID") : "";
    const nomorAngkatan = typeof body.nomorAngkatan === "string" ? body.nomorAngkatan.trim() : "";
    const tahunAngkatan = Number(body.tahunAngkatan);

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

    if (!/^[A-Z0-9]+(?:[ ][A-Z0-9]+){0,3}$/.test(kategoriProgram) || !nomorAngkatan || nomorAngkatan.length > 40 || !Number.isInteger(tahunAngkatan) || tahunAngkatan < 1900 || tahunAngkatan > new Date().getFullYear() + 5) {
      return NextResponse.json(
        { message: "Kategori program, nomor angkatan, dan tahun angkatan wajib diisi dengan benar." },
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
      angkatan: kategoriProgram,
      kategoriProgram,
      nomorAngkatan,
      tahunAngkatan,
      jabatan,
      instansi,
      wilayah,
      alamat,
      nomorHp,
    };

    const [result] = await db()`
      UPDATE alumni
      SET nama = ${payload.nama},
        angkatan = ${payload.angkatan},
        kategori_program = ${payload.kategoriProgram},
        nomor_angkatan = ${payload.nomorAngkatan},
        tahun_angkatan = ${payload.tahunAngkatan},
        jabatan = ${payload.jabatan},
        instansi = ${payload.instansi},
        wilayah = ${payload.wilayah},
        alamat = ${payload.alamat},
        nomor_hp = ${payload.nomorHp},
        updated_at = NOW()
      WHERE id = ${alumni.id}
      RETURNING id, nomor_alumni AS "nomorAlumni", nama, angkatan,
        kategori_program AS "kategoriProgram",
        nomor_angkatan AS "nomorAngkatan",
        tahun_angkatan AS "tahunAngkatan", jabatan, instansi, wilayah,
        alamat, nomor_hp AS "nomorHp", status
    `;

    if (!result) return NextResponse.json({ message: "Data alumni tidak ditemukan." }, { status: 404 });

    return NextResponse.json({
      message: "Profil berhasil diperbarui dan langsung tersimpan ke database.",
      data: result,
    });
  } catch (error) {
    console.error("PATCH /api/user/profile:", error);

    return NextResponse.json(
      { message: "Gagal mengirim perubahan profil." },
      { status: 500 }
    );
  }
        }
  
