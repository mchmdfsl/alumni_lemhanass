import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor } from "@/lib/admin-audit";

export const runtime = "nodejs";

const statusValues = new Set(["Menunggu", "Terverifikasi", "Ditolak"]);

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  try {
    const query = request.nextUrl.searchParams;

    const search = (query.get("search") ?? "").trim().slice(0, 120);
    const status = query.get("status") ?? "";
    const angkatan = query.get("angkatan") ?? "";
    const wilayah = query.get("wilayah") ?? "";

    const requestedLimit = Number(query.get("limit") ?? 100);
    const requestedOffset = Number(query.get("offset") ?? 0);

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 500)
      : 100;

    const offset = Number.isFinite(requestedOffset)
      ? Math.max(Math.floor(requestedOffset), 0)
      : 0;

    if (status && !statusValues.has(status)) {
      return NextResponse.json(
        { error: "Filter status tidak valid." },
        { status: 400 }
      );
    }

    const rows = await db()`
      SELECT
        id,
        COALESCE(nomor_alumni, '') AS "nomorAlumni",
        nama,
        COALESCE(kategori_program, angkatan) AS "kategoriProgram",
        COALESCE(nomor_angkatan, '') AS "nomorAngkatan",
        tahun_angkatan AS "tahunAngkatan",
        angkatan,
        COALESCE(instansi, '') AS instansi,
        COALESCE(jabatan, '') AS jabatan,
        COALESCE(wilayah, '') AS wilayah,
        COALESCE(alamat, '') AS alamat,
        COALESCE(email, '') AS email,
        COALESCE(nomor_hp, '') AS "nomorHp",
        foto_profil AS "fotoProfil",
        status,
        alasan_penolakan AS "alasanPenolakan",
        sumber_data AS "sumberData",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        verified_at AS "verifiedAt"
      FROM alumni
      WHERE (
        ${search} = ''
        OR CONCAT_WS(
          ' ',
          nama,
          nomor_alumni,
          email,
          instansi,
          nomor_hp,
          alamat
        ) ILIKE ${"%" + search + "%"}
      )
      AND (${status} = '' OR status = ${status})
      AND (${angkatan} = '' OR angkatan = ${angkatan})
      AND (${wilayah} = '' OR wilayah = ${wilayah})
      ORDER BY updated_at DESC, id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const [counts] = await db()`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE status = 'Terverifikasi'
        )::int AS terverifikasi,
        COUNT(*) FILTER (
          WHERE status = 'Menunggu'
        )::int AS menunggu,
        COUNT(*) FILTER (
          WHERE status = 'Ditolak'
        )::int AS ditolak
      FROM alumni
    `;

    return NextResponse.json({
      data: rows,
      counts,
    });
  } catch (error) {
    console.error("GET /api/alumni failed:", error);

    return NextResponse.json(
      {
        error:
          "Gagal mengambil data alumni. Periksa koneksi database dan struktur tabel.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const nama =
      typeof body.nama === "string" ? body.nama.trim() : "";

    const kategoriProgram = typeof body.kategoriProgram === "string" ? body.kategoriProgram.trim().toLocaleUpperCase("id-ID") : "";
    const nomorAngkatan = typeof body.nomorAngkatan === "string" ? body.nomorAngkatan.trim() : "";
    const tahunAngkatan = Number(body.tahunAngkatan);
    const allowedCategories = new Set(["KRA", "PPRA", "P4N", "KSA", "PPSA", "P3N", "PPNK", "PPNK KOLABORASI", "TOT"]);

    if (
      nama.length < 2 ||
      nama.length > 200 ||
      !allowedCategories.has(kategoriProgram) ||
      !nomorAngkatan ||
      nomorAngkatan.length > 40 ||
      !Number.isInteger(tahunAngkatan) ||
      tahunAngkatan < 1900 ||
      tahunAngkatan > new Date().getFullYear() + 5
    ) {
      return NextResponse.json(
        {
          error:
            "Nama, kategori program, nomor angkatan, dan tahun angkatan wajib diisi dengan format yang benar.",
        },
        { status: 400 }
      );
    }

    // Email dibiarkan NULL sampai alumni mengisinya sendiri di profil.

    const nomorAlumni =
      typeof body.nomorAlumni === "string"
        ? body.nomorAlumni.trim() || null
        : null;

    const instansi =
      typeof body.instansi === "string"
        ? body.instansi.trim()
        : "";

    const jabatan =
      typeof body.jabatan === "string"
        ? body.jabatan.trim()
        : "";

    const wilayah =
      typeof body.wilayah === "string"
        ? body.wilayah.trim()
        : "";

    const alamat =
      typeof body.alamat === "string"
        ? body.alamat.trim()
        : "";

    const nomorHp =
      typeof body.nomorHp === "string"
        ? body.nomorHp.trim()
        : "";

    const [row] = await db()`
      INSERT INTO alumni (
        nomor_alumni,
        nama,
        angkatan: kategoriProgram,
        kategori_program: kategoriProgram,
        nomor_angkatan: nomorAngkatan,
        tahun_angkatan: tahunAngkatan,
        instansi,
        jabatan,
        wilayah,
        alamat,
        email,
        nomor_hp,
        status,
        sumber_data
      )
      VALUES (
        ${nomorAlumni},
        ${nama},
        ${kategoriProgram},
        ${kategoriProgram},
        ${nomorAngkatan},
        ${tahunAngkatan},
        ${instansi},
        ${jabatan},
        ${wilayah},
        ${alamat},
        NULL,
        ${nomorHp},
        'Menunggu',
        'impor'
      )
      RETURNING
        id,
        COALESCE(nomor_alumni, '') AS "nomorAlumni",
        nama,
        COALESCE(kategori_program, angkatan) AS "kategoriProgram",
        COALESCE(nomor_angkatan, '') AS "nomorAngkatan",
        tahun_angkatan AS "tahunAngkatan",
        angkatan,
        COALESCE(instansi, '') AS instansi,
        COALESCE(jabatan, '') AS jabatan,
        COALESCE(wilayah, '') AS wilayah,
        COALESCE(alamat, '') AS alamat,
        COALESCE(email, '') AS email,
        COALESCE(nomor_hp, '') AS "nomorHp",
        foto_profil AS "fotoProfil",
        status
    `;

    // Audit logging is best-effort here; the alumni record is already committed.
    const actor = await getAdminActor();
    if (actor && row) {
      try {
        await db()`
          INSERT INTO admin_audit_log (action, alumni_id, actor, details)
          VALUES ('create', ${row.id}, ${actor.actor}, ${JSON.stringify({ actorRole: actor.role, nama: row.nama, sumberData: "impor" })}::jsonb)
        `;
      } catch (auditError) {
        console.error("Gagal mencatat pembuatan alumni:", auditError);
      }
    }

    return NextResponse.json(
      { data: row },
      { status: 201 }
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;

    if (code === "23505") {
      return NextResponse.json(
        {
          error:
            "Nomor alumni sudah terdaftar.",
        },
        { status: 409 }
      );
    }

    console.error("POST /api/alumni failed:", error);

    return NextResponse.json(
      { error: "Gagal menyimpan data alumni." },
      { status: 500 }
    );
  }
  }
