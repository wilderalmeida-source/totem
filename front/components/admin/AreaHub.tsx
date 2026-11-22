"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ADMIN_AREAS, sectionsOfArea, type AreaComPagina } from "@/lib/admin-sections";

// Página de entrada de uma área (Totem ou Analíticos): os cartões das telas que o usuário pode abrir.
export default function AreaHub({ area }: { area: AreaComPagina }) {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).then(d => setPermissions(d.permissions ?? [])).catch(() => setPermissions([]));
  }, []);
  const info = ADMIN_AREAS[area];
  const Icone = info.icon;
  const secoes = permissions ? sectionsOfArea(permissions, area) : [];

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/configuracoes" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700"><ArrowLeft size={16} />Central</Link>
        <header className="mb-10">
          <div className="system-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"><Icone size={24} /></div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Administração</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{info.title}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{info.description}</p>
        </header>

        {permissions && !secoes.length && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Seu usuário não tem acesso a nenhuma tela desta área.</p>
        )}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {secoes.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <div className="system-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl"><Icon size={24} /></div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              <p className="mt-5 text-sm font-bold text-blue-600">{area === "analiticos" ? "Abrir análise →" : "Abrir configuração →"}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
