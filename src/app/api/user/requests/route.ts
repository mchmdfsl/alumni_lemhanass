
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";

export const runtime = "nodejs";

async function getVerifiedAlumni() {
  const session = await getAlumniSession();

  if (!session) return null;

  const [alumni] = await db()`
    SELECT a.id
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
        { message: "Silakan login sebagai alumni." },
        { status: 401 }
      );
    }

    const data = await db()`
      SELECT
        id,
        request_type AS "requestType",
        message,
        status,
        admin_note AS "adminNote",
        created_at AS "createdAt",
        reviewed_at AS "reviewedAt"
      FROM alumni_user_requests
      WHERE alumni_id = ${alumni.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/user/requests:", error);

    return NextResponse.json(
      { message: "Gagal mengambil riwayat pengajuan." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const alumni = await getVerifiedAlumni();

    if (!alumni) {
      return NextResponse.json(
        { message: "Silakan login sebagai alumni." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const type =
      typeof body.type === "string" ? body.type : "";

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!["data_update", "delete_account"].includes(type)) {
      return NextResponse.json(
        { message: "Jenis pengajuan tidak valid." },
        { status: 400 }
      );
    }

    if (!message || message.length > 2000) {
      return NextResponse.json(
        { message: "Pesan wajib diisi, maksimal 2.000 karakter." },
        { status: 400 }
      );
    }

    const [result] = await db()`
      INSERT INTO alumni_user_requests (
        alumni_id,
        request_type,
        message,
        status
      )
      VALUES (
        ${alumni.id},
        ${type},
        ${message},
        'Menunggu'
      )
      RETURNING
        id,
        request_type AS "requestType",
        message,
        status,
        created_at AS "createdAt"
    `;

    return NextResponse.json(
      {
        message: "Pengajuan berhasil dikirim ke admin.",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/user/requests:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan pengajuan." },
      { status: 500 }
    );
  }
}
  
