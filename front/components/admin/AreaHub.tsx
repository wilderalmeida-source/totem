"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import {
  ADMIN_AREAS, CATEGORIAS_ANALITICOS, ORDEM_CATEGORIAS, sectionsOfArea, sectionsOfCategoria, type AreaComPagina, type CategoriaAnalitico,
} from "@/lib/admin-sections";

// Página de entrada de uma área (Totem ou Analíticos) ou de uma categoria dos Analíticos.
// Analíticos: primeiro as categorias (Recepção, Direção, Financeiro); dentro de cada uma, um botão por dashboard.
export default function AreaHub({ area, categoria }: { area: AreaComPagina; categoria?: CategoriaAnalitico }) {
  const [permissions, setPermissions] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).then(d => setPermissions(d.permissions ?? [])).catch(() => setPermissions([]));
  }, []);
  const info = categoria ? CATEGORIAS_ANALITICOS[categoria] : ADMIN_AREAS[area];
  const Icone = info.icon;
  const inicioAnaliticos = area === "analiticos" && !categoria;
  const secoes = !permissions ? [] : categoria ? sectionsOfCategoria(permissions, categoria) : area === "analiticos" ? [] : sectionsOfArea(permissions, area);
  const categorias = permissions && inicioAnaliticos ? ORDEM_CATEGORIAS.map(id => ({ id, ...CATEGORIAS_ANALITICOS[id], telas: sectionsOfCategoria(permissions, id) })).filter(c => c.telas.length) : [];
  const configuracoes = permissions && area === "analiticos" ? sectionsOfCategoria(permissions, "config") : [];
  const vazio = permissions && (inicioAnaliticos ? !categorias.length : !secoes.length);

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href={categoria ? ADMIN_AREAS.analiticos.href : "/configuracoes"} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-700">
          <ArrowLeft size={16} />{categoria ? "Analíticos" : "Central"}
        </Link>
        <header className="mb-10">
          <div className="system-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"><Icone size={24} /></div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">{categoria ? "Analíticos" : "Administração"}</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">{info.title}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{info.description}</p>
        </header>

        {vazio && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Seu usuário não tem acesso a nenhuma tela desta área.</p>}

        {inicioAnaliticos && (
          <section className="grid gap-5 md:grid-cols-3">
            {categorias.map(c => {
              const Ic = c.icon;
              return (
                <Link key={c.id} href={c.href} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="system-icon mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"><Ic size={28} /></div>
                  <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-700">{c.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{c.description}</p>
                  <p className="mt-4 text-xs font-semibold text-slate-400">{c.telas.map(t => t.label).join(" · ")}</p>
                  <p className="mt-5 text-sm font-bold text-blue-600">{c.telas.length} {c.telas.length === 1 ? "dashboard" : "dashboards"} →</p>
                </Link>
              );
            })}
          </section>
        )}

        {!inicioAnaliticos && (
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
        )}

        {configuracoes.length > 0 && (inicioAnaliticos || categoria === "recepcao" || categoria === "direcao") && (
          <div className="mt-8 flex flex-wrap gap-3">
            {configuracoes.map(({ href, title }) => (
              <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700">
                <SlidersHorizontal size={16} />{title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
