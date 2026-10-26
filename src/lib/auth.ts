import { cookies } from "next/headers";
import { COOKIE_NAME, createSessionToken, getSessionRole, SESSION_SECONDS_MAX_AGE, verifySessionToken, type AdminRole } from "@/lib/session-token";
import { timingSafeEqual } from "crypto";

export { createSessionToken, verifySessionToken };

export async function isAdminAuthenticated(): Promise<AdminRole | null> {
  const cookieStore = await cookies();
  return getSessionRole(cookieStore.get(COOKIE_NAME)?.value);
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_SECONDS_MAX_AGE,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function verifyAdminCredentials(identifier: string, password: string) {
  const configuredUser = process.env.ADMIN_USERNAME;
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword || (!configuredUser && !configuredEmail)) {
    throw new Error("ADMIN_USERNAME atau ADMIN_EMAIL dan ADMIN_PASSWORD wajib dikonfigurasi.");
  }
  const userMatches = [configuredUser, configuredEmail].filter(Boolean).some((value) => safeEqual(identifier.toLowerCase(), value!.toLowerCase()));
  return userMatches && safeEqual(password, configuredPassword);
}

export function verifySuperAdminCredentials(identifier: string, password: string) {
  const configuredUser = process.env.SUPER_ADMIN_USERNAME;
  const configuredEmail = process.env.SUPER_ADMIN_EMAIL;
  const configuredPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (!configuredPassword || (!configuredUser && !configuredEmail)) return false;
  const userMatches = [configuredUser, configuredEmail].filter(Boolean).some((value) => safeEqual(identifier.toLowerCase(), value!.toLowerCase()));
  return userMatches && safeEqual(password, configuredPassword);
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
