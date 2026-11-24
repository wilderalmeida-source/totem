"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, CalendarRange, FileSearch, FileSpreadsheet, FileStack, FileWarning, Gauge, KeyRound, Layers, Receipt, RefreshCw, ScanSearch, ShieldAlert, X } from "lucide-react";
import { Alternador } from "@/components/dashboard/laudos-charts";

// Filtros comuns das telas de Faturamento, lembrados entre as telas (sessão do navegador).
export type Preset = "hoje" | "ontem" | "7d" | "30d" | "mes" | "anterior" | "trimestre" | "ano" | "custom";
export type FiltrosFat = { preset: Preset; inicio: string; fim: string; base: "realizacao" | "envio"; convenio?: number; modalidade?: number; procedimento?: number };
type Opcao = { id: number; nome: string };

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function periodoPreset(p: Preset): [string, string] {
  const h = new Date(), d = (n: number) => { const x = new Date(h); x.setDate(x.getDate() + n); return iso(x); };
  switch (p) {
    case "hoje": return [iso(h), iso(h)];
    case "ontem": return [d(-1), d(-1)];
    case "7d": return [d(-6), iso(h)];
    case "30d": return [d(-29), iso(h)];
    case "anterior": return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))];
    case "trimestre": return [iso(new Date(h.getFullYear(), Math.floor(h.getMonth() / 3) * 3, 1)), iso(h)];
    case "ano": return [`${h.getFullYear()}-01-01`, iso(h)];
    default: return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(h)];
  }
}
const PRESETS: Array<[Preset, string]> = [["hoje", "Hoje"], ["ontem", "Ontem"], ["7d", "7 dias"], ["30d", "30 dias"], ["mes", "Mês atual"], ["anterior", "Mês anterior"], ["trimestre", "Trimestre"], ["ano", "Ano"]];
const CHAVE = "faturamento-filtros";

export function useFiltrosFaturamento(padrao: Preset = "mes") {
  const [f, setF] = useState<FiltrosFat>(() => { const [inicio, fim] = periodoPreset(padrao); return { preset: padrao, inicio, fim, base: "realizacao" }; });
  useEffect(() => {
    try {
      const salvo = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") as FiltrosFat | null;
      if (salvo?.inicio) setF(salvo.preset !== "custom" ? { ...salvo, ...(([inicio, fim]) => ({ inicio, fim }))(periodoPreset(salvo.preset)) } : salvo);
    } catch { /* sem armazenamento */ }
  }, []);
  const atualizar = (novo: FiltrosFat) => { setF(novo); try { sessionStorage.setItem(CHAVE, JSON.stringify(novo)); } catch { /* sem armazenamento */ } };
  return [f, atualizar] as const;
}

export const parametros = (f: FiltrosFat, extra: Record<string, string> = {}) => new URLSearchParams({
  inicio: f.inicio, fim: f.fim, base: f.base,
  ...(f.convenio ? { convenio: String(f.convenio) } : {}), ...(f.modalidade ? { modalidade: String(f.modalidade) } : {}), ...(f.procedimento ? { procedimento: String(f.procedimento) } : {}),
  ...extra,
});

let opcoesCache: { convenios: Opcao[]; modalidades: Opcao[]; procedimentos: Opcao[] } | null = null;

export function BarraFiltros({ f, setF, comBase = true }: { f: FiltrosFat; setF: (f: FiltrosFat) => void; comBase?: boolean }) {
  const [opcoes, setOpcoes] = useState(opcoesCache);
  useEffect(() => {
    if (opcoesCache) return;
    fetch("/api/backend/clinux/faturamento/opcoes", { cache: "no-store" }).then(r => r.json()).then(j => { if (j.convenios) { opcoesCache = j; setOpcoes(j); } }).catch(() => undefined);
  }, []);
  const sel = (rotulo: string, campo: "convenio" | "modalidade" | "procedimento", lista: Opcao[] = []) => (
    <select value={f[campo] ?? ""} onChange={e => setF({ ...f, [campo]: e.target.value ? Number(e.target.value) : undefined })} className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700" title={rotulo}>
      <option value="">{rotulo}: todos</option>
      {lista.map(o => <option key={o.id} value={o.id}>{campo === "procedimento" ? `${o.id} · ${o.nome}` : o.nome}</option>)}
    </select>
  );
  const ativos = [f.convenio, f.modalidade, f.procedimento].filter(Boolean).length;
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1">
          {PRESETS.map(([id, rotulo]) => (
            <button key={id} onClick={() => { const [inicio, fim] = periodoPreset(id); setF({ ...f, preset: id, inicio, fim }); }}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${f.preset === id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>{rotulo}</button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
          <CalendarRange size={16} className="text-slate-400" />
          <input type="date" value={f.inicio} max={f.fim} onChange={e => { if (e.target.value) setF({ ...f, preset: "custom", inicio: e.target.value }); }} className="bg-transparent outline-none" />
          <span className="text-slate-400">até</span>
          <input type="date" value={f.fim} min={f.inicio} onChange={e => { if (e.target.value) setF({ ...f, preset: "custom", fim: e.target.value }); }} className="bg-transparent outline-none" />
        </label>
        {comBase && <Alternador valor={f.base} onChange={x => setF({ ...f, base: x as FiltrosFat["base"] })} opcoes={[["realizacao", "Data de realização"], ["envio", "Data de envio (fatura)"]]} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {sel("Convênio", "convenio", opcoes?.convenios)}
        {sel("Modalidade", "modalidade", opcoes?.modalidades)}
        {sel("Procedimento", "procedimento", opcoes?.procedimentos)}
        {ativos > 0 && <button onClick={() => setF({ ...f, convenio: undefined, modalidade: undefined, procedimento: undefined })} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-red-600"><X size={14} />Limpar filtros</button>}
        <span className="ml-auto text-xs text-slate-400">Unidade: o Clinux tem uma só unidade cadastrada.</span>
      </div>
    </section>
  );
}

const TELAS = [
  ["/faturamento", "Visão geral", FileSpreadsheet],
  ["/faturamento/producao", "Produção de exames", Activity],
  ["/faturamento/pendencias", "Produção pendente", FileWarning],
  ["/faturamento/convenios", "Por convênio", Receipt],
  ["/faturamento/modalidades", "Modalidades e procedimentos", Layers],
  ["/faturamento/lotes", "Lotes (faturas)", FileStack],
  ["/faturamento/glosas", "Glosas e recursos", ShieldAlert],
  ["/faturamento/guias", "Guias e autorizações", KeyRound],
  ["/faturamento/demonstrativos", "Demonstrativos", FileSearch],
  ["/faturamento/produtividade", "Produtividade", Gauge],
  ["/faturamento/auditoria", "Auditoria", ScanSearch],
] as const;

export function CabecalhoFaturamento({ atual, titulo, descricao, atualizadoEm, carregando, onAtualizar, icone: Icone }: {
  atual: string; titulo: string; descricao: string; atualizadoEm?: string; carregando: boolean; onAtualizar: () => void; icone: typeof Activity
}) {
  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><Icone size={28} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos · Faturamento</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{titulo}</h1>
            <p className="text-sm text-slate-500">{descricao}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {atualizadoEm && <span>Atualizado às {new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <button onClick={onAtualizar} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
          </button>
        </div>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Telas do faturamento">
        {TELAS.map(([href, nome, Ic]) => (
          <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${href === atual ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}><Ic size={16} />{nome}</Link>
        ))}
      </nav>
    </>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold tracking-tight text-slate-900">{titulo}</h2>{acao}</div>
      {children}
    </section>
  );
}

/** Carrega o resumo do faturamento com os filtros (descarta respostas antigas). */
export function useResumo<T>(url: string, f: FiltrosFat, extra: Record<string, string> = {}) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [forcar, setForcar] = useState(0);
  const chave = parametros(f, extra).toString();
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    const qs = new URLSearchParams(chave);
    if (forcar) qs.set("atualizar", "1");
    fetch(`${url}?${qs}`, { cache: "no-store" }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível carregar os dados.");
      if (vivo) { setDados(j); setErro(""); }
    }).catch(e => { if (vivo) setErro(e instanceof Error ? e.message : "Erro"); }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [url, chave, forcar]);
  return { dados, carregando, erro, atualizar: () => setForcar(n => n + 1) };
}
