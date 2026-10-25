import type { Sql } from "postgres";

export function alumniNumberPrefix(angkatan: string): string {
  const normalized = angkatan
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("id-ID")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  return `LHN-${normalized || "ALUMNI"}`;
}

export async function assignAlumniNumber(
  tx: Sql,
  alumniId: number,
  angkatan: string,
  existingNumber: string | null,
): Promise<string> {
  if (existingNumber?.trim()) return existingNumber.trim();

  const prefix = alumniNumberPrefix(angkatan);
  await tx`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

  const existing = await tx`
    SELECT nomor_alumni AS "nomorAlumni"
    FROM alumni
    WHERE nomor_alumni LIKE ${prefix + "-%"}
    ORDER BY nomor_alumni DESC
    LIMIT 1
  `;

  let sequence = 1;
  const lastNumber = existing[0]?.nomorAlumni as string | undefined;
  if (lastNumber) {
    const match = lastNumber.match(/-(\d+)$/);
    if (match) sequence = Number(match[1]) + 1;
  }

  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const number = `${prefix}-${String(sequence + attempts).padStart(4, "0")}`;
    const duplicate = await tx`SELECT id FROM alumni WHERE nomor_alumni = ${number} AND id <> ${alumniId} LIMIT 1`;
    if (!duplicate.length) {
      await tx`UPDATE alumni SET nomor_alumni = ${number}, updated_at = NOW() WHERE id = ${alumniId}`;
      return number;
    }
  }

  throw new Error("Tidak dapat membuat nomor alumni unik untuk angkatan ini.");
}
