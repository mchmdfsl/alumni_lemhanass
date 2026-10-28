import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAlumniSession } from "@/lib/alumni-session";
import { getR2Client, r2Bucket, r2PublicUrl } from "@/lib/r2";

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
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
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

function ownedPhotoKey(alumniId: number, photoUrl: string): string | null {
  if (!r2PublicUrl) return null;
  const prefix = `${r2PublicUrl.replace(/\/$/, "")}/`;
  if (!photoUrl.startsWith(prefix)) return null;

  const key = photoUrl.slice(prefix.length);
  const pattern = new RegExp(
    `^profiles/${alumniId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
    "i",
  );
  return pattern.test(key) ? key : null;
}

async function getCurrentAlumni(accountId: number, alumniId: number) {
  const [alumni] = await db()`
    SELECT a.id, to_jsonb(a)->>'foto_profil' AS "fotoProfil"
    FROM alumni_accounts aa
    INNER JOIN alumni a ON a.id = aa.alumni_id
    WHERE aa.id = ${accountId}
      AND a.id = ${alumniId}
      AND aa.is_active = TRUE
      AND a.status = 'Terverifikasi'
    LIMIT 1
  `;
  return alumni;
}

async function hasPhotoColumn() {
  const [result] = await db()`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'alumni'
        AND column_name = 'foto_profil'
    ) AS "hasPhotoColumn"
  `;
  return Boolean(result?.hasPhotoColumn);
}

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;
  let databaseUpdated = false;

  try {
    const session = await getAlumniSession();
    if (!session) {
      return NextResponse.json(
        { message: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 },
      );
    }

    const alumni = await getCurrentAlumni(session.accountId, session.alumniId);
    if (!alumni) {
      return NextResponse.json(
        { message: "Akun alumni tidak aktif atau belum terverifikasi." },
        { status: 403 },
      );
    }

    if (!(await hasPhotoColumn())) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada skema database." },
        { status: 503 },
      );
    }

    if (!r2PublicUrl) {
      console.error("R2_PUBLIC_URL belum dikonfigurasi.");
      return NextResponse.json(
        { message: "URL publik Cloudflare R2 belum dikonfigurasi." },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File)) {
      return NextResponse.json(
        { message: 'Foto tidak ditemukan. Pastikan field upload bernama "photo".' },
        { status: 400 },
      );
    }
    if (photo.size === 0) {
      return NextResponse.json({ message: "File foto kosong." }, { status: 400 });
    }
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Ukuran foto maksimal 5 MB." }, { status: 413 });
    }

    const imageType = ALLOWED_TYPES[photo.type as keyof typeof ALLOWED_TYPES];
    if (!imageType) {
      return NextResponse.json(
        { message: "Format foto harus JPG, PNG, atau WebP." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    if (!imageType.signature(buffer)) {
      return NextResponse.json(
        { message: "File tidak terbaca sebagai gambar yang valid." },
        { status: 400 },
      );
    }

    const key = `profiles/${Number(alumni.id)}/${randomUUID()}.${imageType.extension}`;
    const photoUrl = `${r2PublicUrl.replace(/\/$/, "")}/${key}`;

    await getR2Client().send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: photo.type,
      CacheControl: "public, max-age=31536000, immutable",
    }));
    uploadedKey = key;

    const [updatedAlumni] = await db()`
      UPDATE alumni
      SET foto_profil = ${photoUrl}, updated_at = NOW()
      WHERE id = ${alumni.id}
      RETURNING id
    `;
    if (!updatedAlumni) {
      throw new Error("Data alumni tidak ditemukan saat menyimpan foto profil.");
    }
    databaseUpdated = true;

    const previousPhotoUrl = typeof alumni.fotoProfil === "string"
      ? alumni.fotoProfil
      : null;
    if (previousPhotoUrl) {
      const previousKey = ownedPhotoKey(Number(alumni.id), previousPhotoUrl);
      if (previousKey && previousKey !== key) {
        try {
          await r2.send(new DeleteObjectCommand({
            Bucket: r2Bucket,
            Key: previousKey,
          }));
        } catch (cleanupError) {
          console.error("Gagal menghapus foto profil lama dari R2:", cleanupError);
        }
      }
    }

    return NextResponse.json({
      message: "Foto profil berhasil diperbarui.",
      data: { fotoProfil: photoUrl },
    });
  } catch (error) {
    console.error("POST /api/user/profile/photo failed:", error);
    if (uploadedKey && !databaseUpdated) {
      try {
        await r2.send(new DeleteObjectCommand({
          Bucket: r2Bucket,
          Key: uploadedKey,
        }));
      } catch (cleanupError) {
        console.error("Gagal membersihkan foto baru dari R2:", cleanupError);
      }
    }
    return NextResponse.json(
      { message: "Gagal mengunggah foto profil. Silakan coba lagi." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getAlumniSession();
    if (!session) {
      return NextResponse.json(
        { message: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 },
      );
    }

    const alumni = await getCurrentAlumni(session.accountId, session.alumniId);
    if (!alumni) {
      return NextResponse.json(
        { message: "Akun alumni tidak aktif atau belum terverifikasi." },
        { status: 403 },
      );
    }

    if (!(await hasPhotoColumn())) {
      return NextResponse.json(
        { message: "Fitur foto profil belum diaktifkan pada database." },
        { status: 503 },
      );
    }

    const photoUrl = typeof alumni.fotoProfil === "string" ? alumni.fotoProfil : null;
    await db()`
      UPDATE alumni
      SET foto_profil = NULL, updated_at = NOW()
      WHERE id = ${alumni.id}
    `;

    if (photoUrl) {
      const key = ownedPhotoKey(Number(alumni.id), photoUrl);
      if (key) {
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
        } catch (storageError) {
          // URL di database sudah dilepas; kegagalan R2 tidak memulihkan foto lama.
          console.error("Gagal menghapus file foto dari R2:", storageError);
        }
      }
    }

    return NextResponse.json({
      message: "Foto profil berhasil dihapus.",
      data: { fotoProfil: null },
    });
  } catch (error) {
    console.error("DELETE /api/user/profile/photo failed:", error);
    return NextResponse.json(
      { message: "Gagal menghapus foto profil. Silakan coba lagi." },
      { status: 500 },
    );
  }
}
