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
      SELECT a.id, to_jsonb(a)->>'foto_profil' AS "fotoProfil"
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

    // Kolom foto profil belum tersedia di semua database yang sudah ada.
    // Cek sebelum mengunggah agar file tidak terlanjur tersimpan di R2.
    const [photoSchema] = await db()`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alumni'
          AND column_name = 'foto_profil'
      ) AS "hasPhotoColumn"
    `;
    if (!photoSchema?.hasPhotoColumn) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada skema database. Kolom foto_profil perlu disiapkan oleh administrator database." },
        { status: 503 }
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

    // 9. Hapus foto lama setelah URL baru berhasil disimpan.
    // Batasi penghapusan ke object milik alumni yang dibuat endpoint upload ini.
    const previousPhotoUrl = typeof alumni.fotoProfil === "string"
      ? alumni.fotoProfil
      : null;
    if (previousPhotoUrl && r2PublicUrl) {
      const prefix = `${r2PublicUrl}/`;
      if (previousPhotoUrl.startsWith(prefix)) {
        const previousKey = previousPhotoUrl.slice(prefix.length);
        const ownedPhotoPattern = new RegExp(
          `^profiles/${Number(alumni.id)}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)import {
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
      SELECT a.id, to_jsonb(a)->>'foto_profil' AS "fotoProfil"
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

    // Kolom foto profil belum tersedia di semua database yang sudah ada.
    // Cek sebelum mengunggah agar file tidak terlanjur tersimpan di R2.
    const [photoSchema] = await db()`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alumni'
          AND column_name = 'foto_profil'
      ) AS "hasPhotoColumn"
    `;
    if (!photoSchema?.hasPhotoColumn) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada skema database. Kolom foto_profil perlu disiapkan oleh administrator database." },
        { status: 503 }
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
,
          "i",
        );
        if (ownedPhotoPattern.test(previousKey) && previousKey !== key) {
          try {
            await r2.send(new DeleteObjectCommand({
              Bucket: r2Bucket,
              Key: previousKey,
            }));
          } catch (cleanupError) {
            // Foto baru sudah aktif; kegagalan cleanup tidak membatalkan upload.
            console.error("Gagal menghapus foto profil lama dari R2:", cleanupError);
          }
        }
      }
    }

    // 10. Kirim hasil upload ke halaman profil.
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

export async function DELETE() {
  try {
    const session = await getAlumniSession();
    if (!session) {
      return NextResponse.json(
        { message: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const [alumni] = await db()`
      SELECT a.id, to_jsonb(a)->>'foto_profil' AS "fotoProfil"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE aa.id = ${session.accountId}
        AND a.id = ${session.alumniId}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
      LIMIT 1
    `;

    if (!alumni) {
      return NextResponse.json(
        { message: "Akun alumni tidak aktif atau belum terverifikasi." },
        { status: 403 }
      );
    }

    const [photoSchema] = await db()`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alumni'
          AND column_name = 'foto_profil'
      ) AS "hasPhotoColumn"
    `;

    if (!photoSchema?.hasPhotoColumn) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada database." },
        { status: 503 }
      );
    }

    const photoUrl = typeof alumni.fotoProfil === "string"
      ? alumni.fotoProfil
      : null;

    await db()`
      UPDATE alumni
      SET foto_profil = NULL
      WHERE id = ${alumni.id}
    `;

    // Hapus file dari R2 hanya jika URL-nya berasal dari bucket publik
    // yang dikonfigurasi dan key-nya milik direktori alumni ini.
    if (photoUrl && r2PublicUrl) {
      // Hanya hapus object dengan nama yang dibuat endpoint upload:
      // profiles/{id}/{UUID}.{jpg|png|webp}. Jangan decode key bebas dari URL.
      const ownedPhotoPattern = new RegExp(
        `^profiles/${Number(alumni.id)}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)import {
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

    // Kolom foto profil belum tersedia di semua database yang sudah ada.
    // Cek sebelum mengunggah agar file tidak terlanjur tersimpan di R2.
    const [photoSchema] = await db()`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alumni'
          AND column_name = 'foto_profil'
      ) AS "hasPhotoColumn"
    `;
    if (!photoSchema?.hasPhotoColumn) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada skema database. Kolom foto_profil perlu disiapkan oleh administrator database." },
        { status: 503 }
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

export async function DELETE() {
  try {
    const session = await getAlumniSession();
    if (!session) {
      return NextResponse.json(
        { message: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const [alumni] = await db()`
      SELECT a.id, to_jsonb(a)->>'foto_profil' AS "fotoProfil"
      FROM alumni_accounts aa
      INNER JOIN alumni a ON a.id = aa.alumni_id
      WHERE aa.id = ${session.accountId}
        AND a.id = ${session.alumniId}
        AND aa.is_active = TRUE
        AND a.status = 'Terverifikasi'
      LIMIT 1
    `;

    if (!alumni) {
      return NextResponse.json(
        { message: "Akun alumni tidak aktif atau belum terverifikasi." },
        { status: 403 }
      );
    }

    const [photoSchema] = await db()`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'alumni'
          AND column_name = 'foto_profil'
      ) AS "hasPhotoColumn"
    `;

    if (!photoSchema?.hasPhotoColumn) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada database." },
        { status: 503 }
      );
    }

    const photoUrl = typeof alumni.fotoProfil === "string"
      ? alumni.fotoProfil
      : null;

    await db()`
      UPDATE alumni
      SET foto_profil = NULL
      WHERE id = ${alumni.id}
    `;

    // Hapus file dari R2 hanya jika URL-nya berasal dari bucket publik
    // yang dikonfigurasi dan key-nya milik direktori alumni ini.
,
        "i",
      );
      const prefix = `${r2PublicUrl}/`;
      if (photoUrl.startsWith(prefix)) {
        const key = photoUrl.slice(prefix.length);
        if (ownedPhotoPattern.test(key)) {
          try {
            await r2.send(
              new DeleteObjectCommand({
                Bucket: r2Bucket,
                Key: key,
              })
            );
          } catch (storageError) {
            // Database sudah dilepas dari foto; kegagalan penghapusan file
            // tidak boleh membuat profil kembali menunjuk ke foto lama.
            console.error("Gagal menghapus file foto dari R2:", storageError);
          }
        }
      }
    }

    return NextResponse.json({
      message: "Foto profil berhasil dihapus.",
      data: { fotoProfil: null },
    });
  } catch (error) {
    console.error("DELETE /api/user/profile/photo:", error);
    return NextResponse.json(
      { message: "Gagal menghapus foto profil. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
