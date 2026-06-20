import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getBarbershopByToken } from "@/lib/auth";

// POST: Create a new service (authenticated)
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, price, duration } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Nome e preço são obrigatórios" },
        { status: 400 }
      );
    }

    const [newService] = await db
      .insert(services)
      .values({
        barbershopId: barbershop.id,
        name,
        description: description || null,
        price: Math.round(price),
        duration: duration || 30,
      })
      .returning();

    return NextResponse.json({ service: newService }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar serviço" },
      { status: 500 }
    );
  }
}
