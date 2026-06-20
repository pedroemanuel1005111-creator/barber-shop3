import { randomBytes } from "crypto";

const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "emanuel1005";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

const globalForPlatformAdmin = globalThis as typeof globalThis & {
  __platformAdminSessions?: Map<string, number>;
};

const adminSessions =
  globalForPlatformAdmin.__platformAdminSessions ?? new Map<string, number>();

if (!globalForPlatformAdmin.__platformAdminSessions) {
  globalForPlatformAdmin.__platformAdminSessions = adminSessions;
}

export function validatePlatformAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export function createPlatformAdminSession() {
  const token = randomBytes(32).toString("hex");
  adminSessions.set(token, Date.now() + SESSION_DURATION_MS);
  cleanupPlatformAdminSessions();
  return token;
}

export function isValidPlatformAdminSession(token: string) {
  const expiresAt = adminSessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

export function cleanupPlatformAdminSessions() {
  const now = Date.now();
  for (const [token, expiresAt] of adminSessions.entries()) {
    if (expiresAt < now) {
      adminSessions.delete(token);
    }
  }
}
