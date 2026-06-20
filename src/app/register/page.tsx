"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [feeLabel, setFeeLabel] = useState("R$ 75,00");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    city: "",
  });

  useEffect(() => {
    fetch("/api/platform-config")
      .then((res) => res.json())
      .then((data) => {
        setPixKey(data.pixKey);
        setFeeLabel(data.activationFeeLabel);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password) {
      setError("Nome, email e senha são obrigatórios");
      return;
    }
    if (form.password.length < 4) {
      setError("A senha deve ter no mínimo 4 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/barbershops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          city: form.city,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("barber_token", data.token);
        localStorage.setItem("barber_slug", data.barbershop.slug);
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Erro ao criar barbearia");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-gold-400/20 bg-gradient-to-br from-gold-400/10 to-transparent p-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-zinc-400 hover:text-gold-400">
            ← Voltar
          </Link>
          <div className="mb-5 text-5xl">💈</div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Cadastre sua <span className="text-gold-400">barbearia</span>
          </h1>
          <p className="mt-4 max-w-xl text-zinc-400">
            Crie sua conta, configure seus serviços e depois faça o pagamento único para liberar sua página pública.
          </p>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <div className="text-sm text-zinc-500">Taxa única de ativação</div>
              <div className="mt-2 text-3xl font-bold text-gold-400">{feeLabel}</div>
              <p className="mt-2 text-sm text-zinc-400">Depois de aprovada, você não paga essa taxa novamente.</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <div className="text-sm text-zinc-500">PIX para pagamento</div>
              <div className="mt-2 break-all text-xl font-bold text-zinc-100">{pixKey || "..."}</div>
              <p className="mt-2 text-sm text-zinc-400">
                Após se cadastrar, o comprovante deverá ser enviado no painel do barbeiro para conferência automática.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h2 className="font-semibold text-zinc-100">Como funciona</h2>
              <ol className="mt-3 space-y-2 text-sm text-zinc-400">
                <li>1. Você cria sua conta.</li>
                <li>2. Entra no painel e configura sua barbearia.</li>
                <li>3. Faz o PIX de {feeLabel} para a chave informada.</li>
                <li>4. Envia o comprovante com o código único e TxID.</li>
                <li>5. O sistema valida automaticamente por OCR.</li>
                <li>6. A plataforma confirma e libera seu site.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">Criar conta</h2>
            <p className="mt-2 text-zinc-500">Comece agora e envie o comprovante depois.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-900/30 p-4 text-center text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Nome da Barbearia *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Barbearia do João"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Senha *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mín. 4 caracteres"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Confirmar *</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Cidade</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Sua cidade"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus:border-gold-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gold-400 px-8 py-3 font-bold text-zinc-950 hover:bg-gold-300 disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar barbearia"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Já tem cadastro?{" "}
            <Link href="/admin/login" className="text-gold-400 hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
