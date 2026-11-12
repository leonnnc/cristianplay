import { describe, expect, it } from "vitest";
import { formatDuration, formatViews, plural } from "../format";

describe("formatDuration", () => {
  it("devuelve un marcador para valores no válidos", () => {
    expect(formatDuration(0)).toBe("--:--");
    expect(formatDuration(-10)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });

  it("formatea minutos y segundos", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("añade las horas cuando corresponde", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(86_400)).toBe("24:00:00");
  });
});

describe("formatViews", () => {
  it("omite valores vacíos o inválidos", () => {
    expect(formatViews(undefined)).toBe("");
    expect(formatViews(0)).toBe("");
    expect(formatViews(-5)).toBe("");
  });

  it("usa notación compacta en español", () => {
    expect(formatViews(1_500_000)).toMatch(/1,5\s*M/);
  });
});

describe("plural", () => {
  it("usa el singular solo con una unidad", () => {
    expect(plural(1, "video", "videos")).toBe("1 video");
    expect(plural(1, "reproducción", "reproducciones")).toBe("1 reproducción");
  });

  it("usa el plural con cero y con varias unidades", () => {
    expect(plural(0, "video", "videos")).toBe("0 videos");
    expect(plural(25, "resultado", "resultados")).toBe("25 resultados");
  });
});
