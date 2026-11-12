import type { PublicRuntimeConfig } from "@/lib/config-types";

let cache: Promise<PublicRuntimeConfig> | null = null;

export function loadPublicConfig(force = false): Promise<PublicRuntimeConfig> {
  if (!cache || force) {
    cache = fetch("/api/config", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as PublicRuntimeConfig;
      })
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

export function resetPublicConfigCache(): void {
  cache = null;
}