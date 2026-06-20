import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

// DELETE: Cancel appointment (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const { id } = await params;

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const appointmentId = parseInt(id, 10);
  if (isNaN(appointmentId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Verify appointment belongs to this barbershop
  const existing = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.barbershopId, barbershop.id)));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  // Mark as cancelled instead of deleting
  await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(eq(appointments.id, appointmentId));

  return NextResponse.json({ success: true });
}
