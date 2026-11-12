"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  configureFirebase,
  describeAuthError,
  isFirebaseConfigured,
  loadRemoteLibrary,
  saveRemoteLibrary,
  signInWithGoogle,
  signOutFirebase,
  watchAuth,
} from "@/lib/firebase/client";
import { loadPublicConfig } from "@/lib/runtime-config-client";
import {
  EMPTY_LIBRARY,
  makeId,
  sanitizeTrack,
} from "@/lib/library-data";
import { readLocalLibrary, writeLocalLibrary } from "@/lib/store/local";
import type { AppUser, LibraryData, Track } from "@/lib/types";

export interface LibraryContextValue {
  library: LibraryData;
  hydrated: boolean;
  user: AppUser | null;
  mode: "local" | "firebase";
  syncing: boolean;
  syncError: string | null;
  firebaseReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  toggleFavorite: (track: Track) => boolean;
  isFavorite: (trackId: string) => boolean;
  recordHistory: (track: Track) => void;
  clearHistory: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const subscribeNoop = () => () => {};

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<LibraryData>({ ...EMPTY_LIBRARY });
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mode, setMode] = useState<"local" | "firebase">("local");
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const remoteReadyRef = useRef<string | null>(null);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  // Rehidratación síncrona: leer localStorage durante el render (solo en el
  // cliente, después del SSR) evita un efecto y el parpadeo inicial.
  if (isClient && !hydrated) {
    setHydrated(true);
    setLibrary(readLocalLibrary());
  }

  // Carga la configuración runtime una sola vez.
  useEffect(() => {
    let cancelled = false;
    loadPublicConfig()
      .then((config) => {
        if (cancelled) return;
        configureFirebase(config.firebase);
        const ready = isFirebaseConfigured();
        setFirebaseReady(ready);
        setConfigLoaded(true);
        if (ready) setSyncing(true);
      })
      .catch(() => {
        if (cancelled) return;
        setFirebaseReady(false);
        setConfigLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded || !firebaseReady) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    watchAuth(async (nextUser) => {
      if (cancelled) return;
      setUser(nextUser);

      if (!nextUser) {
        remoteReadyRef.current = null;
        setMode("local");
        setSyncError(null);
        setSyncing(false);
        return;
      }

      if (remoteReadyRef.current === nextUser.uid) return;

      setSyncing(true);
      setSyncError(null);
      try {
        const remote = await loadRemoteLibrary(nextUser.uid);
        if (cancelled) return;

        if (remote) {
          setLibrary(remote);
        } else {
          const local = readLocalLibrary();
          if (local.updatedAt > 0) {
            await saveRemoteLibrary(nextUser.uid, local);
          }
        }
        remoteReadyRef.current = nextUser.uid;
        setMode("firebase");
      } catch (error) {
        if (cancelled) return;
        setSyncError(
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar con Firestore.",
        );
        setMode("local");
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch(() => {
        if (!cancelled) {
          setSyncError(
            "No se pudo inicializar Firebase. La app seguirá en modo local.",
          );
          setSyncing(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configLoaded, firebaseReady]);

  useEffect(() => {
    if (!hydrated) return;
    writeLocalLibrary(library);

    if (!user || !firebaseReady || remoteReadyRef.current !== user.uid) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSyncing(true);
      saveRemoteLibrary(user.uid, library)
        .then(() => setSyncError(null))
        .catch((error: unknown) =>
          setSyncError(
            error instanceof Error
              ? error.message
              : "No se pudo guardar en Firestore.",
          ),
        )
        .finally(() => setSyncing(false));
    }, 700);

    return () => window.clearTimeout(timer);
  }, [library, hydrated, user, firebaseReady]);

  const mutate = useCallback(
    (updater: (current: LibraryData) => LibraryData) => {
      setLibrary((current) => ({ ...updater(current), updatedAt: Date.now() }));
    },
    [],
  );

  const createPlaylist = useCallback(
    (name: string) => {
      const id = makeId();
      const clean = name.trim().slice(0, 80) || "Mi playlist";
      mutate((current) => ({
        ...current,
        playlists: [
          { id, name: clean, createdAt: Date.now(), tracks: [] },
          ...current.playlists,
        ],
      }));
      return id;
    },
    [mutate],
  );

  const renamePlaylist = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().slice(0, 80);
      if (!clean) return;
      mutate((current) => ({
        ...current,
        playlists: current.playlists.map((playlist) =>
          playlist.id === id ? { ...playlist, name: clean } : playlist,
        ),
      }));
    },
    [mutate],
  );

  const deletePlaylist = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        playlists: current.playlists.filter((playlist) => playlist.id !== id),
      }));
    },
    [mutate],
  );

  const addToPlaylist = useCallback(
    (playlistId: string, track: Track) => {
      mutate((current) => ({
        ...current,
        playlists: current.playlists.map((playlist) => {
          if (playlist.id !== playlistId) return playlist;
          if (playlist.tracks.some((item) => item.id === track.id)) {
            return playlist;
          }
          return { ...playlist, tracks: [...playlist.tracks, track] };
        }),
      }));
    },
    [mutate],
  );

  const removeFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      mutate((current) => ({
        ...current,
        playlists: current.playlists.map((playlist) =>
          playlist.id === playlistId
            ? {
                ...playlist,
                tracks: playlist.tracks.filter((track) => track.id !== trackId),
              }
            : playlist,
        ),
      }));
    },
    [mutate],
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      const exists = library.favorites.some((item) => item.id === track.id);
      mutate((current) => ({
        ...current,
        favorites: exists
          ? current.favorites.filter((item) => item.id !== track.id)
          : [track, ...current.favorites].slice(0, 250),
      }));
      return !exists;
    },
    [library.favorites, mutate],
  );

  const isFavorite = useCallback(
    (trackId: string) =>
      library.favorites.some((track) => track.id === trackId),
    [library.favorites],
  );

  const recordHistory = useCallback(
    (track: Track) => {
      mutate((current) => ({
        ...current,
        history: [
          { track, playedAt: Date.now() },
          ...current.history.filter((entry) => entry.track.id !== track.id),
        ].slice(0, 60),
      }));
    },
    [mutate],
  );

  const clearHistory = useCallback(() => {
    mutate((current) => ({ ...current, history: [] }));
  }, [mutate]);

  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        "Firebase no está configurado. Configúralo en el panel del servidor.",
      );
    }
    try {
      await signInWithGoogle();
    } catch (error) {
      throw new Error(describeAuthError(error));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutFirebase();
    } catch {
      setUser(null);
      setMode("local");
    }
  }, []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      library,
      hydrated,
      user,
      mode,
      syncing,
      syncError,
      firebaseReady,
      signIn,
      signOut,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      toggleFavorite,
      isFavorite,
      recordHistory,
      clearHistory,
    }),
    [
      library,
      hydrated,
      user,
      mode,
      syncing,
      syncError,
      firebaseReady,
      signIn,
      signOut,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      toggleFavorite,
      isFavorite,
      recordHistory,
      clearHistory,
    ],
  );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error("useLibrary debe usarse dentro de LibraryProvider");
  return context;
}

/** Utilidad compartida para rehidratar un track guardado. */
export const reviveTrack = sanitizeTrack;
