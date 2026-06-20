import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidPlatformAdminSession } from "@/lib/platform-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const { id } = await params;

  if (!token || !isValidPlatformAdminSession(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const barbershopId = Number(id);
  if (Number.isNaN(barbershopId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  await db
    .update(barbershops)
    .set({
      onboardingStatus: "rejected",
      isActive: false,
      paymentRejectedAt: new Date(),
      paymentRejectedReason: reason || "Comprovante rejeitado. Solicite novo envio.",
      updatedAt: new Date(),
    })
    .where(eq(barbershops.id, barbershopId));

  return NextResponse.json({ success: true });
}
