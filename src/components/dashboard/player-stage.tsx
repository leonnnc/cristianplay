"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Heart,
  ListMusic,
  ListPlus,
  Maximize2,
  Minimize2,
  Music4,
  Mic2,
  Pause,
  Play,
  Podcast,
  Radio,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import clsx from "clsx";
import { useLibrary } from "@/components/providers/library-provider";
import { usePlayer } from "@/components/providers/player-provider";
import { useSearch } from "@/components/providers/search-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Thumb } from "@/components/ui/thumb";
import { formatDuration, formatViews } from "@/lib/format";
import {
  CATEGORY_LABELS,
  MEDIA_LABELS,
  type Category,
} from "@/lib/types";

const QUICK_CATEGORIES: Array<{
  category: Category;
  icon: typeof Music4;
  color: string;
}> = [
  { category: "alabanza", icon: Music4, color: "text-violet-300" },
  { category: "adoracion", icon: Sparkles, color: "text-cyan-300" },
  { category: "predicacion", icon: Mic2, color: "text-fuchsia-300" },
  { category: "podcast", icon: Podcast, color: "text-amber-300" },
];

export function PlayerStage() {
  const {
    current,
    queue,
    index,
    playing,
    buffering,
    progress,
    duration,
    volume,
    muted,
    error,
    attachHost,
    toggle,
    next,
    prev,
    seek,
    changeVolume,
    toggleMute,
    playQueue,
    playAt,
    enqueue,
  } = usePlayer();
  const { searchCategory, state: searchState } = useSearch();
  const { navigate, openPlaylistPicker, pushToast } = useUI();
  const { isFavorite, toggleFavorite, user } = useLibrary();

  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const hostRef = useCallback(
    (element: HTMLDivElement | null) => attachHost(element),
    [attachHost],
  );

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void stageRef.current?.requestFullscreen().catch(() => {
      pushToast("El navegador no permitió pantalla completa.", "warning");
    });
  };

  const total = duration || current?.durationSec || 0;
  const percent = total > 0 ? Math.min(100, (progress / total) * 100) : 0;
  const favorite = current ? isFavorite(current.id) : false;

  const quickCategory = (category: Category) => {
    searchCategory(category);
    navigate({ type: "search", category });
  };

  return (
    <section
      ref={stageRef}
      className="stage relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#080b16]/80 p-2.5 shadow-[0_30px_90px_-40px_rgba(139,92,246,0.45)] backdrop-blur-2xl sm:p-3"
    >
      <div className="stage-glow" aria-hidden="true" />

      <div className="stage-media relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        {current ? (
          <div className="absolute inset-0 scale-110 opacity-30 blur-2xl">
            <Thumb src={current.thumbnail} alt="" className="h-full w-full" />
          </div>
        ) : (
          <div className="absolute inset-0 stage-empty-bg" />
        )}

        <div
          className={clsx(
            "absolute inset-0 z-10 transition-opacity duration-500",
            current ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div
            ref={hostRef}
            className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
          />
        </div>

        {!current ? (
          <div className="relative z-20 flex h-full flex-col items-center justify-center gap-4 px-5 py-6 text-center sm:gap-5">
            <div className="empty-orb">
              <Play className="ml-1 h-7 w-7 fill-current" />
            </div>
            <div className="max-w-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-violet-300/90">
                Reproductor listo
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-white sm:text-3xl">
                Tu santuario de sonido
              </h2>
              <p className="mt-1.5 hidden text-xs leading-relaxed text-slate-400 sm:block">
                Alabanza, adoración y predicación filtradas para ti. Elige un
                video de la búsqueda o empieza por una categoría.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {QUICK_CATEGORIES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => quickCategory(item.category)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-500/15 hover:text-white"
                  >
                    <Icon className={clsx("h-3.5 w-3.5", item.color)} />
                    {CATEGORY_LABELS[item.category]}
                  </button>
                );
              })}
              {searchState.items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => playQueue(searchState.items)}
                  className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Reproducir sugerencias
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-1.5 bg-gradient-to-b from-black/70 to-transparent p-3">
              {current.live ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  <Radio className="h-2.5 w-2.5" />
                  En vivo
                </span>
              ) : null}
              <span className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-200 backdrop-blur">
                {MEDIA_LABELS[current.category]}
              </span>
              <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-medium text-slate-300 backdrop-blur">
                {current.source === "official" ? "API oficial" : "Modo abierto"}
              </span>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3">
              <div className="flex items-center gap-1">
                {queue.slice(0, 4).map((track, position) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => playAt(position)}
                    aria-label={`Reproducir ${track.title}`}
                    className={clsx(
                      "pointer-events-auto h-7 w-12 overflow-hidden rounded-md ring-1 transition",
                      position === index
                        ? "ring-violet-400 opacity-100"
                        : "ring-white/20 opacity-60 hover:opacity-100",
                    )}
                  >
                    <Thumb src={track.thumbnail} alt="" className="h-full w-full" />
                  </button>
                ))}
              </div>
            </div>

            {!playing && !buffering && !error ? (
              <button
                type="button"
                onClick={toggle}
                aria-label="Reproducir"
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 transition hover:bg-black/35"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-white/20">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </span>
              </button>
            ) : null}

            {buffering && !error ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <span className="loader-ring" aria-label="Cargando" />
              </div>
            ) : null}

            {error ? (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
                <p className="text-sm text-slate-200">{error}</p>
                <div className="flex gap-2">
                  {queue.length > 1 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-full bg-violet-500 px-4 py-1.5 text-xs font-semibold text-white"
                    >
                      Pasar al siguiente
                    </button>
                  ) : null}
                  <a
                    href={`https://www.youtube.com/watch?v=${current.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-slate-200"
                  >
                    Abrir en YouTube
                  </a>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="relative z-10 px-1 pb-0.5 pt-3">
        {current ? (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug text-white sm:text-lg">
                {current.title}
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
                {current.channel}
                {current.views ? ` · ${formatViews(current.views)} vistas` : ""}
                {current.publishedText ? ` · ${current.publishedText}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    pushToast("Regístrate para guardar favoritos.", "warning");
                    return;
                  }
                  const added = toggleFavorite(current);
                  pushToast(
                    added ? "Guardado en favoritos" : "Quitado de favoritos",
                    added ? "success" : "info",
                  );
                }}
                aria-label="Favorito"
                className={clsx(
                  "rounded-lg p-2 transition hover:bg-white/10",
                  favorite ? "text-rose-300" : "text-slate-400 hover:text-white",
                )}
              >
                <Heart className={clsx("h-4 w-4", favorite && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    pushToast("Regístrate para crear playlists.", "warning");
                    return;
                  }
                  openPlaylistPicker(current);
                }}
                aria-label="Añadir a playlist"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <ListPlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  enqueue(current);
                  pushToast("Añadido a la cola", "success");
                }}
                aria-label="Añadir a la cola"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <ListMusic className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="px-1 pb-1 text-center text-[11px] text-slate-500">
            Conecta tu búsqueda, arma playlists y deja que la adoración fluya.
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={queue.length < 2}
            aria-label="Anterior"
            className="control-btn"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={toggle}
            disabled={!current}
            aria-label={playing ? "Pausar" : "Reproducir"}
            className="play-btn"
          >
            {playing ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={queue.length < 2}
            aria-label="Siguiente"
            className="control-btn"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>

          <div className="mx-1 min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.floor(total))}
              step={1}
              value={Math.min(Math.floor(progress), Math.max(1, Math.floor(total)))}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Progreso del video"
              disabled={!current}
              className="progress-range w-full"
              style={{ "--p": `${percent}%` } as CSSProperties}
            />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-500">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(total)}</span>
            </div>
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Activar sonido" : "Silenciar"}
              className="control-btn"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volumen"
              className="volume-range w-16"
            />
          </div>

          <button
            type="button"
            onClick={() => navigate({ type: "queue" })}
            aria-label="Ver cola"
            className="control-btn relative"
          >
            <ListMusic className="h-4 w-4" />
            {queue.length > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-violet-500 px-0.5 text-[8px] font-bold text-white">
                {queue.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Pantalla completa"
            className="control-btn hidden sm:flex"
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
