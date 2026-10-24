import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    await sql`
      INSERT INTO alumni (email, password, status) 
      VALUES (${email}, ${password}, 'Pending')
    `;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Email sudah terdaftar atau terjadi kesalahan." }, { status: 400 });
  }
}