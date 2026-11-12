export type Category =
  | "todas"
  | "alabanza"
  | "adoracion"
  | "predicacion"
  | "podcast";

export type MediaCategory = Exclude<Category, "todas"> | "otro";

export type DurationFilter = "any" | "short" | "medium" | "long";

export type SortOrder = "relevance" | "date" | "views";

export type SearchProvider = "official" | "innertube" | "channel";

export interface Track {
  /** YouTube video id */
  id: string;
  title: string;
  channel: string;
  channelId?: string;
  thumbnail: string;
  durationSec: number;
  durationText: string;
  views?: number;
  publishedText?: string;
  description?: string;
  live?: boolean;
  category: MediaCategory;
  /** Christian-content relevance score. */
  score: number;
  /** Human readable reasons behind the score. */
  reasons: string[];
  source: SearchProvider;
}

export interface SearchPayload {
  items: Track[];
  nextPageToken?: string;
  provider: SearchProvider;
  query: string;
  tookMs: number;
  blocked: number;
  relaxed: boolean;
  notice?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  tracks: Track[];
}

export interface HistoryEntry {
  track: Track;
  playedAt: number;
}

export interface LibraryData {
  playlists: Playlist[];
  favorites: Track[];
  history: HistoryEntry[];
  updatedAt: number;
}

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type View =
  | { type: "home" }
  | { type: "live" }
  | { type: "search"; category: Category }
  | { type: "favorites" }
  | { type: "history" }
  | { type: "queue" }
  | { type: "playlist"; id: string };

export const CATEGORY_LABELS: Record<Category, string> = {
  todas: "Todo",
  alabanza: "Alabanzas",
  adoracion: "Adoraciones",
  predicacion: "Prédicas",
  podcast: "Podcasts",
};

export const MEDIA_LABELS: Record<MediaCategory, string> = {
  alabanza: "Alabanza",
  adoracion: "Adoración",
  predicacion: "Predicación",
  podcast: "Podcast",
  otro: "Cristiano",
};
