import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";
import { assignAlumniNumber } from "@/lib/alumni-number";
import { getAdminScope } from "@/lib/admin-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewError =
  | "NOT_FOUND" | "ALREADY_REVIEWED" | "ALUMNI_NOT_LINKED"
  | "ALUMNI_NOT_FOUND" | "IDENTITY_NOT_VERIFIED" | "ACCOUNT_EXISTS"
  | "EMAIL_IN_USE" | "NOMOR_ALUMNI_IN_USE" | "INVALID_NEW_ALUMNI";

type ReviewResult =
  | { success: true; status: "Disetujui" | "Ditolak"; alumniId?: number }
  | { error: ReviewError };

const errorResponses: Record<ReviewError, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Pendaftaran tidak ditemukan." },
  ALREADY_REVIEWED: { status: 409, message: "Pendaftaran sudah diproses." },
  ALUMNI_NOT_LINKED: { status: 409, message: "Pengajuan klaim belum terhubung ke data alumni." },
  ALUMNI_NOT_FOUND: { status: 404, message: "Data alumni tidak ditemukan." },
  IDENTITY_NOT_VERIFIED: { status: 409, message: "Data alumni belum terverifikasi." },
  ACCOUNT_EXISTS: { status: 409, message: "Akun untuk alumni atau email ini sudah ada." },
  EMAIL_IN_USE: { status: 409, message: "Email sudah digunakan pada data alumni lain." },
  NOMOR_ALUMNI_IN_USE: { status: 409, message: "Nomor alumni sudah digunakan pada data lain." },
  INVALID_NEW_ALUMNI: { status: 400, message: "Data pendaftaran alumni baru belum lengkap." },
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getAdminScope();
    if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
    if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });

    const { id } = await context.params;
    if (!/^[1-9]\d*$/.test(id)) {
      return NextResponse.json({ error: "ID pendaftaran tidak valid." }, { status: 400 });
    }

    let body: { status?: unknown; reviewNote?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Format JSON tidak valid." }, { status: 400 });
    }

    const status = body.status;
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 1000) : "";
    if (status !== "Disetujui" && status !== "Ditolak") {
      return NextResponse.json({ error: "Status harus Disetujui atau Ditolak." }, { status: 400 });
    }
    if (status === "Ditolak" && !reviewNote) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    }

    const actor = await getAdminActor();
    const sql = db();
    const result: ReviewResult = await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT id, alumni_id, email, password_hash, request_type, status,
          submitted_nama, submitted_angkatan, submitted_kategori_program,
          submitted_nomor_angkatan, submitted_tahun_angkatan, submitted_nomor_hp,
          submitted_nomor_alumni, submitted_instansi, submitted_jabatan,
          submitted_wilayah, submitted_alamat
        FROM alumni_account_requests WHERE id = ${id} FOR UPDATE
      `;
      const req = rows[0];
      if (!req) return { error: "NOT_FOUND" };
      if (scope.role === "admin") {
        if (req.alumni_id === null) {
          const submittedCategory = String(req.submitted_kategori_program || req.submitted_angkatan || "").trim().toLocaleUpperCase("id-ID");
          if (submittedCategory !== scope.kategoriProgram) return { error: "NOT_FOUND" };
        } else {
          const [target] = await tx`SELECT id FROM alumni WHERE id = ${req.alumni_id} AND upper(COALESCE(NULLIF(trim(kategori_program), ''), angkatan, '')) = ${scope.kategoriProgram ?? ""} LIMIT 1`;
          if (!target) return { error: "NOT_FOUND" };
        }
      }
      if (req.status !== "Menunggu") return { error: "ALREADY_REVIEWED" };

      if (status === "Ditolak") {
        await tx`
          UPDATE alumni_account_requests
          SET status = 'Ditolak', review_note = ${reviewNote}, reviewed_at = NOW()
          WHERE id = ${id}
        `;
        return { success: true, status: "Ditolak" };
      }

      let alumniId: number;

      if (req.request_type === "claim") {
        if (req.alumni_id === null) return { error: "ALUMNI_NOT_LINKED" };

        const alumniRows = await tx`
          SELECT id, status FROM alumni WHERE id = ${req.alumni_id} FOR UPDATE
        `;
        const alumni = alumniRows[0];
        if (!alumni) return { error: "ALUMNI_NOT_FOUND" };
        if (alumni.status !== "Terverifikasi") return { error: "IDENTITY_NOT_VERIFIED" };

        const account = await tx`
          SELECT id FROM alumni_accounts
          WHERE alumni_id = ${req.alumni_id} OR lower(email) = lower(${req.email})
          LIMIT 1
        `;
        if (account.length) return { error: "ACCOUNT_EXISTS" };

        const emailOwner = await tx`
          SELECT id FROM alumni
          WHERE lower(trim(coalesce(email, ''))) = lower(${req.email})
            AND id <> ${req.alumni_id}
          LIMIT 1
        `;
        if (emailOwner.length) return { error: "EMAIL_IN_USE" };

        // Email lama memang boleh kosong. Isi dengan email yang diajukan saat klaim disetujui.
        await tx`
          UPDATE alumni SET email = ${req.email}, updated_at = NOW()
          WHERE id = ${req.alumni_id}
        `;
        alumniId = Number(req.alumni_id);
      } else if (req.request_type === "register") {
        const nama = typeof req.submitted_nama === "string" ? req.submitted_nama.trim() : "";
        const kategoriProgram = typeof req.submitted_kategori_program === "string" ? req.submitted_kategori_program.trim() : typeof req.submitted_angkatan === "string" ? req.submitted_angkatan.trim() : "";
        const nomorAngkatan = typeof req.submitted_nomor_angkatan === "string" ? req.submitted_nomor_angkatan.trim() : "";
        const tahunAngkatan = Number(req.submitted_tahun_angkatan);
        if (!nama || !kategoriProgram || !nomorAngkatan || !Number.isInteger(tahunAngkatan)) return { error: "INVALID_NEW_ALUMNI" };

        const emailOwner = await tx`
          SELECT id FROM alumni WHERE lower(trim(coalesce(email, ''))) = lower(${req.email}) LIMIT 1
        `;
        if (emailOwner.length) return { error: "EMAIL_IN_USE" };

        const account = await tx`
          SELECT id FROM alumni_accounts WHERE lower(email) = lower(${req.email}) LIMIT 1
        `;
        if (account.length) return { error: "ACCOUNT_EXISTS" };

        const inserted = await tx`
          INSERT INTO alumni (
            nomor_alumni, nama, angkatan, kategori_program, nomor_angkatan, tahun_angkatan,
            instansi, jabatan, wilayah, alamat, email, nomor_hp, status, sumber_data, verified_at, updated_at
          ) VALUES (
            NULL, ${nama}, ${kategoriProgram}, ${kategoriProgram}, ${nomorAngkatan}, ${tahunAngkatan},
            ${req.submitted_instansi || ""}, ${req.submitted_jabatan || ""},
            ${req.submitted_wilayah || ""}, ${req.submitted_alamat || ""},
            ${req.email}, ${req.submitted_nomor_hp || ""}, 'Terverifikasi',
            'pengajuan', NOW(), NOW()
          )
          RETURNING id
        `;
        alumniId = Number(inserted[0].id);
        await assignAlumniNumber(tx, alumniId, kategoriProgram, null);
      } else {
        return { error: "INVALID_NEW_ALUMNI" };
      }

      await tx`
        INSERT INTO alumni_accounts (alumni_id, email, password_hash, is_active)
        VALUES (${alumniId}, ${req.email}, ${req.password_hash}, TRUE)
      `;

      await tx`
        UPDATE alumni_account_requests
        SET alumni_id = ${alumniId}, status = 'Disetujui',
            review_note = NULL, reviewed_at = NOW()
        WHERE id = ${id}
      `;
      return { success: true, status: "Disetujui", alumniId };
    });

    if ("error" in result) {
      const response = errorResponses[result.error];
      return NextResponse.json({ error: response.message }, { status: response.status });
    }
    if (actor) await writeAdminAudit(actor, result.status === "Disetujui" ? "account_request_approved" : "account_request_rejected", { requestId: Number(id), status: result.status, alumniId: result.alumniId ?? null });
    return NextResponse.json({ ok: true, status: result.status, alumniId: result.alumniId });
  } catch (error) {
    console.error("PATCH alumni account request failed:", error);
    return NextResponse.json({ error: "Gagal memproses pendaftaran akun." }, { status: 500 });
  }
}
