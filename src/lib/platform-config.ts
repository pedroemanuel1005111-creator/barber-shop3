import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULTS = {
  pixKey: "12957618400",
  activationFeeCents: 7500,
  whatsappApprovalNumber: "5582999375324",
};

let cachedPixKey: string | null = null;
let cachedFeeCents: number | null = null;
let cachedWhatsApp: string | null = null;
let lastCache = 0;

async function loadConfig(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: platformConfig.value })
    .from(platformConfig)
    .where(eq(platformConfig.key, key));

  return rows.length > 0 ? rows[0].value : null;
}

export async function getPlatformPixKey(): Promise<string> {
  const now = Date.now();
  if (cachedPixKey && now - lastCache < 30000) return cachedPixKey;
  const val = await loadConfig("pix_key");
  cachedPixKey = val ?? DEFAULTS.pixKey;
  lastCache = now;
  return cachedPixKey;
}

export async function getPlatformActivationFeeCents(): Promise<number> {
  const now = Date.now();
  if (cachedFeeCents !== null && now - lastCache < 30000) return cachedFeeCents;
  const val = await loadConfig("activation_fee_cents");
  cachedFeeCents = val ? parseInt(val, 10) : DEFAULTS.activationFeeCents;
  lastCache = now;
  return cachedFeeCents;
}

export async function getPlatformWhatsAppNumber(): Promise<string> {
  const now = Date.now();
  if (cachedWhatsApp && now - lastCache < 30000) return cachedWhatsApp;
  const val = await loadConfig("whatsapp_approval_number");
  cachedWhatsApp = val ?? DEFAULTS.whatsappApprovalNumber;
  lastCache = now;
  return cachedWhatsApp;
}

export function formatActivationFeeLabel(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export async function getPlatformActivationFeeLabel(): Promise<string> {
  const cents = await getPlatformActivationFeeCents();
  return formatActivationFeeLabel(cents);
}

export async function setPlatformConfig(
  key: string,
  value: string
): Promise<void> {
  const existing = await db
    .select({ id: platformConfig.id })
    .from(platformConfig)
    .where(eq(platformConfig.key, key));

  if (existing.length > 0) {
    await db
      .update(platformConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(platformConfig.key, key));
  } else {
    await db.insert(platformConfig).values({ key, value });
  }

  // invalidate cache
  cachedPixKey = null;
  cachedFeeCents = null;
  cachedWhatsApp = null;
  lastCache = 0;
}

export async function getAllPlatformConfig(): Promise<{
  pixKey: string;
  activationFeeCents: number;
  activationFeeLabel: string;
  whatsappNumber: string;
}> {
  const pixKey = await getPlatformPixKey();
  const activationFeeCents = await getPlatformActivationFeeCents();
  const activationFeeLabel = formatActivationFeeLabel(activationFeeCents);
  const whatsappNumber = await getPlatformWhatsAppNumber();

  return { pixKey, activationFeeCents, activationFeeLabel, whatsappNumber };
}

export function isApprovedStatus(status: string) {
  return status === "approved";
}
