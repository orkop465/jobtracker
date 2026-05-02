import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  const session = await auth();
  return NextResponse.json({ isAdmin: isAdmin(session) });
}
