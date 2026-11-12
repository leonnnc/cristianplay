import type { Track } from "./types";

/**
 * Configuración de la iglesia y de sus transmisiones en vivo.
 *
 * La detección real la hace el servidor consultando YouTube; estas ventanas
 * sirven para calcular la "próxima transmisión" y como respaldo cuando
 * YouTube no responde.
 */

export const LIVE_TIMEZONE = "America/Lima";

export const LIVE_CHANNEL = {
  name: "Catedral de Fe",
  fullName: "Catedral de Fe · Centro de Avivamiento",
  handle: "CatedraldeFeCDF",
  id: "UC0XjfZF7rFUA9eS0Ok6pJvg",
  location: "Av. Guzmán Blanco 350, Cercado de Lima",
  url: "https://www.youtube.com/@CatedraldeFeCDF",
  liveUrl: "https://www.youtube.com/@CatedraldeFeCDF/live",
  rssUrl:
    "https://www.youtube.com/feeds/videos.xml?channel_id=UC0XjfZF7rFUA9eS0Ok6pJvg",
} as const;

export interface LiveWindow {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** Hora local de inicio, formato HH:MM. */
  start: string;
  /** Hora local de fin, formato HH:MM. */
  end: string;
  label: string;
}

export const LIVE_WINDOWS: readonly LiveWindow[] = [
  { weekday: 3, start: "19:30", end: "22:00", label: "Miércoles" },
  { weekday: 0, start: "07:30", end: "22:00", label: "Domingo" },
];

export const LIVE_SCHEDULE_LABEL =
  "Miércoles 7:30 p. m. · Domingo 7:30 a. m. (hora de Lima)";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  /** Minutos transcurridos desde la medianoche local. */
  minutes: number;
}

export interface LiveScheduleState {
  timezone: string;
  /** true cuando la hora actual está dentro de una ventana programada. */
  inWindow: boolean;
  windowStart: number | null;
  windowEnd: number | null;
  /** Próximo inicio programado (timestamp) o null si no hay. */
  nextStart: number | null;
}

export interface LiveStatus {
  channel: {
    name: string;
    fullName: string;
    handle: string;
    id: string;
    location: string;
    url: string;
    liveUrl: string;
  };
  timezone: string;
  inWindow: boolean;
  windowStart: number | null;
  windowEnd: number | null;
  nextStart: number | null;
  nextStartLabel: string | null;
  isLive: boolean;
  videoId: string | null;
  title: string | null;
  thumbnail: string | null;
  checkedAt: number;
  /** Fuente de la certeza sobre el estado en vivo. */
  detection: "youtube" | "schedule" | "unavailable";
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

export function getZonedParts(
  date: Date,
  timeZone: string = LIVE_TIMEZONE,
): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const hour = Number(read("hour"));
  const minute = Number(read("minute"));
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    weekday: WEEKDAY_INDEX[read("weekday")] ?? 0,
    hour,
    minute,
    minutes: hour * 60 + minute,
  };
}

/** Diferencia en milisegundos entre la hora local indicada y UTC. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return asUtc - truncated;
}

/** Convierte una fecha/hora "de pared" en la zona indicada a timestamp UTC. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = LIVE_TIMEZONE,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  let timestamp = guess - offset;
  const corrected = timeZoneOffsetMs(new Date(timestamp), timeZone);
  if (corrected !== offset) timestamp = guess - corrected;
  return timestamp;
}

function parseHm(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatTimeLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const suffix = hours24 < 12 ? "a. m." : "p. m.";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatScheduleLabel(
  timestamp: number,
  now: Date = new Date(),
  timeZone: string = LIVE_TIMEZONE,
): string {
  const target = getZonedParts(new Date(timestamp), timeZone);
  const current = getZonedParts(now, timeZone);
  const targetDay = Date.UTC(target.year, target.month - 1, target.day);
  const currentDay = Date.UTC(current.year, current.month - 1, current.day);
  const diffDays = Math.round((targetDay - currentDay) / 86_400_000);
  const time = formatTimeLabel(target.hour * 60 + target.minute);

  if (diffDays === 0) return `hoy a las ${time}`;
  if (diffDays === 1) return `mañana a las ${time}`;
  return `el ${WEEKDAYS_ES[target.weekday]} a las ${time}`;
}

/** Calcula si la hora actual cae dentro de una transmisión programada. */
export function getLiveSchedule(
  now: Date = new Date(),
  timeZone: string = LIVE_TIMEZONE,
): LiveScheduleState {
  const current = getZonedParts(now, timeZone);
  let windowStart: number | null = null;
  let windowEnd: number | null = null;

  for (const window of LIVE_WINDOWS) {
    if (window.weekday !== current.weekday) continue;
    const start = parseHm(window.start);
    const end = parseHm(window.end);
    if (current.minutes >= start && current.minutes < end) {
      windowStart = zonedTimeToUtc(
        current.year,
        current.month,
        current.day,
        Math.floor(start / 60),
        start % 60,
        timeZone,
      );
      windowEnd = zonedTimeToUtc(
        current.year,
        current.month,
        current.day,
        Math.floor(end / 60),
        end % 60,
        timeZone,
      );
      break;
    }
  }

  let nextStart: number | null = null;
  for (let offset = 0; offset <= 8; offset += 1) {
    const base = new Date(
      Date.UTC(current.year, current.month - 1, current.day + offset),
    );
    const weekday = base.getUTCDay();
    for (const window of LIVE_WINDOWS) {
      if (window.weekday !== weekday) continue;
      const start = parseHm(window.start);
      const candidate = zonedTimeToUtc(
        base.getUTCFullYear(),
        base.getUTCMonth() + 1,
        base.getUTCDate(),
        Math.floor(start / 60),
        start % 60,
        timeZone,
      );
      if (
        candidate > now.getTime() &&
        (nextStart === null || candidate < nextStart)
      ) {
        nextStart = candidate;
      }
    }
  }

  return {
    timezone: timeZone,
    inWindow: windowStart !== null,
    windowStart,
    windowEnd,
    nextStart,
  };
}

/** Construye un Track reproducible a partir de la transmisión detectada. */
export function buildLiveTrack(status: LiveStatus): Track | null {
  if (!status.isLive || !status.videoId) return null;
  const videoId = status.videoId;
  return {
    id: videoId,
    title: status.title?.trim() || `En vivo · ${LIVE_CHANNEL.fullName}`,
    channel: LIVE_CHANNEL.name,
    channelId: LIVE_CHANNEL.id,
    thumbnail:
      status.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSec: 0,
    durationText: "EN VIVO",
    description:
      "Transmisión en vivo desde Catedral de Fe · Centro de Avivamiento.",
    live: true,
    category: "otro",
    score: 10,
    reasons: ["Transmisión en vivo del canal de la iglesia"],
    source: "channel",
  };
}
