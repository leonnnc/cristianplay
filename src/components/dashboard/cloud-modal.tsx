"use client";

import {
  Cloud,
  CloudOff,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLibrary } from "@/components/providers/library-provider";
import { useUI } from "@/components/providers/ui-provider";
import {
  describeAuthError,
  isFirebaseConfigured,
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/client";

export function CloudModal() {
  const { cloudOpen, setCloudOpen, pushToast } = useUI();
  const { firebaseReady, user, mode, syncing, signOut } = useLibrary();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!cloudOpen) return null;

  const handleGoogle = () => {
    setBusy(true);
    void signInWithGoogle()
      .then(() => pushToast("Sesión iniciada. Sincronizando biblioteca.", "success"))
      .catch((error: unknown) =>
        pushToast(describeAuthError(error), "danger"),
      )
      .finally(() => setBusy(false));
  };

  const handleEmailAuth = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFirebaseConfigured()) {
      pushToast("Firebase no está configurado. Configúralo en el panel del servidor.", "danger");
      return;
    }
    setBusy(true);
    const action =
      tab === "register"
        ? registerWithEmail(email.trim(), password, name.trim())
        : signInWithEmail(email.trim(), password);
    void action
      .then(() => {
        pushToast(
          tab === "register"
            ? "Cuenta creada. Sincronizando biblioteca."
            : "Sesión iniciada. Sincronizando biblioteca.",
          "success",
        );
        setEmail("");
        setPassword("");
        setName("");
      })
      .catch((error: unknown) => pushToast(describeAuthError(error), "danger"))
      .finally(() => setBusy(false));
  };

  const handleReset = () => {
    if (!email.trim()) {
      pushToast("Escribe tu correo para restablecer la contraseña.", "warning");
      return;
    }
    setBusy(true);
    void sendPasswordReset(email.trim())
      .then(() => {
        setResetSent(true);
        pushToast("Te enviamos un correo para restablecer la contraseña.", "success");
      })
      .catch((error: unknown) => pushToast(describeAuthError(error), "danger"))
      .finally(() => setBusy(false));
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setCloudOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <div className="modal-in relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e1c] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/[0.07] p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-violet-200">
            {user ? (
              <Cloud className="h-5 w-5" />
            ) : firebaseReady ? (
              <Cloud className="h-5 w-5" />
            ) : (
              <CloudOff className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-300">
              Biblioteca
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold text-white">
              {user ? "Cuenta conectada" : "Inicia sesión o regístrate"}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {user
                ? "Tus playlists, favoritos e historial se sincronizan en la nube."
                : mode === "firebase"
                  ? "Sesión activa."
                  : "Sin cuenta, solo puedes buscar y escuchar. Regístrate para guardar playlists, favoritos e historial."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCloudOpen(false)}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full ring-2 ring-violet-400/40"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-bold text-white">
                    {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {user.displayName ?? "Usuario"}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">{user.email}</p>
                </div>
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                    <ShieldCheck className="h-3 w-3" />
                    Sync
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                  pushToast("Sesión cerrada. Datos locales conservados.", "info");
                  setCloudOpen(false);
                }}
                className="w-full rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Cerrar sesión
              </button>
            </div>
          ) : firebaseReady ? (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    tab === "login"
                      ? "bg-violet-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    tab === "register"
                      ? "bg-violet-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {tab === "register" ? (
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className="field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      autoComplete="name"
                    />
                  </div>
                ) : null}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    className="field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-400">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      className="field pr-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={tab === "register" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : tab === "register" ? (
                    <UserPlus className="h-4 w-4" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {tab === "register" ? "Crear cuenta" : "Iniciar sesión"}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] text-slate-500">o</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar con Google
              </button>

              {tab === "login" ? (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={busy || resetSent}
                  className="text-center text-[11px] text-slate-400 transition hover:text-white disabled:opacity-50"
                >
                  {resetSent ? "Correo enviado" : "¿Olvidaste tu contraseña?"}
                </button>
              ) : null}

              <p className="text-[10px] leading-relaxed text-slate-500">
                Al registrarte, tus playlists, favoritos e historial se sincronizan
                en la nube y estarán disponibles en cualquier dispositivo.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.08] p-3 text-[11px] leading-relaxed text-amber-100/90">
              <span className="font-semibold">Modo local activo.</span> Firebase no
              está configurado. Configúralo en el panel del servidor para habilitar
              cuentas y sincronización.
              <a
                href="/panel"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-amber-200 underline"
              >
                Abrir panel
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3">
          <a
            href="/panel"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-white"
          >
            Panel del servidor
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}