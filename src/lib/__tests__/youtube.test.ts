import { describe, expect, it } from "vitest";
import {
  buildQuery,
  parseIsoDuration,
  parseViewCount,
} from "../youtube";

describe("buildQuery", () => {
  it("usa la consulta base cuando no hay texto", () => {
    expect(buildQuery("", "todas")).toBe(
      "alabanza adoración cristiana en vivo",
    );
    expect(buildQuery("   ", "predicacion")).toBe(
      "predicación cristiana sermón completo",
    );
  });

  it("añade contexto cristiano a búsquedas seculares", () => {
    expect(buildQuery("marcos witt", "todas")).toBe("marcos witt cristiano");
  });

  it("no repite el contexto si ya es cristiano", () => {
    expect(buildQuery("adoracion profunda", "todas")).toBe(
      "adoracion profunda",
    );
  });

  it("agrega la pista de categoría cuando falta", () => {
    expect(buildQuery("salmo 23", "alabanza")).toBe("salmo 23 alabanza");
  });

  it("no duplica la pista de categoría si ya está presente", () => {
    expect(buildQuery("alabanzas nuevas", "alabanza")).toBe(
      "alabanzas nuevas",
    );
    expect(buildQuery("adoracion", "adoracion")).toBe("adoracion");
  });

  it("recorta consultas demasiado largas", () => {
    const query = buildQuery("a".repeat(200), "todas");
    expect(query.startsWith("a".repeat(110))).toBe(true);
    expect(query).toBe(`${"a".repeat(110)} cristiano`);
  });
});

describe("parseViewCount", () => {
  it("devuelve undefined sin datos", () => {
    expect(parseViewCount()).toBeUndefined();
    expect(parseViewCount("sin datos")).toBeUndefined();
  });

  it("interpreta números con separadores", () => {
    expect(parseViewCount("1.234.567 visualizaciones")).toBe(1_234_567);
    expect(parseViewCount("12 mil vistas")).toBe(12_000);
  });

  it("interpreta sufijos en español e inglés", () => {
    expect(parseViewCount("1,2 M de vistas")).toBe(1_200_000);
    expect(parseViewCount("2,5 millones")).toBe(2_500_000);
    expect(parseViewCount("3K views")).toBe(3_000);
    expect(parseViewCount("1,1 B")).toBe(1_100_000_000);
  });
});

describe("parseIsoDuration", () => {
  it("convierte duraciones ISO 8601", () => {
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3_723);
    expect(parseIsoDuration("P1D")).toBe(86_400);
    expect(parseIsoDuration("P1DT2H")).toBe(93_600);
  });

  it("devuelve 0 para formatos inválidos", () => {
    expect(parseIsoDuration("")).toBe(0);
    expect(parseIsoDuration("abc")).toBe(0);
  });
});
