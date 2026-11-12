"use client";

import type { LiveStatus } from "@/lib/live";

const POLL_MS = 45_000;

export interface LiveSnapshot {
  status: LiveStatus | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: LiveSnapshot = { status: null, loading: true, error: null };

let snapshot: LiveSnapshot = INITIAL;
const listeners = new Set<() => void>();
let timer: number | null = null;
let inFlight = false;

function emit() {
  for (const listener of listeners) listener();
}

function patch(next: Partial<LiveSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function getLiveSnapshot(): LiveSnapshot {
  return snapshot;
}

export function getLiveServerSnapshot(): LiveSnapshot {
  return INITIAL;
}

async function fetchLive(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const response = await fetch("/api/live", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const payload = (await response.json()) as LiveStatus | { error?: string };

    if (!response.ok || !("isLive" in payload)) {
      const message =
        "error" in payload && payload.error
          ? payload.error
          : "No se pudo consultar el estado en vivo.";
      throw new Error(message);
    }

    patch({ status: payload, error: null, loading: false });
  } catch (caught) {
    patch({
      error:
        caught instanceof Error
          ? caught.message
          : "No se pudo consultar el estado en vivo.",
      loading: false,
    });
  } finally {
    inFlight = false;
  }
}

function tick() {
  if (document.visibilityState === "visible") void fetchLive();
}

export async function refreshLive(): Promise<void> {
  await fetchLive();
}

export function subscribeLive(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1) {
    void fetchLive();
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
