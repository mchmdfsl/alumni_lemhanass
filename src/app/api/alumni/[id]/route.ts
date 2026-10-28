import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "ID alumni tidak valid." }, { status: 400 });

  try {
    const body = await request.json();

    const nama =
      typeof body.nama === "string" ? body.nama.trim().slice(0, 200) : undefined;
    const kategoriProgram =
      typeof body.kategoriProgram === "string" ? body.kategoriProgram.trim().toLocaleUpperCase("id-ID").slice(0, 80) : undefined;
    const nomorAngkatan =
      typeof body.nomorAngkatan === "string" ? body.nomorAngkatan.trim().slice(0, 40) : undefined;
    const tahunAngkatan =
      body.tahunAngkatan === undefined ? undefined : Number(body.tahunAngkatan);
    const instansi =
      typeof body.instansi === "string" ? body.instansi.trim().slice(0, 250) : undefined;
    const jabatan =
      typeof body.jabatan === "string" ? body.jabatan.trim().slice(0, 200) : undefined;
    const wilayah =
      typeof body.wilayah === "string" ? body.wilayah.trim().slice(0, 150) : undefined;
    const alamat =
      typeof body.alamat === "string" ? body.alamat.trim().slice(0, 3000) : undefined;
    const nomorHp =
      typeof body.nomorHp === "string" ? body.nomorHp.trim().slice(0, 50) : undefined;
    // Nomor alumni hanya boleh ditetapkan oleh alur verifikasi khusus.
    // Email diisi langsung oleh alumni dari halaman profil, bukan administrator.

    if (nama !== undefined && (nama.length < 2 || nama.length > 200))
      return NextResponse.json({ error: "Nama harus 2–200 karakter." }, { status: 400 });
    if (kategoriProgram !== undefined && !/^[A-Z0-9]+(?:[ ][A-Z0-9]+){0,3}$/.test(kategoriProgram))
      return NextResponse.json({ error: "Kategori program tidak valid." }, { status: 400 });
    if (nomorAngkatan !== undefined && (!nomorAngkatan || nomorAngkatan.length > 40))
      return NextResponse.json({ error: "Nomor angkatan tidak valid." }, { status: 400 });
    if (tahunAngkatan !== undefined && (!Number.isInteger(tahunAngkatan) || tahunAngkatan < 1900 || tahunAngkatan > new Date().getFullYear() + 5))
      return NextResponse.json({ error: "Tahun angkatan tidak valid." }, { status: 400 });

    const [row] = await db()`
      UPDATE alumni SET
        nama        = COALESCE(${nama ?? null}::varchar, nama),
        angkatan    = COALESCE(${kategoriProgram ?? null}::varchar, angkatan),
        kategori_program = COALESCE(${kategoriProgram ?? null}::varchar, kategori_program),
        nomor_angkatan = COALESCE(${nomorAngkatan ?? null}::varchar, nomor_angkatan),
        tahun_angkatan = COALESCE(${tahunAngkatan ?? null}::integer, tahun_angkatan),
        instansi    = COALESCE(${instansi ?? null}::varchar, instansi),
        jabatan     = COALESCE(${jabatan ?? null}::varchar, jabatan),
        wilayah     = COALESCE(${wilayah ?? null}::varchar, wilayah),
        alamat      = COALESCE(${alamat ?? null}::text, alamat),
        nomor_hp    = COALESCE(${nomorHp ?? null}::varchar, nomor_hp),
        email       = email,
        updated_at  = NOW()
      WHERE id = ${Number(id)}
      RETURNING id, COALESCE(nomor_alumni, '') AS "nomorAlumni", nama,
        COALESCE(kategori_program, angkatan) AS "kategoriProgram",
        COALESCE(nomor_angkatan, '') AS "nomorAngkatan", tahun_angkatan AS "tahunAngkatan", angkatan,
        instansi, jabatan, wilayah, alamat, COALESCE(email, '') AS email,
        nomor_hp AS "nomorHp", status, updated_at AS "updatedAt"`;

    if (!row)
      return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });

    const actor = await getAdminActor();
    if (actor) await writeAdminAudit(actor, "edit", { alumniName: row.nama, fields: Object.keys(body) }, Number(id));

    return NextResponse.json({ data: row });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23505")
      return NextResponse.json({ error: "Nomor alumni sudah terdaftar." }, { status: 409 });
    console.error("PATCH /api/alumni/[id] failed", error);
    return NextResponse.json({ error: "Gagal memperbarui data alumni." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const role = await isAdminAuthenticated();
  if (!role)
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (role !== "super_admin")
    return NextResponse.json({ error: "Hanya Super Admin yang boleh menghapus data alumni." }, { status: 403 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "ID alumni tidak valid." }, { status: 400 });

  try {
    const actor = await getAdminActor();
    const result = await db().begin(async (tx) => {
      const [row] = await tx`
        SELECT id, nama FROM alumni WHERE id = ${Number(id)} FOR UPDATE
      `;
      if (!row) return null;

      await tx`DELETE FROM alumni_accounts WHERE alumni_id = ${Number(id)}`;
      await tx`DELETE FROM alumni WHERE id = ${Number(id)}`;
      await tx`
        INSERT INTO admin_audit_log (action, alumni_id, actor, details)
        VALUES (${"delete"}, NULL, ${actor?.actor || "admin"}, ${JSON.stringify({ alumniId: Number(id), nama: row.nama, actorRole: actor?.role || "unknown" })}::jsonb)
      `;
      return row;
    });

    if (!result)
      return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });

    return NextResponse.json({ message: `Alumni "${result.nama}" beserta akun terkait berhasil dihapus.` });
  } catch (error) {
    console.error("DELETE /api/alumni/[id] failed", error);
    return NextResponse.json({ error: "Gagal menghapus data alumni." }, { status: 500 });
  }
}
