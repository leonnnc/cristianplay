import {
  formatScheduleLabel,
  getLiveSchedule,
  LIVE_CHANNEL,
  LIVE_TIMEZONE,
  type LiveStatus,
} from "@/lib/live";
import { getResolvedYouTubeConfig } from "@/lib/server/config";

const CACHE_TTL_MS = 45_000;
const API_ENDPOINT = "https://www.googleapis.com/youtube/v3";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface LiveCheck {
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  detection: "youtube" | "unavailable";
  checkedAt: number;
}

interface LiveCacheStore {
  __cpLiveCheck?: { expires: number; value: LiveCheck };
}

const store = globalThis as unknown as LiveCacheStore;

function unavailable(): LiveCheck {
  return {
    isLive: false,
    videoId: null,
    title: null,
    detection: "unavailable",
    checkedAt: Date.now(),
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Consulta la YouTube Data API v3 (solo si hay clave configurada). */
async function checkWithApi(key: string): Promise<LiveCheck | null> {
  try {
    const params = new URLSearchParams({
      key,
      part: "snippet",
      channelId: LIVE_CHANNEL.id,
      eventType: "live",
      type: "video",
      maxResults: "1",
    });
    const response = await fetch(`${API_ENDPOINT}/search?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: { title?: string };
      }>;
    };
    const item = data.items?.[0];
    const videoId = item?.id?.videoId ?? null;

    return {
      isLive: Boolean(videoId),
      videoId,
      title: videoId ? item?.snippet?.title ?? null : null,
      detection: "youtube",
      checkedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Sin clave: la página /live del canal redirige su canonical al video cuando
 * hay un directo activo. Si no hay directo, el canonical apunta al canal.
 */
async function checkWithPage(): Promise<LiveCheck> {
  try {
    const response = await fetch(LIVE_CHANNEL.liveUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: {
        accept: "text/html",
        "accept-language": "es",
        "user-agent": USER_AGENT,
      },
    });
    if (!response.ok) return unavailable();

    const html = await response.text();
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    if (!canonical) return unavailable();

    const videoId = /[?&]v=([A-Za-z0-9_-]{11})/.exec(canonical)?.[1] ?? null;

    if (!videoId) {
      const isChannelPage =
        canonical.includes("/channel/") || canonical.includes("/@");
      return {
        isLive: false,
        videoId: null,
        title: null,
        detection: isChannelPage ? "youtube" : "unavailable",
        checkedAt: Date.now(),
      };
    }

    const rawTitle =
      /<meta property="og:title" content="([^"]*)"/.exec(html)?.[1] ?? null;

    return {
      isLive: true,
      videoId,
      title: rawTitle ? decodeHtml(rawTitle) : null,
      detection: "youtube",
      checkedAt: Date.now(),
    };
  } catch {
    return unavailable();
  }
}

async function resolveLiveCheck(): Promise<LiveCheck> {
  const cached = store.__cpLiveCheck;
  if (cached && cached.expires > Date.now()) return cached.value;

  const youtube = await getResolvedYouTubeConfig();
  let check: LiveCheck | null = youtube.apiKey
    ? await checkWithApi(youtube.apiKey)
    : null;
  if (!check) check = await checkWithPage();

  store.__cpLiveCheck = {
    expires: Date.now() + CACHE_TTL_MS,
    value: check,
  };
  return check;
}

/** Estado completo que consume la interfaz. */
export async function getLiveStatus(): Promise<LiveStatus> {
  const now = new Date();
  const schedule = getLiveSchedule(now, LIVE_TIMEZONE);
  const check = await resolveLiveCheck();

  // Si YouTube no responde pero estamos dentro del horario, asumimos que la
  // transmisión está al aire para no apagar el indicador por un fallo de red.
  const scheduleFallback = check.detection === "unavailable" && schedule.inWindow;
  const isLive = check.isLive || scheduleFallback;
  const videoId = check.isLive ? check.videoId : null;

  return {
    channel: {
      name: LIVE_CHANNEL.name,
      fullName: LIVE_CHANNEL.fullName,
      handle: LIVE_CHANNEL.handle,
      id: LIVE_CHANNEL.id,
      location: LIVE_CHANNEL.location,
      url: LIVE_CHANNEL.url,
      liveUrl: LIVE_CHANNEL.liveUrl,
    },
    timezone: schedule.timezone,
    inWindow: schedule.inWindow,
    windowStart: schedule.windowStart,
    windowEnd: schedule.windowEnd,
    nextStart: schedule.nextStart,
    nextStartLabel:
      schedule.nextStart !== null
        ? formatScheduleLabel(schedule.nextStart, now, LIVE_TIMEZONE)
        : null,
    isLive,
    videoId,
    title: isLive ? check.title : null,
    thumbnail:
      videoId !== null
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null,
    checkedAt: Date.now(),
    detection: check.isLive
      ? "youtube"
      : scheduleFallback
        ? "schedule"
        : check.detection,
  };
}
