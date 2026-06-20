"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TabType = "ativacao" | "agenda" | "barbeiros" | "servicos" | "galeria" | "config";

interface Barbershop {
  id: number;
  slug: string;
  name: string;
  email: string;
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
  activationFeeCents: number;
  paymentReferenceCode: string;
  paymentTransactionId: string | null;
  paymentValidationStatus: string;
  paymentValidationScore: number;
  paymentValidationSummary: string | null;
  paymentValidationExtractedText: string | null;
  paymentValidationCheckedAt: string | null;
  onboardingStatus: string;
  paymentSubmittedAt: string | null;
  paymentApprovedAt: string | null;
  paymentRejectedAt: string | null;
  paymentRejectedReason: string | null;
  paymentReceiptNotes: string | null;
  accessReleasedAt: string | null;
  isActive: boolean;
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isActive: boolean;
}

interface Appointment {
  id: number;
  serviceName: string;
  servicePrice: number;
  clientName: string;
  clientPhone: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
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
  for (let i = -1; i < count; i++) {
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
  };
}

function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
}

function getStatusMeta(status: string) {
  if (status === "approved") {
    return {
      label: "Site liberado",
      classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (status === "payment_submitted") {
    return {
      label: "Comprovante enviado",
      classes: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    };
  }
  if (status === "rejected") {
    return {
      label: "Comprovante rejeitado",
      classes: "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }
  if (status === "archived") {
    return {
      label: "Arquivada",
      classes: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
    };
  }
  return {
    label: "Aguardando pagamento",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("ativacao");
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [serviceForm, setServiceForm] = useState({ name: "", description: "", price: "", duration: "30" });
  const [serviceError, setServiceError] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [configForm, setConfigForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    openTime: "08:00",
    closeTime: "20:00",
    slotDuration: "30",
    workDays: "1,2,3,4,5,6",
  });
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState("");
  const [configSaving, setConfigSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState<Array<{ id: number; dataUrl: string; caption: string | null; fileName: string | null }>>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  const [barbersList, setBarbersList] = useState<Array<{ id: number; name: string; photoDataUrl: string | null; isActive: boolean; workDays: string }>>([]);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<{ id: number; name: string; photoDataUrl: string | null; workDays: string } | null>(null);
  const [barberForm, setBarberForm] = useState({ name: "", photoDataUrl: "", workDays: "1,2,3,4,5,6" });
  const [barberError, setBarberError] = useState("");

  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [copyPixSuccess, setCopyPixSuccess] = useState(false);
  const [platformConfig, setPlatformConfig] = useState({
    pixKey: "",
    activationFeeLabel: "",
    whatsappNumber: "",
  });

  const days = useMemo(() => getNextDays(14), []);

  useEffect(() => {
    fetch("/api/platform-config")
      .then((res) => res.json())
      .then((data) => setPlatformConfig({
        pixKey: data.pixKey,
        activationFeeLabel: data.activationFeeLabel,
        whatsappNumber: data.whatsappNumber,
      }))
      .catch(() => {});
  }, []);

  const loadServices = useCallback(
    async (currentToken: string, currentSlug: string) => {
      const res = await fetch(`/api/barbershops/${currentSlug}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      setServices(data.services || []);
      setGalleryPhotos(data.gallery || []);
      setBarbersList(data.barbers || []);
    },
    []
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("barber_token");
    if (!storedToken) {
      router.push("/admin/login");
      return;
    }

    const authToken = storedToken;
    setToken(authToken);

    async function bootstrap() {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) {
          localStorage.removeItem("barber_token");
          localStorage.removeItem("barber_slug");
          router.push("/admin/login");
          return;
        }

        const data = await res.json();
        setBarbershop(data.barbershop);
        setPaymentNotes(data.barbershop.paymentReceiptNotes || "");
        setConfigForm({
          name: data.barbershop.name || "",
          description: data.barbershop.description || "",
          address: data.barbershop.address || "",
          city: data.barbershop.city || "",
          phone: data.barbershop.phone || "",
          whatsapp: data.barbershop.whatsapp || "",
          instagram: data.barbershop.instagram || "",
          openTime: data.barbershop.openTime || "08:00",
          closeTime: data.barbershop.closeTime || "20:00",
          slotDuration: String(data.barbershop.slotDuration || 30),
          workDays: data.barbershop.workDays || "1,2,3,4,5,6",
        });
        setActiveTab(data.barbershop.onboardingStatus === "approved" ? "agenda" : "ativacao");
        await loadServices(authToken, data.barbershop.slug);
      } catch {
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [loadServices, router]);

  const fetchAppointments = useCallback(async () => {
    if (!token || !barbershop) return;
    setAppointmentsLoading(true);
    try {
      const res = await fetch(
        `/api/appointments?barbershopId=${barbershop.id}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setAppointments(data.appointments || []);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [barbershop, selectedDate, token]);

  useEffect(() => {
    if (barbershop && token) {
      fetchAppointments();
    }
  }, [barbershop, token, fetchAppointments]);

  const handleLogout = () => {
    localStorage.removeItem("barber_token");
    localStorage.removeItem("barber_slug");
    router.push("/admin/login");
  };

  const reloadMe = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setBarbershop(data.barbershop);
  }, [token]);

  const handleDeleteAppointment = async (id: number) => {
    if (!token) return;
    await fetch(`/api/appointments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteConfirm(null);
    await fetchAppointments();
  };

  const openCreateService = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", price: "", duration: "30" });
    setServiceError("");
    setShowServiceModal(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || "",
      price: (service.price / 100).toFixed(2).replace(".", ","),
      duration: String(service.duration),
    });
    setServiceError("");
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setServiceError("");

    const price = Math.round(Number(serviceForm.price.replace(",", ".")) * 100);
    if (!serviceForm.name || Number.isNaN(price) || price <= 0) {
      setServiceError("Preencha nome e um preço válido.");
      return;
    }

    const payload = {
      name: serviceForm.name,
      description: serviceForm.description || null,
      price,
      duration: Number(serviceForm.duration),
    };

    const endpoint = editingService ? `/api/services/${editingService.id}` : "/api/services";
    const method = editingService ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setServiceError(data.error || "Erro ao salvar serviço.");
      return;
    }

    await loadServices(token, barbershop.slug);
    setShowServiceModal(false);
  };

  const handleDeleteService = async (id: number) => {
    if (!token || !confirm("Deseja excluir este serviço?")) return;
    await fetch(`/api/services/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setServices((current) => current.filter((service) => service.id !== id));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !barbershop) return;
    if (!file.type.startsWith("image/")) {
      setGalleryError("Envie apenas imagens.");
      return;
    }
    if (file.size > 400 * 1024) {
      setGalleryError("Imagem muito grande. Máximo 400KB.");
      return;
    }
    setGalleryUploading(true);
    setGalleryError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            dataUrl: String(reader.result),
            fileName: file.name,
            mimeType: file.type,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setGalleryError(d.error || "Erro ao enviar foto");
        } else {
          await loadServices(token, barbershop.slug);
        }
      } catch { setGalleryError("Erro de conexão."); }
      finally { setGalleryUploading(false); e.target.value = ""; }
    };
    reader.onerror = () => { setGalleryError("Falha ao ler imagem."); setGalleryUploading(false); };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!token || !barbershop || !confirm("Excluir esta foto?")) return;
    await fetch(`/api/gallery?id=${photoId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleBarberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setBarberError("");
    if (!barberForm.name.trim()) { setBarberError("Nome obrigatório."); return; }
    try {
      const url = editingBarber ? `/api/barbers?id=${editingBarber.id}` : "/api/barbers";
      const method = editingBarber ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: barberForm.name.trim(), photoDataUrl: barberForm.photoDataUrl || null, workDays: barberForm.workDays }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setBarberError(d.error || "Erro ao salvar"); return; }
      await loadServices(token, barbershop.slug);
      setShowBarberModal(false);
      setEditingBarber(null);
      setBarberForm({ name: "", photoDataUrl: "", workDays: "1,2,3,4,5,6" });
    } catch { setBarberError("Erro de conexão."); }
  };

  const handleToggleBarberActive = async (barber: { id: number; name: string; isActive: boolean }) => {
    if (!token) return;
    await fetch(`/api/barbers?id=${barber.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !barber.isActive }),
    });
    setBarbersList(prev => prev.map(b => b.id === barber.id ? { ...b, isActive: !b.isActive } : b));
  };

  const handleDeleteBarber = async (id: number) => {
    if (!token || !confirm("Excluir este barbeiro?")) return;
    await fetch(`/api/barbers?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setBarbersList(prev => prev.filter(b => b.id !== id));
  };

  const openBarberModal = (barber?: { id: number; name: string; photoDataUrl: string | null; workDays: string }) => {
    if (barber) {
      setEditingBarber(barber);
      setBarberForm({ name: barber.name, photoDataUrl: barber.photoDataUrl || "", workDays: barber.workDays || "1,2,3,4,5,6" });
    } else {
      setEditingBarber(null);
      setBarberForm({ name: "", photoDataUrl: "", workDays: "1,2,3,4,5,6" });
    }
    setBarberError("");
    setShowBarberModal(true);
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setConfigSaving(true);
    setConfigError("");
    setConfigSuccess("");

    const res = await fetch(`/api/barbershops/${barbershop.slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: configForm.name,
        description: configForm.description || null,
        address: configForm.address || null,
        city: configForm.city || null,
        phone: configForm.phone || null,
        whatsapp: configForm.whatsapp || null,
        instagram: configForm.instagram || null,
        openTime: configForm.openTime,
        closeTime: configForm.closeTime,
        slotDuration: Number(configForm.slotDuration),
        workDays: configForm.workDays,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setConfigError(data.error || "Erro ao salvar configurações.");
      setConfigSaving(false);
      return;
    }

    setConfigSuccess("Configurações salvas com sucesso!");
    await reloadMe();
    setConfigSaving(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.next.length < 4) {
      setPasswordError("A nova senha deve ter no mínimo 4 caracteres.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    const res = await fetch(`/api/barbershops/${barbershop.slug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setPasswordError(data.error || "Erro ao alterar senha.");
      return;
    }

    setPasswordSuccess("Senha alterada com sucesso!");
    setPasswordForm({ current: "", next: "", confirm: "" });
  };

  const handleDeleteBarbershop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/barbershops/${barbershop.slug}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setDeleteError(data.error || "Erro ao excluir barbearia.");
        setDeleteLoading(false);
        return;
      }

      localStorage.removeItem("barber_token");
      localStorage.removeItem("barber_slug");
      router.push("/");
    } catch {
      setDeleteError("Erro de conexão.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(platformConfig.pixKey);
      setCopyPixSuccess(true);
      setTimeout(() => setCopyPixSuccess(false), 2000);
    } catch {
      setCopyPixSuccess(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const msg = `Olá! Sou *${barbershop?.name || "Barbearia"}*, código: *${barbershop?.paymentReferenceCode || ""}*. Estou enviando o comprovante de pagamento da taxa de ativação de ${platformConfig.activationFeeLabel}.`;
    window.open(`https://wa.me/${platformConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !barbershop) return;
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentSaving(true);

    try {
      const res = await fetch(`/api/barbershops/${barbershop.slug}/payment-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentNotes: paymentNotes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPaymentError(data.error || "Erro ao registrar pagamento.");
        setPaymentSaving(false);
        return;
      }

      setPaymentSuccess("Pagamento registrado! O comprovante será analisado pela plataforma.");
      await reloadMe();
    } catch {
      setPaymentError("Erro ao registrar pagamento.");
    } finally {
      setPaymentSaving(false);
    }
  };

  const timeSlots = useMemo(
    () =>
      generateTimeSlots(
        configForm.openTime || "08:00",
        configForm.closeTime || "20:00",
        Number(configForm.slotDuration) || 30
      ),
    [configForm.closeTime, configForm.openTime, configForm.slotDuration]
  );

  const getAppointmentForSlot = (slot: string) =>
    appointments.find((appointment) => appointment.timeSlot === slot);

  if (loading || !barbershop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-500">Carregando...</div>
      </div>
    );
  }

  const statusMeta = getStatusMeta(barbershop.onboardingStatus);
  const publicPageEnabled = barbershop.isActive && barbershop.onboardingStatus === "approved";

  return (
    <div className="min-h-screen bg-zinc-950">
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingService ? "Editar" : "Novo"} <span className="text-gold-400">serviço</span>
              </h2>
              <button onClick={() => setShowServiceModal(false)} className="text-2xl text-zinc-500">×</button>
            </div>

            {serviceError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                {serviceError}
              </div>
            )}

            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <input
                value={serviceForm.name}
                onChange={(e) => setServiceForm((current) => ({ ...current, name: e.target.value }))}
                placeholder="Nome do serviço"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
              <input
                value={serviceForm.description}
                onChange={(e) =>
                  setServiceForm((current) => ({ ...current, description: e.target.value }))
                }
                placeholder="Descrição"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((current) => ({ ...current, price: e.target.value }))}
                  placeholder="Preço em reais ex: 45,00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                />
                <select
                  value={serviceForm.duration}
                  onChange={(e) =>
                    setServiceForm((current) => ({ ...current, duration: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button className="flex-1 rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Alterar <span className="text-gold-400">senha</span>
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-2xl text-zinc-500">×</button>
            </div>

            {passwordError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((current) => ({ ...current, current: e.target.value }))}
                placeholder="Senha atual"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
              <input
                type="password"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((current) => ({ ...current, next: e.target.value }))}
                placeholder="Nova senha"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((current) => ({ ...current, confirm: e.target.value }))}
                placeholder="Confirmar nova senha"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-800"
                >
                  Fechar
                </button>
                <button className="flex-1 rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">
                  Salvar senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-red-400">
                ⚠️ Excluir barbearia
              </h2>
              <button onClick={() => { setShowDeleteModal(false); setDeleteError(""); setDeletePassword(""); }} className="text-2xl text-zinc-500">×</button>
            </div>

            <div className="mb-4 rounded-xl border border-red-500/10 bg-red-950/20 p-4 text-sm text-red-200">
              <p className="font-semibold mb-1">Esta ação é irreversível!</p>
              <p>Todos os dados serão perdidos: serviços, agendamentos, configurações e comprovantes. Sua página pública será desativada permanentemente.</p>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteBarbershop} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Digite sua senha para confirmar
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Sua senha"
                  autoFocus
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-red-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteError(""); setDeletePassword(""); }}
                  className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || !deletePassword}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-bold text-white hover:bg-red-400 disabled:opacity-50"
                >
                  {deleteLoading ? "Excluindo..." : "Excluir permanentemente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💈</span>
            <div>
              <div className="font-bold text-gold-400">{barbershop.name}</div>
              <div className="text-xs text-zinc-500">Painel do barbeiro</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {publicPageEnabled ? (
              <Link href={`/b/${barbershop.slug}`} target="_blank" className="text-sm text-zinc-400 hover:text-gold-400">
                Ver página pública
              </Link>
            ) : (
              <span className="text-sm text-zinc-600">Página pública bloqueada até aprovação</span>
            )}
            <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-red-400">
              Sair
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className={`mb-6 rounded-3xl border p-5 ${statusMeta.classes}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs font-semibold">
                {statusMeta.label}
              </div>
              <h1 className="text-2xl font-bold text-white">
                Taxa única de ativação: {platformConfig.activationFeeLabel}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-200/90">
                Para liberar sua barbearia ao público, faça o PIX para a chave {platformConfig.pixKey} e envie o comprovante.
                A plataforma confere manualmente se o pagamento foi realmente realizado antes de liberar o site.
              </p>
              {barbershop.paymentRejectedReason && (
                <p className="mt-3 text-sm font-medium text-red-200">
                  Motivo da última rejeição: {barbershop.paymentRejectedReason}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleCopyPix}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                {copyPixSuccess ? "PIX copiado!" : "Copiar chave PIX"}
              </button>
              <button
                onClick={() => setActiveTab("ativacao")}
                className="rounded-xl bg-zinc-950/60 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-950"
              >
                Enviar comprovante
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {[
            { key: "ativacao", label: "Ativação" },
            { key: "agenda", label: "Agenda" },
            { key: "barbeiros", label: "Barbeiros" },
            { key: "servicos", label: "Serviços" },
            { key: "galeria", label: "Galeria" },
            { key: "config", label: "Configurações" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-gold-400 text-zinc-950"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "ativacao" && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-2xl font-bold">
                Envio do <span className="text-gold-400">comprovante</span>
              </h2>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-sm text-zinc-500">Valor</div>
                  <div className="mt-2 text-xl font-bold text-gold-400">{platformConfig.activationFeeLabel}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-sm text-zinc-500">Chave PIX</div>
                  <div className="mt-2 break-all text-lg font-bold text-zinc-100">{platformConfig.pixKey}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-sm text-zinc-500">Código obrigatório no PIX</div>
                  <div className="mt-2 break-all text-lg font-bold text-zinc-100">{barbershop.paymentReferenceCode}</div>
                  <p className="mt-2 text-xs text-zinc-500">Coloque esse código na descrição/mensagem do PIX.</p>
                </div>
              </div>

              {paymentError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                  {paymentError}
                </div>
              )}
              {paymentSuccess && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                  {paymentSuccess}
                </div>
              )}

              <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <h3 className="text-xl font-bold text-emerald-300">📱 Envie o comprovante pelo WhatsApp</h3>
                <p className="mt-2 text-sm text-emerald-200/70">
                  Clique no botão abaixo para enviar o comprovante diretamente para o WhatsApp da plataforma.
                  Depois clique em Confirmar Pagamento.
                </p>
                <button
                  type="button"
                  onClick={handleWhatsAppRedirect}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-400 transition"
                >
                  💬 Enviar comprovante pelo WhatsApp
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Observações do pagamento</label>
                  <textarea
                    rows={4}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Ex.: nome de quem pagou, horário do PIX, banco usado..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                </div>
                <button
                  disabled={paymentSaving}
                  className="rounded-xl bg-gold-400 px-6 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:opacity-50"
                >
                  {paymentSaving ? "Confirmando..." : "Confirmar Pagamento"}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="mb-4 text-xl font-bold">Como funciona</h3>
                <ol className="space-y-3 text-sm text-zinc-300">
                  <li>1. Faça o PIX de {platformConfig.activationFeeLabel} para a chave {platformConfig.pixKey}.</li>
                  <li>2. Na descrição do PIX, coloque o código: <b>{barbershop.paymentReferenceCode}</b>.</li>
                  <li>3. Clique em <b>"Enviar comprovante pelo WhatsApp"</b> e envie o print.</li>
                  <li>4. Clique em <b>"Confirmar Pagamento"</b>.</li>
                  <li>5. A plataforma analisa e aprova seu site.</li>
                </ol>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="mb-4 text-xl font-bold">Status atual</h3>
                <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusMeta.classes}`}>
                  {statusMeta.label}
                </div>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div>
                    Cadastrada em: {new Date().toLocaleDateString("pt-BR")}
                  </div>
                  <div>
                    Comprovante: {barbershop.paymentSubmittedAt ? "Enviado" : "Ainda não enviado"}
                  </div>
                  <div>
                    Comprovante enviado em: {barbershop.paymentSubmittedAt ? new Date(barbershop.paymentSubmittedAt).toLocaleString("pt-BR") : "ainda não enviado"}
                  </div>
                  <div>
                    Status: {barbershop.paymentValidationStatus === "manual_review" ? "Aguardando análise" : barbershop.paymentValidationStatus}
                  </div>
                  <div>
                    Aprovado em: {barbershop.paymentApprovedAt ? new Date(barbershop.paymentApprovedAt).toLocaleString("pt-BR") : "ainda não aprovado"}
                  </div>
                </div>
                {barbershop.paymentValidationSummary && (
                  <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                    {barbershop.paymentValidationSummary}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "agenda" && (
          <section>
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-3xl font-bold text-gold-400">{appointments.length}</div>
                <div className="text-sm text-zinc-500">Agendados</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-3xl font-bold text-emerald-400">{timeSlots.length - appointments.length}</div>
                <div className="text-sm text-zinc-500">Disponíveis</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-3xl font-bold text-zinc-200">{timeSlots.length}</div>
                <div className="text-sm text-zinc-500">Slots</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-3xl font-bold text-blue-400">
                  {timeSlots.length > 0 ? Math.round((appointments.length / timeSlots.length) * 100) : 0}%
                </div>
                <div className="text-sm text-zinc-500">Ocupação</div>
              </div>
            </div>

            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {days.map((day) => {
                const { dayName, dayNum, month } = formatDateLabel(day);
                const dateString = toDateString(day);
                const selected = dateString === selectedDate;
                return (
                  <button
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`min-w-[90px] rounded-2xl px-4 py-3 text-center transition ${
                      selected
                        ? "bg-gold-400 text-zinc-950"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="text-xs">{dayName}</div>
                    <div className="text-xl font-bold">{dayNum}</div>
                    <div className="text-xs">{month}</div>
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <h2 className="text-xl font-bold">Agenda do dia {selectedDate}</h2>
                <button onClick={fetchAppointments} className="text-sm text-zinc-400 hover:text-gold-400">
                  Atualizar
                </button>
              </div>
              {appointmentsLoading ? (
                <div className="p-10 text-center text-zinc-500">Carregando...</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {timeSlots.map((slot) => {
                    const appointment = getAppointmentForSlot(slot);
                    return (
                      <div key={slot} className={`flex items-center gap-4 px-5 py-4 ${appointment ? "bg-gold-400/5" : ""}`}>
                        <div className="w-20 font-mono text-lg font-bold text-gold-400">{slot}</div>
                        <div className="flex-1">
                          {appointment ? (
                            <div>
                              <div className="font-semibold">{appointment.clientName}</div>
                              <div className="text-sm text-zinc-400">
                                {appointment.clientPhone} • {appointment.serviceName}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-zinc-600">Horário livre</div>
                          )}
                        </div>
                        {appointment ? (
                          deleteConfirm === appointment.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(appointment.id)}
                              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-red-400 hover:text-red-300"
                            >
                              Cancelar
                            </button>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "barbeiros" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Barbeiros</h2>
              <button onClick={() => openBarberModal()} className="rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">
                + Adicionar barbeiro
              </button>
            </div>

            {barberError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">{barberError}</div>}

            {showBarberModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{editingBarber ? "Editar" : "Novo"} <span className="text-gold-400">barbeiro</span></h2>
                    <button onClick={() => setShowBarberModal(false)} className="text-2xl text-zinc-500">×</button>
                  </div>
                  <form onSubmit={handleBarberSubmit} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Nome do barbeiro</label>
                      <input
                        type="text"
                        value={barberForm.name}
                        onChange={(e) => setBarberForm({ ...barberForm, name: e.target.value })}
                        placeholder="Nome completo"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Foto (opcional, máx 400KB)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 400 * 1024) { setBarberError("Foto muito grande."); return; }
                          const reader = new FileReader();
                          reader.onload = () => setBarberForm({ ...barberForm, photoDataUrl: String(reader.result) });
                          reader.readAsDataURL(file);
                        }}
                        className="block w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-gold-400 file:px-4 file:py-2 file:font-semibold file:text-zinc-950"
                      />
                      {barberForm.photoDataUrl && (
                        <div className="mt-2 flex items-center gap-3">
                          <img src={barberForm.photoDataUrl} alt="Preview" className="h-12 w-12 rounded-full object-cover" />
                          <button type="button" onClick={() => setBarberForm({ ...barberForm, photoDataUrl: "" })} className="text-xs text-red-400">Remover foto</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-zinc-400">Dias de trabalho</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: "0", l: "Dom" },
                          { v: "1", l: "Seg" },
                          { v: "2", l: "Ter" },
                          { v: "3", l: "Qua" },
                          { v: "4", l: "Qui" },
                          { v: "5", l: "Sex" },
                          { v: "6", l: "Sáb" },
                        ].map((d) => {
                          const selected = barberForm.workDays.split(",").includes(d.v);
                          return (
                            <button
                              key={d.v}
                              type="button"
                              onClick={() => {
                                const days = barberForm.workDays.split(",").filter(Boolean);
                                const newDays = selected
                                  ? days.filter((x) => x !== d.v)
                                  : [...days, d.v].sort();
                                setBarberForm({ ...barberForm, workDays: newDays.join(",") || "1,2,3,4,5,6" });
                              }}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                selected
                                  ? "bg-gold-400 text-zinc-950"
                                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                            >
                              {d.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowBarberModal(false)} className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                      <button type="submit" className="flex-1 rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">Salvar</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {barbersList.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
                <div className="mb-4 text-5xl">👤</div>
                <p className="text-zinc-500">Nenhum barbeiro cadastrado.</p>
                <p className="mt-1 text-sm text-zinc-600">Adicione os profissionais da sua barbearia.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {barbersList.map((barber) => (
                  <div key={barber.id} className={`rounded-3xl border p-5 transition ${barber.isActive ? "border-white/5 bg-zinc-900" : "border-red-500/10 bg-zinc-900/40 opacity-60"}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold-400/30 bg-zinc-800">
                        {barber.photoDataUrl ? (
                          <img src={barber.photoDataUrl} alt={barber.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate">{barber.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${barber.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span className="text-xs text-zinc-500">{barber.isActive ? "Ativo" : "Inativo"}</span>
                        </div>
                        <div className="mt-2 flex gap-0.5">
                          {["D","S","T","Q","Q","S","S"].map((l, i) => {
                            const active = barber.workDays.split(",").includes(String(i));
                            return <span key={i} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded ${active ? "text-gold-400 bg-gold-400/10" : "text-zinc-700"}`}>{l}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => openBarberModal(barber)} className="flex-1 rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                        Editar
                      </button>
                      <button onClick={() => handleToggleBarberActive(barber)} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                        {barber.isActive ? "Pausar" : "Ativar"}
                      </button>
                      <button onClick={() => handleDeleteBarber(barber.id)} className="rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30">
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "servicos" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Serviços cadastrados</h2>
              <button onClick={openCreateService} className="rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">
                + Novo serviço
              </button>
            </div>

            <div className="grid gap-4">
              {services.map((service) => (
                <div key={service.id} className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    {service.description && <p className="text-sm text-zinc-500">{service.description}</p>}
                    <div className="mt-2 flex gap-3 text-sm">
                      <span className="font-bold text-gold-400">{formatPrice(service.price)}</span>
                      <span className="text-zinc-500">{service.duration} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditService(service)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800">
                      Editar
                    </button>
                    <button onClick={() => handleDeleteService(service.id)} className="rounded-xl border border-red-500/20 px-4 py-3 text-sm text-red-300 hover:bg-red-950/30">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "galeria" && (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Galeria de fotos</h2>
              <label className="cursor-pointer rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300 transition">
                {galleryUploading ? "Enviando..." : "+ Adicionar foto"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  disabled={galleryUploading}
                  className="hidden"
                />
              </label>
            </div>

            <p className="mb-6 text-sm text-zinc-500">Mostre fotos reais dos seus cortes e do seu espaço. Máximo 400KB por imagem.</p>

            {galleryError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">{galleryError}</div>
            )}

            {galleryPhotos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">
                <div className="mb-4 text-5xl">📸</div>
                <p className="text-zinc-500">Nenhuma foto na galeria ainda.</p>
                <p className="text-sm text-zinc-600 mt-1">Adicione fotos dos seus melhores trabalhos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleryPhotos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 aspect-square">
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption || "Foto da barbearia"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition bg-gradient-to-t from-black/60 via-transparent to-transparent">
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "config" && (
          <section className="max-w-4xl">
            {configError && (
              <div className="mb-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                {configError}
              </div>
            )}
            {configSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                {configSuccess}
              </div>
            )}

            <form onSubmit={handleConfigSubmit} className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xl font-bold text-gold-400">Dados da barbearia</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={configForm.name}
                    onChange={(e) => setConfigForm((current) => ({ ...current, name: e.target.value }))}
                    placeholder="Nome da barbearia"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <input
                    value={configForm.city}
                    onChange={(e) => setConfigForm((current) => ({ ...current, city: e.target.value }))}
                    placeholder="Cidade"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <input
                    value={configForm.address}
                    onChange={(e) => setConfigForm((current) => ({ ...current, address: e.target.value }))}
                    placeholder="Endereço"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400 sm:col-span-2"
                  />
                  <input
                    value={configForm.phone}
                    onChange={(e) => setConfigForm((current) => ({ ...current, phone: e.target.value }))}
                    placeholder="Telefone"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <input
                    value={configForm.whatsapp}
                    onChange={(e) => setConfigForm((current) => ({ ...current, whatsapp: e.target.value }))}
                    placeholder="WhatsApp"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <input
                    value={configForm.instagram}
                    onChange={(e) => setConfigForm((current) => ({ ...current, instagram: e.target.value }))}
                    placeholder="Instagram"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400 sm:col-span-2"
                  />
                  <textarea
                    rows={4}
                    value={configForm.description}
                    onChange={(e) => setConfigForm((current) => ({ ...current, description: e.target.value }))}
                    placeholder="Descrição da barbearia"
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400 sm:col-span-2"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xl font-bold text-gold-400">Funcionamento</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <input
                    type="time"
                    value={configForm.openTime}
                    onChange={(e) => setConfigForm((current) => ({ ...current, openTime: e.target.value }))}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <input
                    type="time"
                    value={configForm.closeTime}
                    onChange={(e) => setConfigForm((current) => ({ ...current, closeTime: e.target.value }))}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <select
                    value={configForm.slotDuration}
                    onChange={(e) => setConfigForm((current) => ({ ...current, slotDuration: e.target.value }))}
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  >
                    <option value="15">Intervalo 15 min</option>
                    <option value="30">Intervalo 30 min</option>
                    <option value="45">Intervalo 45 min</option>
                    <option value="60">Intervalo 60 min</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="mb-4 text-xl font-bold text-gold-400">Segurança</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-800"
                  >
                    Alterar senha
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="rounded-xl border border-red-500/20 px-4 py-3 text-red-400 hover:bg-red-950/30"
                  >
                    🗑️ Excluir barbearia
                  </button>
                </div>
              </div>

              <button
                disabled={configSaving}
                className="rounded-xl bg-gold-400 px-6 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:opacity-50"
              >
                {configSaving ? "Salvando..." : "Salvar configurações"}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
