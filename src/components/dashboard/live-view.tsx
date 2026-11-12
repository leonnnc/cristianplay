"use client";

import { CalendarClock, ExternalLink, MonitorPlay } from "lucide-react";
import { useChurch } from "@/components/providers/church-provider";
import { useLive } from "@/components/providers/live-provider";
import { TrackGridCard } from "@/components/dashboard/track-cards";
import { LiveBanner } from "@/components/dashboard/live-banner";
import { plural } from "@/lib/format";
import { LIVE_CHANNEL, LIVE_WINDOWS } from "@/lib/live";

const WINDOW_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

export function LiveView() {
  const { status, isLive } = useLive();
  const { videos, loading } = useChurch();
  const recent = videos.slice(0, 8);

  return (
    <div className="space-y-5">
      <LiveBanner />

      {isLive && status?.videoId ? (
        <section className="space-y-2">
          <div className="relative overflow-hidden rounded-3xl border border-rose-400/30 bg-black shadow-[0_30px_90px_-50px_rgba(244,63,94,0.9)]">
            <div className="aspect-video">
              <iframe
                title={status.title ?? "Transmisión en vivo de Catedral de Fe"}
                src={`https://www.youtube.com/embed/${status.videoId}?rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-500">
            Si el video no carga, ábrelo directamente en{" "}
            <a
              href={`https://www.youtube.com/watch?v=${status.videoId}`}
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 underline-offset-2 hover:underline"
            >
              YouTube
            </a>
            .
          </p>
        </section>
      ) : null}

      <section className="glass-soft rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            <CalendarClock className="h-3.5 w-3.5 text-violet-300" />
            Horario de transmisión
          </p>
          <a
            href={LIVE_CHANNEL.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 transition hover:text-white"
          >
            <MonitorPlay className="h-3.5 w-3.5 text-rose-300" />
            @{LIVE_CHANNEL.handle}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {LIVE_WINDOWS.map((window) => (
            <div
              key={`${window.weekday}-${window.start}`}
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2"
            >
              <span className="text-xs font-medium text-slate-200">
                {WINDOW_LABELS[window.weekday]}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {window.start} – {window.end}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-2.5 text-[10px] leading-relaxed text-slate-500">
          Hora de Lima (UTC-5). El indicador se enciende al detectar el directo
          en YouTube y se apaga al finalizar.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Canal de la iglesia
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold text-white sm:text-xl">
              Últimos videos de {LIVE_CHANNEL.name}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {loading
                ? "Cargando el canal…"
                : `${plural(videos.length, "video disponible", "videos disponibles")} en el feed`}
            </p>
          </div>
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {recent.map((track) => (
              <TrackGridCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-500">
            {loading
              ? "Consultando el feed del canal…"
              : "No hay videos disponibles en este momento."}
          </p>
        )}
      </section>
    </div>
  );
}
