"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { ADMIN_AREAS, ADMIN_SECTIONS, areaOfPath, sectionsOfArea, type AdminSection, type AreaComPagina } from "@/lib/admin-sections";
import { ReactNode, useEffect, useState } from "react";

const adminPaths = new Set(ADMIN_SECTIONS.map((section) => section.href));
const AREAS = Object.keys(ADMIN_AREAS) as AreaComPagina[];
const CHAVE_AREA = "admin-area";
const CHAVE_MENU = "admin-menu-oculto";

// O menu lateral mostra só a área em que o usuário está (Totem ou Analíticos). Na Central e nas páginas de
// conta/sistema, que não pertencem a nenhuma, continua a última área visitada.
function lerAreaSalva(): AreaComPagina | null {
  try { const v = sessionStorage.getItem(CHAVE_AREA); return v === "totem" || v === "analiticos" ? v : null; } catch { return null; }
}

function ItemMenu({ section, active, label, onClick }: { section: AdminSection; active: boolean; label?: string; onClick: () => void }) {
  const Icon = section.icon;
  return (
    <Link href={section.href} onClick={onClick} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
      <Icon size={18} className="shrink-0" />{label ?? section.label}
    </Link>
  );
}

export default function AdminRouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [areaSalva, setAreaSalva] = useState<AreaComPagina | null>(null);
  // Menu lateral oculto (telas grandes): lembrado neste navegador. Mais espaço para os dashboards.
  const [menuOculto, setMenuOculto] = useState(false);
  useEffect(() => { try { setMenuOculto(localStorage.getItem(CHAVE_MENU) === "1"); } catch { /* sem armazenamento */ } }, []);
  const alternarMenu = () => setMenuOculto(v => {
    try { localStorage.setItem(CHAVE_MENU, v ? "0" : "1"); } catch { /* sem armazenamento */ }
    return !v;
  });
  const areaDaPagina = areaOfPath(pathname);

  useEffect(() => {
    if (!adminPaths.has(pathname)) return
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setPermissions(data.permissions ?? []))
      .catch(() => setPermissions([]))
  }, [pathname]);

  useEffect(() => {
    if (areaDaPagina) {
      try { sessionStorage.setItem(CHAVE_AREA, areaDaPagina); } catch { /* sem armazenamento: só não lembra */ }
      setAreaSalva(areaDaPagina);
    } else setAreaSalva(lerAreaSalva());
  }, [areaDaPagina]);

  if (!adminPaths.has(pathname)) return children;

  const disponiveis = AREAS.filter((id) => sectionsOfArea(permissions, id).length > 0);
  const area: AreaComPagina = areaDaPagina ?? (areaSalva && disponiveis.includes(areaSalva) ? areaSalva : disponiveis[0] ?? "totem");
  const infoArea = ADMIN_AREAS[area];
  const itensArea = sectionsOfArea(permissions, area);
  const sistema = sectionsOfArea(permissions, "sistema");
  const central = ADMIN_SECTIONS.find((s) => s.href === "/configuracoes")!;
  const visaoGeral = ADMIN_SECTIONS.find((s) => s.href === infoArea.href)!;
  const hub = AREAS.find((id) => ADMIN_AREAS[id].href === pathname);
  const rotuloAtual = hub ? ADMIN_AREAS[hub].title : ADMIN_SECTIONS.find((s) => s.href === pathname)?.label;
  const fechar = () => setMenuOpen(false);

  return (
    <div className="system-theme admin-theme min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-8">
          <button type="button" onClick={alternarMenu} aria-label={menuOculto ? "Mostrar menu lateral" : "Ocultar menu lateral"} title={menuOculto ? "Mostrar menu lateral" : "Ocultar menu lateral"}
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 lg:flex">
            {menuOculto ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <Link href="/configuracoes" className="flex items-center gap-3 font-bold text-slate-950">
            <span className="system-icon flex h-10 w-10 items-center justify-center rounded-xl"><LayoutDashboard size={21} /></span>
            <span className="hidden sm:block">Administração</span>
          </Link>
          {areaDaPagina && (
            <Link href={infoArea.href} className="hidden items-center gap-2 border-l border-slate-200 pl-4 text-sm font-semibold text-slate-500 transition hover:text-blue-700 sm:flex">
              <infoArea.icon size={17} />{infoArea.title}
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 md:block">{rotuloAtual}</span>
            <form action="/api/auth/logout" method="post"><button className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"><LogOut size={17} /><span className="hidden sm:inline">Sair</span></button></form>
            <button type="button" aria-label="Abrir menu" onClick={() => setMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white lg:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${menuOpen ? "fixed inset-x-4 top-20 z-40 flex shadow-2xl" : "hidden"} max-h-[calc(100vh-6rem)] flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-16 ${menuOculto ? "lg:hidden" : "lg:flex"} lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:p-4 lg:shadow-none`}>
          <ItemMenu section={central} active={pathname === "/configuracoes"} onClick={fechar} />

          {disponiveis.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Área">
              {disponiveis.map((id) => {
                const { href, label, icon: Icon } = ADMIN_AREAS[id];
                const ativa = id === area;
                return (
                  <Link key={id} href={href} onClick={fechar} role="tab" aria-selected={ativa}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition ${ativa ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                    <Icon size={15} />{label}
                  </Link>
                );
              })}
            </div>
          )}

          {itensArea.length > 0 && (
            <>
              <p className="mb-2 mt-5 px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{infoArea.title}</p>
              <nav className="space-y-1">
                <ItemMenu section={{ ...visaoGeral, icon: LayoutGrid }} active={pathname === infoArea.href} onClick={fechar} />
                {itensArea.map((section) => <ItemMenu key={section.href} section={section} active={pathname === section.href} onClick={fechar} />)}
              </nav>
            </>
          )}

          {sistema.length > 0 && (
            <div className="mt-auto pt-6">
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Conta e sistema</p>
              <nav className="space-y-1">{sistema.map((section) => <ItemMenu key={section.href} section={section} active={pathname === section.href} onClick={fechar} />)}</nav>
            </div>
          )}
        </aside>
        <div className="admin-page-content min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
