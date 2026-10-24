
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error("Password minimal 12 karakter.");
  }

  if (Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error("Password terlalu panjang.");
  }

  const salt = randomBytes(SALT_LENGTH);

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 6 || parts[0] !== "scrypt") {
      return false;
    }

    const cost = Number(parts[1]);
    const blockSize = Number(parts[2]);
    const parallelization = Number(parts[3]);

    // Batasi parameter agar nilai database yang rusak tidak
    // menyebabkan konsumsi memori/CPU yang tidak terkendali.
    if (
      cost !== COST ||
      blockSize !== BLOCK_SIZE ||
      parallelization !== PARALLELIZATION
    ) {
      return false;
    }

    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");

    if (
      salt.length !== SALT_LENGTH ||
      expected.length !== KEY_LENGTH
    ) {
      return false;
    }

    const actual = (await scrypt(password, salt, KEY_LENGTH, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
      maxmem: 64 * 1024 * 1024,
    })) as Buffer;

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
