import { createHash } from "node:crypto";
import { db } from "@/lib/db";

type RateLimitOptions = {
  identity?: string;
  ipLimit: number;
  identityLimit?: number;
  windowSeconds: number;
};

type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

/**
 * PostgreSQL-backed fixed-window rate limiter, shared across serverless instances.
 * If the migration is not installed yet, fail open so authentication remains
 * available; the server log makes the missing migration visible.
 */
export async function checkRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const checks = [
    { key: `${scope}:ip:${ip}`, limit: options.ipLimit },
  ];
  const identity = options.identity?.trim().toLowerCase();
  if (identity) {
    checks.push({
      key: `${scope}:identity:${identity}`,
      limit: options.identityLimit ?? options.ipLimit,
    });
  }

  try {
    for (const check of checks) {
      const keyHash = createHash("sha256").update(check.key).digest("hex");
      const [row] = await db() `
        INSERT INTO api_rate_limits (key_hash, window_started_at, request_count)
        VALUES (${keyHash}, NOW(), 1)
        ON CONFLICT (key_hash) DO UPDATE
        SET
          request_count = CASE
            WHEN api_rate_limits.window_started_at <= NOW() - make_interval(secs => ${options.windowSeconds})
              THEN 1
            ELSE api_rate_limits.request_count + 1
          END,
          window_started_at = CASE
            WHEN api_rate_limits.window_started_at <= NOW() - make_interval(secs => ${options.windowSeconds})
              THEN NOW()
            ELSE api_rate_limits.window_started_at
          END
        RETURNING request_count AS "requestCount",
          window_started_at AS "windowStartedAt"
      `;

      if (Number(row.requestCount) > check.limit) {
        const startedAt = row.windowStartedAt instanceof Date
          ? row.windowStartedAt.getTime()
          : new Date(row.windowStartedAt).getTime();
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((startedAt + options.windowSeconds * 1000 - Date.now()) / 1000),
        );
        return { limited: true, retryAfterSeconds };
      }
    }
    return { limited: false, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("Rate limiter tidak tersedia; permintaan dilanjutkan:", error);
    return { limited: false, retryAfterSeconds: 0 };
  }
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { message: "Terlalu banyak percobaan. Silakan coba lagi beberapa saat." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
