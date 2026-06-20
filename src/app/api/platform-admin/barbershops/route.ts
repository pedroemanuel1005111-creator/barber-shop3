import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isValidPlatformAdminSession } from "@/lib/platform-admin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !isValidPlatformAdminSession(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("showArchived") === "1";

  const rows = await db
    .select({
      id: barbershops.id,
      name: barbershops.name,
      slug: barbershops.slug,
      email: barbershops.email,
      city: barbershops.city,
      phone: barbershops.phone,
      onboardingStatus: barbershops.onboardingStatus,
      activationFeeCents: barbershops.activationFeeCents,
      paymentReferenceCode: barbershops.paymentReferenceCode,
      paymentTransactionId: barbershops.paymentTransactionId,
      paymentValidationStatus: barbershops.paymentValidationStatus,
      paymentValidationScore: barbershops.paymentValidationScore,
      paymentValidationSummary: barbershops.paymentValidationSummary,
      paymentValidationExtractedText: barbershops.paymentValidationExtractedText,
      paymentValidationCheckedAt: barbershops.paymentValidationCheckedAt,
      paymentReceiptDataUrl: barbershops.paymentReceiptDataUrl,
      paymentReceiptFileName: barbershops.paymentReceiptFileName,
      paymentReceiptMimeType: barbershops.paymentReceiptMimeType,
      paymentReceiptNotes: barbershops.paymentReceiptNotes,
      paymentSubmittedAt: barbershops.paymentSubmittedAt,
      paymentApprovedAt: barbershops.paymentApprovedAt,
      paymentRejectedAt: barbershops.paymentRejectedAt,
      paymentRejectedReason: barbershops.paymentRejectedReason,
      accessReleasedAt: barbershops.accessReleasedAt,
      isActive: barbershops.isActive,
      createdAt: barbershops.createdAt,
    })
    .from(barbershops)
    .orderBy(desc(barbershops.createdAt));

  // Filter out archived unless showArchived=1
  const filtered = showArchived
    ? rows
    : rows.filter((r) => r.onboardingStatus !== "archived");

  return NextResponse.json({ barbershops: filtered });

  return NextResponse.json({ barbershops: filtered });
}
