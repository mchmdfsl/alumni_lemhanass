import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getAdminActor, writeAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const role = await isAdminAuthenticated();
  if (role !== "super_admin") return NextResponse.json({ error: "Akses hanya untuk Super Admin." }, { status: 403 });
  try {
    const users = await db()`
      SELECT id, username, email, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM admin_users ORDER BY created_at DESC, id DESC
    `;
    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/admin/users failed:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar admin. Pastikan migrasi admin_users sudah dijalankan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const role = await isAdminAuthenticated();
  if (role !== "super_admin") return NextResponse.json({ error: "Akses hanya untuk Super Admin." }, { status: 403 });
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) return NextResponse.json({ error: "Username tidak valid." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+[.][^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    if (password.length < 12 || Buffer.byteLength(password, "utf8") > 1024) return NextResponse.json({ error: "Password harus minimal 12 karakter." }, { status: 400 });
    const passwordHash = await hashPassword(password);
    const [user] = await db()`
      INSERT INTO admin_users (username, email, password_hash, role, is_active)
      VALUES (${username}, ${email}, ${passwordHash}, ${"admin"}, TRUE)
      RETURNING id, username, email, is_active AS "isActive", created_at AS "createdAt"
    `;
    const actor = await getAdminActor();
    if (actor) await writeAdminAudit(actor, "admin_created", { targetUsername: user.username, targetEmail: user.email });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("admin_users_username_lower_unique") || message.includes("admin_users_email_lower_unique") || message.includes("duplicate key")) return NextResponse.json({ error: "Username atau email sudah digunakan." }, { status: 409 });
    console.error("POST /api/admin/users failed:", error);
    return NextResponse.json({ error: "Gagal membuat akun admin." }, { status: 500 });
  }
}
