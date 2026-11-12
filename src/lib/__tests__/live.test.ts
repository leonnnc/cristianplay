import { describe, expect, it } from "vitest";
import {
  formatScheduleLabel,
  formatTimeLabel,
  getLiveSchedule,
  getZonedParts,
  LIVE_TIMEZONE,
} from "@/lib/live";

describe("getZonedParts", () => {
  it("convierte UTC a la hora de Lima", () => {
    const parts = getZonedParts(
      new Date("2026-11-12T01:00:00Z"),
      LIVE_TIMEZONE,
    );
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(11);
    expect(parts.day).toBe(11);
    expect(parts.weekday).toBe(3); // miércoles
    expect(parts.hour).toBe(20);
    expect(parts.minute).toBe(0);
    expect(parts.minutes).toBe(20 * 60);
  });
});

describe("getLiveSchedule", () => {
  it("marca en vivo un miércoles a las 20:00 (Lima)", () => {
    const now = new Date("2026-11-12T01:00:00Z");
    const state = getLiveSchedule(now, LIVE_TIMEZONE);
    expect(state.inWindow).toBe(true);
    expect(state.windowStart).toBe(
      new Date("2026-11-12T00:30:00Z").getTime(),
    );
    expect(state.windowEnd).toBe(new Date("2026-11-12T03:00:00Z").getTime());
  });

  it("fuera de horario apunta a la próxima transmisión del mismo día", () => {
    const now = new Date("2026-11-12T00:00:00Z"); // miércoles 19:00 Lima
    const state = getLiveSchedule(now, LIVE_TIMEZONE);
    expect(state.inWindow).toBe(false);
    expect(state.nextStart).toBe(
      new Date("2026-11-12T00:30:00Z").getTime(),
    );
  });

  it("un domingo antes de las 7:30 apunta a las 7:30 del domingo", () => {
    const now = new Date("2026-11-15T12:00:00Z"); // domingo 07:00 Lima
    const state = getLiveSchedule(now, LIVE_TIMEZONE);
    expect(state.inWindow).toBe(false);
    expect(state.nextStart).toBe(
      new Date("2026-11-15T12:30:00Z").getTime(),
    );
  });

  it("un domingo por la noche salta al miércoles siguiente", () => {
    const now = new Date("2026-11-16T04:00:00Z"); // domingo 23:00 Lima
    const state = getLiveSchedule(now, LIVE_TIMEZONE);
    expect(state.inWindow).toBe(false);
    expect(state.nextStart).toBe(
      new Date("2026-11-19T00:30:00Z").getTime(),
    );
  });

  it("un lunes apunta al miércoles a las 19:30", () => {
    const now = new Date("2026-11-16T15:00:00Z"); // lunes 10:00 Lima
    const state = getLiveSchedule(now, LIVE_TIMEZONE);
    expect(state.inWindow).toBe(false);
    expect(state.nextStart).toBe(
      new Date("2026-11-19T00:30:00Z").getTime(),
    );
  });

  it("el domingo está activo a las 8:00 y cierra a las 22:00", () => {
    const state = getLiveSchedule(
      new Date("2026-11-15T13:00:00Z"), // domingo 08:00 Lima
      LIVE_TIMEZONE,
    );
    expect(state.inWindow).toBe(true);
    expect(state.windowEnd).toBe(new Date("2026-11-16T03:00:00Z").getTime());

    const closed = getLiveSchedule(
      new Date("2026-11-16T03:30:00Z"), // domingo 22:30 Lima
      LIVE_TIMEZONE,
    );
    expect(closed.inWindow).toBe(false);
  });
});

describe("formato de horarios", () => {
  it("da formato de 12 horas", () => {
    expect(formatTimeLabel(7 * 60 + 30)).toBe("7:30 a. m.");
    expect(formatTimeLabel(19 * 60 + 30)).toBe("7:30 p. m.");
    expect(formatTimeLabel(22 * 60)).toBe("10:00 p. m.");
    expect(formatTimeLabel(0)).toBe("12:00 a. m.");
  });

  it("etiqueta la próxima transmisión en lenguaje natural", () => {
    const now = new Date("2026-11-12T00:00:00Z"); // miércoles 19:00 Lima
    const next = new Date("2026-11-12T00:30:00Z").getTime(); // 19:30 Lima
    expect(formatScheduleLabel(next, now, LIVE_TIMEZONE)).toBe(
      "hoy a las 7:30 p. m.",
    );
  });
});
