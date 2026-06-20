import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

const MAX_PHOTO_LEN = 400_000;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, photoDataUrl, workDays } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nome é obrigatório (mínimo 2 caracteres)" }, { status: 400 });
    }

    if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_LEN) {
      return NextResponse.json({ error: "Foto muito grande. Máximo 400KB." }, { status: 400 });
    }

    const [barber] = await db
      .insert(barbers)
      .values({
        barbershopId: barbershop.id,
        name: name.trim(),
        photoDataUrl: photoDataUrl || null,
        workDays: workDays || "1,2,3,4,5,6",
      })
      .returning();

    return NextResponse.json({ barber }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar barbeiro" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const barberId = parseInt(id, 10);

  const rows = await db.select().from(barbers).where(eq(barbers.id, barberId));
  if (rows.length === 0) return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  if (rows[0].barbershopId !== barbershop.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { name, photoDataUrl, isActive, workDays } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2)
        return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
      updateData.name = name.trim();
    }
    if (photoDataUrl !== undefined) updateData.photoDataUrl = photoDataUrl || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (workDays !== undefined) updateData.workDays = workDays;

    await db.update(barbers).set(updateData).where(eq(barbers.id, barberId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const barberId = parseInt(id, 10);
  const rows = await db.select().from(barbers).where(eq(barbers.id, barberId));
  if (rows.length === 0) return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  if (rows[0].barbershopId !== barbershop.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await db.delete(barbers).where(eq(barbers.id, barberId));
  return NextResponse.json({ success: true });
}
