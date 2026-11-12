import { NextResponse } from "next/server";
import {
  checkPanelRateLimit,
  clientIp,
  createSessionToken,
  isPanelConfigured,
  originAllowed,
  setSessionCookie,
  verifyPassword,
} from "@/lib/server/panel-auth";

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  const ip = clientIp(request);
  const rl = checkPanelRateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    );
  }
  if (!(await isPanelConfigured())) {
    return NextResponse.json(
      { error: "El panel no está configurado todavía." },
      { status: 409 },
    );
  }

  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const password = (body.password ?? "").trim();
  if (!password) {
    return NextResponse.json({ error: "Contraseña requerida." }, { status: 400 });
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true, authenticated: true });
  setSessionCookie(response, token, request);
  return response;
}