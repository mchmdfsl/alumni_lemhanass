import { cookies } from "next/headers";
import { COOKIE_NAME, getSessionAdminUserId } from "@/lib/session-token";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminScope = { role: "admin" | "super_admin"; kategoriProgram: string | null };

/** Canonical program categories. Legacy aliases are accepted at input boundaries only. */
export function normalizeProgramCategory(value: unknown): string {
  if (typeof value !== "string") return "";
  const category = value.trim().toLocaleUpperCase("id-ID").replace(/\s+/g, " ");
  if (category === "PRA") return "KRA";
  if (category === "PSA") return "KSA";
  return category;
}

export const ADMIN_CATEGORY_GROUPS = {
  ADMIN_GROUP_1: ["KRA", "PPRA", "P4N"],
  ADMIN_GROUP_2: ["KSA", "PPSA", "P3N"],
  ADMIN_GROUP_3: ["TAPLAI", "PPNK", "PPNK KOLABORASI"],
  ADMIN_GROUP_4: ["TOT"],
} as const;
export type AdminCategoryGroup = keyof typeof ADMIN_CATEGORY_GROUPS;

export function getAdminCategoryGroup(value: unknown): AdminCategoryGroup | null {
  return value === "ADMIN_GROUP_1" || value === "ADMIN_GROUP_2" || value === "ADMIN_GROUP_3" || value === "ADMIN_GROUP_4" ? value : null;
}
export function getAdminCategories(scope: AdminScope): string[] | null {
  if (scope.role === "super_admin") return null;
  if (!scope.kategoriProgram) return [];
  const stored = normalizeProgramCategory(scope.kategoriProgram);
  const group = getAdminCategoryGroup(stored);
  return group ? [...ADMIN_CATEGORY_GROUPS[group]] : [stored];
}
export function adminCanManageCategory(scope: AdminScope, category: unknown) {
  if (scope.role === "super_admin") return true;
  if (typeof category !== "string") return false;
  return (getAdminCategories(scope) ?? []).includes(normalizeProgramCategory(category));
}
export async function getAdminScope(): Promise<AdminScope | null> {
  const role = await isAdminAuthenticated();
  if (role !== "admin" && role !== "super_admin") return null;
  if (role === "super_admin") return { role, kategoriProgram: null };
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const adminUserId = getSessionAdminUserId(token);
  if (adminUserId === null) return { role, kategoriProgram: null };
  try {
    const [user] = await db()`
      SELECT kategori_program AS "kategoriProgram"
      FROM admin_users
      WHERE id = ${adminUserId} AND role = ${"admin"} AND is_active = TRUE
      LIMIT 1
    `;
    const category = typeof user?.kategoriProgram === "string" ? user.kategoriProgram.trim().toLocaleUpperCase("id-ID") : "";
    return { role, kategoriProgram: category || null };
  } catch (error) {
    console.error("Gagal membaca kelompok kategori Admin:", error);
    return { role, kategoriProgram: null };
  }
}
