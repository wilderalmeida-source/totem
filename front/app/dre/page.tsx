"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, FileSpreadsheet, FileText, History, ListTree, Loader2, Lock,
  Plus, Printer, RefreshCw, RotateCcw, Save, Search, Split, TableProperties, Target, Trash2, TrendingUp, X,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Kpi, Painel, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { formatarReais } from "@/lib/diretoria";
import { FechamentoDre } from "@/components/dre/fechamento";
import { OrcamentoDre } from "@/components/dre/orcamento";
import {
  FORA, SEM_CONTA, analiseHorizontal, analiseVertical, calcularCelula, celulaOrcada, colunasDaVisao, deslocarMes, formatarValor, indicadores, intervaloMeses,
  maioresImpactos, rotuloMes, statusColuna, temOrcamento, totalSemClassificacao, valorLinha,
  type Celula, type Coluna, type ContaDre, type ItemAssociacao, type LinhaEstrutura, type RespostaValores, type Visao,
} from "@/lib/dre";

type ContaEstrutura = ContaDre & { linha: string | null; sugerida: string | null; uso: { titulos: number; valor: number } };
type RespostaEstrutura = {
  estrutura: LinhaEstrutura[]; fora: string; contas: ContaEstrutura[]
  historico: Array<{ em: string; por: string; cdConta: number; conta: string; de: ItemAssociacao[] | null; para: ItemAssociacao[] | null }>
};
type Lancamento = { cdLancamento: number; tipo: string | null; cdConta: number | null; emissao: string; competencia: string; documento: string | null; historico: string | null; fornecedor: string | null; valor: number; parcelas: number; realizado: number };

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const VISOES: Array<[Visao, string]> = [["mensal", "Mensal"], ["trimestral", "Trimestral"], ["anual", "Anual"], ["acumulado", "Acumulado no ano"], ["doze", "Últimos 12 meses"]];

export default function DrePage() {
  const [aba, setAba] = useState<"demonstrativo" | "estrutura" | "fechamento" | "orcamento">("demonstrativo");
  const [estrutura, setEstrutura] = useState<RespostaEstrutura | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [podeFechar, setPodeFechar] = useState(false);
  const [podeAprovar, setPodeAprovar] = useState(false);
  const [erro, setErro] = useState("");

  const carregarEstrutura = useCallback(async () => {
    try {
      const res = await fetch("/api/backend/clinux/dre/estrutura", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar a estrutura.");
      setEstrutura(json);
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível carregar a estrutura."); }
  }, []);

  useEffect(() => {
    void carregarEstrutura();
    fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json())
      .then((s: { permissions?: string[] }) => {
        const tem = (p: string) => Boolean(s.permissions?.includes("*") || s.permissions?.includes(p));
        setPodeEditar(tem("DRE_CONFIG")); setPodeFechar(tem("DRE_FECHAR")); setPodeAprovar(tem("DRE_APROVAR"));
      })
      .catch(() => { setPodeEditar(false); setPodeFechar(false); setPodeAprovar(false); });
  }, [carregarEstrutura]);

  const semClassificar = estrutura?.contas.filter(c => !c.itens.length && c.uso.titulos > 0) ?? [];

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6 pb-20">
        <header className="flex items-center gap-4">
          <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><TableProperties size={28} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">DRE — Demonstração do Resultado</h1>
            <p className="text-sm text-slate-500">Regime de competência, estrutura compatível com o CPC 26. Valores do financeiro do Clinux.</p>
          </div>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Seção">
          {([
            ["demonstrativo", "Demonstrativo", "Mensal, trimestral, anual, acumulada, 12 meses", FileText],
            ["estrutura", "Estrutura e contas", "Contas do Clinux nas linhas da DRE", ListTree],
            ["fechamento", "Fechamento mensal", "Fechar, aprovar, ajustar e conciliar", Lock],
            ["orcamento", "Orçamento", "DRE orçada para comparar com o realizado", Target],
          ] as const).map(([id, nome, desc, Icone]) => (
            <button key={id} onClick={() => setAba(id)} className={`flex items-center gap-3 rounded-3xl border p-4 text-left transition ${aba === id ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${aba === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}><Icone size={20} /></span>
              <span><b className="block text-slate-900">{nome}</b><span className="text-sm text-slate-500">{desc}</span></span>
            </button>
          ))}
        </nav>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {semClassificar.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle size={18} className="shrink-0" />
            <span><b>{semClassificar.length} contas com movimento estão sem classificação</b> e aparecem à parte, fora do resultado.</span>
            {aba !== "estrutura" && <button onClick={() => setAba("estrutura")} className="font-bold text-amber-900 underline">Classificar agora</button>}
          </div>
        )}

        {estrutura && aba === "demonstrativo" && <Demonstrativo estrutura={estrutura.estrutura} />}
        {estrutura && aba === "estrutura" && <EstruturaContas dados={estrutura} podeEditar={podeEditar} onSalvo={carregarEstrutura} />}
        {estrutura && aba === "fechamento" && <FechamentoDre estrutura={estrutura.estrutura} contas={estrutura.contas} podeFechar={podeFechar} podeAprovar={podeAprovar} />}
        {estrutura && aba === "orcamento" && <OrcamentoDre estrutura={estrutura.estrutura} podeEditar={podeEditar} />}
      </div>
    </main>
  );
}

// ======================= Demonstrativo =======================

function Demonstrativo({ estrutura }: { estrutura: LinhaEstrutura[] }) {
  const [visao, setVisao] = useState<Visao>("mensal");
  const [ref, setRef] = useState(mesAtual);
  const [av, setAv] = useState(true);
  const [ah, setAh] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [dados, setDados] = useState<RespostaValores | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [detalhe, setDetalhe] = useState<{ titulo: string; contas: number[]; de: string; ate: string } | null>(null);
  const [centro, setCentro] = useState<number | null>(null);
  const [centros, setCentros] = useState<Array<{ cdCentro: number; centro: string }>>([]);
  const [orcado, setOrcado] = useState(false);
  const [orcamentos, setOrcamentos] = useState<Record<number, Record<string, number[]>>>({});
  const pedido = useRef(0);
  const ano = Number(ref.slice(0, 4));

  useEffect(() => {
    fetch("/api/backend/clinux/dre/centros", { cache: "no-store" }).then(r => r.json()).then(j => setCentros(j.centros ?? [])).catch(() => setCentros([]));
  }, []);
  useEffect(() => {
    if (!orcado) return;
    Promise.all([ano - 2, ano - 1, ano].map(a => fetch(`/api/backend/clinux/dre/orcamento?ano=${a}`, { cache: "no-store" }).then(r => r.json()).then(j => [a, j.valores ?? {}] as const)))
      .then(l => setOrcamentos(Object.fromEntries(l))).catch(() => setOrcamentos({}));
  }, [orcado, ano]);

  // Busca de janeiro de dois anos antes até o mês de referência (cobre todas as visões).
  const carregar = useCallback(async (forcar = false) => {
    const n = ++pedido.current;
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ de: `${ano - 2}-01`, ate: ref, ...(centro !== null ? { centro: String(centro) } : {}), ...(forcar ? { atualizar: "1" } : {}) });
      const res = await fetch(`/api/backend/clinux/dre/valores?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar a DRE.");
      if (n === pedido.current) { setDados(json); setErro(""); }
    } catch (e) {
      if (n === pedido.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar a DRE.");
    } finally {
      if (n === pedido.current) setCarregando(false);
    }
  }, [ano, ref, centro]);
  useEffect(() => { void carregar(); }, [carregar]);

  const colunas = useMemo(() => colunasDaVisao(visao, ref), [visao, ref]);
  const celulas = useMemo(() => (dados ? colunas.map(c => calcularCelula(estrutura, dados, c.meses)) : []), [dados, colunas, estrutura]);
  const orcadas = useMemo(() => (orcado ? colunas.map(c => (temOrcamento(orcamentos, c.meses) ? celulaOrcada(estrutura, orcamentos, c.meses) : null)) : []), [orcado, colunas, orcamentos, estrutura]);
  const orc = (id: string) => (orcado ? orcadas.map(c => (c ? valorLinha(c, id) : null)) : undefined);
  const situacoes = colunas.map(c => (dados?.centro != null ? "aberto" : statusColuna(c.meses, dados?.fechamentos)));
  const nomes = useMemo(() => new Map((dados?.contas ?? []).map(c => [c.cdConta, c.conta])), [dados]);
  const principal = celulas.at(-1) ?? null;
  // Impacto: as duas últimas colunas de período (sem a coluna de total).
  const periodos = colunas.map((c, i) => ({ c, cel: celulas[i] })).filter(x => !x.c.total && x.cel);
  const impactos = periodos.length >= 2 ? maioresImpactos(periodos.at(-2)!.cel, periodos.at(-1)!.cel, nomes) : [];
  const evolucao = useMemo(() => {
    if (!dados) return [];
    return intervaloMeses(deslocarMes(ref, -11), ref).map(m => {
      const c = calcularCelula(estrutura, dados, [m]);
      return { mes: m, rotulo: rotuloMes(m), rb: valorLinha(c, "RB"), rl: valorLinha(c, "RL"), lb: valorLinha(c, "LB"), ebitda: valorLinha(c, "EBITDA"), ll: valorLinha(c, "LL"), custos: -valorLinha(c, "CSP"), despesas: -(valorLinha(c, "DOP") + valorLinha(c, "DA")) };
    });
  }, [dados, ref, estrutura]);

  const alternar = (id: string) => setAbertos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todosIds = estrutura.flatMap(l => (l.tipo === "grupo" ? [l.id, ...l.folhas.map(f => f.id)] : []));
  const ind = principal ? indicadores(principal) : null;
  const semClass = celulas.map(totalSemClassificacao);
  const deAte = { de: colunas[0]?.meses[0] ?? ref, ate: colunas.at(-1)?.meses.at(-1) ?? ref };

  function linhasExportacao() {
    const linhas: Array<{ nivel: number; nome: string; valores: number[]; destaque: boolean }> = [];
    for (const l of estrutura) {
      linhas.push({ nivel: 0, nome: l.nome, valores: celulas.map(c => valorLinha(c, l.id)), destaque: l.tipo === "total" });
      if (l.tipo === "grupo") for (const f of l.folhas) {
        linhas.push({ nivel: 1, nome: f.nome, valores: celulas.map(c => valorLinha(c, f.id)), destaque: false });
        const contas = new Set(celulas.flatMap(c => [...(c.contas.get(f.id)?.keys() ?? [])]));
        for (const k of contas) linhas.push({ nivel: 2, nome: nomes.get(k) ?? `Conta ${k}`, valores: celulas.map(c => c.contas.get(f.id)?.get(k) ?? 0), destaque: false });
      }
    }
    linhas.push({ nivel: 0, nome: "Sem classificação (fora do resultado)", valores: semClass, destaque: false });
    return linhas;
  }

  function exportarExcel() {
    const cab = ["Linha", ...colunas.map(c => c.rotulo), ...(av ? colunas.map(c => `AV % ${c.rotulo}`) : [])];
    const corpo = linhasExportacao().map(l => [`${"  ".repeat(l.nivel)}${l.nome}`, ...l.valores.map(v => v.toFixed(2).replace(".", ",")),
      ...(av ? l.valores.map((v, i) => { const p = analiseVertical(celulas[i], v); return p === null ? "" : String(p).replace(".", ","); }) : [])]);
    const csv = [cab, ...corpo].map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `dre-${visao}-${ref}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportarPdf() {
    const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
    const linhas = linhasExportacao().filter(l => l.nivel < 2);
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DRE ${esc(VISOES.find(v => v[0] === visao)![1])} ${esc(rotuloMes(ref))}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;color:#0f172a;margin:24px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 12px;color:#475569}
      table{border-collapse:collapse;width:100%}th,td{padding:4px 6px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap}
      th:first-child,td:first-child{text-align:left}th{background:#f1f5f9}.t{font-weight:bold;background:#f8fafc}.f td:first-child{padding-left:18px;color:#334155}
      @page{size:landscape;margin:12mm}</style></head><body>
      <h1>DRE — Demonstração do Resultado (${esc(VISOES.find(v => v[0] === visao)![1])})</h1>
      <p>Regime de competência · referência ${esc(rotuloMes(ref))} · resultado provisório · gerado em ${new Date().toLocaleString("pt-BR")}</p>
      <table><thead><tr><th>Linha</th>${colunas.map(c => `<th>${esc(c.rotulo)}</th>`).join("")}</tr></thead><tbody>
      ${linhas.map(l => `<tr class="${l.destaque ? "t" : l.nivel ? "f" : ""}"><td>${esc(l.nome)}</td>${l.valores.map(v => `<td>${formatarValor(v)}</td>`).join("")}</tr>`).join("")}
      </tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  return (
    <div className="space-y-6">
      <AvisoCarregando ativo={carregando} mensagem="Calculando a DRE…" />
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <Alternador valor={visao} onChange={x => setVisao(x as Visao)} opcoes={VISOES} />
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
          Referência <input type="month" value={ref} max={mesAtual()} onChange={e => { if (e.target.value) setRef(e.target.value); }} className="bg-transparent font-bold outline-none" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={av} onChange={e => setAv(e.target.checked)} className="h-4 w-4 accent-blue-600" />Análise vertical</label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={ah} onChange={e => setAh(e.target.checked)} className="h-4 w-4 accent-blue-600" />Análise horizontal</label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={orcado} onChange={e => setOrcado(e.target.checked)} className="h-4 w-4 accent-blue-600" />Orçado × realizado</label>
        <select value={centro ?? ""} onChange={e => setCentro(e.target.value ? Number(e.target.value) : null)} className="h-9 max-w-[260px] rounded-lg border border-slate-200 px-2 text-sm font-semibold text-slate-700" title="Centro de resultado">
          <option value="">Consolidado (todos os centros)</option>
          {centros.map(c => <option key={c.cdCentro} value={c.cdCentro}>{c.centro}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Botao onClick={() => setAbertos(new Set(todosIds))} icone={ChevronsUpDown}>Expandir</Botao>
          <Botao onClick={() => setAbertos(new Set())} icone={ChevronsDownUp}>Recolher</Botao>
          <Botao onClick={exportarExcel} icone={FileSpreadsheet}>Excel</Botao>
          <Botao onClick={exportarPdf} icone={Printer}>PDF</Botao>
          <Botao onClick={() => void carregar(true)} icone={RefreshCw} disabled={carregando}>Atualizar</Botao>
        </div>
      </section>

      {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

      {dados && principal && ind && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <SeloSituacao status={situacoes.at(-1) ?? "aberto"} />
            <span className="text-slate-500">
              {dados.centro != null ? `Centro de resultado: ${centros.find(c => c.cdCentro === dados.centro)?.centro ?? dados.centro} (valores atuais do Clinux, rateio dos títulos). ` : ""}
              Meses fechados usam a fotografia aprovada; os demais são provisórios. Indicadores abaixo: {colunas.at(-1)!.rotulo}.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <Kpi titulo="Receita operacional líquida" valor={formatarReais(valorLinha(principal, "RL"), true)} icone={TrendingUp} variacao={null} detalhe={`bruta ${formatarReais(valorLinha(principal, "RB"), true)}`} destaque={COR.primaria} />
            <Kpi titulo="Margem bruta" valor={fmtP(ind.margemBruta)} icone={TrendingUp} variacao={null} detalhe={`lucro bruto ${formatarReais(valorLinha(principal, "LB"), true)}`} destaque={COR.ok} />
            <Kpi titulo="Margem operacional" valor={fmtP(ind.margemOperacional)} icone={TrendingUp} variacao={null} detalhe={`antes do financeiro ${formatarReais(valorLinha(principal, "EBIT"), true)}`} destaque={COR.secundaria} />
            <Kpi titulo="Margem EBITDA" valor={fmtP(ind.margemEbitda)} icone={TrendingUp} variacao={null} detalhe={`EBITDA ${formatarReais(valorLinha(principal, "EBITDA"), true)}`} destaque={COR.secundaria} />
            <Kpi titulo="Margem líquida" valor={fmtP(ind.margemLiquida)} icone={TrendingUp} variacao={null} detalhe={`resultado ${formatarReais(valorLinha(principal, "LL"), true)}`} destaque={valorLinha(principal, "LL") >= 0 ? COR.ok : COR.critico} />
            <Kpi titulo="Custos e despesas sobre a receita" valor={`${fmtP(ind.pctCustos)} · ${fmtP(ind.pctDespesas)}`} icone={TrendingUp} variacao={null} detalhe="custos · despesas operacionais" destaque={COR.atencao} />
          </div>

          <Painel titulo="Demonstração do Resultado do Exercício" subtitulo="Clique num grupo para ver as linhas e as contas; clique numa conta para ver os lançamentos de origem." icone={FileText}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 360 + colunas.length * 140 }}>
                <thead>
                  <tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                    <th className="sticky left-0 z-10 rounded-l-xl bg-slate-50 px-3 py-2 text-left">Linha</th>
                    {colunas.map((c, i) => (
                      <th key={c.chave} className={`whitespace-nowrap px-3 py-2 ${c.total ? "bg-blue-50 text-blue-800" : "bg-slate-50"}`}>
                        {c.rotulo}<span className="mt-0.5 block normal-case tracking-normal"><SeloSituacao status={situacoes[i]} pequeno /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {estrutura.map(l => {
                    if (l.tipo === "total") return (
                      <LinhaTabela key={l.id} nome={l.nome} valores={celulas.map(c => valorLinha(c, l.id))} celulas={celulas} colunas={colunas} av={av} ah={ah}
                        estilo={l.memo ? "memo" : "total"} orcados={orc(l.id)} />
                    );
                    const aberto = abertos.has(l.id);
                    return (
                      <Fragment key={l.id}>
                        <LinhaTabela nome={l.nome} valores={celulas.map(c => valorLinha(c, l.id))} celulas={celulas} colunas={colunas} av={av} ah={ah} estilo="grupo"
                          aberto={aberto} onClick={() => alternar(l.id)} orcados={orc(l.id)} />
                        {aberto && l.folhas.map(f => {
                          const contas = [...new Set(celulas.flatMap(c => [...(c.contas.get(f.id)?.keys() ?? [])]))];
                          const folhaAberta = abertos.has(f.id);
                          return (
                            <Fragment key={f.id}>
                              <LinhaTabela nome={f.nome} valores={celulas.map(c => valorLinha(c, f.id))} celulas={celulas} colunas={colunas} av={av} ah={ah} estilo="folha" orcados={orc(f.id)}
                                aberto={contas.length ? folhaAberta : undefined} onClick={contas.length ? () => alternar(f.id) : undefined} />
                              {folhaAberta && contas.sort((a, b) => Math.abs(celulas.at(-1)?.contas.get(f.id)?.get(b) ?? 0) - Math.abs(celulas.at(-1)?.contas.get(f.id)?.get(a) ?? 0)).map(k => (
                                <LinhaTabela key={k} nome={nomes.get(k) ?? `Conta ${k}`} valores={celulas.map(c => c.contas.get(f.id)?.get(k) ?? 0)} celulas={celulas} colunas={colunas} av={av} ah={ah} estilo="conta"
                                  onClick={k > 0 ? () => setDetalhe({ titulo: nomes.get(k) ?? `Conta ${k}`, contas: [k], ...deAte }) : undefined} />
                              ))}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {semClass.some(v => v !== 0) && (
                    <LinhaTabela nome="Sem classificação (fora do resultado)" valores={semClass} celulas={celulas} colunas={colunas} av={false} ah={false} estilo="alerta"
                      onClick={() => setDetalhe({ titulo: "Lançamentos sem classificação", contas: [...new Set(celulas.flatMap(c => [...c.semClassificacao.keys()]))], ...deAte })} />
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Receitas positivas e despesas negativas. {av && "AV = % sobre a receita operacional líquida. "}{ah && "AH = variação sobre a coluna anterior. "}
              Empréstimos recebidos e amortizados, imobilizado e ajustes de saldo ficam fora da DRE (veja “Estrutura e contas”).
            </p>
          </Painel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Painel titulo="Evolução em 12 meses" subtitulo="Receitas, lucro bruto, EBITDA e lucro líquido (linhas); custos e despesas (barras)." icone={TrendingUp}>
              <GraficoEvolucao dados={evolucao} />
            </Painel>
            <Painel titulo="Contas que mais impactaram o resultado" subtitulo={periodos.length >= 2 ? `${periodos.at(-1)!.c.rotulo} contra ${periodos.at(-2)!.c.rotulo}.` : "Escolha uma visão com dois ou mais períodos."} icone={TrendingUp}>
              {impactos.length ? (
                <ol className="space-y-2">
                  {impactos.map(i => (
                    <li key={i.cdConta}>
                      <button onClick={() => { if (i.cdConta > 0) setDetalhe({ titulo: i.conta, contas: [i.cdConta], ...deAte }); }} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                        <span className="min-w-0 truncate font-semibold text-slate-700" title={i.conta}>{i.conta}</span>
                        <span className="shrink-0 tabular-nums">
                          <b className={i.impacto >= 0 ? "text-emerald-600" : "text-red-600"}>{i.impacto >= 0 ? "+" : ""}{formatarReais(i.impacto, true)}</b>
                          <span className="ml-2 text-xs text-slate-400">{fmtP(analiseHorizontal(i.depois, i.antes))}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-8 text-center text-sm text-slate-400">Sem diferenças para mostrar.</p>}
            </Painel>
          </div>
        </>
      )}

      {detalhe && <ModalLancamentos {...detalhe} onFechar={() => setDetalhe(null)} />}
    </div>
  );
}

function Botao({ onClick, icone: Icone, children, disabled }: { onClick: () => void; icone: typeof Download; children: ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
      <Icone size={15} className={disabled && Icone === RefreshCw ? "animate-spin" : ""} />{children}
    </button>
  );
}

function LinhaTabela({ nome, valores, celulas, colunas, av, ah, estilo, aberto, onClick, orcados }: {
  nome: string; valores: number[]; celulas: Celula[]; colunas: Coluna[]; av: boolean; ah: boolean
  estilo: "grupo" | "folha" | "conta" | "total" | "memo" | "alerta"; aberto?: boolean; onClick?: () => void; orcados?: Array<number | null>
}) {
  const classe = {
    grupo: "font-bold text-slate-900", folha: "text-slate-700", conta: "text-xs text-slate-500",
    total: "bg-blue-50/60 font-extrabold text-slate-900", memo: "italic text-violet-700", alerta: "font-semibold text-amber-700",
  }[estilo];
  const recuo = estilo === "folha" ? "pl-8" : estilo === "conta" ? "pl-14" : "pl-3";
  return (
    <tr className={`border-b border-slate-100 last:border-0 ${classe} ${onClick ? "cursor-pointer hover:bg-slate-50" : ""}`} onClick={onClick}>
      <td className={`sticky left-0 z-10 bg-white py-2 pr-3 ${recuo} ${estilo === "total" ? "bg-blue-50" : ""}`}>
        <span className="flex items-center gap-1.5">
          {aberto !== undefined && (aberto ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />)}
          <span className="truncate" title={nome}>{nome}</span>
        </span>
      </td>
      {valores.map((v, i) => {
        const pAv = av ? analiseVertical(celulas[i], v) : null;
        const anterior = i > 0 && !colunas[i].total ? valores[i - 1] : null;
        const pAh = ah && anterior !== null ? analiseHorizontal(v, anterior) : null;
        return (
          <td key={colunas[i].chave} className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${colunas[i].total ? "bg-blue-50/40" : ""} ${v < 0 ? "text-red-600" : ""}`}>
            {v === 0 ? <span className="text-slate-300">—</span> : formatarValor(v)}
            {(pAv !== null || pAh !== null) && v !== 0 && (
              <span className="block text-[10px] font-normal text-slate-400">
                {pAv !== null && `${fmtP(pAv)}`}{pAv !== null && pAh !== null && " · "}
                {pAh !== null && <span className={pAh >= 0 === v >= 0 ? "text-emerald-600" : "text-red-500"}>{pAh > 0 ? "+" : ""}{fmtP(pAh)}</span>}
              </span>
            )}
            {orcados && orcados[i] !== null && orcados[i] !== undefined && (orcados[i] !== 0 || v !== 0) && (
              <span className="block text-[10px] font-normal text-slate-500">
                orç. {formatarValor(orcados[i]!)}
                {(() => { const d = analiseHorizontal(v, orcados[i]!); return d === null ? null : <span className={(v - orcados[i]!) >= 0 ? " text-emerald-600" : " text-red-500"}> · {d > 0 ? "+" : ""}{fmtP(d)}</span>; })()}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function GraficoEvolucao({ dados }: { dados: Array<{ rotulo: string; rb: number; rl: number; lb: number; ebitda: number; ll: number; custos: number; despesas: number }> }) {
  if (!dados.some(d => d.rb || d.custos)) return <Vazio altura={300} />;
  const fmt = (v: number) => formatarReais(v, true).replace("R$ ", "");
  return (
    <div className="h-[320px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={fmt} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof dados)[number];
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: "#93c5fd", rotulo: "Receita bruta", valor: formatarReais(p.rb) }, { cor: COR.primaria, rotulo: "Receita líquida", valor: formatarReais(p.rl) },
              { cor: "#cbd5e1", rotulo: "Custos", valor: formatarReais(p.custos) }, { cor: "#fcd34d", rotulo: "Despesas operacionais", valor: formatarReais(p.despesas) },
              { cor: COR.ok, rotulo: "Lucro bruto", valor: formatarReais(p.lb) }, { cor: COR.secundaria, rotulo: "EBITDA", valor: formatarReais(p.ebitda) },
              { cor: p.ll >= 0 ? "#047857" : COR.critico, rotulo: "Lucro líquido", valor: formatarReais(p.ll) },
            ]} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar name="Custos" dataKey="custos" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar name="Despesas" dataKey="despesas" fill="#fcd34d" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Line name="Receita bruta" type="monotone" dataKey="rb" stroke="#93c5fd" strokeWidth={2} dot={false} />
          <Line name="Receita líquida" type="monotone" dataKey="rl" stroke={COR.primaria} strokeWidth={2.5} dot={false} />
          <Line name="Lucro bruto" type="monotone" dataKey="lb" stroke={COR.ok} strokeWidth={2} dot={false} />
          <Line name="EBITDA" type="monotone" dataKey="ebitda" stroke={COR.secundaria} strokeWidth={2} dot={false} />
          <Line name="Lucro líquido" type="monotone" dataKey="ll" stroke="#047857" strokeWidth={3} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ModalLancamentos({ titulo, contas, de, ate, onFechar }: { titulo: string; contas: number[]; de: string; ate: string; onFechar: () => void }) {
  const [lista, setLista] = useState<Lancamento[] | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const qs = new URLSearchParams({ de, ate, contas: contas.map(c => (c === SEM_CONTA ? 0 : c)).join(",") });
    fetch(`/api/backend/clinux/dre/lancamentos?${qs}`, { cache: "no-store" }).then(async r => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível carregar os lançamentos.");
      setLista(j.lancamentos);
    }).catch(e => setErro(e instanceof Error ? e.message : "Erro"));
  }, [contas, de, ate]);
  const TIPO: Record<string, string> = { U: "Atendimento", F: "Fatura", L: "Lançamento", C: "Compra" };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onFechar}>
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div><h3 className="text-lg font-extrabold text-slate-900">{titulo}</h3><p className="text-sm text-slate-500">Lançamentos de origem por competência · {rotuloMes(de)} a {rotuloMes(ate)} · os 500 de maior valor</p></div>
          <button onClick={onFechar} aria-label="Fechar" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="overflow-auto p-5">
          {erro ? <p className="text-sm font-semibold text-red-600">{erro}</p> : !lista ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Carregando…</p>
            : !lista.length ? <p className="text-sm text-slate-400">Nenhum lançamento.</p> : (
              <table className="w-full min-w-[820px] text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="bg-slate-50 px-3 py-2">Título</th><th className="bg-slate-50 px-3 py-2">Competência</th><th className="bg-slate-50 px-3 py-2">Histórico</th>
                  <th className="bg-slate-50 px-3 py-2">Fornecedor/cliente</th><th className="bg-slate-50 px-3 py-2 text-right">Valor</th><th className="bg-slate-50 px-3 py-2 text-right">Realizado</th>
                </tr></thead>
                <tbody>
                  {lista.map(l => (
                    <tr key={l.cdLancamento} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2"><b>{l.cdLancamento}</b><span className="block text-xs text-slate-400">{TIPO[l.tipo ?? ""] ?? l.tipo} · {l.emissao.split("-").reverse().join("/")}{l.documento ? ` · ${l.documento}` : ""}</span></td>
                      <td className="px-3 py-2">{rotuloMes(l.competencia)}</td>
                      <td className="max-w-[300px] truncate px-3 py-2" title={l.historico ?? ""}>{l.historico ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-3 py-2" title={l.fornecedor ?? ""}>{l.fornecedor ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{formatarValor(l.valor)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500">{formatarValor(l.realizado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

// ======================= Estrutura e contas =======================

function EstruturaContas({ dados, podeEditar, onSalvo }: { dados: RespostaEstrutura; podeEditar: boolean; onSalvo: () => Promise<void> }) {
  const [rascunho, setRascunho] = useState<Record<number, ItemAssociacao[] | null>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "sem" | "movimento" | "alteradas">("movimento");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [verHistorico, setVerHistorico] = useState(false);

  const destinos = useMemo(() => [
    ...dados.estrutura.flatMap(l => (l.tipo === "grupo" ? l.folhas.map(f => ({ id: f.id, nome: `${l.nome.replace("(−) ", "")} › ${f.nome}` })) : [])),
    { id: FORA, nome: "Fora da DRE (empréstimos, imobilizado, ajustes)" },
  ], [dados.estrutura]);
  const nomeDestino = (id: string) => destinos.find(d => d.id === id)?.nome ?? id;

  const itensDe = (c: ContaEstrutura): ItemAssociacao[] => {
    if (c.cdConta in rascunho) { const r = rascunho[c.cdConta]; return r ?? (c.sugerida ? [{ folha: c.sugerida, pct: 100 }] : []); }
    return c.itens;
  };
  const alterar = (c: ContaEstrutura, itens: ItemAssociacao[] | null) => setRascunho(r => ({ ...r, [c.cdConta]: itens }));
  const pendentes = Object.keys(rascunho).length;
  const invalidas = dados.contas.filter(c => c.cdConta in rascunho && rascunho[c.cdConta] && Math.abs(rascunho[c.cdConta]!.reduce((s, i) => s + i.pct, 0) - 100) > 0.01);

  const lista = dados.contas.filter(c => {
    const n = `${c.conta} ${c.grupo ?? ""} ${c.linha ?? ""}`.toLowerCase();
    if (busca && !n.includes(busca.toLowerCase())) return false;
    if (filtro === "sem") return !itensDe(c).length;
    if (filtro === "movimento") return c.uso.titulos > 0;
    if (filtro === "alteradas") return c.salvo || c.cdConta in rascunho;
    return true;
  });

  async function salvar() {
    if (invalidas.length) { setMsg(`Ajuste o rateio de ${invalidas.length} conta(s): os percentuais precisam somar 100%.`); return; }
    setSalvando(true); setMsg("");
    try {
      const alteracoes = Object.fromEntries(Object.entries(rascunho).map(([k, v]) => [k, v && v.length ? v : null]));
      const res = await fetch("/api/backend/clinux/dre/estrutura", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alteracoes }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? "Seu usuário não tem a permissão para editar a estrutura da DRE." : j.error ?? "Não foi possível salvar.");
      setRascunho({}); setMsg("Estrutura salva. A DRE já usa a nova associação.");
      await onSalvo();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setSalvando(false); }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm">
          <Search size={16} className="text-slate-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conta, grupo ou linha do Clinux" className="w-full bg-transparent outline-none" />
        </label>
        <Alternador valor={filtro} onChange={x => setFiltro(x as typeof filtro)} opcoes={[["movimento", "Com movimento"], ["sem", "Sem classificação"], ["alteradas", "Alteradas"], ["todas", "Todas"]]} />
        <Botao onClick={() => setVerHistorico(v => !v)} icone={History}>Histórico</Botao>
        {podeEditar && (
          <>
            <Botao onClick={() => setRascunho({})} icone={RotateCcw} disabled={!pendentes}>Descartar</Botao>
            <button onClick={() => void salvar()} disabled={!pendentes || salvando} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Salvar{pendentes ? ` (${pendentes})` : ""}
            </button>
          </>
        )}
      </section>
      {!podeEditar && <p className="text-sm text-slate-500">Somente leitura: alterar a estrutura exige a permissão “DRE — editar estrutura”.</p>}
      {msg && <p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{msg}</p>}

      {verHistorico && (
        <Painel titulo="Histórico de alterações" subtitulo="Associações e rateios usados ao longo do tempo." icone={History}>
          {dados.historico.length ? (
            <ul className="max-h-80 space-y-1.5 overflow-auto text-sm">
              {dados.historico.map((h, i) => (
                <li key={i} className="rounded-xl bg-slate-50 px-3 py-2">
                  <b>{h.conta}</b> <span className="text-slate-400">· {new Date(h.em).toLocaleString("pt-BR")} · {h.por}</span>
                  <span className="block text-xs text-slate-600">
                    {h.de ? h.de.map(i => `${nomeDestino(i.folha)} ${i.pct}%`).join(" + ") : "sugestão automática"} → {h.para ? h.para.map(i => `${nomeDestino(i.folha)} ${i.pct}%`).join(" + ") : "sugestão automática"}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400">Nenhuma alteração registrada.</p>}
        </Painel>
      )}

      <Painel titulo="Associação das contas à DRE" subtitulo={`${lista.length} contas. A classificação do Clinux e o nome sugerem a linha; ajuste e use “Dividir” para ratear uma conta entre linhas (ex.: pessoal operacional × administrativo).`} icone={ListTree}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="rounded-l-xl bg-slate-50 px-3 py-2">Conta do Clinux</th><th className="bg-slate-50 px-3 py-2">Classificação no Clinux</th>
              <th className="bg-slate-50 px-3 py-2 text-right">Movimento (2 anos)</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Linha da DRE</th>
            </tr></thead>
            <tbody>
              {lista.map(c => {
                const itens = itensDe(c);
                const alterada = c.cdConta in rascunho;
                const soma = itens.reduce((s, i) => s + i.pct, 0);
                return (
                  <tr key={c.cdConta} className={`border-b border-slate-100 align-top last:border-0 ${alterada ? "bg-blue-50/40" : ""}`}>
                    <td className="px-3 py-2">
                      <b className="text-slate-900">{c.conta}</b>
                      <span className="block text-xs text-slate-400">código {c.cdConta} · {c.despesa ? "despesa" : "receita"}{c.salvo && !alterada ? " · ajustada manualmente" : !c.salvo && !alterada ? " · sugestão automática" : ""}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.grupo ?? "—"}<span className="block">{c.linha ?? "sem linha de resultado"}</span></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-slate-500">{c.uso.titulos ? `${c.uso.titulos} títulos · ${formatarReais(c.uso.valor, true)}` : "—"}</td>
                    <td className="px-3 py-2">
                      {!itens.length && <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Sem classificação</span>}
                      <div className="space-y-1.5">
                        {(itens.length ? itens : [{ folha: "", pct: 100 }]).map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select disabled={!podeEditar} value={it.folha} onChange={e => {
                              const novo = [...(itens.length ? itens : [{ folha: "", pct: 100 }])]; novo[idx] = { ...it, folha: e.target.value };
                              alterar(c, novo.filter(x => x.folha));
                            }} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm disabled:bg-slate-50">
                              <option value="">— escolher linha —</option>
                              {destinos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            </select>
                            {itens.length > 1 && (
                              <>
                                <input type="number" min={1} max={100} step={0.5} disabled={!podeEditar} value={it.pct}
                                  onChange={e => { const novo = [...itens]; novo[idx] = { ...it, pct: Number(e.target.value) || 0 }; alterar(c, novo); }}
                                  className="h-9 w-20 rounded-lg border border-slate-200 px-2 text-right text-sm" />
                                <span className="text-xs text-slate-400">%</span>
                                {podeEditar && <button onClick={() => alterar(c, itens.filter((_, j) => j !== idx).map((x, _j, arr) => (arr.length === 1 ? { ...x, pct: 100 } : x)))} aria-label="Remover" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      {podeEditar && (
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs font-semibold">
                          {itens.length > 0 && itens.length < 6 && <button onClick={() => alterar(c, itens.length === 1 ? [{ ...itens[0], pct: 50 }, { folha: itens[0].folha === "DOP.PES" ? "CSP.PES" : itens[0].folha, pct: 50 }] : [...itens, { folha: itens[0].folha, pct: 0 }])} className="flex items-center gap-1 text-blue-600 hover:underline">{itens.length === 1 ? <><Split size={13} />Dividir (rateio)</> : <><Plus size={13} />Outra linha</>}</button>}
                          {(c.salvo || alterada) && <button onClick={() => alterar(c, null)} className="flex items-center gap-1 text-slate-500 hover:underline"><RotateCcw size={13} />Voltar à sugestão{c.sugerida ? "" : " (sem sugestão)"}</button>}
                          {itens.length > 1 && Math.abs(soma - 100) > 0.01 && <span className="text-red-600">Soma {soma.toLocaleString("pt-BR")}% — precisa ser 100%</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}

function SeloSituacao({ status, pequeno }: { status: string; pequeno?: boolean }) {
  const [rotulo, cls] = ({
    fechado: ["Fechado", "bg-emerald-100 text-emerald-800"], parcial: ["Parcialmente fechado", "bg-sky-100 text-sky-800"],
    em_aprovacao: ["Em aprovação", "bg-amber-100 text-amber-800"], aberto: ["Provisório", "bg-slate-100 text-slate-600"],
  } as Record<string, [string, string]>)[status] ?? ["Provisório", "bg-slate-100 text-slate-600"];
  return <span className={`inline-block rounded-full font-bold ${cls} ${pequeno ? "px-1.5 py-0 text-[9px]" : "px-3 py-1 text-xs"}`}>{rotulo}</span>;
}
