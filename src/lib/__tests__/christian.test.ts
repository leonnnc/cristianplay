import { describe, expect, it } from "vitest";
import {
  analyzeContent,
  filterAndRank,
  hasTerm,
  matchesDuration,
  normalize,
} from "../christian";
import type { Track } from "../types";

type RawTrack = Omit<Track, "category" | "score" | "reasons">;

function track(overrides: Partial<RawTrack> & Pick<RawTrack, "id" | "title">): RawTrack {
  return {
    channel: "Canal",
    thumbnail: "",
    durationSec: 300,
    durationText: "5:00",
    source: "innertube",
    ...overrides,
  };
}

describe("normalize y hasTerm", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalize("Adoración").normalize("NFC")).toBe("adoracion");
  });

  it("respeta límites de palabra", () => {
    expect(hasTerm("alabanza cristiana", "alabanza")).toBe(true);
    expect(hasTerm("alabanzas cristianas", "alabanza")).toBe(false);
    expect(hasTerm("adoracion profunda", "adoracion profunda")).toBe(true);
  });
});

describe("analyzeContent", () => {
  it("puntúa contenido de adoración y detecta su categoría", () => {
    const result = analyzeContent({
      title: "Adoración profunda en vivo",
      channel: "Hillsong en Español",
      durationSec: 600,
    });

    expect(result.blocked).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.category).toBe("adoracion");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("descarta contenido claramente secular", () => {
    const result = analyzeContent({
      title: "Reggaetón mix 2024",
      channel: "DJ Party",
    });

    expect(result.blocked).toBe(true);
    expect(result.score).toBeLessThan(0);
  });

  it("reconoce predicaciones largas", () => {
    const result = analyzeContent({
      title: "Predicación cristiana: el poder de la fe",
      channel: "Iglesia Central",
      durationSec: 3600,
    });

    expect(result.blocked).toBe(false);
    expect(result.category).toBe("predicacion");
    expect(result.score).toBeGreaterThanOrEqual(4);
  });
});

describe("matchesDuration", () => {
  it("clasifica por tramos", () => {
    expect(matchesDuration(120, "any")).toBe(true);
    expect(matchesDuration(120, "short")).toBe(true);
    expect(matchesDuration(600, "medium")).toBe(true);
    expect(matchesDuration(3600, "long")).toBe(true);
    expect(matchesDuration(0, "short")).toBe(false);
  });
});

describe("filterAndRank", () => {
  const worship = track({
    id: "worship",
    title: "Alabanza cristiana en vivo",
    channel: "Iglesia Central",
  });
  const sermon = track({
    id: "sermon",
    title: "Predicación cristiana completa",
    channel: "Pastor Juan",
    durationSec: 3600,
    durationText: "1:00:00",
  });
  const secular = track({
    id: "secular",
    title: "Reggaetón de fiesta",
    channel: "DJ Party",
  });
  const ambiguous = track({
    id: "ambiguous",
    title: "Música tranquila",
    channel: "Canal",
  });

  it("filtra bloqueados y ordena por relevancia", () => {
    const result = filterAndRank([worship, secular, sermon, ambiguous], {
      category: "todas",
      strict: true,
    });

    expect(result.blocked).toBe(1);
    expect(result.relaxed).toBe(false);
    expect(result.items.map((item) => item.id)).not.toContain("secular");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].score).toBeGreaterThanOrEqual(
      result.items[result.items.length - 1].score,
    );
    expect(result.items[0]).not.toHaveProperty("blocked");
  });

  it("respeta el filtro de categoría", () => {
    const result = filterAndRank([worship, sermon], {
      category: "predicacion",
      strict: true,
    });

    expect(result.items.map((item) => item.id)).toEqual(["sermon"]);
  });

  it("activa el modo ampliado cuando nada supera el umbral", () => {
    const result = filterAndRank([ambiguous], {
      category: "todas",
      strict: true,
    });

    expect(result.relaxed).toBe(true);
    expect(result.items.map((item) => item.id)).toEqual(["ambiguous"]);
  });

  it("devuelve una lista vacía si todo está bloqueado", () => {
    const result = filterAndRank([secular], {
      category: "todas",
      strict: false,
    });

    expect(result.items).toEqual([]);
    expect(result.blocked).toBe(1);
    expect(result.relaxed).toBe(false);
  });
});
