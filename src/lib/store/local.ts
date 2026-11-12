import { EMPTY_LIBRARY, sanitizeLibrary } from "@/lib/library-data";
import type { LibraryData } from "@/lib/types";

const STORAGE_KEY = "cristianplay.library.v1";

export function readLocalLibrary(): LibraryData {
  if (typeof window === "undefined") return { ...EMPTY_LIBRARY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_LIBRARY };
    return sanitizeLibrary(JSON.parse(raw));
  } catch {
    return { ...EMPTY_LIBRARY };
  }
}

export function writeLocalLibrary(library: LibraryData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    // Almacenamiento lleno o bloqueado: la app sigue funcionando en memoria.
  }
}
