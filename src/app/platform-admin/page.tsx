"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type BarbershopRow = {
  id: number;
  name: string;
  slug: string;
  email: string;
  city: string | null;
  phone: string | null;
  onboardingStatus: string;
  activationFeeCents: number;
  paymentReferenceCode: string;
  paymentTransactionId: string | null;
  paymentValidationStatus: string;
  paymentValidationScore: number;
  paymentValidationSummary: string | null;
  paymentValidationExtractedText: string | null;
  paymentValidationCheckedAt: string | null;
  paymentReceiptDataUrl: string | null;
  paymentReceiptFileName: string | null;
  paymentReceiptMimeType: string | null;
  paymentReceiptNotes: string | null;
  paymentSubmittedAt: string | null;
  paymentApprovedAt: string | null;
  paymentRejectedAt: string | null;
  paymentRejectedReason: string | null;
  accessReleasedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

function formatStatus(status: string) {
  if (status === "approved") return "Aprovada";
  if (status === "payment_submitted") return "Comprovante enviado";
  if (status === "rejected") return "Rejeitada";
  if (status === "archived") return "Arquivada";
  return "Aguardando pagamento";
}

export default function PlatformAdminPage() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [rows, setRows] = useState<BarbershopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const [platformConfig, setPlatformConfig] = useState({
    pixKey: "",
    activationFeeCents: 0,
    activationFeeLabel: "",
  });

  const [configForm, setConfigForm] = useState({ pixKey: "", activationFeeCents: "" });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState("");
  const [configError, setConfigError] = useState("");
  const [showConfigSection, setShowConfigSection] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("platform_admin_token");
    if (stored) setSavedToken(stored);
  }, []);

  const activeToken = savedToken || token;

  async function loadPlatformConfig() {
    const res = await fetch("/api/platform-config");
    const data = await res.json();
    setPlatformConfig(data);
    setConfigForm({
      pixKey: data.pixKey,
      activationFeeCents: String(data.activationFeeCents),
    });
  }

  async function loadRows(currentToken: string, showArchivedFlag = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform-admin/barbershops?showArchived=${showArchivedFlag ? "1" : "0"}`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("platform_admin_token");
        setSavedToken(null);
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(data.barbershops || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (savedToken) {
      loadRows(savedToken, showArchived);
      loadPlatformConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedToken, showArchived]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/platform-admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error || "Erro ao entrar");
      return;
    }
    localStorage.setItem("platform_admin_token", data.token);
    setSavedToken(data.token);
    setPassword("");
  }

  async function approveBarbershop(id: number) {
    if (!activeToken) return;
    setActionLoadingId(id);
    try {
      await fetch(`/api/platform-admin/barbershops/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      await loadRows(activeToken, showArchived);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function rejectBarbershop(id: number) {
    if (!activeToken) return;
    setActionLoadingId(id);
    try {
      await fetch(`/api/platform-admin/barbershops/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ reason: rejectReason[id] || "" }),
      });
      await loadRows(activeToken, showArchived);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleConfigSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConfigSaving(true);
    setConfigError("");
    setConfigSuccess("");

    try {
      const res = await fetch("/api/platform-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          pixKey: configForm.pixKey,
          activationFeeCents: parseInt(configForm.activationFeeCents, 10),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPlatformConfig(data);
        setConfigSuccess("Configurações salvas com sucesso!");
        setTimeout(() => setConfigSuccess(""), 3000);
      } else {
        setConfigError(data.error || "Erro ao salvar");
      }
    } catch {
      setConfigError("Erro de conexão");
    } finally {
      setConfigSaving(false);
    }
  }

  const pendingCount = useMemo(
    () => rows.filter((row) => row.onboardingStatus === "payment_submitted").length,
    [rows]
  );

  if (!savedToken) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🧾</div>
            <h1 className="text-2xl font-bold">Admin da Plataforma</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Entre para revisar pagamentos e configurar a plataforma.
            </p>
          </div>
          {loginError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">
              {loginError}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do administrador"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
            />
            <button className="w-full rounded-xl bg-gold-400 px-4 py-3 font-bold text-zinc-950 hover:bg-gold-300">
              Entrar
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-zinc-600">
            <Link href="/" className="hover:text-gold-400">← Voltar</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Pagamentos de <span className="text-gold-400">Ativação</span>
            </h1>
            <p className="mt-2 text-zinc-500">
              Taxa única: {platformConfig.activationFeeLabel} • PIX: {platformConfig.pixKey}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowArchived(!showArchived); loadRows(activeToken, !showArchived); }}
              className={`rounded-xl border px-4 py-3 text-sm transition ${showArchived ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
            >
              📁 Arquivados
            </button>
            <button
              onClick={() => setShowConfigSection(!showConfigSection)}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              ⚙️ Configurar Plataforma
            </button>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
              {pendingCount} comprovantes aguardando
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("platform_admin_token");
                setSavedToken(null);
              }}
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Config Section */}
        {showConfigSection && (
          <div className="mb-8 rounded-3xl border border-gold-400/30 bg-zinc-900 p-6">
            <h2 className="mb-4 text-2xl font-bold">
              Configurações da <span className="text-gold-400">Plataforma</span>
            </h2>

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

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    value={configForm.pixKey}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, pixKey: e.target.value })
                    }
                    placeholder="Chave PIX da plataforma"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Chave onde os barbeiros devem fazer o PIX
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Taxa de cadastro único (em centavos)
                  </label>
                  <input
                    type="number"
                    value={configForm.activationFeeCents}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        activationFeeCents: e.target.value,
                      })
                    }
                    min="100"
                    step="100"
                    placeholder="7500 = R$ 75,00"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Em centavos. Ex: 7500 = R$ 75,00 • 10000 = R$ 100,00
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={configSaving}
                  className="rounded-xl bg-gold-400 px-6 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:opacity-50"
                >
                  {configSaving ? "Salvando..." : "Salvar Configurações"}
                </button>
                <p className="text-sm text-zinc-500">
                  Visualização: {platformConfig.activationFeeLabel} • PIX {platformConfig.pixKey}
                </p>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-zinc-500">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            Nenhuma barbearia cadastrada ainda.
          </div>
        ) : (
          <div className="grid gap-6">
            {rows.map((row) => (
              <section key={row.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-2 inline-flex rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-semibold text-gold-300">
                      {formatStatus(row.onboardingStatus)}
                    </div>
                    <h2 className="text-2xl font-bold">{row.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                      <span>📧 {row.email}</span>
                      {row.city && <span>📍 {row.city}</span>}
                      {row.phone && <span>📱 {row.phone}</span>}
                      <span>🔗 /b/{row.slug}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                    <div>Taxa: {platformConfig.activationFeeLabel}</div>
                    <div>PIX: {platformConfig.pixKey}</div>
                    <div>Código esperado: {row.paymentReferenceCode}</div>
                    <div>TxID informado: {row.paymentTransactionId || "não informado"}</div>
                    <div className="mt-1 text-zinc-500">
                      Enviado em: {row.paymentSubmittedAt ? new Date(row.paymentSubmittedAt).toLocaleString("pt-BR") : "ainda não enviado"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <h3 className="mb-3 font-semibold text-zinc-100">Comprovante / observações</h3>
                    {row.paymentReceiptNotes ? (
                      <p className="whitespace-pre-wrap text-sm text-zinc-300">{row.paymentReceiptNotes}</p>
                    ) : (
                      <p className="text-sm text-zinc-500">Nenhuma observação enviada.</p>
                    )}

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
                      <div className="font-semibold text-zinc-100">Validação automática</div>
                      <div className="mt-1">Status: {row.paymentValidationStatus}</div>
                      <div>Score: {row.paymentValidationScore}/100</div>
                      <div className="mt-2 text-zinc-400">
                        {row.paymentValidationSummary || "Nenhum resumo disponível."}
                      </div>
                    </div>

                    {row.paymentValidationExtractedText && (
                      <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                        <summary className="cursor-pointer font-medium text-zinc-200">Texto lido pelo OCR</summary>
                        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs text-zinc-400">{row.paymentValidationExtractedText}</pre>
                      </details>
                    )}

                    {row.paymentRejectedReason && (
                      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-300">
                        Última rejeição: {row.paymentRejectedReason}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <h3 className="mb-3 font-semibold text-zinc-100">Arquivo enviado</h3>
                    {row.paymentReceiptDataUrl ? (
                      <div className="space-y-3">
                        {row.paymentReceiptMimeType?.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.paymentReceiptDataUrl}
                            alt="Comprovante"
                            className="max-h-80 w-full rounded-xl border border-zinc-800 object-contain"
                          />
                        ) : null}
                        <a
                          href={row.paymentReceiptDataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                        >
                          Abrir comprovante {row.paymentReceiptFileName ? `(${row.paymentReceiptFileName})` : ""}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">Nenhum arquivo enviado.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">Motivo da rejeição (opcional)</label>
                    <textarea
                      rows={3}
                      value={rejectReason[row.id] || ""}
                      onChange={(e) =>
                        setRejectReason((current) => ({ ...current, [row.id]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                      placeholder="Ex.: comprovante ilegível, valor divergente, PIX não localizado..."
                    />
                  </div>
                  <button
                    onClick={() => rejectBarbershop(row.id)}
                    disabled={actionLoadingId === row.id}
                    className="rounded-xl border border-red-500/30 bg-red-950/30 px-5 py-3 font-semibold text-red-300 hover:bg-red-950/50 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => approveBarbershop(row.id)}
                    disabled={actionLoadingId === row.id || row.onboardingStatus === "approved"}
                    className="rounded-xl bg-gold-400 px-5 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aprovar e liberar site
                  </button>
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                  {row.onboardingStatus === "approved" && (
                    <button
                      onClick={async () => {
                        if (!activeToken) { alert("Sessão expirada."); return; }
                        if (!confirm("Arquivar esta barbearia? Ela será removida desta lista, mas continuará funcionando no site.")) return;
                        setActionLoadingId(row.id);
                        try {
                          const res = await fetch(`/api/platform-admin/barbershops/${row.id}/archive`, { method: "POST", headers: { Authorization: `Bearer ${activeToken}` } });
                          if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || "Erro ao arquivar"); }
                          else { alert("Arquivada! Removida da lista."); }
                          await loadRows(activeToken, showArchived);
                        } catch { alert("Erro de conexão."); }
                        finally { setActionLoadingId(null); }
                      }}
                      disabled={actionLoadingId === row.id}
                      className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-40 transition"
                    >
                      📁 Arquivar
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!activeToken) { alert("Sessão expirada."); return; }
                      if (!confirm("Resetar o pedido de ativação? A barbearia voltará ao status Aguardando pagamento.")) return;
                      setActionLoadingId(row.id);
                      try {
                        const res = await fetch(`/api/platform-admin/barbershops/${row.id}/reset`, { method: "POST", headers: { Authorization: `Bearer ${activeToken}` } });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) { alert(data.error || "Erro ao resetar"); }
                        else { alert("Resetado! Barbearia voltou ao status inicial."); }
                        await loadRows(activeToken, showArchived);
                      } catch { alert("Erro de conexão."); }
                      finally { setActionLoadingId(null); }
                    }}
                    disabled={actionLoadingId === row.id}
                    className="rounded-lg border border-amber-500/20 bg-amber-950/10 px-3 py-1.5 text-xs font-medium text-amber-400/70 hover:bg-amber-950/30 hover:text-amber-300 disabled:opacity-50 transition"
                  >
                    🔄 Resetar
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
