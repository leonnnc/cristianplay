import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite 45 solicitudes y bloquea la siguiente", () => {
    const key = "usuario-prueba";

    for (let index = 0; index < 45; index += 1) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }

    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBe(60);
  });

  it("vuelve a permitir tras la ventana de un minuto", () => {
    const key = "usuario-ventana";
    for (let index = 0; index < 46; index += 1) checkRateLimit(key);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key).allowed).toBe(true);
  });

  it("aísla los límites por clave", () => {
    const first = "ip-a";
    for (let index = 0; index < 46; index += 1) checkRateLimit(first);

    expect(checkRateLimit(first).allowed).toBe(false);
    expect(checkRateLimit("ip-b").allowed).toBe(true);
  });
});
