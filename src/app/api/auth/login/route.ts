import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { barbershops } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(barbershops)
      .where(eq(barbershops.email, email.toLowerCase()));

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    const barbershop = rows[0];

    if (!verifyPassword(password, barbershop.passwordHash)) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      );
    }

    const token = await createSession(barbershop.id);

    return NextResponse.json({
      token,
      barbershop: {
        id: barbershop.id,
        slug: barbershop.slug,
        name: barbershop.name,
        email: barbershop.email,
        onboardingStatus: barbershop.onboardingStatus,
        isActive: barbershop.isActive,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    );
  }
}
