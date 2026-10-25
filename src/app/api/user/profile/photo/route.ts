import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";
import { r2, r2Bucket, r2PublicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": {
    extension: "jpg",
    signature: (buffer: Buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },

  "image/png": {
    extension: "png",
    signature: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(
          Buffer.from([
            137, 80, 78, 71, 13, 10, 26, 10,
          ])
        ),
  },

  "image/webp": {
    extension: "webp",
    signature: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;

  try {
    // 1. Periksa sesi login alumni.
    const session = await getAlumniSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "Sesi login berakhir. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    // 2. Pastikan akun aktif dan alumni terverifikasi.
    const [alumni] = await db()`
      SELECT a.id
      FROM alumni_accounts aa
      INNER JOIN alumni a
        ON a.id = aa.alumni_id
      WHERE aa.id = ${session.accountId}
        AND a.id = ${session.alumniId}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
      LIMIT 1
    `;

    if (!alumni) {
      return NextResponse.json(
        {
          message:
            "Akun alumni tidak aktif atau belum terverifikasi.",
        },
        { status: 403 }
      );
    }

    // 3. Periksa konfigurasi Cloudflare R2.
    if (!r2PublicUrl) {
      console.error("R2_PUBLIC_URL belum dikonfigurasi.");

      return NextResponse.json(
        {
          message:
            "URL publik Cloudflare R2 belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    // 4. Ambil file dari form.
    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json(
        {
          message:
            'Foto tidak ditemukan. Pastikan field upload bernama "photo".',
        },
        { status: 400 }
      );
    }

    if (photo.size === 0) {
      return NextResponse.json(
        { message: "File foto kosong." },
        { status: 400 }
      );
    }

    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Ukuran foto maksimal 5 MB." },
        { status: 413 }
      );
    }

    // 5. Validasi format gambar.
    const imageType =
      ALLOWED_TYPES[
        photo.type as keyof typeof ALLOWED_TYPES
      ];

    if (!imageType) {
      return NextResponse.json(
        {
          message: "Format foto harus JPG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(
      await photo.arrayBuffer()
    );

    if (!imageType.signature(buffer)) {
      return NextResponse.json(
        {
          message:
            "File tidak terbaca sebagai gambar yang valid.",
        },
        { status: 400 }
      );
    }

    // 6. Buat lokasi file unik di bucket R2.
    const key =
      `profiles/${alumni.id}/` +
      `${randomUUID()}.${imageType.extension}`;

    const photoUrl =
      `${r2PublicUrl}/${key
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/")}`;

    // 7. Upload file ke Cloudflare R2.
    await r2.send(
      new PutObjectCommand({
        Bucket: r2Bucket,
        Key: key,
        Body: buffer,
        ContentType: photo.type,
        CacheControl:
          "public, max-age=31536000, immutable",
      })
    );

    uploadedKey = key;

    // 8. Simpan URL foto ke database.
    await db()`
      UPDATE alumni
      SET foto_profil = ${photoUrl}
      WHERE id = ${alumni.id}
    `;

    // 9. Kirim hasil upload ke halaman profil.
    return NextResponse.json(
      {
        message: "Foto profil berhasil diperbarui.",
        data: {
          fotoProfil: photoUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "POST /api/user/profile/photo:",
      error
    );

    // Jika upload R2 berhasil tetapi database gagal,
    // hapus file yang telanjur diunggah.
    if (uploadedKey) {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: r2Bucket,
            Key: uploadedKey,
          })
        );
      } catch (cleanupError) {
        console.error(
          "Gagal membersihkan foto dari R2:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        message:
          "Gagal mengunggah foto profil. Periksa konfigurasi R2 dan database.",
      },
      { status: 500 }
    );
  }
      }
