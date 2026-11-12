import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { FirebaseWebConfig } from "@/lib/config-types";
import { EMPTY_FIREBASE } from "@/lib/config-types";

export const DATA_DIR = process.env.CRISTIANPLAY_DATA_DIR?.trim()
  ? path.resolve(process.env.CRISTIANPLAY_DATA_DIR.trim())
  : path.join(process.cwd(), "data");

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

export interface StoredSettings {
  firebase: Partial<FirebaseWebConfig>;
  youtube: {
    apiKey?: string;
    region?: string;
  };
  updatedAt: number;
}

export interface ResolvedFirebaseConfig {
  value: FirebaseWebConfig;
  source: "panel" | "env" | "mixed" | "none";
}

export interface ResolvedYouTubeConfig {
  apiKey: string;
  region: string;
  source: "panel" | "env" | "none";
}

function envFirebase(): Partial<FirebaseWebConfig> {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "",
  };
}

function envYouTube(): { apiKey: string; region: string } {
  return {
    apiKey: process.env.YOUTUBE_API_KEY?.trim() || "",
    region: process.env.YOUTUBE_REGION?.trim() || "MX",
  };
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
}

async function readSettings(): Promise<StoredSettings | null> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      firebase: (parsed.firebase ?? {}) as Partial<FirebaseWebConfig>,
      youtube: {
        apiKey: parsed.youtube?.apiKey ?? "",
        region: parsed.youtube?.region ?? "",
      },
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export async function writeSettings(patch: Partial<StoredSettings>): Promise<StoredSettings> {
  await ensureDir();
  const current = (await readSettings()) ?? {
    firebase: {},
    youtube: { apiKey: "", region: "" },
    updatedAt: 0,
  };
  const next: StoredSettings = {
    firebase: { ...current.firebase, ...(patch.firebase ?? {}) },
    youtube: {
      apiKey:
        patch.youtube && "apiKey" in patch.youtube
          ? patch.youtube.apiKey ?? ""
          : current.youtube.apiKey,
      region:
        patch.youtube && "region" in patch.youtube && patch.youtube.region
          ? patch.youtube.region
          : current.youtube.region || "",
    },
    updatedAt: Date.now(),
  };
  const tmp = SETTINGS_FILE + ".tmp-" + crypto.randomBytes(4).toString("hex");
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  await fs.rename(tmp, SETTINGS_FILE);
  try {
    await fs.chmod(SETTINGS_FILE, 0o600);
  } catch {
    // ignore
  }
  return next;
}

export async function getResolvedFirebaseConfig(): Promise<ResolvedFirebaseConfig> {
  const stored = await readSettings();
  const env = envFirebase();
  const storedVal = stored?.firebase ?? {};
  const merged: FirebaseWebConfig = {
    apiKey: (storedVal.apiKey || env.apiKey || "").trim(),
    authDomain: (storedVal.authDomain || env.authDomain || "").trim(),
    projectId: (storedVal.projectId || env.projectId || "").trim(),
    storageBucket: (storedVal.storageBucket || env.storageBucket || "").trim(),
    messagingSenderId: (storedVal.messagingSenderId || env.messagingSenderId || "").trim(),
    appId: (storedVal.appId || env.appId || "").trim(),
  };
  const storedHas = Object.values(storedVal).some((v) => (v ?? "").trim() !== "");
  const envHas = Object.values(env).some((v) => (v ?? "").trim() !== "");
  let source: ResolvedFirebaseConfig["source"] = "none";
  if (storedHas && envHas) source = "mixed";
  else if (storedHas) source = "panel";
  else if (envHas) source = "env";
  return { value: merged, source };
}

export async function getResolvedYouTubeConfig(): Promise<ResolvedYouTubeConfig> {
  const stored = await readSettings();
  const env = envYouTube();
  const storedKey = stored?.youtube?.apiKey?.trim() || "";
  const storedRegion = stored?.youtube?.region?.trim() || "";
  const apiKey = storedKey || env.apiKey;
  const region = storedRegion || env.region || "MX";
  const storedHas = Boolean(storedKey);
  const envHas = Boolean(env.apiKey);
  let source: ResolvedYouTubeConfig["source"] = "none";
  if (storedHas) source = "panel";
  else if (envHas) source = "env";
  return { apiKey, region, source };
}

export function isFirebaseConfiguredValue(cfg: FirebaseWebConfig): boolean {
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

export { EMPTY_FIREBASE };