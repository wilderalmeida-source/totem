"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { ADMIN_AREAS, sectionsOfArea, type AreaComPagina } from "@/lib/admin-sections";

// Central: dois caminhos (Configurações do Totem e Analíticos) e, abaixo, conta e sistema (comuns aos dois).
export default function ConfiguracoesPage() {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).then(d => setPermissions(d.permissions ?? [])).catch(() => setPermissions([]));
  }, []);
  const lista = permissions ?? [];
  const areas = (Object.keys(ADMIN_AREAS) as AreaComPagina[]).map(id => ({ id, ...ADMIN_AREAS[id], secoes: sectionsOfArea(lista, id) }));
  const sistema = sectionsOfArea(lista, "sistema");

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <div className="system-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"><LayoutDashboard size={24} /></div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Administração</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">Central</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Escolha o que deseja fazer: ajustar o funcionamento do Totem ou acompanhar os números da clínica.</p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {areas.map(({ id, href, title, description, icon: Icone, secoes }) => {
            const bloqueada = permissions !== null && !secoes.length;
            const conteudo = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="system-icon flex h-16 w-16 items-center justify-center rounded-2xl"><Icone size={32} /></div>
                  {!bloqueada && <ArrowRight size={24} className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />}
                </div>
                <h2 className="mt-6 text-2xl font-bold text-slate-900 group-hover:text-blue-700">{title}</h2>
                <p className="mt-2 leading-7 text-slate-500">{description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {bloqueada
                    ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Sem acesso</span>
                    : secoes.map(({ href: h, label, icon: Icon }) => (
                      <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"><Icon size={13} />{label}</span>
                    ))}
                </div>
              </>
            );
            return bloqueada
              ? <div key={id} className="rounded-3xl border border-slate-200 bg-white/60 p-8 opacity-70">{conteudo}</div>
              : <Link key={id} href={href} className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">{conteudo}</Link>;
          })}
        </section>

        {sistema.length > 0 && (
          <section className="mt-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Conta e sistema</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sistema.map(({ href, title, description, icon: Icon }) => (
                <Link key={href} href={href} className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="system-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icon size={20} /></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-700">{title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
