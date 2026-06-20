import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { sessions, barbershops } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashToVerify = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hash, "hex");
  return timingSafeEqual(hashToVerify, storedHash);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generatePaymentReferenceCode(): string {
  return `BH${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50);
}

export async function createSession(barbershopId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(sessions).values({
    barbershopId,
    token,
    expiresAt,
  });

  return token;
}

export async function validateSession(token: string): Promise<number | null> {
  if (!token) return null;

  const rows = await db
    .select({ barbershopId: sessions.barbershopId })
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    );

  if (rows.length === 0) return null;
  return rows[0].barbershopId;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getBarbershopByToken(token: string) {
  const barbershopId = await validateSession(token);
  if (!barbershopId) return null;

  const rows = await db
    .select()
    .from(barbershops)
    .where(eq(barbershops.id, barbershopId));

  return rows[0] || null;
}
