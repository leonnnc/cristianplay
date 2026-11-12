import { NextResponse } from "next/server";
import {
  hashPassword,
  isAuthenticated,
  isPanelConfiguredByEnv,
  originAllowed,
  readPanelAuth,
  verifyPassword,
  writePanelAuth,
} from "@/lib/server/panel-auth";

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (isPanelConfiguredByEnv()) {
    return NextResponse.json(
      { error: "La contraseña está definida por la variable PANEL_PASSWORD; cámbiala ahí." },
      { status: 409 },
    );
  }
  const auth = await readPanelAuth();
  if (!auth) {
    return NextResponse.json({ error: "Panel no configurado." }, { status: 409 });
  }

  let body: { current?: string; next?: string; confirm?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const current = (body.current ?? "").trim();
  const next = (body.next ?? "").trim();
  const confirm = (body.confirm ?? "").trim();
  if (!(await verifyPassword(current))) {
    return NextResponse.json({ error: "Contraseña actual incorrecta." }, { status: 401 });
  }
  if (next.length < 8 || next.length > 200) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener entre 8 y 200 caracteres." },
      { status: 400 },
    );
  }
  if (next !== confirm) {
    return NextResponse.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
  }
  const { hash, salt } = await hashPassword(next);
  await writePanelAuth({ ...auth, passwordHash: hash, salt });
  return NextResponse.json({ ok: true });
}