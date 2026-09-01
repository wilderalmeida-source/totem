"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BellRing,
  BookOpenText,
  Gauge,
  LayoutDashboard,
  MapPin,
  MonitorCog,
  SlidersHorizontal,
  UsersRound,
  ScrollText,
  UserCog,
  KeyRound,
  Clock3,
  ImagePlay,
} from "lucide-react";

const sections = [
  { href: "/configuracao-atrasos", title: "Atrasos", description: "Defina a tolerância e o horário usado para destacar exames atrasados.", icon: Clock3, color: "bg-red-600", permission: 'PAINEIS' },
  { href: "/midias", title: "Mídias e playlists", description: "Envie imagens e vídeos e organize a sequência exibida nos painéis.", icon: ImagePlay, color: "bg-fuchsia-600", permission: 'PAINEIS' },
  { href: "/atencao", title: "Aviso de atenção", description: "Configure e reproduza o aviso sonoro da recepção.", icon: BellRing, color: "bg-amber-500", permission: 'ATENCAO' },
  { href: "/configuracao", title: "Voz e áudio", description: "Escolha vozes, velocidade, volume e regras automáticas.", icon: SlidersHorizontal, color: "bg-violet-600", permission: 'VOZ' },
  { href: "/dic", title: "Dicionário", description: "Ajuste a pronúncia de nomes e termos usados nas chamadas.", icon: BookOpenText, color: "bg-emerald-600", permission: 'DICIONARIO' },
  { href: "/guiche", title: "Guichês", description: "Cadastre e organize os pontos de atendimento.", icon: UsersRound, color: "bg-cyan-600", permission: 'GUICHES' },
  { href: "/recepcao", title: "Recepções", description: "Associe modalidades às recepções e localizações.", icon: MapPin, color: "bg-rose-600", permission: 'RECEPCOES' },
  { href: "/setup-painel", title: "Painéis", description: "Distribua serviços e modalidades entre os painéis.", icon: MonitorCog, color: "bg-blue-600", permission: 'PAINEIS' },
  { href: "/status", title: "Status e consumo", description: "Acompanhe a voz ativa, uso diário e histórico.", icon: Gauge, color: "bg-slate-700", permission: 'STATUS' },
  { href: "/logs", title: "Logs do sistema", description: "Consulte a jornada do totem e ações administrativas.", icon: ScrollText, color: "bg-orange-600", permission: 'LOGS' },
  { href: "/usuarios", title: "Usuários", description: "Cadastre e gerencie o acesso administrativo.", icon: UserCog, color: "bg-indigo-600", permission: 'USUARIOS' },
  { href: "/alterar-senha", title: "Minha senha", description: "Troque com segurança a senha da sua conta.", icon: KeyRound, color: "bg-teal-600", permission: null },
];

export default function ConfiguracoesPage() {
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => { fetch('/api/auth/session', { cache: 'no-store' }).then((response) => response.json()).then((data) => setPermissions(data.permissions ?? [])) }, []);
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><LayoutDashboard size={24} /></div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Administração</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-slate-950">Central de configurações</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Gerencie os serviços e acompanhe o funcionamento do Totem em um só lugar.</p>
          </div>
        </header>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.filter((section) => !section.permission || permissions.includes('*') || permissions.includes(section.permission)).map(({ href, title, description, icon: Icon, color }) => (
            <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-white ${color}`}><Icon size={24} /></div>
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
