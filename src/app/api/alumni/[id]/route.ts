import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const statusValues = new Set(["Menunggu", "Terverifikasi", "Ditolak"]);

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
    const angkatan =
      typeof body.angkatan === "string" ? body.angkatan.trim().slice(0, 100) : undefined;
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
    const nomorAlumni =
      typeof body.nomorAlumni === "string" ? body.nomorAlumni.trim().slice(0, 80) || null : undefined;
    const status =
      typeof body.status === "string" && statusValues.has(body.status) ? body.status : undefined;

    // Email diisi langsung oleh alumni dari halaman profil, bukan administrator.

    if (nama !== undefined && (nama.length < 2 || nama.length > 200))
      return NextResponse.json({ error: "Nama harus 2–200 karakter." }, { status: 400 });

    const [row] = await db()`
      UPDATE alumni SET
        nama        = COALESCE(${nama ?? null}::varchar, nama),
        angkatan    = COALESCE(${angkatan ?? null}::varchar, angkatan),
        instansi    = COALESCE(${instansi ?? null}::varchar, instansi),
        jabatan     = COALESCE(${jabatan ?? null}::varchar, jabatan),
        wilayah     = COALESCE(${wilayah ?? null}::varchar, wilayah),
        alamat      = COALESCE(${alamat ?? null}::text, alamat),
        nomor_hp    = COALESCE(${nomorHp ?? null}::varchar, nomor_hp),
        nomor_alumni = COALESCE(${nomorAlumni !== undefined ? nomorAlumni : null}, nomor_alumni),
        email       = email,
        status      = COALESCE(${status ?? null}::varchar, status),
        updated_at  = NOW()
      WHERE id = ${Number(id)}
      RETURNING id, COALESCE(nomor_alumni, '') AS "nomorAlumni", nama, angkatan,
        instansi, jabatan, wilayah, alamat, COALESCE(email, '') AS email,
        nomor_hp AS "nomorHp", status, updated_at AS "updatedAt"`;

    if (!row)
      return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });

    await db()`
      INSERT INTO admin_audit_log (action, alumni_id, details)
      VALUES ('edit', ${Number(id)}, ${JSON.stringify({ fields: Object.keys(body) })}::jsonb)`;

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
  if (!(await isAdminAuthenticated()))
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });

  const { id } = await context.params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "ID alumni tidak valid." }, { status: 400 });

  try {
    const result = await db().begin(async (tx) => {
      const [row] = await tx`
        SELECT id, nama FROM alumni WHERE id = ${Number(id)} FOR UPDATE
      `;
      if (!row) return null;

      await tx`DELETE FROM alumni_accounts WHERE alumni_id = ${Number(id)}`;
      await tx`DELETE FROM alumni WHERE id = ${Number(id)}`;
      await tx`
        INSERT INTO admin_audit_log (action, alumni_id, details)
        VALUES (${'delete'}, NULL, ${JSON.stringify({ alumniId: Number(id), nama: row.nama })}::jsonb)
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
