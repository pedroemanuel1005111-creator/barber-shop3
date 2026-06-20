import { NextRequest, NextResponse } from "next/server";
import { createPlatformAdminSession, validatePlatformAdminPassword } from "@/lib/platform-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Senha obrigatória" }, { status: 400 });
    }

    if (!validatePlatformAdminPassword(password)) {
      return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
    }

    return NextResponse.json({ token: createPlatformAdminSession() });
  } catch {
    return NextResponse.json({ error: "Erro ao entrar" }, { status: 500 });
  }
}
