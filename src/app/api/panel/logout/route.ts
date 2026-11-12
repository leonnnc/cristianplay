import { NextResponse } from "next/server";
import { clearSessionCookie, originAllowed } from "@/lib/server/panel-auth";

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, request);
  return response;
}