import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  checkPanelRateLimit,
  clientIp,
  createSessionToken,
  hashPassword,
  isPanelConfigured,
  isPanelConfiguredByEnv,
  originAllowed,
  setSessionCookie,
  writePanelAuth,
} from "@/lib/server/panel-auth";

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  const ip = clientIp(request);
  const rl = checkPanelRateLimit(`setup:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429, headers: { "retry-after": String(rl.retryAfter) } },
    );
  }
  if (isPanelConfiguredByEnv()) {
    return NextResponse.json(
      { error: "El panel ya está configurado por la variable PANEL_PASSWORD." },
      { status: 409 },
    );
  }
  if (await isPanelConfigured()) {
    return NextResponse.json(
      { error: "El administrador ya está configurado." },
      { status: 409 },
    );
  }

  let body: { password?: string; confirm?: string };
  try {
    body = (await request.json()) as { password?: string; confirm?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const password = (body.password ?? "").trim();
  const confirm = (body.confirm ?? "").trim();
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json(
      { error: "La contraseña debe tener entre 8 y 200 caracteres." },
      { status: 400 },
    );
  }
  if (password !== confirm) {
    return NextResponse.json(
      { error: "Las contraseñas no coinciden." },
      { status: 400 },
    );
  }

  const { hash, salt } = await hashPassword(password);
  const secret = crypto.randomBytes(32).toString("hex");
  await writePanelAuth({
    version: 1,
    passwordHash: hash,
    salt,
    secret,
    createdAt: Date.now(),
  });

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true, authenticated: true });
  setSessionCookie(response, token, request);
  return response;
}