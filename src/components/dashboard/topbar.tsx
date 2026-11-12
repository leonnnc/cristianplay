"use client";

import { useSyncExternalStore } from "react";
import { Menu, Search, Sparkles } from "lucide-react";
import { useLibrary } from "@/components/providers/library-provider";
import { useLive } from "@/components/providers/live-provider";
import { useSearch } from "@/components/providers/search-provider";
import { useUI } from "@/components/providers/ui-provider";
import { LiveDot } from "@/components/ui/live-dot";
import { formatClock, formatLongDate, plural } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";

function requestSearchFocus() {
  window.setTimeout(() => {
    window.dispatchEvent(new Event("cp:focus-search"));
  }, 80);
}

const CLOCK_TICK_MS = 30_000;

function subscribeToClock(onTick: () => void) {
  const timer = window.setInterval(onTick, CLOCK_TICK_MS);
  return () => window.clearInterval(timer);
}

// Devuelve un valor estable entre renders (el minuto en curso).
function getClockBucket() {
  return Math.floor(Date.now() / CLOCK_TICK_MS);
}

function useNow(): Date | null {
  const bucket = useSyncExternalStore(
    subscribeToClock,
    getClockBucket,
    () => 0,
  );
  return bucket === 0 ? null : new Date(bucket * CLOCK_TICK_MS);
}

export function TopBar() {
  const { view, navigate, setSidebarOpen, setSearchOpen } = useUI();
  const { library } = useLibrary();
  const { params } = useSearch();
  const { isLive } = useLive();
  const now = useNow();

  const openSearch = () => {
    setSearchOpen(true);
    requestSearchFocus();
  };

  let title = "Tu espacio de adoración";
  let eyebrow = "Dashboard";

  if (view.type === "search") {
    title =
      params.category === "todas"
        ? "Explorar música y predicaciones"
        : CATEGORY_LABELS[params.category];
    eyebrow = params.query ? `Búsqueda · ${params.query}` : "Explorar";
  } else if (view.type === "live") {
    title = "En vivo · Catedral de Fe";
    eyebrow = isLive ? "Transmitiendo ahora" : "Transmisiones de la iglesia";
  } else if (view.type === "favorites") {
    title = "Favoritos";
    eyebrow = plural(library.favorites.length, "guardado", "guardados");
  } else if (view.type === "history") {
    title = "Historial";
    eyebrow = plural(library.history.length, "reproducción", "reproducciones");
  } else if (view.type === "queue") {
    title = "Tu cola";
    eyebrow = "Reproducción continua";
  } else if (view.type === "playlist") {
    const playlist = library.playlists.find((item) => item.id === view.id);
    title = playlist?.name ?? "Playlist";
    eyebrow = plural(playlist?.tracks.length ?? 0, "video", "videos");
  }

  return (
    <header className="mb-4 flex items-center gap-3 sm:mb-5">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setSidebarOpen(true)}
        className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-slate-500">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          {eyebrow}
          <span className="hidden text-slate-600 sm:inline">
            · {now ? formatLongDate(now) : "—"}
          </span>
        </p>
        <h1 className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h1>
      </div>

      {isLive ? (
        <button
          type="button"
          onClick={() => navigate({ type: "live" })}
          className="hidden items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-100 transition hover:bg-rose-500/25 sm:flex"
        >
          <LiveDot active className="h-1.5 w-1.5" />
          En vivo
        </button>
      ) : null}

      <button
        type="button"
        onClick={openSearch}
        className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white sm:flex"
      >
        <Search className="h-4 w-4" />
        <span>Buscar</span>
        <kbd className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          /
        </kbd>
      </button>

      <button
        type="button"
        aria-label="Abrir búsqueda"
        onClick={openSearch}
        className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white sm:hidden"
      >
        <Search className="h-5 w-5" />
      </button>

      <div className="hidden flex-col items-end lg:flex">
        <span className="font-mono text-sm text-slate-200">
          {now ? formatClock(now) : "--:--"}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Sparkles className="h-3 w-3 text-violet-400" />
          Modo enfoque
        </span>
      </div>
    </header>
  );
}
