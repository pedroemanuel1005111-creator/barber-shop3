import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, barbershops } from "@/db/schema";
import { and, eq, gte, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone || phone.trim().length < 8) {
    return NextResponse.json({ error: "Informe um telefone válido (mínimo 8 dígitos)." }, { status: 400 });
  }

  const cleanedPhone = phone.replace(/\D/g, "");

  // Get all upcoming confirmed appointments for this phone
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      id: appointments.id,
      barbershopId: appointments.barbershopId,
      barbershopName: barbershops.name,
      barbershopSlug: barbershops.slug,
      barbershopAddress: barbershops.address,
      barbershopCity: barbershops.city,
      barbershopPhone: barbershops.phone,
      barberName: appointments.barberName,
      serviceName: appointments.serviceName,
      servicePrice: appointments.servicePrice,
      clientName: appointments.clientName,
      clientPhone: appointments.clientPhone,
      appointmentDate: appointments.appointmentDate,
      timeSlot: appointments.timeSlot,
      status: appointments.status,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .innerJoin(barbershops, eq(appointments.barbershopId, barbershops.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        gte(appointments.appointmentDate, today)
      )
    )
    .orderBy(asc(appointments.appointmentDate), asc(appointments.timeSlot));

  // Filter by phone (need to match with cleaned digits)
  const matched = rows.filter((r) => {
    const rowPhone = r.clientPhone.replace(/\D/g, "");
    return rowPhone.includes(cleanedPhone) || cleanedPhone.includes(rowPhone);
  });

  return NextResponse.json({ appointments: matched });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const phone = searchParams.get("phone");

  if (!id) {
    return NextResponse.json({ error: "ID do agendamento obrigatório." }, { status: 400 });
  }
  if (!phone || phone.trim().length < 8) {
    return NextResponse.json({ error: "Informe o telefone usado no agendamento." }, { status: 400 });
  }

  const appointmentId = parseInt(id, 10);
  const cleanedPhone = phone.replace(/\D/g, "");

  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }

  const appointment = rows[0];
  const rowPhone = appointment.clientPhone.replace(/\D/g, "");
  if (!rowPhone.includes(cleanedPhone) && !cleanedPhone.includes(rowPhone)) {
    return NextResponse.json({ error: "Telefone não confere com este agendamento." }, { status: 403 });
  }

  await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(eq(appointments.id, appointmentId));

  return NextResponse.json({ success: true });
}
