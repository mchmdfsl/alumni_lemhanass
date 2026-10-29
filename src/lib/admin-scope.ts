import { cookies } from "next/headers";
import { COOKIE_NAME, getSessionAdminUserId } from "@/lib/session-token";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminScope = {
  role: "admin" | "super_admin";
  kategoriProgram: string | null;
};

export async function getAdminScope(): Promise<AdminScope | null> {
  const role = await isAdminAuthenticated();
  if (role !== "admin" && role !== "super_admin") return null;
  if (role === "super_admin") return { role, kategoriProgram: null };

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const adminUserId = getSessionAdminUserId(token);
  // Akun Admin ENV lama tidak memiliki kategori. Tolak akses data sampai
  // akun dipindahkan ke Manajemen Admin dan diberi kategori eksplisit.
  if (adminUserId === null) return { role, kategoriProgram: null };

  const [user] = await db()`
    SELECT kategori_program AS "kategoriProgram"
    FROM admin_users
    WHERE id = ${adminUserId} AND role = ${"admin"} AND is_active = TRUE
    LIMIT 1
  `;
  const category = typeof user?.kategoriProgram === "string"
    ? user.kategoriProgram.trim().toLocaleUpperCase("id-ID")
    : "";
  return { role, kategoriProgram: category || null };
}

export function adminCanManageCategory(scope: AdminScope, category: unknown) {
  if (scope.role === "super_admin") return true;
  return Boolean(scope.kategoriProgram) &&
    typeof category === "string" &&
    category.trim().toLocaleUpperCase("id-ID") === scope.kategoriProgram;
}
