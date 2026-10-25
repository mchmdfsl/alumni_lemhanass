import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
try {
const body = await request.json();

const nomorAlumni =
  typeof body.nomorAlumni === "string"
    ? body.nomorAlumni.trim()
    : "";

const nama =
  typeof body.nama === "string" ? body.nama.trim() : "";

const email =
  typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";

const password =
  typeof body.password === "string" ? body.password : "";

if (!nomorAlumni || !nama || !email || !password) {
  return NextResponse.json(
    { error: "Semua field wajib diisi." },
    { status: 400 }
  );
}

if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  email.length > 254
) {
  return NextResponse.json(
    { error: "Format email tidak valid." },
    { status: 400 }
  );
}

if (password.length < 12) {
  return NextResponse.json(
    { error: "Password minimal 12 karakter." },
    { status: 400 }
  );
}

const passwordHash = await hashPassword(password);
const sql = db();

const result = await sql.begin(async (tx) => {
  const alumniRows = await tx`
    SELECT id, nama, status
    FROM alumni
    WHERE trim(nomor_alumni) = ${nomorAlumni}
      AND lower(trim(nama)) = lower(${nama})
    LIMIT 2
  `;

  if (alumniRows.length !== 1) {
    return { kind: "not_matched" as const };
  }

  const alumni = alumniRows[0];

  if (alumni.status !== "Terverifikasi") {
    return { kind: "not_verified" as const };
  }

  const existing = await tx`
    SELECT id
    FROM alumni_accounts
    WHERE alumni_id = ${alumni.id}
       OR lower(email) = ${email}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return { kind: "account_exists" as const };
  }

  const pending = await tx`
    SELECT id
    FROM alumni_account_requests
    WHERE alumni_id = ${alumni.id}
      AND status = 'Menunggu'
    LIMIT 1
  `;

  if (pending.length > 0) {
    return { kind: "pending" as const };
  }

  await tx`
    INSERT INTO alumni_account_requests (
      alumni_id,
      email,
      password_hash,
      request_type,
      status
    )
    VALUES (
      ${alumni.id},
      ${email},
      ${passwordHash},
      'claim',
      'Menunggu'
    )
  `;

  return { kind: "created" as const };
});

if (result.kind === "not_matched") {
  return NextResponse.json(
    {
      error:
        "Data alumni tidak cocok. Periksa nomor dan nama yang dimasukkan.",
    },
    { status: 404 }
  );
}

if (result.kind === "not_verified") {
  return NextResponse.json(
    {
      error:
        "Data alumni belum terverifikasi. Hubungi administrator.",
    },
    { status: 403 }
  );
}

if (result.kind === "account_exists") {
  return NextResponse.json(
    {
      error:
        "Akun untuk data alumni atau email tersebut sudah ada.",
    },
    { status: 409 }
  );
}

if (result.kind === "pending") {
  return NextResponse.json(
    {
      error:
        "Pengajuan untuk data alumni ini masih menunggu pemeriksaan admin.",
    },
    { status: 409 }
  );
}

return NextResponse.json(
  {
    message:
      "Pengajuan berhasil dikirim. Akun belum aktif dan menunggu verifikasi admin.",
  },
  { status: 202 }
);

} catch (error) {
console.error("POST /api/auth/claim error:", error);

return NextResponse.json(
  { error: "Terjadi kesalahan server saat memproses klaim akun." },
  { status: 500 }
);

}
  }
