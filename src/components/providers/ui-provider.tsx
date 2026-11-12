"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Track, View } from "@/lib/types";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface UIContextValue {
  view: View;
  navigate: (view: View) => void;
  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  playlistTarget: Track | null;
  openPlaylistPicker: (track: Track) => void;
  closePlaylistPicker: () => void;
  cloudOpen: boolean;
  setCloudOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

let toastId = 0;

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>({ type: "home" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [playlistTarget, setPlaylistTarget] = useState<Track | null>(null);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++toastId;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3800);
    },
    [],
  );

  const navigate = useCallback((next: View) => {
    setView(next);
    setSidebarOpen(false);
  }, []);

  const openPlaylistPicker = useCallback((track: Track) => {
    setPlaylistTarget(track);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      view,
      navigate,
      toasts,
      pushToast,
      dismissToast,
      searchOpen,
      setSearchOpen,
      playlistTarget,
      openPlaylistPicker,
      closePlaylistPicker: () => setPlaylistTarget(null),
      cloudOpen,
      setCloudOpen,
      sidebarOpen,
      setSidebarOpen,
    }),
    [
      view,
      navigate,
      toasts,
      pushToast,
      dismissToast,
      searchOpen,
      playlistTarget,
      openPlaylistPicker,
      cloudOpen,
      sidebarOpen,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI debe usarse dentro de UIProvider");
  return context;
}
