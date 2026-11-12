"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Save,

  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import type { FirebaseWebConfig } from "@/lib/config-types";

interface SessionState {
  configured: boolean;
  authenticated: boolean;
  configuredByEnv: boolean;
}

interface PanelConfig {
  firebase: FirebaseWebConfig & { configured: boolean; source: string };
  youtube: {
    region: string;
    hasKey: boolean;
    maskedKey: string;
    source: string;
  };
}

type Notice = { tone: "success" | "danger" | "info"; text: string } | null;

const EMPTY_FB: FirebaseWebConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export function PanelApp() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [config, setConfig] = useState<PanelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Auth forms
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Firebase form
  const [fb, setFb] = useState<FirebaseWebConfig>({ ...EMPTY_FB });
  const [showFbKey, setShowFbKey] = useState(false);

  // YouTube form
  const [ytMode, setYtMode] = useState<"keep" | "replace" | "remove">("keep");
  const [ytKey, setYtKey] = useState("");
  const [ytRegion, setYtRegion] = useState("MX");
  const [showYtKey, setShowYtKey] = useState(false);

  // Test results
  const [fbTest, setFbTest] = useState<Record<string, unknown> | null>(null);
  const [ytTest, setYtTest] = useState<Record<string, unknown> | null>(null);

  // Password change
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");

  async function refreshSession() {
    const res = await fetch("/api/panel/session", { cache: "no-store" });
    const data = (await res.json()) as SessionState;
    setSession(data);
  }

  async function refreshConfig() {
    const res = await fetch("/api/panel/config", { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 401) {
        setSession((s) => (s ? { ...s, authenticated: false } : s));
      }
      return;
    }
    const data = (await res.json()) as PanelConfig;
    setConfig(data);
    setFb({
      apiKey: data.firebase.apiKey ?? "",
      authDomain: data.firebase.authDomain ?? "",
      projectId: data.firebase.projectId ?? "",
      storageBucket: data.firebase.storageBucket ?? "",
      messagingSenderId: data.firebase.messagingSenderId ?? "",
      appId: data.firebase.appId ?? "",
    });
    setYtRegion(data.youtube.region ?? "MX");
  }

  useEffect(() => {
    (async () => {
      await refreshSession();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.authenticated) void refreshConfig();
  }, [session?.authenticated]);

  function toast(tone: "success" | "danger" | "info", text: string) {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 4500);
  }

  async function handleSetup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/panel/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast("success", "Administrador creado. Sesión iniciada.");
      setPassword("");
      setConfirm("");
      await refreshSession();
    } catch (error) {
      toast("danger", error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/panel/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast("success", "Sesión iniciada.");
      setPassword("");
      await refreshSession();
    } catch (error) {
      toast("danger", error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/panel/logout", { method: "POST" });
      setConfig(null);
      await refreshSession();
      toast("info", "Sesión cerrada.");
    } finally {
      setBusy(false);
    }
  }

  async function saveFirebase() {
    setBusy(true);
    try {
      const res = await fetch("/api/panel/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firebase: fb }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast("success", "Configuración de Firebase guardada.");
      await refreshConfig();
    } catch (error) {
      toast("danger", error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function saveYouTube() {
    setBusy(true);
    try {
      const res = await fetch("/api/panel/config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          youtube: {
            apiKeyMode: ytMode,
            apiKey: ytKey,
            region: ytRegion,
          },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast("success", "Configuración de YouTube guardada.");
      setYtMode("keep");
      setYtKey("");
      await refreshConfig();
    } catch (error) {
      toast("danger", error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function testFirebase() {
    setBusy(true);
    setFbTest(null);
    try {
      const res = await fetch("/api/panel/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: "firebase", firebase: fb }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      setFbTest(data);
    } catch (error) {
      setFbTest({ ok: false, error: error instanceof Error ? error.message : "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function testYouTube() {
    setBusy(true);
    setYtTest(null);
    try {
      const res = await fetch("/api/panel/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: "youtube",
          apiKey: ytMode === "replace" ? ytKey : undefined,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      setYtTest(data);
    } catch (error) {
      setYtTest({ ok: false, error: error instanceof Error ? error.message : "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/panel/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ current: curPw, next: newPw, confirm: confPw }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast("success", "Contraseña actualizada.");
      setCurPw("");
      setNewPw("");
      setConfPw("");
    } catch (error) {
      toast("danger", error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-300" />
      </div>
    );
  }

  const configured = session?.configured ?? false;
  const authenticated = session?.authenticated ?? false;

  // Setup screen
  if (!configured) {
    return (
      <Shell>
        <Card title="Crear administrador" subtitle="Primera configuración del panel">
          <p className="text-xs text-slate-400">
            Define la contraseña del panel. Guárdala en un lugar seguro: se usará para
            entrar a este panel desde cualquier equipo.
          </p>
          <form onSubmit={handleSetup} className="mt-4 space-y-3">
            <Field label="Contraseña (mín. 8 caracteres)">
              <input
                type={showPw ? "text" : "password"}
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar contraseña">
              <input
                type={showPw ? "text" : "password"}
                className="field"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              Mostrar contraseñas
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Crear administrador
            </button>
          </form>
        </Card>
        {notice ? <NoticeBar notice={notice} /> : null}
      </Shell>
    );
  }

  // Login screen
  if (!authenticated) {
    return (
      <Shell>
        <Card title="Acceso al panel" subtitle="Configuración del servidor">
          <form onSubmit={handleLogin} className="space-y-3">
            <Field label="Contraseña">
              <input
                type={showPw ? "text" : "password"}
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              Mostrar contraseña
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Entrar
            </button>
          </form>
          {session?.configuredByEnv ? (
            <p className="mt-3 text-[11px] text-slate-500">
              La contraseña la define la variable de entorno PANEL_PASSWORD.
            </p>
          ) : null}
        </Card>
        {notice ? <NoticeBar notice={notice} /> : null}
      </Shell>
    );
  }

  // Authenticated panel
  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-white">Panel de configuración</h1>
          <p className="text-xs text-slate-400">
            Configura la conexión con Google/Firebase y la clave de YouTube. Los cambios se aplican al recargar la app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            Abrir app
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Firebase card */}
        <Card title="Google / Firebase" subtitle="Autenticación y sincronización">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <StatusPill ok={config?.firebase.configured ?? false} label={config?.firebase.configured ? "Configurado" : "Sin configurar"} />
            <span className="text-slate-500">Origen: {config?.firebase.source ?? "—"}</span>
          </div>

          <div className="space-y-3">
            <Field label="API Key">
              <div className="relative">
                <input
                  type={showFbKey ? "text" : "password"}
                  className="field pr-9"
                  value={fb.apiKey}
                  onChange={(e) => setFb({ ...fb, apiKey: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowFbKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showFbKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Auth Domain (ej. proyecto.firebaseapp.com)">
              <input className="field" value={fb.authDomain} onChange={(e) => setFb({ ...fb, authDomain: e.target.value })} />
            </Field>
            <Field label="Project ID">
              <input className="field" value={fb.projectId} onChange={(e) => setFb({ ...fb, projectId: e.target.value })} />
            </Field>
            <Field label="Storage Bucket (opcional)">
              <input className="field" value={fb.storageBucket} onChange={(e) => setFb({ ...fb, storageBucket: e.target.value })} />
            </Field>
            <Field label="Messaging Sender ID (opcional)">
              <input className="field" value={fb.messagingSenderId} onChange={(e) => setFb({ ...fb, messagingSenderId: e.target.value })} />
            </Field>
            <Field label="App ID">
              <input className="field" value={fb.appId} onChange={(e) => setFb({ ...fb, appId: e.target.value })} />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveFirebase}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={testFirebase}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              <TestTube2 className="h-3.5 w-3.5" />
              Probar conexión
            </button>
          </div>

          {fbTest ? <TestResult result={fbTest} /> : null}

          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Google Sign-In requiere que el host desde el que accedes esté en los dominios autorizados
            de Firebase (Authentication → Settings → Authorized domains). La prueba de conexión
            te indica si tu host actual está autorizado.
          </p>
        </Card>

        {/* YouTube card */}
        <Card title="YouTube Data API v3" subtitle="Búsqueda oficial (opcional)">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
            <StatusPill ok={config?.youtube.hasKey ?? false} label={config?.youtube.hasKey ? "Clave configurada" : "Sin clave (Innertube)"} />
            <span className="text-slate-500">Origen: {config?.youtube.source ?? "—"}</span>
            {config?.youtube.maskedKey ? (
              <span className="font-mono text-slate-400">{config.youtube.maskedKey}</span>
            ) : null}
          </div>

          <div className="space-y-3">
            <Field label="Modo de clave">
              <select
                className="field"
                value={ytMode}
                onChange={(e) => setYtMode(e.target.value as "keep" | "replace" | "remove")}
              >
                <option value="keep">Mantener la actual</option>
                <option value="replace">Reemplazar por una nueva</option>
                <option value="remove">Eliminar la guardada</option>
              </select>
            </Field>
            {ytMode === "replace" ? (
              <Field label="Nueva clave de YouTube">
                <div className="relative">
                  <input
                    type={showYtKey ? "text" : "password"}
                    className="field pr-9"
                    value={ytKey}
                    onChange={(e) => setYtKey(e.target.value)}
                    placeholder="AIza..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowYtKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showYtKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            ) : null}
            <Field label="Región (ISO 3166-1 alfa-2)">
              <input
                className="field"
                value={ytRegion}
                onChange={(e) => setYtRegion(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveYouTube}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={testYouTube}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              <TestTube2 className="h-3.5 w-3.5" />
              Probar clave
            </button>
          </div>

          {ytTest ? <TestResult result={ytTest} /> : null}
        </Card>
      </div>

      {/* Security card */}
      <Card title="Seguridad del panel" subtitle="Contraseña de administrador" className="mt-4">
        {session?.configuredByEnv ? (
          <p className="text-xs text-slate-400">
            La contraseña la define la variable de entorno PANEL_PASSWORD. Cámbiala ahí y reinicia el servidor.
          </p>
        ) : (
          <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-3">
            <Field label="Contraseña actual">
              <input type="password" className="field" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </Field>
            <Field label="Nueva contraseña">
              <input type="password" className="field" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </Field>
            <Field label="Confirmar">
              <input type="password" className="field" value={confPw} onChange={(e) => setConfPw(e.target.value)} />
            </Field>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Cambiar contraseña
              </button>
            </div>
          </form>
        )}
      </Card>

      {notice ? <NoticeBar notice={notice} /> : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-[#05060f] px-4 py-6 text-slate-200 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-soft rounded-2xl p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="font-display text-base font-semibold text-white">{title}</h2>
        {subtitle ? <p className="text-[11px] text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function TestResult({ result }: { result: Record<string, unknown> }) {
  const ok = Boolean(result.ok);
  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-[11px] leading-relaxed ${
        ok ? "border-emerald-400/20 bg-emerald-500/[0.06] text-emerald-100" : "border-rose-400/20 bg-rose-500/[0.06] text-rose-100"
      }`}
    >
      {ok ? (
        <>
          <p className="font-semibold">Conexión correcta.</p>
          {typeof result.message === "string" ? <p className="mt-1">{result.message}</p> : null}
          {Array.isArray(result.authorizedDomains) ? (
            <p className="mt-1">
              Dominios autorizados: {(result.authorizedDomains as string[]).join(", ") || "(ninguno)"}
            </p>
          ) : null}
          {typeof result.host === "string" ? (
            <p className="mt-1">
              Host actual: {result.host} —{" "}
              {result.hostAuthorized ? "autorizado" : "NO autorizado"}
            </p>
          ) : null}
          {typeof result.results === "number" ? <p className="mt-1">Resultados de prueba: {result.results}</p> : null}
        </>
      ) : (
        <p className="font-semibold">{String(result.error ?? "Error")}</p>
      )}
    </div>
  );
}

function NoticeBar({ notice }: { notice: { tone: "success" | "danger" | "info"; text: string } }) {
  const cls =
    notice.tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100"
      : notice.tone === "danger"
        ? "border-rose-400/20 bg-rose-500/[0.08] text-rose-100"
        : "border-sky-400/20 bg-sky-500/[0.08] text-sky-100";
  return (
    <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-xs shadow-lg ${cls}`}>
      {notice.text}
    </div>
  );
}