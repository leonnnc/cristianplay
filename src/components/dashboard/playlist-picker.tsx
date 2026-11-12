"use client";

import { useState } from "react";
import { Check, ListMusic, Plus, X } from "lucide-react";
import clsx from "clsx";
import { useLibrary } from "@/components/providers/library-provider";
import { useUI } from "@/components/providers/ui-provider";
import { Thumb } from "@/components/ui/thumb";
import { plural } from "@/lib/format";
import type { Track } from "@/lib/types";

function PlaylistPickerInner({
  track,
  onClose,
}: {
  track: Track;
  onClose: () => void;
}) {
  const { library, createPlaylist, addToPlaylist } = useLibrary();
  const { pushToast } = useUI();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(library.playlists.length === 0);

  const add = (playlistId: string) => {
    addToPlaylist(playlistId, track);
    pushToast("Video añadido a la playlist", "success");
    onClose();
  };

  const createAndAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const id = createPlaylist(name);
    addToPlaylist(id, track);
    pushToast("Playlist creada con el video", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <div className="modal-in relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e1c] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/[0.07] p-4">
          <Thumb
            src={track.thumbnail}
            alt=""
            className="h-12 w-20 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">
              Añadir a playlist
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs font-medium text-white">
              {track.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {library.playlists.map((playlist) => {
              const already = playlist.tracks.some(
                (item) => item.id === track.id,
              );
              return (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={already}
                  onClick={() => add(playlist.id)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition",
                    already
                      ? "cursor-default opacity-60"
                      : "hover:border-white/10 hover:bg-white/[0.05]",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-500/15 text-violet-200">
                    <ListMusic className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-100">
                      {playlist.name}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {plural(playlist.tracks.length, "video", "videos")}
                    </span>
                  </span>
                  {already ? (
                    <Check className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <Plus className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              );
            })}
          </div>

          {library.playlists.length === 0 && !creating ? (
            <p className="px-2 py-3 text-center text-[11px] text-slate-500">
              Aún no tienes playlists.
            </p>
          ) : null}

          {creating ? (
            <form onSubmit={createAndAdd} className="mt-3 space-y-2">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                placeholder="Nombre de la nueva playlist"
                className="field w-full text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110"
              >
                Crear y añadir
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:border-violet-400/40 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva playlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlaylistPicker() {
  const { playlistTarget, closePlaylistPicker } = useUI();
  if (!playlistTarget) return null;

  return (
    <PlaylistPickerInner
      key={playlistTarget.id}
      track={playlistTarget}
      onClose={closePlaylistPicker}
    />
  );
}
