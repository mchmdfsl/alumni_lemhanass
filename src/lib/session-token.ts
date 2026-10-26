import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "lemhannas_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET harus berisi minimal 32 karakter.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type AdminRole = "admin" | "super_admin";

export function createSessionToken(role: AdminRole = "admin", adminUserId?: number) {
  const identity = Number.isSafeInteger(adminUserId) && Number(adminUserId) > 0 ? `:${adminUserId}` : "";
  const payload = `${Date.now() + SESSION_SECONDS * 1000}:${role}${identity}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  try {
    const [payload, suppliedSignature] = token.split(".");
    if (!payload || !suppliedSignature || !/^\d+:(admin|super_admin)(:\d+)?$/.test(payload)) return false;
    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const expiresAt = Number(payload.split(":")[0]);
    return expiresAt > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_SECONDS_MAX_AGE = SESSION_SECONDS;

export function getSessionRole(token?: string): AdminRole | null {
  if (!token || !verifySessionToken(token)) return null;
  try {
    const role = token.split(".")[0].split(":")[1];
    return role === "super_admin" || role === "admin" ? role : null;
  } catch {
    return null;
  }
}

export function getSessionAdminUserId(token?: string): number | null {
  if (!token || !verifySessionToken(token)) return null;
  const parts = token.split(".")[0].split(":");
  if (parts.length !== 3) return null;
  const id = Number(parts[2]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
