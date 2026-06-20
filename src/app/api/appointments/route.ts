import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, barbers, barbershops, services } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getBarbershopByToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barbershopId = searchParams.get("barbershopId");
  const dateStr = searchParams.get("date");
  const barberId = searchParams.get("barberId");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!barbershopId || !dateStr) {
    return NextResponse.json({ error: "barbershopId e date são obrigatórios" }, { status: 400 });
  }

  const bsId = parseInt(barbershopId, 10);
  if (Number.isNaN(bsId)) return NextResponse.json({ error: "barbershopId inválido" }, { status: 400 });

  const barbershopRows = await db.select().from(barbershops).where(eq(barbershops.id, bsId));
  if (barbershopRows.length === 0) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

  const barbershop = barbershopRows[0];

  let isAdmin = false;
  if (token) {
    const auth = await getBarbershopByToken(token);
    if (auth && auth.id === bsId) isAdmin = true;
  }

  if (!isAdmin && (!barbershop.isActive || barbershop.onboardingStatus !== "approved")) {
    return NextResponse.json({ error: "Agenda indisponível" }, { status: 403 });
  }

  const conditions = [
    eq(appointments.barbershopId, bsId),
    eq(appointments.appointmentDate, dateStr),
    eq(appointments.status, "confirmed"),
  ];

  if (barberId) {
    conditions.push(eq(appointments.barberId, parseInt(barberId, 10)));
  }

  const rows = await db
    .select()
    .from(appointments)
    .where(and(...conditions));

  if (isAdmin) {
    return NextResponse.json({ appointments: rows, isAdmin: true });
  }

  return NextResponse.json({
    bookedSlots: rows.map((r) => ({
      timeSlot: r.timeSlot,
      serviceName: r.serviceName,
      barberId: r.barberId,
      barberName: r.barberName,
    })),
    barbers: [],
    isAdmin: false,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { barbershopId, barberId, serviceId, clientName, clientPhone, appointmentDate, timeSlot } = body;

    if (!barbershopId || !serviceId || !clientName || !clientPhone || !appointmentDate || !timeSlot) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }

    const bsRows = await db.select().from(barbershops).where(eq(barbershops.id, barbershopId));
    if (bsRows.length === 0) return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });

    const barbershop = bsRows[0];
    if (!barbershop.isActive || barbershop.onboardingStatus !== "approved") {
      return NextResponse.json({ error: "Barbearia não liberada para agendamentos." }, { status: 403 });
    }

    const svcRows = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.barbershopId, barbershopId), eq(services.isActive, true)));

    if (svcRows.length === 0) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
    const service = svcRows[0];

    let barberName: string | null = null;
    if (barberId) {
      const barberRows = await db
        .select()
        .from(barbers)
        .where(and(eq(barbers.id, barberId), eq(barbers.barbershopId, barbershopId), eq(barbers.isActive, true)));

      if (barberRows.length === 0) return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
      barberName = barberRows[0].name;
    }

    // Check if slot is already taken at this barbershop (regardless of barber)
    const existing = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.barbershopId, barbershopId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.timeSlot, timeSlot),
          eq(appointments.status, "confirmed")
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Este horário já está ocupado" }, { status: 409 });
    }

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        barbershopId,
        barberId: barberId || null,
        barberName,
        serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        clientName,
        clientPhone,
        appointmentDate,
        timeSlot,
      })
      .returning();

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}
