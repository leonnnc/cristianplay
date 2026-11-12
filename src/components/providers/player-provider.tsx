"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Track } from "@/lib/types";
import {
  loadYouTubeIframeAPI,
  type YTPlayer,
} from "@/lib/youtube-iframe";

interface QueueState {
  queue: Track[];
  index: number;
}

type QueueAction =
  | { type: "playNow"; track: Track }
  | { type: "enqueue"; track: Track }
  | { type: "setQueue"; tracks: Track[]; start: number }
  | { type: "jump"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "remove"; index: number }
  | { type: "move"; index: number; direction: -1 | 1 }
  | { type: "clear" };

function uniqueTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "playNow": {
      const existing = state.queue.findIndex(
        (track) => track.id === action.track.id,
      );
      if (existing >= 0) return { ...state, index: existing };
      const insertAt = state.index < 0 ? 0 : state.index + 1;
      const queue = [...state.queue];
      queue.splice(insertAt, 0, action.track);
      return { queue, index: insertAt };
    }
    case "enqueue": {
      if (state.queue.some((track) => track.id === action.track.id)) {
        return state;
      }
      return {
        queue: [...state.queue, action.track],
        index: state.index < 0 ? 0 : state.index,
      };
    }
    case "setQueue": {
      const queue = uniqueTracks(action.tracks);
      if (queue.length === 0) return { queue: [], index: -1 };
      const start = Math.min(
        Math.max(0, action.start),
        queue.length - 1,
      );
      return { queue, index: start };
    }
    case "jump": {
      if (action.index < 0 || action.index >= state.queue.length) return state;
      return { ...state, index: action.index };
    }
    case "next": {
      if (state.queue.length === 0) return state;
      if (state.index < state.queue.length - 1) {
        return { ...state, index: state.index + 1 };
      }
      return state.queue.length > 1 ? { ...state, index: 0 } : state;
    }
    case "prev": {
      if (state.queue.length === 0) return state;
      if (state.index > 0) return { ...state, index: state.index - 1 };
      return state.queue.length > 1
        ? { ...state, index: state.queue.length - 1 }
        : state;
    }
    case "remove": {
      const queue = state.queue.filter(
        (_, position) => position !== action.index,
      );
      if (queue.length === 0) return { queue: [], index: -1 };
      let index = state.index;
      if (action.index < state.index) index -= 1;
      else if (action.index === state.index) {
        index = Math.min(state.index, queue.length - 1);
      }
      return { queue, index };
    }
    case "move": {
      const from = action.index;
      const to = from + action.direction;
      if (from < 0 || from >= state.queue.length) return state;
      if (to < 0 || to >= state.queue.length) return state;
      const queue = [...state.queue];
      const [moved] = queue.splice(from, 1);
      queue.splice(to, 0, moved);
      let index = state.index;
      if (state.index === from) index = to;
      else if (state.index === to) index = from;
      return { queue, index };
    }
    case "clear":
      return { queue: [], index: -1 };
    default:
      return state;
  }
}

export interface PlayerContextValue {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  buffering: boolean;
  ready: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: string | null;
  attachHost: (element: HTMLDivElement | null) => void;
  playNow: (track: Track) => void;
  playQueue: (tracks: Track[], start?: number) => void;
  playAt: (index: number) => void;
  enqueue: (track: Track) => void;
  removeAt: (index: number) => void;
  moveItem: (index: number, direction: -1 | 1) => void;
  clearQueue: () => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  changeVolume: (value: number) => void;
  toggleMute: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const YT_ERRORS: Record<number, string> = {
  2: "El video tiene un identificador inválido.",
  5: "El reproductor HTML5 no puede mostrar este video.",
  100: "El video no existe o es privado.",
  101: "El propietario no permite reproducirlo fuera de YouTube.",
  150: "El propietario no permite reproducirlo fuera de YouTube.",
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(queueReducer, {
    queue: [],
    index: -1,
  });
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const currentRef = useRef<Track | null>(null);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);

  const current =
    state.index >= 0 ? (state.queue[state.index] ?? null) : null;

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const attachHost = useCallback((element: HTMLDivElement | null) => {
    setHost(element);
    // Nueva instancia del reproductor: reinicia el estado de carga.
    setReady(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!host) return;
    let cancelled = false;

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (cancelled) return;
        const player = new YT.Player(host, {
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
            fs: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              setReady(true);
              event.target.setVolume(volumeRef.current);
              if (mutedRef.current) event.target.mute();
              const track = currentRef.current;
              if (track) {
                loadedIdRef.current = track.id;
                setDuration(track.durationSec || 0);
                event.target.loadVideoById(track.id);
              }
            },
            onStateChange: (event) => {
              const playerState = event.data;
              setPlaying(playerState === 1);
              setBuffering(playerState === 3);
              if (playerState === 0) {
                dispatch({ type: "next" });
              }
            },
            onError: (event) => {
              setPlaying(false);
              setBuffering(false);
              setError(
                YT_ERRORS[event.data] ??
                  "No se pudo reproducir este video en el navegador.",
              );
            },
          },
        });
        playerRef.current = player;
        loadedIdRef.current = null;
      })
      .catch(() => {
        if (!cancelled) {
          setError("No se pudo cargar el reproductor de YouTube.");
        }
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // El iframe ya pudo haber sido retirado por React/StrictMode.
      }
      playerRef.current = null;
      loadedIdRef.current = null;
    };
  }, [host]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready || !current) return;
    if (loadedIdRef.current === current.id) return;

    loadedIdRef.current = current.id;
    setError(null);
    setProgress(0);
    setBuffering(true);
    setDuration(current.durationSec || 0);
    try {
      player.loadVideoById(current.id);
    } catch {
      // Se difiere al siguiente microtask para no encadenar renders dentro
      // del efecto de sincronización con el reproductor.
      queueMicrotask(() => {
        setError("No se pudo cargar el video seleccionado.");
      });
    }
  }, [current, ready]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        setProgress(player.getCurrentTime());
        const playerDuration = player.getDuration();
        if (playerDuration > 0) setDuration(playerDuration);
      } catch {
        // Ignorar lecturas durante transiciones del player.
      }
    }, 500);
    return () => window.clearInterval(interval);
  }, [playing]);

  const playNow = useCallback((track: Track) => {
    const player = playerRef.current;
    if (player && currentRef.current?.id === track.id) {
      try {
        player.seekTo(0, true);
        player.playVideo();
      } catch {
        // Si el player todavía no está listo, el efecto lo cargará.
      }
      return;
    }
    dispatch({ type: "playNow", track });
  }, []);

  const playQueue = useCallback((tracks: Track[], start = 0) => {
    if (tracks.length === 0) return;
    const queue = uniqueTracks(tracks);
    if (queue.length === 0) return;
    const safeStart = Math.min(Math.max(0, start), queue.length - 1);
    const target = queue[safeStart];
    const player = playerRef.current;
    if (player && currentRef.current?.id === target.id) {
      try {
        player.seekTo(0, true);
        player.playVideo();
      } catch {
        // Manejo silencioso.
      }
    }
    dispatch({ type: "setQueue", tracks: queue, start: safeStart });
  }, []);

  const playAt = useCallback((index: number) => {
    dispatch({ type: "jump", index });
  }, []);

  const enqueue = useCallback((track: Track) => {
    dispatch({ type: "enqueue", track });
  }, []);

  const removeAt = useCallback((index: number) => {
    dispatch({ type: "remove", index });
  }, []);

  const moveItem = useCallback((index: number, direction: -1 | 1) => {
    dispatch({ type: "move", index, direction });
  }, []);

  const clearQueue = useCallback(() => {
    try {
      playerRef.current?.stopVideo();
    } catch {
      // Sin reproductor activo.
    }
    loadedIdRef.current = null;
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    dispatch({ type: "clear" });
  }, []);

  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (player.getPlayerState() === 1) player.pauseVideo();
      else player.playVideo();
    } catch {
      // Ignorar si el reproductor aún no está listo.
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      player.seekTo(seconds, true);
      setProgress(seconds);
    } catch {
      // Ignorar.
    }
  }, []);

  const changeVolume = useCallback((value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    setVolume(clamped);
    setMuted(clamped === 0);
    try {
      const player = playerRef.current;
      if (!player) return;
      player.setVolume(clamped);
      if (clamped === 0) player.mute();
      else if (player.isMuted()) player.unMute();
    } catch {
      // Ignorar.
    }
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    setMuted((currentMuted) => {
      const nextMuted = !currentMuted;
      try {
        if (!player) return nextMuted;
        if (nextMuted) player.mute();
        else player.unMute();
      } catch {
        // Ignorar.
      }
      return nextMuted;
    });
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue: state.queue,
      index: state.index,
      current,
      playing,
      buffering,
      ready,
      progress,
      duration,
      volume,
      muted,
      error,
      attachHost,
      playNow,
      playQueue,
      playAt,
      enqueue,
      removeAt,
      moveItem,
      clearQueue,
      next,
      prev,
      toggle,
      seek,
      changeVolume,
      toggleMute,
    }),
    [
      state.queue,
      state.index,
      current,
      playing,
      buffering,
      ready,
      progress,
      duration,
      volume,
      muted,
      error,
      attachHost,
      playNow,
      playQueue,
      playAt,
      enqueue,
      removeAt,
      moveItem,
      clearQueue,
      next,
      prev,
      toggle,
      seek,
      changeVolume,
      toggleMute,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer debe usarse dentro de PlayerProvider");
  return context;
}
