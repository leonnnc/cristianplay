"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getChurchServerSnapshot,
  getChurchSnapshot,
  refreshChurch,
  subscribeChurch,
} from "@/lib/client/church-store";
import { filterChurchTracks } from "@/lib/church";
import type { Category, Track } from "@/lib/types";

interface ChurchContextValue {
  videos: Track[];
  loading: boolean;
  error: string | null;
  stale: boolean;
  refresh: () => Promise<void>;
  forCategory: (category: Category) => Track[];
}

const ChurchContext = createContext<ChurchContextValue | null>(null);

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeChurch,
    getChurchSnapshot,
    getChurchServerSnapshot,
  );

  const value = useMemo<ChurchContextValue>(
    () => ({
      videos: snapshot.videos,
      loading: snapshot.loading,
      error: snapshot.error,
      stale: snapshot.stale,
      refresh: refreshChurch,
      forCategory: (category: Category) =>
        filterChurchTracks(snapshot.videos, category),
    }),
    [snapshot],
  );

  return (
    <ChurchContext.Provider value={value}>
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch(): ChurchContextValue {
  const context = useContext(ChurchContext);
  if (!context) {
    throw new Error("useChurch debe usarse dentro de ChurchProvider");
  }
  return context;
}
