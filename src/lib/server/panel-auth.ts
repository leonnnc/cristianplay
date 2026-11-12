import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "@/lib/server/config";

const PANEL_FILE = path.join(DATA_DIR, "panel.json");
const COOKIE_NAME = "cp_panel_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface PanelAuth {
  version: number;
  passwordHash: string;
  salt: string;
  secret: string;
  createdAt: number;
}

export { COOKIE_NAME };

export async function readPanelAuth(): Promise<PanelAuth | null> {
  try {
    const raw = await fs.readFile(PANEL_FILE, "utf8");
    const parsed = JSON.parse(raw) as PanelAuth;
    if (!parsed?.passwordHash || !parsed?.salt || !parsed?.secret) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writePanelAuth(auth: PanelAuth): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  const tmp = PANEL_FILE + ".tmp-" + crypto.randomBytes(4).toString("hex");
  await fs.writeFile(tmp, JSON.stringify(auth, null, 2), { mode: 0o600 });
  await fs.rename(tmp, PANEL_FILE);
  try {
    await fs.chmod(PANEL_FILE, 0o600);
  } catch {
    // ignore
  }
}

export async function hashPassword(
  password: string,
  salt?: string,
): Promise<{ hash: string; salt: string }> {
  const useSalt = salt ?? crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, useSalt, 64, { N: 16384 }, (err, derived) => {
      if (err) reject(err);
      else resolve({ hash: derived.toString("hex"), salt: useSalt });
    });
  });
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    try {
      crypto.timingSafeEqual(bufA, bufA);
    } catch {
      // ignore
    }
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isPanelConfiguredByEnv(): boolean {
  return Boolean(process.env.PANEL_PASSWORD?.trim());
}

export async function isPanelConfigured(): Promise<boolean> {
  if (isPanelConfiguredByEnv()) return true;
  const auth = await readPanelAuth();
  return Boolean(auth);
}

export async function resolveAuth(): Promise<{
  auth: PanelAuth | null;
  configuredByEnv: boolean;
  secret: string;
}> {
  const configuredByEnv = isPanelConfiguredByEnv();
  const auth = configuredByEnv ? null : await readPanelAuth();
  let secret = "";
  if (auth?.secret) secret = auth.secret;
  else if (process.env.PANEL_SECRET?.trim()) secret = process.env.PANEL_SECRET.trim();
  else if (configuredByEnv) secret = crypto.createHash("sha256").update(process.env.PANEL_PASSWORD!.trim()).digest("hex");
  return { auth, configuredByEnv, secret };
}

export async function verifyPassword(password: string): Promise<boolean> {
  const envPassword = process.env.PANEL_PASSWORD?.trim();
  if (envPassword) {
    return timingSafeEqual(password, envPassword);
  }
  const auth = await readPanelAuth();
  if (!auth) return false;
  const { hash } = await hashPassword(password, auth.salt);
  return timingSafeEqual(hash, auth.passwordHash);
}

export async function createSessionToken(): Promise<string> {
  const { secret } = await resolveAuth();
  const useSecret = secret || crypto.randomBytes(32).toString("hex");
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `v1:${exp}`;
  const sig = crypto.createHmac("sha256", useSecret).update(payload).digest("hex");
  return `${exp}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const payload = `v1:${exp}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return timingSafeEqual(sig, expected);
}

export async function isAuthenticated(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const token = match ? decodeURIComponent(match[1]) : "";
  if (!token) return false;
  const { secret } = await resolveAuth();
  // If no secret available, deny.
  if (!secret) return false;
  return verifySessionToken(token, secret);
}

export function setSessionCookie(
  response: Response,
  token: string,
  request: Request,
): void {
  const secure = isHttps(request);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? "; Secure" : ""}`;
  response.headers.append("Set-Cookie", cookie);
}

export function clearSessionCookie(response: Response, request: Request): void {
  const secure = isHttps(request);
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
  response.headers.append("Set-Cookie", cookie);
}

// Rate limiter for panel auth endpoints
const PANEL_BUCKETS = new Map<string, { count: number; resetAt: number }>();

export function checkPanelRateLimit(
  key: string,
  limit = 8,
  windowMs = 5 * 60 * 1000,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = PANEL_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) {
    PANEL_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    return o.host === host;
  } catch {
    return false;
  }
}