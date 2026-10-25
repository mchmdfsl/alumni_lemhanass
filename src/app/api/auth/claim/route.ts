
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const nama =
      typeof body.nama === "string"
        ? body.nama.trim()
        : "";

    const angkatan =
      typeof body.angkatan === "string"
        ? body.angkatan.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!nama || !angkatan || !email || !password) {
      return NextResponse.json(
        { error: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (nama.length > 200 || angkatan.length > 100) {
      return NextResponse.json(
        { error: "Nama atau angkatan terlalu panjang." },
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

    if (
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 1024
    ) {
      return NextResponse.json(
        { error: "Password harus 12 karakter atau lebih." },
        { status: 400 }
      );
    }

    const sql = db();

    const result = await sql.begin(async (tx) => {
      // Cocokkan identitas menggunakan nama dan angkatan.
      // ID internal database bukan nomor alumni.
      const alumniRows = await tx`
        SELECT id, nama, angkatan, status
        FROM alumni
        WHERE lower(trim(nama)) = lower(${nama})
          AND trim(angkatan::text) = ${angkatan}
        LIMIT 2
      `;

      // Jangan memilih secara sembarang jika tidak ada
      // hasil atau ditemukan lebih dari satu hasil.
      if (alumniRows.length !== 1) {
        return { kind: "not_matched" as const };
      }

      const alumni = alumniRows[0];

      if (alumni.status !== "Terverifikasi") {
        return { kind: "not_verified" as const };
      }

      // Satu alumni hanya boleh memiliki satu akun.
      // Email juga tidak boleh digunakan akun lain.
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

      // Hash password sebelum disimpan.
      const passwordHash = await hashPassword(password);

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
            "Data alumni tidak cocok atau tidak unik. Periksa nama dan angkatan sesuai data database.",
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
            "Pengajuan klaim akun masih menunggu pemeriksaan admin.",
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
      {
        error:
          "Terjadi kesalahan server saat memproses klaim akun.",
      },
      { status: 500 }
    );
  }
}
