
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json(
      { error: "ID pendaftaran tidak valid." },
      { status: 400 },
    );
  }

  let body: { status?: unknown; reviewNote?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format JSON tidak valid." },
      { status: 400 },
    );
  }

  const status = body.status;
  const reviewNote =
    typeof body.reviewNote === "string"
      ? body.reviewNote.trim().slice(0, 1000)
      : "";

  if (status !== "Disetujui" && status !== "Ditolak") {
    return NextResponse.json(
      { error: "Status harus Disetujui atau Ditolak." },
      { status: 400 },
    );
  }

  if (status === "Ditolak" && !reviewNote) {
    return NextResponse.json(
      { error: "Alasan penolakan wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const sql = db();

    const result = await sql.begin(async (tx) => {
      const requests = await tx`
        SELECT
          id,
          alumni_id,
          email,
          password_hash,
          request_type,
          status
        FROM alumni_account_requests
        WHERE id = ${id}
        FOR UPDATE
      `;

      const registration = requests[0];

      if (!registration) {
        return { error: "NOT_FOUND" as const };
      }

      if (registration.status !== "Menunggu") {
        return { error: "ALREADY_REVIEWED" as const };
      }

      if (status === "Ditolak") {
        await tx`
          UPDATE alumni_account_requests
          SET status = 'Ditolak',
              review_note = ${reviewNote},
              reviewed_at = NOW()
          WHERE id = ${id}
        `;

        return { success: true as const, status: "Ditolak" };
      }

      if (registration.alumni_id === null) {
        return { error: "ALUMNI_NOT_LINKED" as const };
      }

      const alumniRows = await tx`
        SELECT id, email, status
        FROM alumni
        WHERE id = ${registration.alumni_id}
        FOR UPDATE
      `;

      const alumni = alumniRows[0];

      if (!alumni) {
        return { error: "ALUMNI_NOT_FOUND" as const };
      }

      if (
        alumni.status !== "Terverifikasi" ||
        !alumni.email ||
        alumni.email.trim().toLowerCase() !==
          String(registration.email).trim().toLowerCase()
      ) {
        return { error: "IDENTITY_NOT_VERIFIED" as const };
      }

      const existing = await tx`
        SELECT id
        FROM alumni_accounts
        WHERE alumni_id = ${registration.alumni_id}
           OR lower(email) = lower(${registration.email})
        LIMIT 1
      `;

      if (existing.length > 0) {
        return { error: "ACCOUNT_EXISTS" as const };
      }

      await tx`
        INSERT INTO alumni_accounts (
          alumni_id,
          email,
          password_hash,
          is_active
        )
        VALUES (
          ${registration.alumni_id},
          ${registration.email},
          ${registration.password_hash},
          TRUE
        )
      `;

      await tx`
        UPDATE alumni_account_requests
        SET status = 'Disetujui',
            review_note = NULL,
            reviewed_at = NOW()
        WHERE id = ${id}
      `;

      return { success: true as const, status: "Disetujui" };
    });

    if ("error" in result) {
      const responses: Record<
        string,
        { status: number; message: string }
      > = {
        NOT_FOUND: {
          status: 404,
          message: "Pendaftaran tidak ditemukan.",
        },
        ALREADY_REVIEWED: {
          status: 409,
          message: "Pendaftaran sudah diproses.",
        },
        ALUMNI_NOT_LINKED: {
          status: 409,
          message: "Pendaftaran belum terhubung ke data alumni.",
        },
        ALUMNI_NOT_FOUND: {
          status: 404,
          message: "Data alumni tidak ditemukan.",
        },
        IDENTITY_NOT_VERIFIED: {
          status: 409,
          message:
            "Identitas belum cocok dengan email pada data alumni terverifikasi.",
        },
        ACCOUNT_EXISTS: {
          status: 409,
          message: "Akun untuk alumni atau email ini sudah ada.",
        },
      };

      const response = responses[result.error];

      return NextResponse.json(
        { error: response.message },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      status: result.status,
    });
  } catch (error) {
    console.error("PATCH alumni account request failed:", error);

    return NextResponse.json(
      { error: "Gagal memproses pendaftaran akun." },
      { status: 500 },
    );
  }
            }
       
