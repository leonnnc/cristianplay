import { buildChurchTracks, parseChurchFeed } from "@/lib/church";
import { LIVE_CHANNEL } from "@/lib/live";
import type { Track } from "@/lib/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface ChurchCacheStore {
  __cpChurchFeed?: {
    expires: number;
    items: Track[];
    fetchedAt: number;
    error: string | null;
  };
}

const store = globalThis as unknown as ChurchCacheStore;

export interface ChurchFeedResult {
  items: Track[];
  fetchedAt: number;
  stale: boolean;
  error: string | null;
}

/**
 * Lee el feed público del canal. No requiere API key ni cuota.
 * En caso de fallo devuelve la última copia buena (si existe).
 */
export async function getChurchVideos(): Promise<ChurchFeedResult> {
  const cached = store.__cpChurchFeed;
  if (cached && cached.expires > Date.now()) {
    return {
      items: cached.items,
      fetchedAt: cached.fetchedAt,
      stale: false,
      error: null,
    };
  }

  try {
    const response = await fetch(LIVE_CHANNEL.rssUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: {
        accept: "application/xml, text/xml",
        "accept-language": "es",
        "user-agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`El feed del canal respondió HTTP ${response.status}.`);
    }

    const xml = await response.text();
    const items = buildChurchTracks(parseChurchFeed(xml));
    if (items.length === 0) {
      throw new Error("El feed del canal no contiene videos.");
    }

    const fetchedAt = Date.now();
    store.__cpChurchFeed = {
      expires: fetchedAt + CACHE_TTL_MS,
      items,
      fetchedAt,
      error: null,
    };
    return { items, fetchedAt, stale: false, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo leer el canal de la iglesia.";

    if (cached && cached.items.length > 0) {
      return {
        items: cached.items,
        fetchedAt: cached.fetchedAt,
        stale: true,
        error: message,
      };
    }
    return { items: [], fetchedAt: Date.now(), stale: false, error: message };
  }
}
