import { analyzeContent, trackMatchesCategory } from "./christian";
import { LIVE_CHANNEL } from "./live";
import type { Category, Track } from "./types";

/** Utilidades para leer el feed público del canal de la iglesia. */

export interface ChurchFeedEntry {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: number | null;
  publishedText?: string;
  description?: string;
}

export function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function firstTag(block: string, name: string): string {
  const match = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`,
  ).exec(block);
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function formatPublished(timestamp: number): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

/** Extrae los videos del XML del feed de YouTube. */
export function parseChurchFeed(xml: string): ChurchFeedEntry[] {
  const entries: ChurchFeedEntry[] = [];
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  for (const block of blocks) {
    const id = firstTag(block, "yt:videoId");
    if (!id) continue;

    const title = firstTag(block, "title") || "Video de Catedral de Fe";
    const thumbnail =
      /<media:thumbnail[^>]*url="([^"]+)"/.exec(block)?.[1] ??
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const publishedRaw = firstTag(block, "published");
    const publishedDate = publishedRaw ? new Date(publishedRaw) : null;
    const publishedAt =
      publishedDate && Number.isFinite(publishedDate.getTime())
        ? publishedDate.getTime()
        : null;

    entries.push({
      id,
      title,
      thumbnail,
      publishedAt,
      publishedText:
        publishedAt !== null ? formatPublished(publishedAt) : undefined,
      description: firstTag(block, "media:description").slice(0, 500) || undefined,
    });
  }

  return entries.sort(
    (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
  );
}

/** Convierte una entrada del feed en un Track clasificado. */
export function toChurchTrack(entry: ChurchFeedEntry): Track {
  const analysis = analyzeContent({
    title: entry.title,
    channel: LIVE_CHANNEL.name,
    description: entry.description,
  });

  return {
    id: entry.id,
    title: entry.title,
    channel: LIVE_CHANNEL.name,
    channelId: LIVE_CHANNEL.id,
    thumbnail: entry.thumbnail,
    durationSec: 0,
    durationText: "",
    publishedText: entry.publishedText,
    description: entry.description,
    live: false,
    category: analysis.category,
    score: analysis.score,
    reasons: analysis.reasons,
    source: "channel",
  };
}

export function buildChurchTracks(entries: ChurchFeedEntry[]): Track[] {
  return entries.map(toChurchTrack);
}

/** Filtra los videos del canal por la categoría solicitada. */
export function filterChurchTracks(
  tracks: Track[],
  category: Category,
): Track[] {
  if (category === "todas") return tracks;
  return tracks.filter(
    (track) =>
      track.category === category ||
      trackMatchesCategory(track, category),
  );
}
