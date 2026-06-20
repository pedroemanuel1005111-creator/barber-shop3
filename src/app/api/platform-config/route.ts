import { NextRequest, NextResponse } from "next/server";
import {
  getPlatformPixKey,
  getPlatformActivationFeeCents,
  formatActivationFeeLabel,
  setPlatformConfig,
  getAllPlatformConfig,
} from "@/lib/platform-config";
import { isValidPlatformAdminSession } from "@/lib/platform-admin";

export async function GET() {
  const config = await getAllPlatformConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !isValidPlatformAdminSession(token)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pixKey, activationFeeCents } = body;

    if (pixKey !== undefined) {
      const pixKeyStr = String(pixKey).trim();
      if (!pixKeyStr || pixKeyStr.length < 5) {
        return NextResponse.json(
          { error: "Chave PIX inválida. Deve ter no mínimo 5 caracteres." },
          { status: 400 }
        );
      }
      await setPlatformConfig("pix_key", pixKeyStr);
    }

    if (activationFeeCents !== undefined) {
      const feeStr = String(activationFeeCents).trim();
      const feeNum = parseInt(feeStr, 10);
      if (isNaN(feeNum) || feeNum < 100) {
        return NextResponse.json(
          { error: "O valor mínimo da taxa é R$ 1,00." },
          { status: 400 }
        );
      }
      await setPlatformConfig("activation_fee_cents", String(feeNum));
    }

    const updated = await getAllPlatformConfig();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
