import { Innertube } from "youtubei.js";
import {
  filterAndRank,
  hasTerm,
  matchesDuration,
  normalize,
  STRONG_TERMS,
} from "./christian";
import { formatDuration } from "./format";
import type {
  Category,
  DurationFilter,
  SearchPayload,
  SearchProvider,
  SortOrder,
  Track,
} from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 150;
const CONTINUATION_TTL_MS = 10 * 60 * 1000;
const OFFICIAL_ENDPOINT = "https://www.googleapis.com/youtube/v3";

export class YouTubeSearchError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "YouTubeSearchError";
    this.status = status;
  }
}

export interface YouTubeProviderOptions {
  apiKey?: string;
  region?: string;
}

export function hasOfficialKey(options?: YouTubeProviderOptions): boolean {
  const key = (options?.apiKey ?? process.env.YOUTUBE_API_KEY ?? "").trim();
  return Boolean(key);
}

const BASE_QUERY: Record<Category, string> = {
  todas: "alabanza adoración cristiana en vivo",
  alabanza: "alabanzas cristianas adoración en vivo",
  adoracion: "adoración cristiana profunda en vivo",
  predicacion: "predicación cristiana sermón completo",
  podcast: "podcast cristiano predicación",
};

const CATEGORY_HINT: Record<Exclude<Category, "todas">, string> = {
  alabanza: "alabanza",
  adoracion: "adoración",
  predicacion: "predicación sermón",
  podcast: "podcast cristiano",
};

const DOMAIN_WORDS = [...STRONG_TERMS, "worship", "praise", "gospel"];

/**
 * Construye la consulta enviada a YouTube. Si el usuario ya escribió una
 * palabra del dominio cristiano no se repite; si no, se añade contexto para
 * evitar resultados seculares.
 */
export function buildQuery(rawQuery: string, category: Category): string {
  const q = rawQuery.trim().slice(0, 110);
  if (!q) return BASE_QUERY[category];

  const normalized = normalize(q);
  const alreadyChristian = DOMAIN_WORDS.some((term) =>
    hasTerm(normalized, term),
  );

  let query = q;
  if (category !== "todas") {
    const hint = CATEGORY_HINT[category];
    const firstHint = normalize(hint.split(" ")[0]);
    if (!normalized.includes(firstHint)) {
      query += ` ${hint}`;
    }
  }
  if (!alreadyChristian) {
    query += " cristiano";
  }
  return query;
}

export function parseViewCount(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text
    .toLowerCase()
    .match(/([\d.,]+)\s*(millones|mil|mn|m|billones|b|k)?\b/);
  if (!match) return undefined;

  const numeric = match[1];
  const suffix = match[2];

  if (suffix) {
    const decimal =
      numeric.includes(",") && numeric.includes(".")
        ? numeric.replace(/\./g, "").replace(",", ".")
        : numeric.replace(",", ".");
    const value = Number(decimal);
    if (!Number.isFinite(value)) return undefined;
    const multiplier =
      suffix === "b" || suffix === "billones"
        ? 1_000_000_000
        : suffix === "m" || suffix === "mn" || suffix === "millones"
          ? 1_000_000
          : 1_000;
    return Math.round(value * multiplier);
  }

  const digits = numeric.replace(/\D/g, "");
  const value = Number(digits);
  return Number.isFinite(value) ? value : undefined;
}

export function parseIsoDuration(iso: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

interface RawSearchResult {
  tracks: Omit<Track, "category" | "score" | "reasons">[];
  nextPageToken?: string;
  provider: SearchProvider;
}

interface SearchRequest {
  query: string;
  duration: DurationFilter;
  order: SortOrder;
  pageToken?: string;
}

/* ------------------------------------------------------------------ */
/* Proveedor oficial: YouTube Data API v3                             */
/* ------------------------------------------------------------------ */

interface YtSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    description?: string;
    publishedAt?: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
}

interface YtSearchListResponse {
  items?: YtSearchItem[];
  nextPageToken?: string;
  error?: { message?: string };
}

interface YtVideoItem {
  id?: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

interface YtVideoListResponse {
  items?: YtVideoItem[];
}

const DURATION_MAP: Record<Exclude<DurationFilter, "any">, string> = {
  short: "short",
  medium: "medium",
  long: "long",
};

const ORDER_MAP: Record<SortOrder, string> = {
  relevance: "relevance",
  date: "date",
  views: "viewCount",
};

async function officialSearch(
  request: SearchRequest,
  key: string,
  region: string,
): Promise<RawSearchResult> {
  if (!key) throw new YouTubeSearchError("Falta la clave de YouTube", 500);

  const searchParams = new URLSearchParams({
    key,
    part: "snippet",
    q: request.query,
    type: "video",
    maxResults: "25",
    relevanceLanguage: "es",
    regionCode: region || "MX",
    safeSearch: "moderate",
    order: ORDER_MAP[request.order],
  });
  if (request.duration !== "any") {
    searchParams.set("videoDuration", DURATION_MAP[request.duration]);
  }
  if (request.pageToken) {
    searchParams.set("pageToken", request.pageToken);
  }

  const response = await fetch(
    `${OFFICIAL_ENDPOINT}/search?${searchParams.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(9_000),
      headers: { accept: "application/json" },
    },
  );

  const data = (await response.json().catch(() => null)) as
    | YtSearchListResponse
    | null;

  if (!response.ok) {
    const detail = data?.error?.message ?? `HTTP ${response.status}`;
    throw new YouTubeSearchError(
      `La API de YouTube respondió con error: ${detail}`,
      response.status === 403 ? 429 : 502,
    );
  }

  const items = (data?.items ?? []).filter((item) => item.id?.videoId);
  const ids = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))
    .slice(0, 50);

  const details = new Map<string, YtVideoItem>();
  if (ids.length > 0) {
    try {
      const detailParams = new URLSearchParams({
        key,
        part: "contentDetails,statistics",
        id: ids.join(","),
        maxResults: "50",
      });
      const detailResponse = await fetch(
        `${OFFICIAL_ENDPOINT}/videos?${detailParams.toString()}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(9_000),
          headers: { accept: "application/json" },
        },
      );
      if (detailResponse.ok) {
        const detailData =
          (await detailResponse.json()) as YtVideoListResponse;
        for (const video of detailData.items ?? []) {
          if (video.id) details.set(video.id, video);
        }
      }
    } catch {
      // Si falla el detalle conservamos título y miniatura de la búsqueda.
    }
  }

  const tracks = items.flatMap((item) => {
    const id = item.id?.videoId;
    const snippet = item.snippet;
    if (!id || !snippet?.title) return [];

    const thumbnails = snippet.thumbnails ?? {};
    const thumbnail =
      thumbnails.high?.url ??
      thumbnails.medium?.url ??
      thumbnails.default?.url ??
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    const detail = details.get(id);
    const durationSec = detail?.contentDetails?.duration
      ? parseIsoDuration(detail.contentDetails.duration)
      : 0;
    const views = detail?.statistics?.viewCount
      ? Number(detail.statistics.viewCount)
      : undefined;

    return [
      {
        id,
        title: snippet.title,
        channel: snippet.channelTitle ?? "YouTube",
        channelId: snippet.channelId,
        thumbnail,
        durationSec,
        durationText: formatDuration(durationSec),
        views: Number.isFinite(views) ? views : undefined,
        publishedText: snippet.publishedAt
          ? new Intl.DateTimeFormat("es", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(snippet.publishedAt))
          : undefined,
        description: snippet.description?.slice(0, 400),
        live: snippet.liveBroadcastContent === "live",
        source: "official" as const,
      },
    ];
  });

  return {
    tracks,
    nextPageToken: data?.nextPageToken,
    provider: "official",
  };
}

/* ------------------------------------------------------------------ */
/* Fallback sin clave: YouTube Innertube (youtubei.js)                */
/* ------------------------------------------------------------------ */

type YtSearch = Awaited<ReturnType<Innertube["search"]>>;

type YtVideoNode = {
  video_id?: string;
  title?: { toString(): string };
  author?: { name?: string; id?: string };
  duration?: { seconds?: number; text?: string };
  view_count?: { text?: string };
  published?: { text?: string };
  description_snippet?: { toString(): string };
  thumbnails?: { url?: string; width?: number }[];
  is_live?: boolean;
};

interface QuestionableGlobal {
  __cpInnertube?: Promise<Innertube>;
  __cpContinuations?: Map<string, { search: YtSearch; expires: number }>;
  __cpSearchCache?: Map<string, { expires: number; value: SearchPayload }>;
}

const globalStore = globalThis as unknown as QuestionableGlobal;

function getInnertube(): Promise<Innertube> {
  if (!globalStore.__cpInnertube) {
    globalStore.__cpInnertube = Innertube.create({
      lang: "es",
      location: "MX",
      retrieve_player: false,
    }).catch((error: unknown) => {
      globalStore.__cpInnertube = undefined;
      throw error;
    });
  }
  return globalStore.__cpInnertube;
}

function getContinuations(): Map<
  string,
  { search: YtSearch; expires: number }
> {
  if (!globalStore.__cpContinuations) {
    globalStore.__cpContinuations = new Map();
  }
  return globalStore.__cpContinuations;
}

function mapKeylessTracks(nodes: YtVideoNode[]): Omit<
  Track,
  "category" | "score" | "reasons"
>[] {
  return nodes.flatMap((node) => {
    if (!node.video_id) return [];
    const thumbnails = node.thumbnails ?? [];
    const best = [...thumbnails].sort(
      (a, b) => (b.width ?? 0) - (a.width ?? 0),
    )[0];
    const durationSec = Math.max(
      0,
      Math.floor(node.duration?.seconds ?? 0),
    );

    return [
      {
        id: node.video_id,
        title: node.title?.toString() ?? "Video de YouTube",
        channel: node.author?.name ?? "YouTube",
        channelId: node.author?.id,
        thumbnail:
          best?.url ?? `https://i.ytimg.com/vi/${node.video_id}/hqdefault.jpg`,
        durationSec,
        durationText:
          node.duration?.text ?? formatDuration(durationSec),
        views: parseViewCount(node.view_count?.text),
        publishedText: node.published?.text,
        description: node.description_snippet?.toString()?.slice(0, 400),
        live: Boolean(node.is_live),
        source: "innertube" as const,
      },
    ];
  });
}

async function keylessSearch(request: SearchRequest): Promise<RawSearchResult> {
  const yt = await getInnertube();

  let result: YtSearch;
  if (request.pageToken?.startsWith("kt_")) {
    const stored = getContinuations().get(request.pageToken);
    if (!stored || stored.expires < Date.now()) {
      throw new YouTubeSearchError(
        "La página de resultados expiró. Vuelve a buscar.",
        410,
      );
    }
    result = await stored.search.getContinuation();
  } else {
    result = await yt.search(request.query, { type: "video" });
  }

  const nodes = (result.videos ?? []) as unknown as YtVideoNode[];
  const tracks = mapKeylessTracks(
    nodes.filter((node) => Boolean(node.video_id)),
  );

  let nextPageToken: string | undefined;
  if (result.has_continuation) {
    const token = `kt_${crypto.randomUUID()}`;
    const continuations = getContinuations();
    for (const [key, value] of continuations) {
      if (value.expires < Date.now()) continuations.delete(key);
    }
    if (continuations.size > 60) {
      const oldest = continuations.keys().next().value;
      if (oldest) continuations.delete(oldest);
    }
    continuations.set(token, {
      search: result,
      expires: Date.now() + CONTINUATION_TTL_MS,
    });
    nextPageToken = token;
  }

  return { tracks, nextPageToken, provider: "innertube" };
}

/* ------------------------------------------------------------------ */
/* Orquestador y caché                                               */
/* ------------------------------------------------------------------ */

function getCache(): Map<string, { expires: number; value: SearchPayload }> {
  if (!globalStore.__cpSearchCache) {
    globalStore.__cpSearchCache = new Map();
  }
  return globalStore.__cpSearchCache;
}

export interface SearchYouTubeParams {
  q: string;
  category: Category;
  duration: DurationFilter;
  order: SortOrder;
  strict: boolean;
  pageToken?: string;
}

export async function searchYouTube(
  params: SearchYouTubeParams,
  options?: YouTubeProviderOptions,
): Promise<SearchPayload> {
  const apiKey = (options?.apiKey ?? process.env.YOUTUBE_API_KEY ?? "").trim();
  const region = (options?.region ?? process.env.YOUTUBE_REGION ?? "MX").trim() || "MX";
  const official = Boolean(apiKey);

  const started = Date.now();
  const query = buildQuery(params.q, params.category);
  const cacheKey = JSON.stringify({
    q: query,
    category: params.category,
    duration: params.duration,
    order: params.order,
    strict: params.strict,
    pageToken: params.pageToken ?? "",
    official,
    region,
  });

  const cache = getCache();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const request: SearchRequest = {
    query,
    duration: params.duration,
    order: params.order,
    pageToken: params.pageToken,
  };

  let raw: RawSearchResult;
  let notice: string | undefined;

  if (official) {
    try {
      raw = await officialSearch(request, apiKey, region);
    } catch (error) {
      notice =
        error instanceof YouTubeSearchError
          ? `${error.message} Usando el modo sin clave.`
          : "La API oficial no respondió. Usando el modo sin clave.";
      try {
        raw = await keylessSearch(request);
      } catch {
        throw new YouTubeSearchError(
          "No se pudo consultar YouTube en este momento. Intenta de nuevo.",
        );
      }
    }
  } else {
    try {
      raw = await keylessSearch(request);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Error desconocido";
      throw new YouTubeSearchError(
        `No se pudo consultar YouTube sin clave (${detail}).`,
      );
    }
  }

  const durationFiltered = raw.tracks.filter((track) =>
    matchesDuration(track.durationSec, params.duration),
  );
  const filtered = filterAndRank(durationFiltered, {
    category: params.category,
    strict: params.strict,
  });

  const payload: SearchPayload = {
    items: filtered.items,
    nextPageToken: raw.nextPageToken,
    provider: raw.provider,
    query,
    tookMs: Date.now() - started,
    blocked: filtered.blocked,
    relaxed: filtered.relaxed,
    notice,
  };

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cacheKey, {
    expires: Date.now() + CACHE_TTL_MS,
    value: payload,
  });

  return payload;
}
