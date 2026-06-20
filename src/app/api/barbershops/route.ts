import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops, services } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  createSession,
  createSlug,
  generatePaymentReferenceCode,
  hashPassword,
} from "@/lib/auth";
import { getPlatformActivationFeeCents } from "@/lib/platform-config";

export async function GET() {
  const rows = await db
    .select({
      id: barbershops.id,
      slug: barbershops.slug,
      name: barbershops.name,
      description: barbershops.description,
      address: barbershops.address,
      city: barbershops.city,
      phone: barbershops.phone,
      instagram: barbershops.instagram,
    })
    .from(barbershops)
    .where(
      and(
        eq(barbershops.isActive, true),
        eq(barbershops.onboardingStatus, "approved")
      )
    );

  return NextResponse.json({ barbershops: rows });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, city } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 4 caracteres" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(barbershops)
      .where(eq(barbershops.email, email.toLowerCase()));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 409 }
      );
    }

    let slug = createSlug(name);
    let slugCounter = 0;
    while (true) {
      const slugCandidate = slugCounter === 0 ? slug : `${slug}-${slugCounter}`;
      const slugExists = await db
        .select()
        .from(barbershops)
        .where(eq(barbershops.slug, slugCandidate));
      if (slugExists.length === 0) {
        slug = slugCandidate;
        break;
      }
      slugCounter++;
    }

    const feeCents = await getPlatformActivationFeeCents();

    const [newBarbershop] = await db
      .insert(barbershops)
      .values({
        slug,
        name,
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        phone: phone || null,
        city: city || null,
        activationFeeCents: feeCents,
        paymentReferenceCode: generatePaymentReferenceCode(),
        paymentValidationStatus: "pending",
        paymentValidationScore: 0,
        onboardingStatus: "pending_payment",
        isActive: false,
      })
      .returning();

    const defaultServices = [
      { name: "Corte de Cabelo", price: 4500, duration: 30 },
      { name: "Barba", price: 3500, duration: 30 },
      { name: "Corte + Barba", price: 7000, duration: 45 },
    ];

    for (const service of defaultServices) {
      await db.insert(services).values({
        barbershopId: newBarbershop.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
      });
    }

    const token = await createSession(newBarbershop.id);

    return NextResponse.json(
      {
        token,
        barbershop: {
          id: newBarbershop.id,
          slug: newBarbershop.slug,
          name: newBarbershop.name,
          onboardingStatus: newBarbershop.onboardingStatus,
          activationFeeCents: newBarbershop.activationFeeCents,
          paymentReferenceCode: newBarbershop.paymentReferenceCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating barbershop:", error);
    return NextResponse.json(
      { error: "Erro ao criar barbearia" },
      { status: 500 }
    );
  }
}
