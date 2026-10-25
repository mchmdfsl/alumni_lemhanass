import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Claim-account flow has been retired. Keep the endpoint explicit so old clients
// cannot continue creating claim requests through a hidden API route.
export async function POST() {
  return NextResponse.json(
    { error: "Fitur klaim akun sudah tidak tersedia. Silakan gunakan halaman login atau daftar." },
    { status: 410 },
  );
}
