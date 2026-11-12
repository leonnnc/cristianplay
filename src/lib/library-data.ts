import type {
  Category,
  HistoryEntry,
  LibraryData,
  MediaCategory,
  Playlist,
  Track,
} from "./types";

export const EMPTY_LIBRARY: LibraryData = {
  playlists: [],
  favorites: [],
  history: [],
  updatedAt: 0,
};

const MEDIA_CATEGORIES: MediaCategory[] = [
  "alabanza",
  "adoracion",
  "predicacion",
  "podcast",
  "otro",
];

const CATEGORIES: Category[] = [
  "todas",
  "alabanza",
  "adoracion",
  "predicacion",
  "podcast",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sanitizeTrack(value: unknown): Track | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }

  const category = MEDIA_CATEGORIES.includes(value.category as MediaCategory)
    ? (value.category as MediaCategory)
    : "otro";

  return {
    id: value.id,
    title: text(value.title, "Video de YouTube"),
    channel: text(value.channel, "YouTube"),
    channelId: typeof value.channelId === "string" ? value.channelId : undefined,
    thumbnail: text(
      value.thumbnail,
      `https://i.ytimg.com/vi/${value.id}/hqdefault.jpg`,
    ),
    durationSec: number(value.durationSec),
    durationText: text(value.durationText, "--:--"),
    views: optionalNumber(value.views),
    publishedText:
      typeof value.publishedText === "string" ? value.publishedText : undefined,
    description:
      typeof value.description === "string" ? value.description : undefined,
    live: value.live === true,
    category,
    score: number(value.score),
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 6)
      : [],
    source: value.source === "official" ? "official" : "innertube",
  };
}

export function sanitizeTracks(value: unknown): Track[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const item of value) {
    const track = sanitizeTrack(item);
    if (track && !seen.has(track.id)) {
      seen.add(track.id);
      tracks.push(track);
    }
  }
  return tracks;
}

export function sanitizeLibrary(value: unknown): LibraryData {
  if (!isRecord(value)) return { ...EMPTY_LIBRARY };

  const playlists: Playlist[] = Array.isArray(value.playlists)
    ? value.playlists.flatMap((item) => {
        if (!isRecord(item) || typeof item.name !== "string") return [];
        return [
          {
            id: text(item.id) || makeId(),
            name: item.name.slice(0, 80),
            description:
              typeof item.description === "string"
                ? item.description.slice(0, 200)
                : undefined,
            createdAt: number(item.createdAt, Date.now()),
            tracks: sanitizeTracks(item.tracks),
          },
        ];
      })
    : [];

  const favorites = sanitizeTracks(value.favorites);

  const history: HistoryEntry[] = Array.isArray(value.history)
    ? value.history.flatMap((item) => {
        if (!isRecord(item)) return [];
        const track = sanitizeTrack(item.track);
        if (!track) return [];
        return [{ track, playedAt: number(item.playedAt, Date.now()) }];
      })
    : [];

  return {
    playlists,
    favorites,
    history: history.slice(0, 60),
    updatedAt: number(value.updatedAt),
  };
}

export function isCategory(value: string | null): value is Category {
  return CATEGORIES.includes(value as Category);
}
