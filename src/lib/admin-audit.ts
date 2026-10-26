import { cookies } from "next/headers";
import { COOKIE_NAME, getSessionAdminUserId } from "@/lib/session-token";
import { isAdminAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export type AdminActor = { actor: string; role: "admin" | "super_admin" };

/** Resolves the authenticated administrator identity for audit records. */
export async function getAdminActor(): Promise<AdminActor | null> {
  const role = await isAdminAuthenticated();
  if (role !== "admin" && role !== "super_admin") return null;

  if (role === "super_admin") {
    return { actor: process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL || "super-admin", role };
  }

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const adminUserId = getSessionAdminUserId(token);
  if (adminUserId !== null) {
    const [user] = await db()`
      SELECT username FROM admin_users
      WHERE id = ${adminUserId} AND role = ${"admin"} AND is_active = TRUE
      LIMIT 1
    `;
    if (!user) return null;
    return { actor: String(user.username), role };
  }

  return { actor: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL || "admin", role };
}

export async function writeAdminAudit(
  actor: AdminActor,
  action: string,
  details: Record<string, unknown> = {},
  alumniId: number | null = null,
) {
  try {
    await db()`
      INSERT INTO admin_audit_log (action, alumni_id, actor, details)
      VALUES (${action.slice(0, 80)}, ${alumniId}, ${actor.actor.slice(0, 254)}, ${JSON.stringify({ ...details, actorRole: actor.role })}::jsonb)
    `;
  } catch (error) {
    // Logging is best-effort for operations already committed outside the log transaction.
    // Do not report a successful mutation as failed merely because the log insert failed.
    console.error("Gagal menyimpan log aktivitas admin:", { action, actor: actor.actor, error });
  }
}
