import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !UUID_PATTERN.test(token)) {
    return NextResponse.json({ error: "Token verifikasi tidak valid." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const verificationUrl = `${origin}/verifikasi-ktm/${token}`;
  const upstream = new URL("https://api.qrserver.com/v1/create-qr-code/");
  upstream.searchParams.set("size", "480x480");
  upstream.searchParams.set("margin", "8");
  upstream.searchParams.set("format", "png");
  upstream.searchParams.set("ecc", "H");
  upstream.searchParams.set("data", verificationUrl);

  try {
    const response = await fetch(upstream, {
      headers: { Accept: "image/png" },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Layanan QR sedang tidak tersedia." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("image/")) {
      return NextResponse.json({ error: "Layanan QR mengembalikan format yang tidak sesuai." }, { status: 502 });
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "QR gagal dibuat. Silakan coba kembali." }, { status: 502 });
  }
}
