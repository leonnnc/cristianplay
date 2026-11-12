"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getLiveServerSnapshot,
  getLiveSnapshot,
  refreshLive,
  subscribeLive,
} from "@/lib/client/live-store";
import type { LiveStatus } from "@/lib/live";

interface LiveContextValue {
  status: LiveStatus | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  inWindow: boolean;
  refresh: () => Promise<void>;
}

const LiveContext = createContext<LiveContextValue | null>(null);

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeLive,
    getLiveSnapshot,
    getLiveServerSnapshot,
  );

  const value = useMemo<LiveContextValue>(
    () => ({
      status: snapshot.status,
      loading: snapshot.loading,
      error: snapshot.error,
      isLive: snapshot.status?.isLive ?? false,
      inWindow: snapshot.status?.inWindow ?? false,
      refresh: refreshLive,
    }),
    [snapshot],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const context = useContext(LiveContext);
  if (!context) throw new Error("useLive debe usarse dentro de LiveProvider");
  return context;
}
