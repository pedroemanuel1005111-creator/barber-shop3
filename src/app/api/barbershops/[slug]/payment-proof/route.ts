import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const authBarbershop = await getBarbershopByToken(token);
  if (!authBarbershop || authBarbershop.slug !== slug) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { paymentNotes, transactionId } = body;

    await db
      .update(barbershops)
      .set({
        paymentTransactionId: transactionId?.trim() || null,
        paymentReceiptNotes: paymentNotes || null,
        paymentValidationStatus: "manual_review",
        paymentValidationScore: 0,
        paymentValidationSummary: "Comprovante enviado via WhatsApp. Aguardando análise manual.",
        paymentSubmittedAt: new Date(),
        paymentRejectedAt: null,
        paymentRejectedReason: null,
        onboardingStatus: "payment_submitted",
        updatedAt: new Date(),
      })
      .where(eq(barbershops.id, authBarbershop.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar pagamento" }, { status: 500 });
  }
}
