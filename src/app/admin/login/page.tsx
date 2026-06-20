"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email e senha são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("barber_token", data.token);
        localStorage.setItem("barber_slug", data.barbershop.slug);
        router.push("/admin/dashboard");
      } else {
        setError(data.error || "Email ou senha incorretos");
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-gold-400 transition-colors mb-6">
            ← Voltar
          </Link>
          <div className="text-5xl mb-4">💈</div>
          <h1 className="text-2xl font-bold mb-2">
            Área do <span className="text-gold-400">Barbeiro</span>
          </h1>
          <p className="text-zinc-500">Faça login para acessar seu painel</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/30 rounded-xl text-center">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-400 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-gold-400 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3 bg-gold-400 text-zinc-950 font-bold rounded-xl hover:bg-gold-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Não tem cadastro?{" "}
          <Link href="/register" className="text-gold-400 hover:underline">
            Cadastrar barbearia
          </Link>
        </p>
      </div>
    </main>
  );
}
