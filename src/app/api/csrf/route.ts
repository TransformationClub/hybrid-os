import { NextResponse } from "next/server";
import { generateCsrfToken, getCsrfToken } from "@/lib/security/csrf";

export async function GET() {
  // Return existing token or generate a new one
  let token = await getCsrfToken();
  if (!token) {
    token = await generateCsrfToken();
  }
  return NextResponse.json({ token });
}
