"use client";

import type { Track } from "@/lib/types";

const POLL_MS = 5 * 60 * 1000;

export interface ChurchSnapshot {
  videos: Track[];
  loading: boolean;
  error: string | null;
  stale: boolean;
}

const INITIAL: ChurchSnapshot = {
  videos: [],
  loading: true,
  error: null,
  stale: false,
};

let snapshot: ChurchSnapshot = INITIAL;
const listeners = new Set<() => void>();
let timer: number | null = null;
let inFlight = false;

function emit() {
  for (const listener of listeners) listener();
}

function patch(next: Partial<ChurchSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function getChurchSnapshot(): ChurchSnapshot {
  return snapshot;
}

export function getChurchServerSnapshot(): ChurchSnapshot {
  return INITIAL;
}

async function fetchChurch(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const response = await fetch("/api/church", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const payload = (await response.json()) as {
      items?: Track[];
      stale?: boolean;
      error?: string | null;
    };

    if (!response.ok || !Array.isArray(payload.items)) {
      throw new Error(
        payload.error || "No se pudo leer el canal de la iglesia.",
      );
    }

    patch({
      videos: payload.items,
      stale: Boolean(payload.stale),
      error: payload.error ?? null,
      loading: false,
    });
  } catch (caught) {
    patch({
      error:
        caught instanceof Error
          ? caught.message
          : "No se pudo leer el canal de la iglesia.",
      loading: false,
    });
  } finally {
    inFlight = false;
  }
}

function tick() {
  if (document.visibilityState === "visible") void fetchChurch();
}

export async function refreshChurch(): Promise<void> {
  await fetchChurch();
}

export function subscribeChurch(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1) {
    void fetchChurch();
    timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", tick);
    }
  };
}
