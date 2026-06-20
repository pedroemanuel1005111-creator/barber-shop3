import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

const MAX_DATA_URL_LENGTH = 500_000;

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const barbershop = await getBarbershopByToken(token);
  if (!barbershop) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { dataUrl, fileName, mimeType, caption } = body;

    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
    }

    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "Imagem muito grande. Máximo 500KB." }, { status: 400 });
    }

    const [photo] = await db
      .insert(gallery)
      .values({
        barbershopId: barbershop.id,
        dataUrl,
        fileName: fileName || null,
        mimeType: mimeType || null,
        caption: caption || null,
      })
      .returning();

    return NextResponse.json({ photo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao adicionar foto" }, { status: 500 });
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

  const photoId = parseInt(id, 10);
  const rows = await db
    .select()
    .from(gallery)
    .where(eq(gallery.id, photoId));

  if (rows.length === 0) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  if (rows[0].barbershopId !== barbershop.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  await db.delete(gallery).where(eq(gallery.id, photoId));
  return NextResponse.json({ success: true });
}
