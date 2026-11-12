"use client";

import { useEffect, useRef } from "react";
import {
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import clsx from "clsx";
import { usePlayer } from "@/components/providers/player-provider";
import { useSearch } from "@/components/providers/search-provider";
import { useUI } from "@/components/providers/ui-provider";
import { TrackRow } from "@/components/dashboard/track-cards";
import { plural } from "@/lib/format";
import {
  CATEGORY_LABELS,
  type Category,
  type DurationFilter,
  type SortOrder,
  type Track,
} from "@/lib/types";

const CATEGORIES: Category[] = [
  "todas",
  "alabanza",
  "adoracion",
  "predicacion",
  "podcast",
];

const SUGGESTIONS = [
  "Marcos Witt",
  "Adoración en vivo",
  "Sermón de fe",
  "Salmo 23",
  "Hillsong español",
];

const DURATION_LABELS: Record<DurationFilter, string> = {
  any: "Cualquier duración",
  short: "Corto (< 4 min)",
  medium: "Medio (4–20 min)",
  long: "Largo (+20 min)",
};

const ORDER_LABELS: Record<SortOrder, string> = {
  relevance: "Más relevante",
  date: "Más reciente",
  views: "Más visto",
};

function SearchSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-3 rounded-2xl p-2"
        >
          <div className="h-[52px] w-[92px] shrink-0 rounded-xl bg-white/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-11/12 rounded bg-white/[0.07]" />
            <div className="h-2.5 w-7/12 rounded bg-white/[0.05]" />
            <div className="h-2 w-5/12 rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchPanel({
  variant = "desktop",
  onClose,
}: {
  variant?: "desktop" | "sheet";
  onClose?: () => void;
}) {
  const {
    params,
    state,
    setQuery,
    setCategory,
    setDuration,
    setOrder,
    setStrict,
    submit,
    loadMore,
  } = useSearch();
  const { setSearchOpen } = useUI();
  const { playNow } = usePlayer();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("cp:focus-search", handler);
    return () => window.removeEventListener("cp:focus-search", handler);
  }, []);

  useEffect(() => {
    if (variant !== "sheet") return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timeout);
  }, [variant]);

  const handlePlay = (track: Track) => {
    if (variant === "sheet") setSearchOpen(false);
    playNow(track);
  };

  const providerLabel =
    state.provider === "official" ? "API oficial" : "Modo abierto";

  return (
    <div
      className={clsx(
        "flex h-full min-h-0 flex-col",
        variant === "desktop" ? "px-4 pb-4 pt-4" : "px-4 pb-4 pt-3",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-300/90">
            Buscar
          </p>
          <h2 className="mt-0.5 font-display text-lg font-semibold text-white">
            Encuentra tu próxima adoración
          </h2>
        </div>
        {variant === "sheet" && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mt-3"
      >
        <div className="search-shell">
          <Search className="h-4 w-4 shrink-0 text-violet-300" />
          <input
            ref={inputRef}
            value={params.query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Alabanza, predicación, artista…"
            aria-label="Buscar en YouTube"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-500 focus:outline-none"
          />
          {params.query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110"
          >
            {state.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Ir"
            )}
          </button>
        </div>
      </form>

      <div className="scrollbar-none mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORIES.map((category) => {
          const active = params.category === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setCategory(category)}
              className={clsx(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                active
                  ? "border-violet-400/50 bg-violet-500/20 text-white shadow-[0_0_18px_-6px_rgba(139,92,246,0.9)]"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white",
              )}
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <label className="field-wrap">
          <select
            value={params.duration}
            onChange={(event) =>
              setDuration(event.target.value as DurationFilter)
            }
            aria-label="Duración"
            className="field appearance-none pr-6 text-[11px]"
          >
            {(Object.keys(DURATION_LABELS) as DurationFilter[]).map((key) => (
              <option key={key} value={key}>
                {DURATION_LABELS[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
        </label>
        <label className="field-wrap">
          <select
            value={params.order}
            onChange={(event) => setOrder(event.target.value as SortOrder)}
            aria-label="Ordenar por"
            className="field appearance-none pr-6 text-[11px]"
          >
            {(Object.keys(ORDER_LABELS) as SortOrder[]).map((key) => (
              <option key={key} value={key}>
                {ORDER_LABELS[key]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
        </label>
      </div>

      <button
        type="button"
        onClick={() => setStrict(!params.strict)}
        aria-pressed={params.strict}
        className={clsx(
          "mt-1.5 flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-medium transition",
          params.strict
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white",
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Filtro cristiano estricto
        <span
          className={clsx(
            "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold",
            params.strict
              ? "bg-emerald-400/20 text-emerald-200"
              : "bg-white/10 text-slate-400",
          )}
        >
          {params.strict ? "ON" : "OFF"}
        </span>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
        {state.loading ? (
          <span className="inline-flex items-center gap-1 text-violet-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            Buscando…
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                state.provider === "official"
                  ? "bg-emerald-400"
                  : "bg-amber-400",
              )}
            />
            {providerLabel} · {plural(state.items.length, "resultado", "resultados")}
          </span>
        )}
        {state.tookMs ? <span>{state.tookMs} ms</span> : null}
        {state.blocked > 0 ? <span>{state.blocked} descartados</span> : null}
        {state.relaxed ? (
          <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-amber-200">
            Filtro ampliado
          </span>
        ) : null}
      </div>

      {state.notice ? (
        <p className="mt-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-200/90">
          {state.notice}
        </p>
      ) : null}

      <div className="scroll-thin mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
        {state.loading && state.items.length === 0 ? <SearchSkeleton /> : null}

        {!state.loading && state.error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-center">
            <p className="text-xs leading-relaxed text-rose-100">
              {state.error}
            </p>
            <button
              type="button"
              onClick={submit}
              className="mt-3 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/10"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!state.loading &&
        !state.error &&
        state.items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-violet-300/80" />
            <p className="mt-2 text-xs font-medium text-slate-200">
              Sin resultados en este filtro
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Prueba a desactivar el filtro estricto o busca otro término.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-300 transition hover:border-violet-400/40 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-0.5">
          {state.items.map((track) => (
            <TrackRow key={track.id} track={track} onPlay={() => handlePlay(track)} />
          ))}
        </div>

        {state.nextPageToken ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={state.loadingMore}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:border-violet-400/40 hover:text-white disabled:opacity-60"
          >
            {state.loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Cargar más resultados
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-center text-[9px] leading-relaxed text-slate-600">
        Resultados de YouTube filtrados por relevancia cristiana. La app no
        aloja contenido.
      </p>
    </div>
  );
}

export function SearchSheet() {
  const { searchOpen, setSearchOpen } = useUI();
  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-[75] xl:hidden">
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        onClick={() => setSearchOpen(false)}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />
      <div className="sheet-in absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-white/10 bg-[#070a14] shadow-2xl">
        <SearchPanel variant="sheet" onClose={() => setSearchOpen(false)} />
      </div>
    </div>
  );
}
