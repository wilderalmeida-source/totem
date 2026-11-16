"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { allowedSections } from "@/lib/admin-sections";

export default function ConfiguracoesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => { fetch('/api/auth/session', { cache: 'no-store' }).then((response) => response.json()).then((data) => setPermissions(data.permissions ?? [])) }, []);
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="system-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"><LayoutDashboard size={24} /></div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Administração</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">Central de configurações</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Gerencie os serviços e acompanhe o funcionamento do Totem em um só lugar.</p>
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {allowedSections(permissions).filter((section) => section.href !== '/configuracoes').map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <div className="system-icon mb-5 flex h-12 w-12 items-center justify-center rounded-xl"><Icon size={24} /></div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              <p className="mt-5 text-sm font-bold text-blue-600">Abrir configuração →</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
