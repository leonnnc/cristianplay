import { NextResponse } from "next/server";
import {
  getResolvedFirebaseConfig,
  getResolvedYouTubeConfig,
  isFirebaseConfiguredValue,
  writeSettings,
} from "@/lib/server/config";
import { isAuthenticated, originAllowed } from "@/lib/server/panel-auth";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const firebase = await getResolvedFirebaseConfig();
  const youtube = await getResolvedYouTubeConfig();
  return NextResponse.json(
    {
      firebase: {
        ...firebase.value,
        configured: isFirebaseConfiguredValue(firebase.value),
        source: firebase.source,
      },
      youtube: {
        region: youtube.region,
        hasKey: Boolean(youtube.apiKey),
        maskedKey: maskKey(youtube.apiKey),
        source: youtube.source,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    firebase?: Record<string, unknown>;
    youtube?: { apiKeyMode?: "keep" | "replace" | "remove"; apiKey?: string; region?: string };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const patch: Parameters<typeof writeSettings>[0] = {};

  if (body.firebase && typeof body.firebase === "object") {
    const f = body.firebase as Record<string, unknown>;
    const clean = sanitizeFirebase(f);
    if (clean === null) {
      return NextResponse.json({ error: "Configuración de Firebase inválida." }, { status: 400 });
    }
    patch.firebase = clean;
  }

  if (body.youtube && typeof body.youtube === "object") {
    const y = body.youtube;
    const youtubePatch: { apiKey?: string; region?: string } = {};
    if (y.region !== undefined) {
      const region = String(y.region).trim().slice(0, 8).toUpperCase();
      if (!/^[A-Z]{2}$/.test(region)) {
        return NextResponse.json({ error: "Región inválida (código ISO de 2 letras)." }, { status: 400 });
      }
      youtubePatch.region = region;
    }
    if (y.apiKeyMode === "replace") {
      const key = String(y.apiKey ?? "").trim().slice(0, 200);
      if (!key) {
        return NextResponse.json({ error: "La clave de YouTube no puede estar vacía." }, { status: 400 });
      }
      youtubePatch.apiKey = key;
    } else if (y.apiKeyMode === "remove") {
      youtubePatch.apiKey = "";
    }
    if (Object.keys(youtubePatch).length > 0) {
      patch.youtube = youtubePatch;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que guardar." }, { status: 400 });
  }

  await writeSettings(patch);
  return NextResponse.json({ ok: true });
}

function sanitizeFirebase(input: Record<string, unknown>): Record<string, string> | null {
  const fields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ] as const;
  const out: Record<string, string> = {};
  for (const field of fields) {
    const raw = input[field];
    if (raw === undefined || raw === null) {
      out[field] = "";
      continue;
    }
    if (typeof raw !== "string") return null;
    const val = raw.trim().slice(0, 500);
    out[field] = val;
  }
  // Validate authDomain if present
  if (out.authDomain && !/^[a-z0-9.-]+$/i.test(out.authDomain)) return null;
  if (out.projectId && !/^[a-z0-9-]{4,40}$/i.test(out.projectId)) return null;
  if (out.appId && out.appId.length > 80) return null;
  return out;
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return "•".repeat(Math.max(4, key.length - 4)) + key.slice(-4);
}