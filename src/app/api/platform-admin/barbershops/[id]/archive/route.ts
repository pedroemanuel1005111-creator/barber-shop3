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

  const rows = await db.select().from(barbershops).where(eq(barbershops.id, barbershopId));
  if (rows.length === 0) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  await db
    .update(barbershops)
    .set({ onboardingStatus: "archived", updatedAt: new Date() })
    .where(eq(barbershops.id, barbershopId));

  return NextResponse.json({ success: true });
}
