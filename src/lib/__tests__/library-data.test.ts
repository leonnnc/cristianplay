import { describe, expect, it } from "vitest";
import {
  EMPTY_LIBRARY,
  sanitizeLibrary,
  sanitizeTrack,
  sanitizeTracks,
} from "../library-data";
import type { Track } from "../types";

const validTrack: Track = {
  id: "abc123",
  title: "Alabanza",
  channel: "Iglesia",
  thumbnail: "https://example.com/thumb.jpg",
  durationSec: 300,
  durationText: "5:00",
  category: "alabanza",
  score: 8,
  reasons: ["Señales: alabanza"],
  source: "innertube",
};

describe("sanitizeTrack", () => {
  it("rechaza datos sin id", () => {
    expect(sanitizeTrack(null)).toBeNull();
    expect(sanitizeTrack({})).toBeNull();
    expect(sanitizeTrack({ id: "" })).toBeNull();
  });

  it("normaliza un track válido", () => {
    const result = sanitizeTrack(validTrack);
    expect(result).toMatchObject(validTrack);
    expect(result?.live).toBe(false);
  });

  it("aplica valores por defecto seguros", () => {
    const result = sanitizeTrack({ id: "x", category: "desconocida" });

    expect(result).toMatchObject({
      id: "x",
      title: "Video de YouTube",
      channel: "YouTube",
      thumbnail: "https://i.ytimg.com/vi/x/hqdefault.jpg",
      durationText: "--:--",
      category: "otro",
      score: 0,
      reasons: [],
      source: "innertube",
      live: false,
    });
  });
});

describe("sanitizeTracks", () => {
  it("descarta duplicados por id", () => {
    const result = sanitizeTracks([validTrack, { ...validTrack }, null]);
    expect(result).toHaveLength(1);
  });
});

describe("sanitizeLibrary", () => {
  it("devuelve una biblioteca vacía para datos inválidos", () => {
    expect(sanitizeLibrary(null)).toEqual(EMPTY_LIBRARY);
    expect(sanitizeLibrary("texto")).toEqual(EMPTY_LIBRARY);
  });

  it("normaliza playlists, favoritos e historial", () => {
    const result = sanitizeLibrary({
      playlists: [
        { name: "Domingo", tracks: [validTrack] },
        { name: 123 },
      ],
      favorites: [validTrack, validTrack],
      history: [{ track: validTrack, playedAt: 1_000 }],
      updatedAt: 2_000,
    });

    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0].name).toBe("Domingo");
    expect(result.playlists[0].id).toBeTruthy();
    expect(result.favorites).toHaveLength(1);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].track.id).toBe("abc123");
    expect(result.history[0].playedAt).toBe(1_000);
    expect(result.updatedAt).toBe(2_000);
  });

  it("limita el historial a 60 entradas", () => {
    const history = Array.from({ length: 80 }, (_, index) => ({
      track: { ...validTrack, id: `id-${index}` },
      playedAt: index,
    }));

    expect(sanitizeLibrary({ history }).history).toHaveLength(60);
  });
});
