import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminScope, adminCanManageCategory } from "@/lib/admin-scope";
import { getR2Client, r2Bucket } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan." }, { status: 403 });

  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) return NextResponse.json({ error: "ID pengajuan tidak valid." }, { status: 400 });

  try {
    const [row] = await db()`
      SELECT r.submitted_bukti_url AS "evidenceKey",
        r.submitted_bukti_nama AS "fileName",
        COALESCE(NULLIF(trim(a.kategori_program), ''), a.angkatan, r.submitted_kategori_program, r.submitted_angkatan, '') AS category
      FROM alumni_account_requests r
      LEFT JOIN alumni a ON a.id = r.alumni_id
      WHERE r.id = ${Number(id)} AND r.request_type = 'register'
      LIMIT 1
    `;
    if (!row?.evidenceKey) return NextResponse.json({ error: "Dokumen bukti tidak ditemukan." }, { status: 404 });
    if (scope.role === "admin" && !adminCanManageCategory(scope, String(row.category || ""))) {
      return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 404 });
    }

    const object = await getR2Client().send(new GetObjectCommand({ Bucket: r2Bucket, Key: String(row.evidenceKey) }));
    if (!object.Body) return NextResponse.json({ error: "Dokumen tidak tersedia." }, { status: 404 });
    const bytes = await object.Body.transformToByteArray();
    const key = String(row.evidenceKey);
    const contentType = key.endsWith(".pdf") ? "application/pdf" : key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const filename = String(row.fileName || "bukti-alumni").replace(/[\r\n"]/g, "_");
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET registration evidence failed:", error);
    return NextResponse.json({ error: "Gagal membuka dokumen bukti." }, { status: 500 });
  }
}
