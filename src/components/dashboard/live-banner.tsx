"use client";

import { CalendarClock, ExternalLink, MonitorPlay, Play, Radio } from "lucide-react";
import clsx from "clsx";
import { useLive } from "@/components/providers/live-provider";
import { usePlayer } from "@/components/providers/player-provider";
import { LiveDot } from "@/components/ui/live-dot";
import {
  buildLiveTrack,
  LIVE_CHANNEL,
  LIVE_SCHEDULE_LABEL,
} from "@/lib/live";

export function LiveBanner({ compact = false }: { compact?: boolean }) {
  const { status, loading, error, isLive, inWindow } = useLive();
  const { playNow } = usePlayer();

  const track = status ? buildLiveTrack(status) : null;
  const waiting = !isLive && inWindow;

  const label = isLive ? "EN VIVO" : waiting ? "EN ESPERA" : "OFF";
  const heading = isLive
    ? status?.title?.trim() || `En vivo · ${LIVE_CHANNEL.fullName}`
    : waiting
      ? "La transmisión está por comenzar"
      : "No hay transmisión en este momento";

  const description = isLive
    ? `${LIVE_CHANNEL.fullName} · ${LIVE_CHANNEL.location}`
    : waiting
      ? "La ventana de transmisión está activa. Actualizamos el estado automáticamente."
      : status?.nextStartLabel
        ? `Próxima transmisión ${status.nextStartLabel}.`
        : "Consulta el canal para ver las transmisiones anteriores.";

  return (
    <section
      aria-live="polite"
      className={clsx(
        "relative overflow-hidden rounded-3xl border transition-colors",
        compact ? "p-3.5" : "p-4 sm:p-5",
        isLive
          ? "border-rose-400/40 bg-gradient-to-br from-rose-600/25 via-rose-500/10 to-transparent shadow-[0_24px_70px_-40px_rgba(244,63,94,0.9)]"
          : waiting
            ? "border-amber-300/25 bg-gradient-to-br from-amber-400/12 via-amber-300/5 to-transparent"
            : "border-white/[0.08] bg-white/[0.025]",
      )}
    >
      {isLive ? (
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-500/25 blur-3xl" />
      ) : null}

      <div className="relative flex flex-wrap items-start gap-3">
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
            isLive
              ? "border-rose-300/40 bg-rose-500/20 text-rose-100"
              : waiting
                ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
                : "border-white/10 bg-white/[0.04] text-slate-400",
          )}
        >
          <Radio className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              "flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em]",
              isLive
                ? "text-rose-100"
                : waiting
                  ? "text-amber-200"
                  : "text-slate-500",
            )}
          >
            <LiveDot active={isLive} className="h-2 w-2" />
            {label}
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-medium normal-case tracking-normal text-slate-300">
              {LIVE_CHANNEL.name}
            </span>
          </p>

          <h2 className="mt-1.5 line-clamp-2 font-display text-base font-semibold leading-snug text-white sm:text-lg">
            {loading && !status ? "Consultando transmisión…" : heading}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {error && !isLive ? error : description}
          </p>

          {!compact ? (
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
              <CalendarClock className="h-3 w-3 text-slate-500" />
              {LIVE_SCHEDULE_LABEL}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLive && track ? (
            <button
              type="button"
              onClick={() => playNow(track)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:brightness-110"
            >
              <Play className="h-3 w-3 fill-current" />
              Ver aquí
            </button>
          ) : null}
          <a
            href={LIVE_CHANNEL.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-violet-400/40 hover:text-white"
          >
            <MonitorPlay className="h-3.5 w-3.5 text-rose-300" />
            YouTube
            <ExternalLink className="h-3 w-3 text-slate-500" />
          </a>
        </div>
      </div>
    </section>
  );
}
