import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminScope } from "@/lib/admin-scope";
import { getAdminActor } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const scope = await getAdminScope();
  if (!scope) return NextResponse.json({ error: "Akses hanya untuk Admin dan Super Admin." }, { status: 403 });
  if (scope.role === "admin" && !scope.kategoriProgram) return NextResponse.json({ error: "Kategori akun Admin belum ditetapkan oleh Super Admin." }, { status: 403 });
  const actor = await getAdminActor();
  const actorName = actor?.actor ?? "";

  try {
    const params = request.nextUrl.searchParams;
    const pageRaw = Number(params.get("page") || "1");
    const page = Number.isSafeInteger(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 100000) : 1;
    const limitRaw = Number(params.get("limit") || "25");
    const limit = Number.isSafeInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 25;
    const search = (params.get("q") || "").trim().slice(0, 120);
    const action = (params.get("action") || "").trim().slice(0, 80);
    const offset = (page - 1) * limit;

    const [count] = await db()`
      SELECT COUNT(*)::int AS total
      FROM admin_audit_log l
      WHERE (${search} = '' OR l.actor ILIKE ${'%' + search + '%'} OR l.action ILIKE ${'%' + search + '%'} OR COALESCE(l.details::text, '') ILIKE ${'%' + search + '%'})
        AND (${action} = '' OR l.action = ${action})
        AND (${scope.role === "super_admin"} = TRUE OR l.actor = ${actorName})
    `;
    const logs = await db()`
      SELECT l.id, l.action, l.actor, l.alumni_id AS "alumniId", l.details,
             l.created_at AS "createdAt"
      FROM admin_audit_log l
      WHERE (${search} = '' OR l.actor ILIKE ${'%' + search + '%'} OR l.action ILIKE ${'%' + search + '%'} OR COALESCE(l.details::text, '') ILIKE ${'%' + search + '%'})
        AND (${action} = '' OR l.action = ${action})
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return NextResponse.json({
      logs,
      pagination: { page, limit, total: Number(count?.total ?? 0), totalPages: Math.max(1, Math.ceil(Number(count?.total ?? 0) / limit)) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/activity-logs failed:", error);
    return NextResponse.json({ error: "Gagal mengambil log aktivitas. Pastikan tabel admin_audit_log tersedia di database." }, { status: 500 });
  }
}
