"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Barbershop {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  instagram: string | null;
}

export default function HomePage() {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feeLabel, setFeeLabel] = useState("R$ 75,00");

  useEffect(() => {
    fetch("/api/platform-config")
      .then((r) => r.json())
      .then((d) => setFeeLabel(d.activationFeeLabel))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/barbershops");
        const data = await res.json();
        setBarbershops(data.barbershops || []);
      } catch { /* */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = barbershops.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* NAVBAR */}
      <nav className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-lg font-black text-zinc-950">
              <img src="/images/logo-barbershop.jpg" alt="Barber Shop" className="h-8 w-8 rounded-md object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Barber <span className="text-gold-400">Shop</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="rounded-full px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
              Sou barbeiro
            </Link>
            <Link href="/register" className="rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-gold-300">
              Cadastrar
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-32">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/5 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-xs font-medium text-gold-400 uppercase tracking-widest">
                Plataforma para barbearias
              </span>
            </div>

            <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-7xl">
              O melhor corte<br />
              <span className="text-gold-400">começa aqui</span>
            </h1>
            <p className="mb-10 max-w-xl text-lg leading-relaxed text-zinc-300">
              Encontre barbearias verificadas, veja fotos reais dos trabalhos e agende seu horário em segundos. Profissional, rápido e sem complicação.
            </p>

            <div className="flex flex-wrap gap-4">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Busque por nome ou cidade..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-5 text-white placeholder:text-zinc-500 outline-none transition focus:border-gold-400/50 focus:bg-white/[0.07]"
                />
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <Link
                href="#lista"
                className="inline-flex items-center gap-2 rounded-2xl bg-gold-400 px-6 py-4 font-bold text-zinc-950 transition hover:bg-gold-300"
              >
                Ver barbearias
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="text-xl">💈</span>
                <span>+{barbershops.length || 0} barbearias</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span>Verificadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span>Agendamento rápido</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-white/5 bg-zinc-900/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">Como funciona</span>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Agende em <span className="text-gold-400">3 passos</span>
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                num: "01",
                title: "Escolha a barbearia",
                desc: "Navegue pelas barbearias verificadas, veja fotos, serviços e preços de cada uma.",
              },
              {
                num: "02",
                title: "Selecione o horário",
                desc: "Escolha o dia, o serviço e o horário que melhor se encaixa na sua rotina.",
              },
              {
                num: "03",
                title: "Pronto, só chegar",
                desc: "Agendamento confirmado na hora. É só comparecer no dia e horário marcados.",
              },
            ].map((step) => (
              <div key={step.num} className="group rounded-3xl border border-white/5 bg-zinc-900/80 p-8 transition hover:border-gold-400/20">
                <div className="mb-6 text-5xl font-black text-gold-400/20 group-hover:text-gold-400/40 transition">
                  {step.num}
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
                <p className="leading-relaxed text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACTION SHOT */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto">
            <img
              src="/images/barber-action.jpg"
              alt="Barbeiro profissional cortando cabelo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center bg-zinc-900 px-8 py-16 md:px-16">
            <div className="max-w-lg">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                Qualidade garantida
              </span>
              <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
                Profissionais <span className="text-gold-400">verificados</span>
              </h2>
              <p className="mb-8 leading-relaxed text-zinc-400">
                Cada barbearia passa por uma verificação antes de aparecer na plataforma. Isso garante que você sempre encontre profissionais de verdade, com serviços de qualidade e ambiente adequado.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {["Profissionais reais", "Preços transparentes", "Agenda online 24h", "Fotos dos trabalhos"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <svg className="h-5 w-5 flex-shrink-0 text-gold-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BARBERSHOPS LIST */}
      <section id="lista" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
                Barbearias
              </span>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Escolha a <span className="text-gold-400">sua</span>
              </h2>
            </div>
            {!loading && filtered.length > 0 && (
              <span className="text-sm text-zinc-500">{filtered.length} barbearia{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gold-400 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-zinc-900/50 py-20 text-center">
              <div className="mb-4 text-5xl">💈</div>
              <h3 className="mb-2 text-xl font-bold text-white">
                {search ? "Nenhuma barbearia encontrada" : "Nenhuma barbearia ainda"}
              </h3>
              <p className="mb-6 text-zinc-500">
                {search ? "Tente buscar por outro nome ou cidade." : "Seja o primeiro barbeiro a cadastrar sua barbearia."}
              </p>
              {!search && (
                <Link href="/register" className="inline-flex rounded-2xl bg-gold-400 px-6 py-3 font-bold text-zinc-950 hover:bg-gold-300">
                  Cadastrar barbearia
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((barbershop) => (
                <Link
                  key={barbershop.id}
                  href={`/b/${barbershop.slug}`}
                  className="group overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/60 transition hover:border-gold-400/20 hover:bg-zinc-900"
                >
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold-400/5 to-transparent">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-400/10 text-4xl">
                      💈
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="mb-1 text-lg font-bold text-white group-hover:text-gold-400 transition-colors">
                      {barbershop.name}
                    </h3>
                    {barbershop.city && (
                      <p className="mb-3 flex items-center gap-1.5 text-sm text-zinc-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {barbershop.city}
                      </p>
                    )}
                    {barbershop.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
                        {barbershop.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4">
                      <span className="text-sm font-medium text-gold-400 transition group-hover:translate-x-1">
                        Ver barbearia →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA FOR BARBERS */}
      <section className="border-t border-white/5 bg-zinc-900/50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            É barbeiro?
          </span>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            Cadastre sua <span className="text-gold-400">barbearia</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Mostre seus trabalhos, defina seus preços, receba agendamentos online 24h por dia. Taxa única de {feeLabel} para liberar sua página.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-3 rounded-2xl bg-gold-400 px-8 py-4 text-lg font-bold text-zinc-950 transition hover:bg-gold-300"
          >
            Cadastrar agora
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-sm md:flex-row">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg">
              <img src="/images/logo-barbershop.jpg" alt="Barber Shop" className="h-6 w-6 rounded object-contain" />
            </div>
            <span className="font-bold tracking-tight text-white">
              Barber <span className="text-gold-400">Shop</span>
            </span>
          </Link>
          <div className="flex gap-6 text-zinc-500">
            <Link href="/admin/login" className="hover:text-zinc-300 transition">Sou barbeiro</Link>
            <Link href="/register" className="hover:text-zinc-300 transition">Cadastrar</Link>
            <Link href="/platform-admin" className="hover:text-zinc-300 transition">Admin</Link>
          </div>
          <p className="text-zinc-600">
            © {new Date().getFullYear()} Barber Shop. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
