import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
export async function GET() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      username: process.env.ADMIN_USERNAME || "admin",
      email: process.env.ADMIN_EMAIL || "admin@gmail.com",
      role: "Super Administrator"
    }
  });
}
