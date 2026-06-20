import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops, barbers, services, gallery } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getBarbershopByToken, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const authBarbershop = token ? await getBarbershopByToken(token) : null;

  const rows = await db.select().from(barbershops).where(eq(barbershops.slug, slug));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const barbershop = rows[0];
  const isOwner = authBarbershop?.id === barbershop.id;

  if (!isOwner && (!barbershop.isActive || barbershop.onboardingStatus !== "approved")) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const serviceRows = await db
    .select()
    .from(services)
    .where(
      isOwner
        ? eq(services.barbershopId, barbershop.id)
        : and(eq(services.barbershopId, barbershop.id), eq(services.isActive, true))
    )
    .orderBy(asc(services.sortOrder), asc(services.id));

  return NextResponse.json({
    barbershop: {
      id: barbershop.id,
      slug: barbershop.slug,
      name: barbershop.name,
      email: isOwner ? barbershop.email : undefined,
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
      paymentReferenceCode: isOwner ? barbershop.paymentReferenceCode : undefined,
      paymentTransactionId: isOwner ? barbershop.paymentTransactionId : undefined,
      paymentValidationStatus: isOwner ? barbershop.paymentValidationStatus : undefined,
      paymentValidationScore: isOwner ? barbershop.paymentValidationScore : undefined,
      paymentValidationSummary: isOwner ? barbershop.paymentValidationSummary : undefined,
      paymentValidationExtractedText: isOwner ? barbershop.paymentValidationExtractedText : undefined,
      paymentValidationCheckedAt: isOwner ? barbershop.paymentValidationCheckedAt : undefined,
      onboardingStatus: barbershop.onboardingStatus,
      paymentReceiptNotes: isOwner ? barbershop.paymentReceiptNotes : undefined,
      paymentSubmittedAt: isOwner ? barbershop.paymentSubmittedAt : undefined,
      paymentApprovedAt: isOwner ? barbershop.paymentApprovedAt : undefined,
      paymentRejectedAt: isOwner ? barbershop.paymentRejectedAt : undefined,
      paymentRejectedReason: isOwner ? barbershop.paymentRejectedReason : undefined,
      accessReleasedAt: isOwner ? barbershop.accessReleasedAt : undefined,
      isActive: barbershop.isActive,
    },
    gallery: isOwner
      ? (await db.select().from(gallery).where(eq(gallery.barbershopId, barbershop.id)).orderBy(asc(gallery.sortOrder), asc(gallery.id)))
      : [],
    barbers: await db.select().from(barbers).where(
        isOwner
          ? eq(barbers.barbershopId, barbershop.id)
          : and(eq(barbers.barbershopId, barbershop.id), eq(barbers.isActive, true))
      ).orderBy(asc(barbers.id)),
    services: serviceRows.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      isActive: service.isActive,
      sortOrder: service.sortOrder,
    })),
  });
}

export async function PUT(
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
    const {
      name,
      description,
      address,
      city,
      phone,
      whatsapp,
      instagram,
      openTime,
      closeTime,
      slotDuration,
      workDays,
      currentPassword,
      newPassword,
    } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (openTime) updateData.openTime = openTime;
    if (closeTime) updateData.closeTime = closeTime;
    if (slotDuration) updateData.slotDuration = slotDuration;
    if (workDays) updateData.workDays = workDays;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória para alterar a senha" },
          { status: 400 }
        );
      }

      if (!verifyPassword(currentPassword, authBarbershop.passwordHash)) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 401 }
        );
      }

      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: "A nova senha deve ter no mínimo 4 caracteres" },
          { status: 400 }
        );
      }

      updateData.passwordHash = hashPassword(newPassword);
    }

    await db.update(barbershops).set(updateData).where(eq(barbershops.id, authBarbershop.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// DELETE: Deletar barbearia (autenticado, exige senha)
export async function DELETE(
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
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Digite sua senha para confirmar a exclusão." },
        { status: 400 }
      );
    }

    if (!verifyPassword(password, authBarbershop.passwordHash)) {
      return NextResponse.json(
        { error: "Senha incorreta." },
        { status: 401 }
      );
    }

    await db.delete(barbershops).where(eq(barbershops.id, authBarbershop.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir barbearia" },
      { status: 500 }
    );
  }
}
