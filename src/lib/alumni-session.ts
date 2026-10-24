
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ALUMNI_COOKIE_NAME = "lemhannas_alumni_session";
const SESSION_SECONDS = 60 * 60 * 8;

type AlumniSession = {
  accountId: number;
  alumniId: number;
  role: "alumni";
  exp: number;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET harus minimal 32 karakter.");
  }

  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

export function createAlumniSessionToken(
  accountId: number,
  alumniId: number,
) {
  const session: AlumniSession = {
    accountId,
    alumniId,
    role: "alumni",
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };

  const payload = Buffer.from(JSON.stringify(session))
    .toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyAlumniSessionToken(
  token?: string,
): AlumniSession | null {
  if (!token) return null;

  try {
    const [payload, suppliedSignature] = token.split(".");

    if (!payload || !suppliedSignature) return null;

    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(suppliedSignature);

    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as AlumniSession;

    if (
      session.role !== "alumni" ||
      !Number.isSafeInteger(session.accountId) ||
      session.accountId <= 0 ||
      !Number.isSafeInteger(session.alumniId) ||
      session.alumniId <= 0 ||
      !Number.isSafeInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function getAlumniSession() {
  const cookieStore = await cookies();

  return verifyAlumniSessionToken(
    cookieStore.get(ALUMNI_COOKIE_NAME)?.value,
  );
}

export const alumniSessionCookie = {
  name: ALUMNI_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};
                    
