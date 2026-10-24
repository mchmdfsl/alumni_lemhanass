
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 },
      );
    }

    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) {
      return NextResponse.json(
        { error: "Password harus minimal 12 karakter." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Akun aktif yang sudah memakai email ini tidak boleh
    // didaftarkan ulang melalui endpoint registrasi.
    const existingAccount = await sql`
      SELECT id
      FROM alumni_accounts
      WHERE lower(email) = ${email}
      LIMIT 1
    `;

    if (existingAccount.length > 0) {
      return NextResponse.json(
        { error: "Permintaan tidak dapat diproses. Silakan login atau hubungi admin." },
        { status: 409 },
      );
    }

    // Cari kandidat alumni berdasarkan email saja. Hasil ini
    // tidak otomatis mengaktifkan akun atau memberikan sesi.
    const candidates = await sql`
      SELECT id
      FROM alumni
      WHERE lower(trim(coalesce(email, ''))) = ${email}
      LIMIT 2
    `;

    const matchedAlumniId =
      candidates.length === 1 ? Number(candidates[0].id) : null;

    // Jangan menyimpan password pada tabel permintaan.
    // Hash disimpan sementara pada field review_note tidak aman,
    // sehingga desain tabel harus menampung hash secara eksplisit.
    // Karena itu, endpoint ini menolak sampai migrasi berikut
    // menyediakan kolom password_hash untuk permintaan.
    return NextResponse.json(
      {
        error:
          "Registrasi belum dapat diaktifkan. Migrasi perlu menambahkan penyimpanan hash sementara pada permintaan aktivasi terlebih dahulu.",
        candidateFound: matchedAlumniId !== null,
      },
      { status: 503 },
    );
  } catch (error) {
    console.error("auth/register failed", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server saat registrasi." },
      { status: 500 },
    );
  }
        }
  
