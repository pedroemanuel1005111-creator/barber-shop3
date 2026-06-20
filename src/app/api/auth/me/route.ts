import { NextRequest, NextResponse } from "next/server";
import { getBarbershopByToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const barbershop = await getBarbershopByToken(token);

  if (!barbershop) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  return NextResponse.json({
    barbershop: {
      id: barbershop.id,
      slug: barbershop.slug,
      name: barbershop.name,
      email: barbershop.email,
      description: barbershop.description,
      address: barbershop.address,
      city: barbershop.city,
      phone: barbershop.phone,
      whatsapp: barbershop.whatsapp,
      instagram: barbershop.instagram,
      openTime: barbershop.openTime,
      closeTime: barbershop.closeTime,
      slotDuration: barbershop.slotDuration,
      workDays: barbershop.workDays,
      activationFeeCents: barbershop.activationFeeCents,
      paymentReferenceCode: barbershop.paymentReferenceCode,
      paymentTransactionId: barbershop.paymentTransactionId,
      paymentValidationStatus: barbershop.paymentValidationStatus,
      paymentValidationScore: barbershop.paymentValidationScore,
      paymentValidationSummary: barbershop.paymentValidationSummary,
      paymentValidationExtractedText: barbershop.paymentValidationExtractedText,
      paymentValidationCheckedAt: barbershop.paymentValidationCheckedAt,
      onboardingStatus: barbershop.onboardingStatus,
      paymentSubmittedAt: barbershop.paymentSubmittedAt,
      paymentApprovedAt: barbershop.paymentApprovedAt,
      paymentRejectedAt: barbershop.paymentRejectedAt,
      paymentRejectedReason: barbershop.paymentRejectedReason,
      paymentReceiptNotes: barbershop.paymentReceiptNotes,
      accessReleasedAt: barbershop.accessReleasedAt,
      isActive: barbershop.isActive,
    },
  });
}
