"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Barbershop {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  openTime: string;
  closeTime: string;
  slotDuration: number;
  workDays: string;
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
}

function generateTimeSlots(openTime: string, closeTime: string, duration: number) {
  const slots: string[] = [];
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);

  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    current += duration;
  }

  return slots;
}

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function getNextDays(count: number) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateLabel(d: Date) {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return {
    dayName: dayNames[d.getDay()],
    dayNum: d.getDate().toString().padStart(2, "0"),
    month: monthNames[d.getMonth()],
    dayOfWeek: d.getDay(),
  };
}

function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
}

function isPastSlot(dateStr: string, timeSlot: string) {
  const now = new Date();
  const [hours, minutes] = timeSlot.split(":").map(Number);
  const slotDate = new Date(dateStr + "T00:00:00");
  slotDate.setHours(hours, minutes, 0, 0);
  return slotDate <= now;
}

export default function BarbershopPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<Array<{ id: number; dataUrl: string; caption: string | null }>>([]);
  const [barbersList, setBarbersList] = useState<Array<{ id: number; name: string; photoDataUrl: string | null; isActive: boolean; workDays: string }>>([]);

  // Booking state
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Array<{ timeSlot: string; barberId: number | null }>>([]);

  // Lookup state
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResult, setLookupResult] = useState<Array<{
    id: number;
    barbershopName: string;
    barbershopSlug: string;
    barbershopAddress: string | null;
    barbershopCity: string | null;
    barbershopPhone: string | null;
    barberName: string | null;
    serviceName: string;
    servicePrice: number;
    clientName: string;
    appointmentDate: string;
    timeSlot: string;
  }> | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Load barbershop data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/barbershops/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setBarbershop(data.barbershop);
        setServices(data.services || []);
        setGallery(data.gallery || []);
        setBarbersList(data.barbers || []);

        // Set default date (first work day)
        const days = getNextDays(14);
        const workDaysArr = data.barbershop.workDays.split(",").map(Number);
        const firstWorkDay = days.find((d) => workDaysArr.includes(d.getDay()));
        if (firstWorkDay) {
          setSelectedDate(toDateString(firstWorkDay));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Fetch booked slots
  const fetchSlots = useCallback(async () => {
    if (!barbershop || !selectedDate) return;
    try {
      const res = await fetch(`/api/appointments?barbershopId=${barbershop.id}&date=${selectedDate}&barberId=${selectedBarberId || ""}`);
      const data = await res.json();
      if (data.bookedSlots) {
        setBookedSlots(data.bookedSlots);
      }
    } catch {
      console.error("Erro ao buscar horários");
    }
  }, [barbershop, selectedDate]);

  useEffect(() => {
    fetchSlots();
    setSelectedSlot(null);
  }, [fetchSlots]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedService || !clientName || !clientPhone || !barbershop) return;
    setBookingLoading(true);
    setError("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopId: barbershop.id,
          serviceId: selectedService.id,
          barberId: selectedBarberId,
          clientName,
          clientPhone,
          appointmentDate: selectedDate,
          timeSlot: selectedSlot,
        }),
      });

      if (res.ok) {
      setSuccess(true);
      setSelectedSlot(null);
      setSelectedService(null);
      setLookupResult(null);
        setClientName("");
        setClientPhone("");
        setStep(1);
        fetchSlots();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao agendar");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setLookupResult(null);
    if (!lookupPhone.trim() || lookupPhone.replace(/\D/g, "").length < 8) {
      setLookupError("Informe um telefone válido (mínimo 8 dígitos).");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/client-appointments?phone=${encodeURIComponent(lookupPhone.trim())}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || "Erro ao buscar"); return; }
      setLookupResult(data.appointments || []);
      if (data.appointments?.length === 0) setLookupError("Nenhum agendamento encontrado.");
    } catch { setLookupError("Erro de conexão."); }
    finally { setLookupLoading(false); }
  };

  const handleCancelAppointment = async (aptId: number) => {
    const raw = lookupPhone.trim();
    if (!raw || raw.replace(/\\D/g, "").length < 8) { setLookupError("Informe o telefone antes de cancelar."); return; }
    setCancelLoading(true);
    setCancelId(aptId);
    try {
      const res = await fetch(`/api/client-appointments?id=${aptId}&phone=${encodeURIComponent(raw)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || "Erro ao cancelar"); return; }
      setLookupResult(prev => prev ? prev.filter(a => a.id !== aptId) : null);
      setLookupError("");
    } catch { setLookupError("Erro de conexão."); }
    finally { setCancelLoading(false); setCancelId(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-gold-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (notFound || !barbershop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Barbearia não encontrada</h1>
          <p className="text-zinc-500 mb-6">Esta barbearia não existe ou foi desativada.</p>
          <Link href="/" className="px-6 py-3 bg-gold-400 text-zinc-950 font-bold rounded-xl hover:bg-gold-300">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const days = getNextDays(14);
  const shopWorkDays = barbershop.workDays.split(",").map(Number);

  // Quando um barbeiro é selecionado, os dias livres são a interseção barbearia ∩ barbeiro
  const selectedBarber = selectedBarberId ? barbersList.find(b => b.id === selectedBarberId) : null;
  const barberWorkDays = selectedBarber
    ? selectedBarber.workDays.split(",").map(Number)
    : null;

  // Barbeiro selecionado → usa os dias dele. Sem barbeiro → usa os dias da barbearia
  const workDaysArr = barberWorkDays ?? shopWorkDays;

  const timeSlots = generateTimeSlots(barbershop.openTime, barbershop.closeTime, barbershop.slotDuration);
  const availableCount = timeSlots.filter(
    (slot) => !bookedSlots.some(b => b.timeSlot === slot) && !isPastSlot(selectedDate, slot)
  ).length;

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-gold-400">
            ← <span className="hidden sm:inline">Voltar</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">💈</span>
            <span className="font-bold text-gold-400 truncate max-w-[200px]">{barbershop.name}</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-8 px-4 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-20 h-20 bg-gold-400/10 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
              💈
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{barbershop.name}</h1>
              {barbershop.description && (
                <p className="text-zinc-400 mb-4">{barbershop.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                {barbershop.city && (
                  <span className="flex items-center gap-1">📍 {barbershop.address ? `${barbershop.address}, ${barbershop.city}` : barbershop.city}</span>
                )}
                {barbershop.phone && (
                  <a href={`tel:${barbershop.phone}`} className="flex items-center gap-1 hover:text-gold-400">
                    📱 {barbershop.phone}
                  </a>
                )}
                {barbershop.whatsapp && (
                  <a
                    href={`https://wa.me/${barbershop.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    className="flex items-center gap-1 hover:text-gold-400"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {barbershop.instagram && (
                  <a
                    href={`https://instagram.com/${barbershop.instagram.replace("@", "")}`}
                    target="_blank"
                    className="flex items-center gap-1 hover:text-gold-400"
                  >
                    📷 {barbershop.instagram}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barbers */}
      {barbersList.length > 0 && (
        <section className="py-10 px-4 border-b border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Nossos Barbeiros</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {barbersList.map((barber) => (
                <div
                  key={barber.id}
                  className={`rounded-2xl border p-5 text-center transition cursor-pointer ${
                    selectedBarberId === barber.id
                      ? "border-gold-400 bg-gold-400/5"
                      : "border-white/5 bg-zinc-900/50 hover:border-zinc-700"
                  }`}
                  onClick={() => setSelectedBarberId(selectedBarberId === barber.id ? null : barber.id)}
                >
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gold-400/30 bg-zinc-800">
                    {barber.photoDataUrl ? (
                      <img src={barber.photoDataUrl} alt={barber.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-sm">{barber.name}</h3>
                  <div className="mt-2 flex justify-center gap-0.5">
                    {["D","S","T","Q","Q","S","S"].map((l, i) => {
                      const active = barber.workDays.split(",").includes(String(i));
                      return <span key={i} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded ${active ? "text-gold-400 bg-gold-400/10" : "text-zinc-700"}`}>{l}</span>;
                    })}
                  </div>
                  <p className="mt-1 text-xs text-gold-400">{selectedBarberId === barber.id ? "Selecionado ✓" : "Clique para selecionar"}</p>
                </div>
              ))}
            </div>
            {selectedBarberId && (
              <div className="mt-4 text-center">
                <button onClick={() => setSelectedBarberId(null)} className="text-sm text-zinc-400 hover:text-white underline">
                  Limpar seleção
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="py-10 px-4 border-b border-zinc-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Galeria de Trabalhos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {gallery.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-2xl border border-white/5 aspect-square bg-zinc-900">
                  <img src={photo.dataUrl} alt={photo.caption || "Trabalho"} className="h-full w-full object-cover hover:scale-105 transition duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <section className="py-10 px-4 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-6">Nossos Serviços</h2>
          {services.length === 0 ? (
            <p className="text-zinc-500">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
                >
                  <h3 className="font-semibold">{svc.name}</h3>
                  {svc.description && (
                    <p className="text-zinc-500 text-sm mt-1">{svc.description}</p>
                  )}
                  <div className="flex justify-between mt-3">
                    <span className="text-gold-400 font-bold">{formatPrice(svc.price)}</span>
                    <span className="text-zinc-500 text-sm">{svc.duration} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Booking Section */}
      <section id="agendar" className="py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Agende seu <span className="text-gold-400">Horário</span>
            </h2>
            <p className="text-zinc-500">Escolha o dia, serviço e horário de sua preferência</p>
          </div>

          {/* Success */}
          {success && (
            <div className="mb-8 p-4 bg-emerald-900/50 border border-emerald-500/30 rounded-xl text-center animate-fade-in-up">
              <p className="text-emerald-300 font-semibold text-lg">✅ Agendamento confirmado!</p>
              <p className="text-emerald-400/70 text-sm mt-1">Aguardamos você no horário marcado.</p>
              <button onClick={() => setSuccess(false)} className="mt-3 text-sm text-emerald-400 underline">
                Fazer outro agendamento
              </button>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-500/30 rounded-xl text-center">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {!success && services.length > 0 && (
            <>
              {/* Steps */}
              <div className="flex items-center justify-center mb-10 gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        step >= s ? "bg-gold-400 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {s}
                    </div>
                    <span className={`text-sm hidden sm:block ${step >= s ? "text-gold-400" : "text-zinc-500"}`}>
                      {s === 1 ? "Data & Serviço" : s === 2 ? "Horário" : "Seus Dados"}
                    </span>
                    {s < 3 && <div className={`w-8 md:w-16 h-0.5 ${step > s ? "bg-gold-400" : "bg-zinc-800"}`} />}
                  </div>
                ))}
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <div className="animate-fade-in-up">
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="text-gold-400">📅</span> Escolha o dia
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {days.map((d) => {
                        const { dayName, dayNum, month, dayOfWeek } = formatDateLabel(d);
                        const ds = toDateString(d);
                        const isSelected = ds === selectedDate;
                        const isWorkDay = workDaysArr.includes(dayOfWeek);
                        return (
                          <button
                            key={ds}
                            disabled={!isWorkDay}
                            onClick={() => setSelectedDate(ds)}
                            className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl transition-all ${
                              !isWorkDay
                                ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                                : isSelected
                                ? "bg-gold-400 text-zinc-950 shadow-lg shadow-gold-400/20"
                                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                            }`}
                          >
                            <span className="text-xs font-medium">{dayName}</span>
                            <span className="text-xl font-bold">{dayNum}</span>
                            <span className="text-xs">{month}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <span className="text-gold-400">✂️</span> Escolha o serviço
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {services.map((svc) => (
                        <button
                          key={svc.id}
                          onClick={() => setSelectedService(svc)}
                          className={`p-4 rounded-xl text-left transition-all ${
                            selectedService?.id === svc.id
                              ? "bg-gold-400/10 border-2 border-gold-400"
                              : "bg-zinc-900 border-2 border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div className="font-semibold">{svc.name}</div>
                          <div className="flex justify-between mt-2">
                            <span className="text-gold-400 font-bold">{formatPrice(svc.price)}</span>
                            <span className="text-zinc-500 text-sm">{svc.duration} min</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      disabled={!selectedService || !selectedDate}
                      onClick={() => setStep(2)}
                      className="px-8 py-3 bg-gold-400 text-zinc-950 font-bold rounded-xl hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <div className="animate-fade-in-up">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="text-gold-400">🕐</span> Escolha o horário
                    </h3>
                    <span className="text-sm text-zinc-400">
                      <span className="text-emerald-400 font-bold">{availableCount}</span> disponíveis
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
                    {timeSlots.map((slot) => {
                      const isBooked = bookedSlots.some(b => b.timeSlot === slot);
                      const isPast = isPastSlot(selectedDate, slot);
                      const isSelected = selectedSlot === slot;
                      const isDisabled = isBooked || isPast;

                      return (
                      <button
                        key={slot}
                        disabled={isDisabled}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 px-2 rounded-xl text-center font-semibold transition-all ${
                            isDisabled
                              ? "bg-zinc-900/50 text-zinc-700 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-gold-400 text-zinc-950 shadow-lg"
                              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                          }`}
                        >
                          {slot}
                          {isBooked && <div className="text-[10px] text-red-400 mt-1">Ocupado</div>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-8 py-3 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:bg-zinc-800"
                    >
                      ← Voltar
                    </button>
                    <button
                      disabled={!selectedSlot}
                      onClick={() => setStep(3)}
                      className="px-8 py-3 bg-gold-400 text-zinc-950 font-bold rounded-xl hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <div className="animate-fade-in-up max-w-lg mx-auto">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="text-gold-400">👤</span> Seus dados
                  </h3>

                  <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-zinc-800">
                    <div className="text-sm text-zinc-400 mb-2">Resumo</div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-gold-400 font-bold">{selectedDate}</div>
                        <div className="text-xs text-zinc-500">Data</div>
                      </div>
                      <div>
                        <div className="text-gold-400 font-bold">{selectedSlot}</div>
                        <div className="text-xs text-zinc-500">Horário</div>
                      </div>
                      <div>
                        <div className="text-gold-400 font-bold text-sm">{selectedService?.name}</div>
                        <div className="text-xs text-zinc-500">Serviço</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Nome completo</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Telefone / WhatsApp</label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="px-8 py-3 border border-zinc-700 text-zinc-300 font-bold rounded-xl hover:bg-zinc-800"
                    >
                      ← Voltar
                    </button>
                    <button
                      disabled={bookingLoading || !clientName || !clientPhone}
                      onClick={handleBook}
                      className="px-8 py-3 bg-gold-400 text-zinc-950 font-bold rounded-xl hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {bookingLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Agendando...
                        </>
                      ) : (
                        "Confirmar ✓"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {services.length === 0 && !success && (
            <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <p className="text-zinc-400">Esta barbearia ainda não cadastrou seus serviços.</p>
            </div>
          )}
        </div>
      </section>

      {/* Meus Agendamentos */}
      <section className="py-10 px-4 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-6 text-center">🔍 Meus Agendamentos</h2>
          <p className="text-center text-zinc-500 text-sm mb-6">
            Já agendou? Consulte seus horários pelo telefone cadastrado.
          </p>

          <form onSubmit={handleLookup} className="flex gap-2 mb-6">
            <input
              type="tel"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              placeholder="Seu telefone (com DDD)"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
            />
            <button
              type="submit"
              disabled={lookupLoading}
              className="rounded-xl bg-gold-400 px-6 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:opacity-50"
            >
              {lookupLoading ? "..." : "Buscar"}
            </button>
          </form>

          {lookupError && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-300 text-center">{lookupError}</div>
          )}

          {lookupResult && lookupResult.length > 0 && (
            <div className="space-y-4">
              {lookupResult.map((apt) => (
                <div key={apt.id} className="rounded-2xl border border-gold-400/20 bg-zinc-900 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400 font-semibold uppercase">Confirmado</span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(apt.appointmentDate + "T00:00:00").toLocaleDateString("pt-BR")} às {apt.timeSlot}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm text-zinc-400">Serviço: <span className="text-white font-medium">{apt.serviceName}</span></div>
                    <div className="text-sm text-zinc-400">Valor: <span className="text-gold-400 font-bold">{formatPrice(apt.servicePrice)}</span></div>
                    {apt.barberName && <div className="text-sm text-zinc-400">Barbeiro: <span className="text-white">{apt.barberName}</span></div>}
                    <div className="text-sm text-zinc-400">Barbearia: <span className="text-white">{apt.barbershopName}</span></div>
                    {apt.barbershopAddress && (
                      <div className="text-sm text-zinc-400">
                        Endereço: <span className="text-zinc-300">{apt.barbershopAddress}{apt.barbershopCity ? `, ${apt.barbershopCity}` : ""}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    {cancelId === apt.id ? (
                      <div className="flex gap-2">
                        <button disabled className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg">Cancelando...</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="text-xs px-3 py-1.5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition"
                      >
                        Cancelar agendamento
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-zinc-600 text-sm">
            Agendamento por <Link href="/" className="text-gold-400 hover:underline">BarberHub</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
