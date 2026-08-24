"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, BookOpenText, Gauge, KeyRound, LayoutDashboard, LogOut, MapPin, Menu, MonitorCog, ScrollText, SlidersHorizontal, UserCog, UsersRound, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

const sections = [
  { href: "/configuracoes", label: "Central", icon: LayoutDashboard, permission: null },
  { href: "/atencao", label: "Aviso de atenção", icon: BellRing, permission: 'ATENCAO' },
  { href: "/configuracao", label: "Voz e áudio", icon: SlidersHorizontal, permission: 'VOZ' },
  { href: "/dic", label: "Dicionário", icon: BookOpenText, permission: 'DICIONARIO' },
  { href: "/guiche", label: "Guichês", icon: UsersRound, permission: 'GUICHES' },
  { href: "/recepcao", label: "Recepções", icon: MapPin, permission: 'RECEPCOES' },
  { href: "/setup-painel", label: "Painéis", icon: MonitorCog, permission: 'PAINEIS' },
  { href: "/status", label: "Status", icon: Gauge, permission: 'STATUS' },
  { href: "/logs", label: "Logs", icon: ScrollText, permission: 'LOGS' },
  { href: "/usuarios", label: "Usuários", icon: UserCog, permission: 'USUARIOS' },
  { href: "/alterar-senha", label: "Minha senha", icon: KeyRound, permission: null },
];

const adminPaths = new Set(sections.map((section) => section.href));

export default function AdminRouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => {
    if (!adminPaths.has(pathname)) return
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setPermissions(data.permissions ?? []))
      .catch(() => setPermissions([]))
  }, [pathname]);
  if (!adminPaths.has(pathname)) return children;
  const current = sections.find((section) => section.href === pathname);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-8">
          <Link href="/configuracoes" className="flex items-center gap-3 font-bold text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white"><LayoutDashboard size={21} /></span>
            <span className="hidden sm:block">Administração do Totem</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 md:block">{current?.label}</span>
            <form action="/api/auth/logout" method="post"><button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><LogOut size={17} /><span className="hidden sm:inline">Sair</span></button></form>
            <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white lg:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${menuOpen ? "fixed inset-x-4 top-20 z-40 flex shadow-2xl" : "hidden"} max-h-[calc(100vh-6rem)] flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:p-4 lg:shadow-none`}>
          <p className="mb-3 px-3 pt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Configurações</p>
          <nav className="space-y-1">{sections.filter((section) => !section.permission || permissions.includes('*') || permissions.includes(section.permission)).map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><Icon size={19} />{label}</Link> })}</nav>
        </aside>
        <div className="admin-page-content min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
