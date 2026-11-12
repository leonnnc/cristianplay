"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Cloud,
  CloudOff,
  Heart,
  History,
  Home,
  ListMusic,
  Loader2,
  LogIn,
  LogOut,
  Mic2,
  Music4,
  Play,
  Plus,
  Podcast,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useLibrary } from "@/components/providers/library-provider";
import { useUI } from "@/components/providers/ui-provider";
import { usePlayer } from "@/components/providers/player-provider";
import type { Category, View } from "@/lib/types";
import { useSearch } from "@/components/providers/search-provider";

const NAV_ITEMS = [
  { type: "home" as const, label: "Inicio", icon: Home },
  { type: "search" as const, label: "Buscar", icon: Search },
  { type: "favorites" as const, label: "Favoritos", icon: Heart },
  { type: "history" as const, label: "Historial", icon: History },
  { type: "queue" as const, label: "Cola", icon: ListMusic },
];

const CATEGORY_ITEMS: Array<{
  category: Category;
  label: string;
  icon: typeof Music4;
  color: string;
}> = [
  { category: "alabanza", label: "Alabanza", icon: Music4, color: "text-violet-300" },
  { category: "adoracion", label: "Adoración", icon: Sparkles, color: "text-cyan-300" },
  { category: "predicacion", label: "Predicaciones", icon: Mic2, color: "text-fuchsia-300" },
  { category: "podcast", label: "Podcasts", icon: Podcast, color: "text-amber-300" },
];

interface SidebarContentProps {
  onNavigate: (view: View) => void;
  onClose?: () => void;
}

function SidebarContent({ onNavigate, onClose }: SidebarContentProps) {
  const { view, pushToast, setCloudOpen } = useUI();
  const router = useRouter();
  const { library, user, mode, syncing, firebaseReady, signOut, createPlaylist } =
    useLibrary();
  const { queue } = usePlayer();
  const { params } = useSearch();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const isActive = (type: View["type"], id?: string) =>
    view.type === type &&
    (type !== "playlist" || (view.type === "playlist" && view.id === id));

  const handleConnect = () => {
    if (!firebaseReady) {
      router.push("/panel");
      return;
    }
    setCloudOpen(true);
  };

  const submitPlaylist = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      pushToast("Regístrate para crear playlists.", "warning");
      setCloudOpen(true);
      return;
    }
    const id = createPlaylist(name);
    setName("");
    setCreating(false);
    onNavigate({ type: "playlist", id });
    pushToast("Playlist creada. Añade videos desde los resultados.", "success");
  };

  return (
    <>
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <div className="logo-mark">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-[17px] font-semibold leading-none tracking-wide text-white">
            Cristian<span className="text-gradient">Play</span>
          </p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.32em] text-slate-500">
            Worship OS
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <nav className="flex flex-col gap-1" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const next: View =
              item.type === "search"
                ? { type: "search", category: params.category }
                : { type: item.type };
            const active = isActive(item.type);
            const count =
              item.type === "favorites"
                ? library.favorites.length
                : item.type === "queue"
                  ? queue.length
                  : undefined;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => onNavigate(next)}
                aria-current={active ? "page" : undefined}
                className={clsx("nav-item", active && "nav-item-active")}
              >
                <Icon className="h-[17px] w-[17px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {typeof count === "number" && count > 0 ? (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <p className="sidebar-label">Explorar</p>
        <div className="flex flex-col gap-0.5">
          {CATEGORY_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              view.type === "search" && params.category === item.category;
            return (
              <button
                key={item.category}
                type="button"
                onClick={() =>
                  onNavigate({ type: "search", category: item.category })
                }
                className={clsx("nav-item", active && "nav-item-active")}
              >
                <Icon className={clsx("h-[17px] w-[17px]", item.color)} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between px-2">
          <p className="sidebar-label !p-0">Tus playlists</p>
          <button
            type="button"
            aria-label="Crear playlist"
            onClick={() => {
              if (!user) {
                pushToast("Regístrate para crear playlists.", "warning");
                setCloudOpen(true);
                return;
              }
              setCreating((current) => !current);
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {creating ? (
          <form onSubmit={submitPlaylist} className="mt-2 px-1">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="Nombre de la playlist"
              className="field w-full text-xs"
            />
          </form>
        ) : null}

        <div className="mt-2 flex flex-col gap-0.5">
          {library.playlists.length === 0 && !creating ? (
            <p className="px-3 py-2 text-xs leading-relaxed text-slate-500">
              Aún no tienes playlists. Crea una y guarda tus alabanzas favoritas.
            </p>
          ) : null}
          {library.playlists.map((playlist) => {
            const active = isActive("playlist", playlist.id);
            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => onNavigate({ type: "playlist", id: playlist.id })}
                className={clsx("nav-item group", active && "nav-item-active")}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-[10px] font-bold text-white/80">
                  {playlist.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {playlist.name}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:text-slate-300" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/[0.06] p-3">
        {user ? (
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full ring-2 ring-violet-400/40"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white">
                {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {user.displayName ?? "Cuenta conectada"}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/10"
          >
            <LogIn className="h-4 w-4 text-violet-300" />
            <span className="flex-1 text-left">Iniciar sesión</span>
          </button>
        )}

        <div className="mt-2 flex items-center gap-1.5 px-2 text-[10px] text-slate-500">
          {mode === "firebase" ? (
            <Cloud className="h-3 w-3 text-emerald-400" />
          ) : (
            <CloudOff className="h-3 w-3 text-slate-500" />
          )}
          <span>
            {mode === "firebase"
              ? "Sincronizado en Firebase"
              : firebaseReady
                ? "Modo local · Google disponible"
                : "Modo local · sin nube"}
          </span>
          {syncing ? (
            <Loader2 className="ml-auto h-3 w-3 animate-spin text-violet-300" />
          ) : null}
        </div>
      </div>
    </>
  );
}

export function Sidebar({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <aside className="hidden min-h-0 flex-col border-r border-white/[0.06] bg-[#070a14]/55 backdrop-blur-xl lg:flex">
      <SidebarContent onNavigate={onNavigate} />
    </aside>
  );
}

export function MobileSidebar({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const { sidebarOpen, setSidebarOpen } = useUI();
  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <aside className="drawer-in absolute inset-y-0 left-0 flex w-[292px] max-w-[85vw] flex-col border-r border-white/10 bg-[#070a14]">
        <SidebarContent
          onNavigate={onNavigate}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>
    </div>
  );
}
