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

export function createSessionToken() {
  const payload = `${Date.now() + SESSION_SECONDS * 1000}`;
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) return false;
  try {
    const [payload, suppliedSignature] = token.split(".");
    if (!payload || !suppliedSignature || !/^\d+$/.test(payload)) return false;
    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    return Number(payload) > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_SECONDS_MAX_AGE = SESSION_SECONDS;
