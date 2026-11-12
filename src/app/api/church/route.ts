import { NextResponse } from "next/server";
import { filterChurchTracks } from "@/lib/church";
import { LIVE_CHANNEL } from "@/lib/live";
import { getChurchVideos } from "@/lib/server/church";
import type { Category } from "@/lib/types";

const CATEGORIES: Category[] = [
  "todas",
  "alabanza",
  "adoracion",
  "predicacion",
  "podcast",
];

function pickCategory(value: string | null): Category {
  return CATEGORIES.includes(value as Category)
    ? (value as Category)
    : "todas";
}

/**
 * Videos recientes del canal de la iglesia, clasificados por categoría.
 * Usa el feed público de YouTube (sin API key).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = pickCategory(url.searchParams.get("category"));
  const feed = await getChurchVideos();

  const items = filterChurchTracks(feed.items, category);

  return NextResponse.json(
    {
      channel: LIVE_CHANNEL,
      category,
      items,
      total: feed.items.length,
      fetchedAt: feed.fetchedAt,
      stale: feed.stale,
      error: feed.error,
    },
    {
      headers: {
        "cache-control": "no-store",
        "x-church-source": "rss",
      },
    },
  );
}
