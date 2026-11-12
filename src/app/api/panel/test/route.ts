import { NextResponse } from "next/server";
import {
  getResolvedFirebaseConfig,
  getResolvedYouTubeConfig,
} from "@/lib/server/config";
import { isAuthenticated, originAllowed } from "@/lib/server/panel-auth";

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: {
    target?: "youtube" | "firebase";
    apiKey?: string;
    firebase?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.target === "youtube") {
    const provided = (body.apiKey ?? "").trim();
    const resolved = await getResolvedYouTubeConfig();
    const key = provided || resolved.apiKey;
    if (!key) {
      return NextResponse.json({ ok: false, error: "No hay clave de YouTube configurada." }, { status: 400 });
    }
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", "alabanza cristiana");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", key);
    try {
      const res = await fetch(url.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => null)) as { error?: { message?: string }; items?: unknown[] } | null;
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` },
          { status: 200 },
        );
      }
      return NextResponse.json({
        ok: true,
        results: Array.isArray(data?.items) ? data!.items!.length : 0,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Error de red" },
        { status: 200 },
      );
    }
  }

  if (body.target === "firebase") {
    const f = body.firebase && typeof body.firebase === "object" ? (body.firebase as Record<string, unknown>) : null;
    const resolved = await getResolvedFirebaseConfig();
    const apiKey = String(f?.apiKey ?? resolved.value.apiKey ?? "").trim();
    const authDomain = String(f?.authDomain ?? resolved.value.authDomain ?? "").trim();
    const projectId = String(f?.projectId ?? resolved.value.projectId ?? "").trim();
    if (!apiKey || !authDomain || !projectId) {
      return NextResponse.json(
        { ok: false, error: "Faltan apiKey, authDomain o projectId." },
        { status: 200 },
      );
    }
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const hostname = host.split(":")[0];
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const data = (await res.json().catch(() => null)) as
        | { projectId?: string; authorizedDomains?: string[]; error?: { message?: string } }
        | null;
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` },
          { status: 200 },
        );
      }
      const domains = Array.isArray(data?.authorizedDomains) ? data!.authorizedDomains! : [];
      const hostAuthorized =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        domains.includes(hostname);
      return NextResponse.json({
        ok: true,
        projectId: data?.projectId ?? projectId,
        authorizedDomains: domains,
        host: hostname,
        hostAuthorized,
        message: hostAuthorized
          ? "Dominio autorizado para el acceso actual."
          : `El host "${hostname}" no está en los dominios autorizados de Firebase. Agrégalo en Authentication → Settings → Authorized domains.`,
      });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Error de red" },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ error: "target inválido." }, { status: 400 });
}