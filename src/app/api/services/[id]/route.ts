import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

// PUT: Update a service
export async function PUT(
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

  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Verify service belongs to this barbershop
  const existingService = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.barbershopId, barbershop.id)));

  if (existingService.length === 0) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, description, price, duration, isActive, sortOrder } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Math.round(price);
    if (duration !== undefined) updateData.duration = duration;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, serviceId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE: Delete a service
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

  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Verify service belongs to this barbershop
  const existingService = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.barbershopId, barbershop.id)));

  if (existingService.length === 0) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  await db.delete(services).where(eq(services.id, serviceId));

  return NextResponse.json({ success: true });
}
