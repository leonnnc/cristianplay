"use client";

import {
  Heart,
  ListPlus,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { useLibrary } from "@/components/providers/library-provider";
import { usePlayer } from "@/components/providers/player-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Equalizer } from "@/components/ui/equalizer";
import { Thumb } from "@/components/ui/thumb";
import { formatViews } from "@/lib/format";
import { MEDIA_LABELS, type MediaCategory, type Track } from "@/lib/types";

const CATEGORY_STYLES: Record<MediaCategory, string> = {
  alabanza: "text-violet-300",
  adoracion: "text-cyan-300",
  predicacion: "text-fuchsia-300",
  podcast: "text-amber-300",
  otro: "text-slate-300",
};

function CategoryBadge({ category }: { category: MediaCategory }) {
  return (
    <span
      className={clsx(
        "rounded-full border border-white/10 bg-black/35 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        CATEGORY_STYLES[category],
      )}
    >
      {MEDIA_LABELS[category]}
    </span>
  );
}

function useTrackActions(track: Track) {
  const { isFavorite, toggleFavorite, user } = useLibrary();
  const { playNow, enqueue, current } = usePlayer();
  const { openPlaylistPicker, pushToast } = useUI();

  const active = current?.id === track.id;

  return {
    active,
    favorite: isFavorite(track.id),
    play: () => playNow(track),
    enqueue: () => {
      enqueue(track);
      pushToast("Añadido a la cola", "success");
    },
    toggleFavorite: () => {
      if (!user) {
        pushToast("Regístrate para guardar favoritos.", "warning");
        return;
      }
      const added = toggleFavorite(track);
      pushToast(
        added ? "Guardado en favoritos" : "Quitado de favoritos",
        added ? "success" : "info",
      );
    },
    addToPlaylist: () => {
      if (!user) {
        pushToast("Regístrate para crear playlists.", "warning");
        return;
      }
      openPlaylistPicker(track);
    },
  };
}

export function TrackRow({
  track,
  onRemove,
  onPlay,
  removeLabel = "Quitar",
  meta,
  className,
}: {
  track: Track;
  onRemove?: () => void;
  onPlay?: () => void;
  removeLabel?: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  const actions = useTrackActions(track);
  const { playing } = usePlayer();
  const play = onPlay ?? actions.play;

  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-2xl border border-transparent p-2 transition hover:border-white/10 hover:bg-white/[0.045]",
        actions.active && "border-violet-400/30 bg-violet-500/[0.08]",
        className,
      )}
    >
      <button
        type="button"
        onClick={play}
        aria-label={`Reproducir ${track.title}`}
        className="relative h-[52px] w-[92px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10"
      >
        <Thumb src={track.thumbnail} alt="" className="h-full w-full" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
        {actions.active ? (
          <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1 py-0.5">
            <Equalizer active={playing} />
          </span>
        ) : null}
        {track.durationText ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[9px] font-medium text-white">
            {track.durationText}
          </span>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={play}
          className="block w-full text-left"
        >
          <p className="line-clamp-2 text-[13px] font-medium leading-snug text-slate-100 transition group-hover:text-white">
            {track.title}
          </p>
        </button>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {track.channel}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-slate-500">
          <CategoryBadge category={track.category} />
          {track.views ? <span>{formatViews(track.views)} vistas</span> : null}
          {track.live ? (
            <span className="inline-flex items-center gap-1 text-rose-300">
              <span className="h-1 w-1 animate-pulse rounded-full bg-rose-400" />
              EN VIVO
            </span>
          ) : null}
          {meta}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={actions.toggleFavorite}
          aria-label={actions.favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          className={clsx(
            "rounded-lg p-1.5 transition hover:bg-white/10",
            actions.favorite
              ? "text-rose-300"
              : "text-slate-500 hover:text-white",
          )}
        >
          <Heart
            className={clsx("h-4 w-4", actions.favorite && "fill-current")}
          />
        </button>
        <button
          type="button"
          onClick={actions.addToPlaylist}
          aria-label="Añadir a playlist"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          <ListPlus className="h-4 w-4" />
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={actions.enqueue}
            aria-label="Añadir a la cola"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TrackGridCard({
  track,
  onPlay,
}: {
  track: Track;
  onPlay?: () => void;
}) {
  const actions = useTrackActions(track);
  const { playing } = usePlayer();
  const play = onPlay ?? actions.play;

  return (
    <article
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition duration-300 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-white/[0.055] hover:shadow-[0_18px_50px_-24px_rgba(139,92,246,0.55)]",
        actions.active && "border-violet-400/40 bg-violet-500/[0.07]",
      )}
    >
      <button
        type="button"
        onClick={play}
        aria-label={`Reproducir ${track.title}`}
        className="relative block aspect-video w-full overflow-hidden"
      >
        <Thumb
          src={track.thumbnail}
          alt=""
          className="h-full w-full transition duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/20" />
        <span className="absolute left-2 top-2">
          <CategoryBadge category={track.category} />
        </span>
        {track.durationText ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {track.durationText}
          </span>
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-white/95 text-slate-950 opacity-0 shadow-2xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
        {actions.active ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-1.5 py-1">
            <Equalizer active={playing} />
          </span>
        ) : null}
      </button>

      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug text-slate-100">
          {track.title}
        </p>
        <p className="mt-1 truncate text-[11px] text-slate-500">
          {track.channel}
        </p>
        <div className="mt-2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={actions.toggleFavorite}
            aria-label="Favorito"
            className={clsx(
              "rounded-lg p-1.5 transition hover:bg-white/10",
              actions.favorite
                ? "text-rose-300"
                : "text-slate-500 hover:text-white",
            )}
          >
            <Heart
              className={clsx("h-4 w-4", actions.favorite && "fill-current")}
            />
          </button>
          <button
            type="button"
            onClick={actions.enqueue}
            aria-label="Añadir a la cola"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={actions.addToPlaylist}
            aria-label="Añadir a playlist"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <ListPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
