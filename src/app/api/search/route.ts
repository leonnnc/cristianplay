import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchYouTube, YouTubeSearchError } from "@/lib/youtube";
import { getResolvedYouTubeConfig } from "@/lib/server/config";
import type { Category, DurationFilter, SortOrder } from "@/lib/types";

const CATEGORIES: Category[] = [
  "todas",
  "alabanza",
  "adoracion",
  "predicacion",
  "podcast",
];
const DURATIONS: DurationFilter[] = ["any", "short", "medium", "long"];
const ORDERS: SortOrder[] = ["relevance", "date", "views"];

function pick<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas seguidas. Espera unos segundos." },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfter) },
      },
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const category = pick(url.searchParams.get("category"), CATEGORIES, "todas");
  const duration = pick(url.searchParams.get("duration"), DURATIONS, "any");
  const order = pick(url.searchParams.get("order"), ORDERS, "relevance");
  const strict = url.searchParams.get("strict") !== "0";
  const pageToken = url.searchParams.get("pageToken")?.slice(0, 400) || undefined;

  try {
    const youtube = await getResolvedYouTubeConfig();
    const payload = await searchYouTube(
      {
        q,
        category,
        duration,
        order,
        strict,
        pageToken,
      },
      { apiKey: youtube.apiKey, region: youtube.region },
    );

    return NextResponse.json(payload, {
      headers: {
        "cache-control": "no-store",
        "x-search-provider": payload.provider,
      },
    });
  } catch (error) {
    const status =
      error instanceof YouTubeSearchError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado al buscar.";
    return NextResponse.json({ error: message }, { status });
  }
}
