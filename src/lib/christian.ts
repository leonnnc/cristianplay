import type { Category, MediaCategory, Track } from "./types";

/**
 * Motor de relevancia para contenido cristiano.
 *
 * No pretende ser un clasificador perfecto: combina señales léxicas del
 * título, canal y descripción para ordenar y descartar resultados que
 * claramente no pertenecen a alabanza, adoración o predicación.
 */

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasTerm(haystack: string, term: string): boolean {
  const needle = normalize(term);
  if (!needle) return false;
  if (needle.includes(" ")) return haystack.includes(needle);
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`).test(haystack);
}

export const STRONG_TERMS = [
  "alabanza",
  "alabanzas",
  "adoracion",
  "adorando",
  "adorar",
  "adoramos",
  "worship",
  "praise",
  "himno",
  "himnos",
  "hymn",
  "cristiano",
  "cristiana",
  "cristo",
  "jesus",
  "dios",
  "senor",
  "espiritu santo",
  "evangelio",
  "biblia",
  "salmo",
  "salmos",
  "predicacion",
  "predicaciones",
  "predica",
  "predicas",
  "sermon",
  "sermones",
  "pastor",
  "pastora",
  "ministracion",
  "iglesia",
  "oracion",
  "aleluya",
  "hallelujah",
  "gospel",
  "mesias",
  "jehova",
  "yahve",
  "avivamiento",
  "uncion",
  "devocional",
];

export const ARTIST_TERMS = [
  "marcos witt",
  "marco barrientos",
  "julio melgar",
  "marcela gandara",
  "ricardo rodriguez",
  "danilo montero",
  "coalo zamorano",
  "hillsong",
  "elevation worship",
  "bethel music",
  "maverick city",
  "un corazon",
  "ingrid rosario",
  "lilly goodman",
  "christine d clario",
  "alex campos",
  "gateway worship",
  "jesus culture",
];

export const MEDIUM_TERMS = [
  "en vivo",
  "live",
  "oficial",
  "musica cristiana",
  "adoracion profunda",
  "tiempo de adoracion",
  "alabanzas cristianas",
  "predicacion cristiana",
  "sermon cristiano",
  "palabra de dios",
  "estudio biblico",
  "discipulado",
  "conferencia",
  "podcast",
  "entrevista",
  "testimonio",
  "milagro",
  "bendicion",
  "gracia",
  "cruz",
  "resurreccion",
  "salvacion",
  "reino de dios",
  "amor de dios",
  "poder de dios",
  "coro",
  "coral",
  "capilla",
  "santo",
  "gloria",
  "fe",
];

export const NEGATIVE_TERMS = [
  "parodia",
  "comedia",
  "chiste",
  "meme",
  "humor",
  "broma",
  "reggaeton",
  "regueton",
  "trap latino",
  "narco",
  "corrido",
  "banda ms",
  "reaccion",
  "karaoke",
  "porno",
  "satira",
];

const MINISTRY_TERMS = [
  "ministerio",
  "iglesia",
  "church",
  "worship",
  "adoracion",
  "radio",
  "misiones",
  "comunidad",
  "tabernaculo",
  "casa de dios",
  "vida",
  "fe",
  "tv",
  "oficial",
];

const CATEGORY_TERMS: Record<Exclude<Category, "todas">, string[]> = {
  alabanza: [
    "alabanza",
    "alabanzas",
    "himno",
    "himnos",
    "worship",
    "praise",
    "coral",
    "coro",
    "cantos",
    "cantemos",
    "hillsong",
    "elevation worship",
    "bethel music",
    "marcos witt",
    "marco barrientos",
    "coalo zamorano",
    "danilo montero",
    "marcela gandara",
    "un corazon",
    "ingrid rosario",
  ],
  adoracion: [
    "adoracion",
    "adorando",
    "adorar",
    "adoramos",
    "worship",
    "adoracion profunda",
    "holy",
    "santo",
    "santo eres",
    "espiritu santo",
    "avivamiento",
    "uncion",
    "gloria",
    "presencia de dios",
    "maverick city",
    "jesus culture",
  ],
  predicacion: [
    "predicacion",
    "predicaciones",
    "predica",
    "predicas",
    "sermon",
    "sermones",
    "mensaje",
    "pastor",
    "pastora",
    "ministracion",
    "estudio biblico",
    "palabra de dios",
    "biblia",
    "salmo",
    "salmos",
    "evangelio",
    "doctrina",
    "discipulado",
    "conferencia",
    "cruz",
    "resurreccion",
    "salvacion",
    "fe",
  ],
  podcast: [
    "podcast",
    "episodio",
    "entrevista",
    "charla",
    "conversacion",
    "conferencia",
    "mesa redonda",
    "radio",
  ],
};

export interface ContentAnalysis {
  score: number;
  category: MediaCategory;
  reasons: string[];
  blocked: boolean;
}

export function analyzeContent(input: {
  title: string;
  channel?: string;
  description?: string;
  durationSec?: number;
}): ContentAnalysis {
  const text = normalize(
    `${input.title} ${input.channel ?? ""} ${input.description ?? ""}`,
  );
  const reasons: string[] = [];
  let score = 0;

  const negativeHits = NEGATIVE_TERMS.filter((term) => hasTerm(text, term));
  if (negativeHits.length > 0) {
    return {
      score: -10,
      category: "otro",
      reasons: [`Contenido descartado: ${negativeHits.slice(0, 2).join(", ")}`],
      blocked: true,
    };
  }

  const strongHits = STRONG_TERMS.filter((term) => hasTerm(text, term));
  if (strongHits.length > 0) {
    score += Math.min(12, strongHits.length * 3);
    reasons.push(`Señales: ${strongHits.slice(0, 3).join(", ")}`);
  }

  const artistHits = ARTIST_TERMS.filter((term) => text.includes(term));
  if (artistHits.length > 0) {
    score += 4;
    reasons.push(`Artista reconocido: ${artistHits[0]}`);
  }

  const mediumHits = MEDIUM_TERMS.filter((term) => hasTerm(text, term));
  if (mediumHits.length > 0) {
    score += Math.min(5, mediumHits.length);
    if (strongHits.length === 0) {
      reasons.push(`Contexto: ${mediumHits.slice(0, 2).join(", ")}`);
    }
  }

  const channelText = normalize(input.channel ?? "");
  if (MINISTRY_TERMS.some((term) => hasTerm(channelText, term))) {
    score += 2;
    reasons.push("Canal ministerial");
  }

  if ((input.durationSec ?? 0) >= 1200 && hasTerm(text, "predicacion")) {
    score += 1;
  }

  const categoryScores = (
    Object.keys(CATEGORY_TERMS) as Array<Exclude<Category, "todas">>
  ).map((category) => ({
    category,
    hits: CATEGORY_TERMS[category].filter((term) => hasTerm(text, term)),
  }));

  categoryScores.sort((a, b) => b.hits.length - a.hits.length);
  const best = categoryScores[0];
  const category: MediaCategory = best && best.hits.length > 0 ? best.category : "otro";
  if (category !== "otro") {
    score += 2;
    reasons.push(`Categoría: ${category}`);
  }

  return { score, category, reasons, blocked: false };
}

export function matchesDuration(
  seconds: number,
  filter: "any" | "short" | "medium" | "long",
): boolean {
  if (filter === "any") return true;
  if (filter === "short") return seconds > 0 && seconds <= 240;
  if (filter === "medium") return seconds > 240 && seconds <= 1200;
  return seconds > 1200;
}

export function trackMatchesCategory(track: Track, category: Category): boolean {
  if (category === "todas") return true;
  if (track.category === category) return true;
  const text = normalize(
    `${track.title} ${track.channel} ${track.description ?? ""}`,
  );
  return CATEGORY_TERMS[category].some((term) => hasTerm(text, term));
}

export function filterAndRank(
  tracks: Omit<Track, "category" | "score" | "reasons">[],
  options: { category: Category; strict: boolean },
): { items: Track[]; blocked: number; relaxed: boolean } {
  const analyzed = tracks.map((track) => ({
    ...track,
    ...analyzeContent(track),
  }));

  const safe = analyzed.filter((track) => !track.blocked);
  const blocked = analyzed.length - safe.length;

  let candidates = safe;
  if (options.category !== "todas") {
    candidates = safe.filter((track) =>
      trackMatchesCategory(track, options.category),
    );
  }

  const threshold = options.strict ? 4 : 1;
  let items = candidates.filter((track) => track.score >= threshold);
  let relaxed = false;

  if (items.length === 0 && candidates.length > 0) {
    items = candidates;
    relaxed = true;
  }

  items.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.views ?? 0) - (a.views ?? 0);
  });

  return {
    items: items.map((track) => {
      const clean: Track & { blocked?: boolean } = { ...track };
      delete clean.blocked;
      return clean;
    }),
    blocked,
    relaxed,
  };
}
