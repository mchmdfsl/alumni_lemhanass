import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function authorizeAndFindId(context: RouteContext) {
  const role = await isAdminAuthenticated();
  if (role !== "super_admin") return { response: NextResponse.json({ error: "Akses hanya untuk Super Admin." }, { status: 403 }) };
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) return { response: NextResponse.json({ error: "ID admin tidak valid." }, { status: 400 }) };
  return { id };
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeAndFindId(context);
  if ("response" in access) return access.response;
  try {
    const body = await request.json();
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Status isActive harus berupa boolean." }, { status: 400 });
    const [user] = await db()`
      UPDATE admin_users SET is_active = ${body.isActive}, updated_at = NOW()
      WHERE id = ${access.id} AND role = ${"admin"}
      RETURNING id, username, email, is_active AS "isActive", updated_at AS "updatedAt"
    `;
    if (!user) return NextResponse.json({ error: "Akun admin tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] failed:", error);
    return NextResponse.json({ error: "Gagal memperbarui status akun admin." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await authorizeAndFindId(context);
  if ("response" in access) return access.response;
  try {
    const [user] = await db()`
      DELETE FROM admin_users WHERE id = ${access.id} AND role = ${"admin"}
      RETURNING id, username
    `;
    if (!user) return NextResponse.json({ error: "Akun admin tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] failed:", error);
    return NextResponse.json({ error: "Gagal menghapus akun admin." }, { status: 500 });
  }
}
