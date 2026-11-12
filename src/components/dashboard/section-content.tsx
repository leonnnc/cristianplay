"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock3,
  Heart,
  History,
  ListMusic,
  Loader2,
  Mic2,
  Music4,
  Pencil,
  Play,
  Podcast,
  Radio,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { useChurch } from "@/components/providers/church-provider";
import { useLibrary } from "@/components/providers/library-provider";
import { useLive } from "@/components/providers/live-provider";
import { usePlayer } from "@/components/providers/player-provider";
import { useSearch } from "@/components/providers/search-provider";
import { useUI } from "@/components/providers/ui-provider";
import { LiveBanner } from "@/components/dashboard/live-banner";
import { LiveView } from "@/components/dashboard/live-view";
import { TrackGridCard, TrackRow } from "@/components/dashboard/track-cards";
import { LiveDot } from "@/components/ui/live-dot";
import { Thumb } from "@/components/ui/thumb";
import { filterChurchTracks } from "@/lib/church";
import { formatRelative, plural } from "@/lib/format";
import { LIVE_CHANNEL } from "@/lib/live";
import {
  CATEGORY_LABELS,
  type Category,
  type Track,
  type View,
} from "@/lib/types";

const EXPLORE_TILES: Array<{
  category: Category;
  title: string;
  description: string;
  icon: typeof Music4;
  gradient: string;
  color: string;
}> = [
  {
    category: "alabanza",
    title: "Alabanzas",
    description: "Cantos que elevan",
    icon: Music4,
    gradient: "from-violet-500/25 via-violet-500/5 to-transparent",
    color: "text-violet-200",
  },
  {
    category: "adoracion",
    title: "Adoraciones",
    description: "Presencia profunda",
    icon: Sparkles,
    gradient: "from-cyan-500/25 via-cyan-500/5 to-transparent",
    color: "text-cyan-200",
  },
  {
    category: "predicacion",
    title: "Prédicas",
    description: "Palabra que transforma",
    icon: Mic2,
    gradient: "from-fuchsia-500/25 via-fuchsia-500/5 to-transparent",
    color: "text-fuchsia-200",
  },
  {
    category: "podcast",
    title: "Podcasts",
    description: "Conversaciones de fe",
    icon: Podcast,
    gradient: "from-amber-500/25 via-amber-500/5 to-transparent",
    color: "text-amber-200",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-0.5 font-display text-lg font-semibold text-white sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

function PrimaryButton({
  onClick,
  children,
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-violet-400/40 hover:text-white"
    >
      {children}
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
        >
          <div className="aspect-video animate-pulse bg-white/[0.05]" />
          <div className="space-y-2 p-3">
            <div className="h-2.5 w-11/12 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-2 w-8/12 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-soft flex flex-col items-center justify-center rounded-3xl px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-200">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-base font-semibold text-white">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function HistoryStrip({ entries }: { entries: Array<{ track: Track; playedAt: number }> }) {
  const { playNow } = usePlayer();
  return (
    <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
      {entries.map((entry) => (
        <button
          key={`${entry.track.id}-${entry.playedAt}`}
          type="button"
          onClick={() => playNow(entry.track)}
          className="group flex w-[220px] shrink-0 items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2 text-left transition hover:border-violet-400/30 hover:bg-white/[0.05]"
        >
          <Thumb
            src={entry.track.thumbnail}
            alt=""
            className="h-12 w-[72px] shrink-0 rounded-lg"
          />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-200 group-hover:text-white">
              {entry.track.title}
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
              {formatRelative(entry.playedAt)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function HomeView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { playQueue } = usePlayer();
  const { library, hydrated } = useLibrary();
  const { videos, loading: churchLoading } = useChurch();
  const { isLive, status } = useLive();
  const featured = videos.slice(0, 8);

  if (!hydrated) return <GridSkeleton />;

  return (
    <div className="space-y-6">
      <LiveBanner />

      <section className="space-y-3">
        <SectionHeader
          eyebrow="Catedral de Fe"
          title="Elige tu atmósfera"
          description="Alabanzas, adoraciones, prédicas, podcasts y transmisiones en vivo de la iglesia."
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => onNavigate({ type: "live" })}
            className={clsx(
              "group relative overflow-hidden rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20",
              isLive
                ? "border-rose-400/40 bg-gradient-to-br from-rose-500/30 via-rose-500/10 to-transparent"
                : "border-white/[0.08] bg-gradient-to-br from-slate-400/12 via-slate-400/5 to-transparent",
            )}
          >
            <Radio
              className={clsx(
                "h-5 w-5",
                isLive ? "text-rose-200" : "text-slate-400",
              )}
            />
            <p className="mt-3 font-display text-sm font-semibold text-white">
              En vivo
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-400">
              {isLive
                ? "Transmitiendo ahora"
                : status?.nextStartLabel
                  ? `Próximo ${status.nextStartLabel}`
                  : "Sin transmisión programada"}
            </p>
            <span className="absolute bottom-3 right-3 flex items-center gap-1">
              <LiveDot active={isLive} className="h-1.5 w-1.5" />
              <span
                className={clsx(
                  "text-[9px] font-bold uppercase tracking-wide",
                  isLive ? "text-rose-200" : "text-slate-500",
                )}
              >
                {isLive ? "Live" : "Off"}
              </span>
            </span>
          </button>

          {EXPLORE_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.category}
                type="button"
                onClick={() =>
                  onNavigate({ type: "search", category: tile.category })
                }
                className={clsx(
                  "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5 hover:border-white/20",
                  tile.gradient,
                )}
              >
                <Icon className={clsx("h-5 w-5", tile.color)} />
                <p className="mt-3 font-display text-sm font-semibold text-white">
                  {tile.title}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
                  {tile.description}
                </p>
                <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </button>
            );
          })}
        </div>
      </section>

      {library.history.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Tu actividad"
            title="Continuar escuchando"
            action={
              <GhostButton onClick={() => onNavigate({ type: "history" })}>
                Ver historial
                <ArrowRight className="h-3 w-3" />
              </GhostButton>
            }
          />
          <HistoryStrip entries={library.history.slice(0, 6)} />
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeader
          eyebrow="Canal de la iglesia"
          title={`Últimos videos de ${LIVE_CHANNEL.name}`}
          description={
            churchLoading
              ? "Cargando el canal de la iglesia…"
              : `${featured.length} videos recientes con filtro cristiano`
          }
          action={
            <>
              {featured.length > 0 ? (
                <PrimaryButton onClick={() => playQueue(featured)}>
                  <Play className="h-3 w-3 fill-current" />
                  Reproducir
                </PrimaryButton>
              ) : null}
              <GhostButton
                onClick={() => onNavigate({ type: "search", category: "todas" })}
              >
                Ver todo
                <ArrowRight className="h-3 w-3" />
              </GhostButton>
            </>
          }
        />
        {churchLoading && featured.length === 0 ? <GridSkeleton /> : null}
        {!churchLoading && featured.length === 0 ? (
          <EmptyPanel
            icon={Radio}
            title="Sin videos del canal por ahora"
            description="No se pudo leer el feed de la iglesia. Abre YouTube para ver el contenido directamente."
            action={
              <PrimaryButton onClick={() => onNavigate({ type: "live" })}>
                <Radio className="h-3 w-3" />
                Ir a En vivo
              </PrimaryButton>
            }
          />
        ) : null}
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {featured.map((track) => (
              <TrackGridCard key={track.id} track={track} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="glass-soft flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
          <span className="font-medium text-slate-200">Canal verificado:</span>{" "}
          el contenido de las secciones proviene de {LIVE_CHANNEL.fullName} y se
          clasifica automáticamente por categoría.
        </p>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200">
          Activo
        </span>
      </section>
    </div>
  );
}

function SearchView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { params, state, loadMore, setStrict } = useSearch();
  const { videos, loading: churchLoading, error: churchError } = useChurch();
  const { playQueue } = usePlayer();
  const { setSearchOpen } = useUI();
  const [source, setSource] = useState<"church" | "all">("church");

  // Sin texto de búsqueda navegamos el canal de la iglesia; al escribir se
  // consulta YouTube de forma general.
  const churchMode = source === "church" && params.query.trim().length === 0;
  const items = churchMode
    ? filterChurchTracks(videos, params.category)
    : state.items;
  const loading = churchMode ? churchLoading : state.loading;
  const error = churchMode ? churchError : state.error;

  const title = churchMode
    ? params.category === "todas"
      ? `Canal de ${LIVE_CHANNEL.name}`
      : CATEGORY_LABELS[params.category]
    : params.category === "todas"
      ? "Resultados de búsqueda"
      : CATEGORY_LABELS[params.category];

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow={churchMode ? "Catedral de Fe" : "Búsqueda"}
        title={title}
        description={
          loading
            ? churchMode
              ? "Cargando el canal de la iglesia…"
              : "Consultando YouTube…"
            : churchMode
              ? `${plural(items.length, "video", "videos")} del canal de la iglesia`
              : `${plural(items.length, "video", "videos")} · filtro ${
                  params.strict ? "estricto" : "abierto"
                }`
        }
        action={
          <>
            {items.length > 0 ? (
              <PrimaryButton onClick={() => playQueue(items)}>
                <Play className="h-3 w-3 fill-current" />
                Reproducir todo
              </PrimaryButton>
            ) : null}
            <GhostButton onClick={() => setSearchOpen(true)}>
              <Search className="h-3 w-3" />
              {churchMode ? "Buscar en YouTube" : "Refinar"}
            </GhostButton>
          </>
        }
      />

      {params.query.trim().length === 0 ? (
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => setSource("church")}
            className={clsx(
              "rounded-full px-3 py-1 text-[10px] font-medium transition",
              source === "church"
                ? "bg-violet-500/25 text-white"
                : "text-slate-400 hover:text-white",
            )}
          >
            Canal de la iglesia
          </button>
          <button
            type="button"
            onClick={() => setSource("all")}
            className={clsx(
              "rounded-full px-3 py-1 text-[10px] font-medium transition",
              source === "all"
                ? "bg-violet-500/25 text-white"
                : "text-slate-400 hover:text-white",
            )}
          >
            Todo YouTube
          </button>
        </div>
      ) : null}

      {churchMode && error ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          {error}
        </p>
      ) : null}

      {!churchMode && error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-center">
          <p className="text-xs text-rose-100">{error}</p>
          <button
            type="button"
            onClick={() => setStrict(!params.strict)}
            className="mt-3 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white hover:bg-white/10"
          >
            Probar con filtro {params.strict ? "abierto" : "estricto"}
          </button>
        </div>
      ) : null}

      {!churchMode && state.relaxed ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
          El filtro estricto no encontró suficientes coincidencias. Mostrando
          resultados ampliados.
        </p>
      ) : null}

      {loading && items.length === 0 ? <GridSkeleton /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyPanel
          icon={Search}
          title={
            churchMode
              ? "Aún no hay videos en esta categoría"
              : "No encontramos resultados"
          }
          description={
            churchMode
              ? "El canal de la iglesia no tiene videos clasificados en esta sección por ahora. Prueba otra categoría o mira las transmisiones."
              : "Prueba con otro término, otra categoría o desactiva el filtro estricto."
          }
          action={
            churchMode ? (
              <PrimaryButton onClick={() => setSource("all")}>
                <Search className="h-3 w-3" />
                Ver en todo YouTube
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => setStrict(false)}>
                Ampliar filtro
              </PrimaryButton>
            )
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((track) => (
            <TrackGridCard key={track.id} track={track} />
          ))}
        </div>
      ) : null}

      {!churchMode && state.nextPageToken ? (
        <div className="flex justify-center">
          <GhostButton onClick={loadMore}>
            {state.loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Cargar más
          </GhostButton>
        </div>
      ) : null}

      {items.length === 0 && !loading ? (
        <button
          type="button"
          onClick={() => onNavigate({ type: "home" })}
          className="mx-auto flex items-center gap-1.5 text-[11px] text-slate-500 transition hover:text-white"
        >
          Volver al inicio
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

function FavoritesView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { library, hydrated } = useLibrary();
  const { playQueue } = usePlayer();

  if (!hydrated) return <GridSkeleton />;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Tu biblioteca"
        title="Favoritos"
        description={plural(
          library.favorites.length,
          "video guardado",
          "videos guardados",
        )}
        action={
          library.favorites.length > 0 ? (
            <PrimaryButton onClick={() => playQueue(library.favorites)}>
              <Play className="h-3 w-3 fill-current" />
              Reproducir todo
            </PrimaryButton>
          ) : null
        }
      />

      {library.favorites.length === 0 ? (
        <EmptyPanel
          icon={Heart}
          title="Tu colección está vacía"
          description="Toca el corazón en cualquier resultado para guardarlo aquí."
          action={
            <PrimaryButton
              onClick={() => onNavigate({ type: "search", category: "todas" })}
            >
              <Search className="h-3 w-3" />
              Buscar música
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {library.favorites.map((track) => (
            <TrackGridCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { library, hydrated, clearHistory } = useLibrary();
  const { playQueue } = usePlayer();
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) return <GridSkeleton />;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Tu actividad"
        title="Historial"
        description={plural(
          library.history.length,
          "reproducción reciente",
          "reproducciones recientes",
        )}
        action={
          <>
            {library.history.length > 0 ? (
              <PrimaryButton
                onClick={() =>
                  playQueue(library.history.map((entry) => entry.track))
                }
              >
                <Play className="h-3 w-3 fill-current" />
                Reproducir
              </PrimaryButton>
            ) : null}
            {library.history.length > 0 ? (
              <GhostButton
                onClick={() => {
                  if (confirming) {
                    clearHistory();
                    setConfirming(false);
                  } else {
                    setConfirming(true);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
                {confirming ? "Confirmar" : "Limpiar"}
              </GhostButton>
            ) : null}
          </>
        }
      />

      {library.history.length === 0 ? (
        <EmptyPanel
          icon={History}
          title="Todavía no hay historial"
          description="Los videos que reproduzcas aparecerán aquí para volver a ellos."
          action={
            <PrimaryButton
              onClick={() => onNavigate({ type: "search", category: "todas" })}
            >
              <Search className="h-3 w-3" />
              Empezar a escuchar
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-0.5">
          {library.history.map((entry) => (
            <TrackRow
              key={`${entry.track.id}-${entry.playedAt}`}
              track={entry.track}
              meta={
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Clock3 className="h-3 w-3" />
                  {formatRelative(entry.playedAt)}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QueueView() {
  const { queue, index, playAt, removeAt, moveItem, clearQueue, playQueue } =
    usePlayer();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Reproducción"
        title="Tu cola"
        description={plural(queue.length, "video en espera", "videos en espera")}
        action={
          <>
            {queue.length > 0 ? (
              <PrimaryButton onClick={() => playQueue(queue, 0)}>
                <Play className="h-3 w-3 fill-current" />
                Desde el inicio
              </PrimaryButton>
            ) : null}
            {queue.length > 0 ? (
              <GhostButton
                onClick={() => {
                  if (confirming) {
                    clearQueue();
                    setConfirming(false);
                  } else {
                    setConfirming(true);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
                {confirming ? "Confirmar" : "Vaciar"}
              </GhostButton>
            ) : null}
          </>
        }
      />

      {queue.length === 0 ? (
        <EmptyPanel
          icon={ListMusic}
          title="La cola está vacía"
          description="Usa el botón + en cualquier video para programarlo sin cortar lo que suena."
        />
      ) : (
        <div className="space-y-0.5">
          {queue.map((track, position) => (
            <TrackRow
              key={`${track.id}-${position}`}
              track={track}
              onPlay={() => playAt(position)}
              onRemove={() => removeAt(position)}
              removeLabel="Quitar de la cola"
              className={clsx(position === index && "bg-violet-500/[0.06]")}
              meta={
                <>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                    #{position + 1}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveItem(position, -1);
                      }}
                      disabled={position === 0}
                      aria-label="Subir en la cola"
                      className="rounded p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        moveItem(position, 1);
                      }}
                      disabled={position === queue.length - 1}
                      aria-label="Bajar en la cola"
                      className="rounded p-0.5 text-slate-500 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </span>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaylistView({
  playlistId,
  onNavigate,
}: {
  playlistId: string;
  onNavigate: (view: View) => void;
}) {
  const {
    library,
    hydrated,
    renamePlaylist,
    deletePlaylist,
    removeFromPlaylist,
  } = useLibrary();
  const { playQueue } = usePlayer();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) return <GridSkeleton />;

  const playlist = library.playlists.find((item) => item.id === playlistId);

  if (!playlist) {
    return (
      <EmptyPanel
        icon={ListMusic}
        title="Playlist no encontrada"
        description="Puede que se haya eliminado en otro dispositivo."
        action={
          <PrimaryButton onClick={() => onNavigate({ type: "home" })}>
            Volver al inicio
          </PrimaryButton>
        }
      />
    );
  }

  const startEditing = () => {
    setName(playlist.name);
    setEditing(true);
  };

  const saveName = () => {
    renamePlaylist(playlist.id, name);
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Playlist"
        title={editing ? "Renombrar playlist" : playlist.name}
        description={`${plural(playlist.tracks.length, "video", "videos")} · creada ${formatRelative(
          playlist.createdAt,
        )}`}
        action={
          <>
            {playlist.tracks.length > 0 ? (
              <PrimaryButton onClick={() => playQueue(playlist.tracks)}>
                <Play className="h-3 w-3 fill-current" />
                Reproducir
              </PrimaryButton>
            ) : null}
            <GhostButton onClick={startEditing}>
              <Pencil className="h-3 w-3" />
              Renombrar
            </GhostButton>
            <GhostButton
              onClick={() => {
                if (confirming) {
                  deletePlaylist(playlist.id);
                  onNavigate({ type: "home" });
                } else {
                  setConfirming(true);
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
              {confirming ? "Confirmar" : "Eliminar"}
            </GhostButton>
          </>
        }
      />

      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveName();
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            className="field flex-1 text-xs"
          />
          <PrimaryButton onClick={saveName}>Guardar</PrimaryButton>
          <GhostButton onClick={() => setEditing(false)}>Cancelar</GhostButton>
        </form>
      ) : null}

      {playlist.tracks.length === 0 ? (
        <EmptyPanel
          icon={ListMusic}
          title="Esta playlist está vacía"
          description="Añade videos con el icono de lista desde los resultados o el reproductor."
          action={
            <PrimaryButton
              onClick={() => onNavigate({ type: "search", category: "todas" })}
            >
              <Search className="h-3 w-3" />
              Buscar videos
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-0.5">
          {playlist.tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onRemove={() => removeFromPlaylist(playlist.id, track.id)}
              removeLabel="Quitar de la playlist"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SectionContent({
  onNavigate,
}: {
  onNavigate: (view: View) => void;
}) {
  const { view } = useUI();

  switch (view.type) {
    case "live":
      return <LiveView />;
    case "search":
      return <SearchView onNavigate={onNavigate} />;
    case "favorites":
      return <FavoritesView onNavigate={onNavigate} />;
    case "history":
      return <HistoryView onNavigate={onNavigate} />;
    case "queue":
      return <QueueView />;
    case "playlist":
      return (
        <PlaylistView playlistId={view.id} onNavigate={onNavigate} />
      );
    default:
      return <HomeView onNavigate={onNavigate} />;
  }
}
