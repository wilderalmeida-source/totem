"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, CalendarClock, CalendarRange, CheckCircle2, Clock3, Coins, Download, FileWarning,
  Gauge, Hourglass, ShieldAlert, Waves, Landmark, LineChart, PiggyBank, Receipt, RefreshCw, Scale, TrendingDown, TrendingUp, Wallet, Wallet2,
} from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { COR_ORIGEM, GraficoAtrasos, GraficoEnvelhecimento, GraficoFluxo } from "@/components/dashboard/financeiro-charts";
import { ContasPagar } from "@/components/dashboard/contas-pagar";
import ExamesAuditoria from "@/components/financeiro/ExamesAuditoria";
import { despesasDre, formatarReais, rotuloMes } from "@/lib/diretoria";
import {
  FAIXAS_A_VENCER, FAIXAS_VENCIDAS, ROTULO_FAIXA, ROTULO_TIPO_CONTA, despesasFixas, dso, mesesDoPeriodo, origem, projecao,
  resultado, resumoBancos, resumoFluxo, resumoReceber, resumoRecebidos, serieFluxo, type Origem, type RespostaFinanceiro,
} from "@/lib/financeiro";

export type Aba = "geral" | "receber" | "pagar" | "exames";
const TITULO: Record<Aba, string> = { geral: "Visão geral financeira", receber: "Contas a receber", pagar: "Contas a pagar", exames: "Exames e auditoria" };
const SUBTITULO: Record<Aba, string> = {
  geral: "Saldos, fluxo de caixa, resultado do período, projeção e capital de giro.",
  receber: "Recebíveis por convênio e particular, envelhecimento, inadimplência e prazos.",
  pagar: "Obrigações, fornecedores, categorias, centros de custo, juros, descontos e prazos.",
  exames: "Ticket médio por modalidade e exames com valor fora do padrão para auditoria.",
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function presetPeriodo(id: string): [string, string] {
  const h = new Date();
  if (id === "mes") return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(h)];
  if (id === "anterior") return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))];
  if (id === "trimestre") return [iso(new Date(h.getFullYear(), h.getMonth() - 2, 1)), iso(h)];
  return [iso(new Date(h.getFullYear(), 0, 1)), iso(h)];
}
const PRESETS: Array<[string, string]> = [["mes", "Mês atual"], ["anterior", "Mês anterior"], ["trimestre", "Últimos 3 meses"], ["ano", "Ano"]];

const R = (n: number) => formatarReais(n, true);
const RC = (n: number) => formatarReais(n);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const fmtD = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export default function FinanceiroTela({ aba }: { aba: Aba }) {
  const [preset, setPreset] = useState("mes");
  const [[inicio, fim], setPeriodo] = useState<[string, string]>(() => presetPeriodo("mes"));
  const [dados, setDados] = useState<RespostaFinanceiro | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const pedido = useRef(0);
  // Aba Exames: busca os próprios dados; o Atualizar só avisa a aba.
  const [versaoExames, setVersaoExames] = useState(0);

  const carregar = useCallback(async (forcar = false) => {
    const n = ++pedido.current;
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/financeiro/resumo?${new URLSearchParams({ inicio, fim, ...(forcar ? { atualizar: "1" } : {}) })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      if (n === pedido.current) { setDados(json); setErro(""); }
    } catch (e) {
      if (n === pedido.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      if (n === pedido.current) setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => { if (aba !== "exames") void carregar(); else setCarregando(false); }, [carregar, aba]);

  const v = useMemo(() => (dados ? calcularTudo(dados) : null), [dados]);

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando o financeiro…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><Wallet size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos · Financeiro</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{TITULO[aba]}</h1>
              <p className="text-sm text-slate-500">{SUBTITULO[aba]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && aba !== "exames" && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => (aba === "exames" ? setVersaoExames(n => n + 1) : void carregar(true))} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Telas do financeiro">
          {([["geral", "/financeiro", "Visão geral", Gauge], ["fluxo", "/financeiro/fluxo", "Fluxo de caixa", Waves], ["receber", "/financeiro/receber", "Contas a receber", Banknote], ["pagar", "/financeiro/pagar", "Contas a pagar", Receipt], ["exames", "/financeiro/exames", "Exames e auditoria", ShieldAlert]] as const).map(([id, href, nome, Icone]) => (
            <Link key={id} href={href} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${aba === id ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <Icone size={16} />{nome}
            </Link>
          ))}
        </nav>

        <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1">
            {PRESETS.map(([id, rotulo]) => (
              <button key={id} onClick={() => { setPreset(id); setPeriodo(presetPeriodo(id)); }}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${preset === id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>{rotulo}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
            <CalendarRange size={16} className="text-slate-400" />
            <input type="date" value={inicio} max={fim} onChange={e => { setPreset("custom"); if (e.target.value) setPeriodo([e.target.value, fim]); }} className="bg-transparent outline-none" />
            <span className="text-slate-400">até</span>
            <input type="date" value={fim} min={inicio} onChange={e => { setPreset("custom"); if (e.target.value) setPeriodo([inicio, e.target.value]); }} className="bg-transparent outline-none" />
          </label>
          <span className="text-xs text-slate-400">Saldos em aberto e vencimentos são sempre de hoje; os demais números seguem o período.</span>
        </section>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {aba === "exames" ? <ExamesAuditoria inicio={inicio} fim={fim} versao={versaoExames} /> : dados && v && (aba === "geral" ? <VisaoGeral dados={dados} v={v} /> : aba === "receber" ? <ContasReceber dados={dados} v={v} /> : <ContasPagar dados={dados} />)}
      </div>
    </main>
  );
}

type Calculos = ReturnType<typeof calcularTudo>;

function calcularTudo(dados: RespostaFinanceiro) {
  const bancos = resumoBancos(dados.bancos);
  const fluxo = resumoFluxo(dados.fluxo);
  const dre = resultado(dados);
  const fixas = despesasFixas(dados, mesesDoPeriodo(dados.periodo.inicio, dados.periodo.fim));
  const rec = resumoReceber(dados);
  const recebidos = resumoRecebidos(dados);
  const proj = projecao(bancos.disponivelFinal, rec.receberFaixas, rec.pagarFaixas);
  const serie = serieFluxo(dados.fluxo, dados.periodo.inicio, dados.periodo.fim, bancos.saldoInicial);
  const atrasos = [...new Set(dados.atrasosMensais.map(a => a.mes))].sort().map(mes => {
    const p = { mes, rotulo: rotuloMes(mes), convenio: 0, particular: 0, outros: 0 };
    for (const a of dados.atrasosMensais) if (a.mes === mes) p[origem(a.tipo)] += a.valor;
    return p;
  });
  return { bancos, fluxo, dre, fixas, rec, recebidos, proj, serie, atrasos };
}

function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold tracking-tight text-slate-900">{titulo}</h2>{acao}</div>
      {children}
    </section>
  );
}

// ---------------- Visão geral ----------------

function VisaoGeral({ dados, v }: { dados: RespostaFinanceiro; v: Calculos }) {
  const { bancos: b, fluxo: f, dre, rec } = v;
  const variacaoSaldo = b.saldoFinal - b.saldoInicial;
  const ncg = rec.receberTotal - (rec.receberFaixas.v181 ?? 0) - rec.pagarOperacionalTotal;
  const comprometimento = pct(v.fixas, dre.receitaLiquida);
  const [agrupar, setAgrupar] = useState<"conta" | "banco">("conta");

  return (
    <div className="space-y-8">
      <Secao titulo="Saldos e caixa do período">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Saldo inicial" valor={R(b.saldoInicial)} icone={Wallet2} variacao={null} detalhe={`em ${dados.periodo.inicio.split("-").reverse().join("/")}`} destaque={COR.texto} />
          <Kpi titulo="Saldo final" valor={R(b.saldoFinal)} icone={Wallet} variacao={null} detalhe={`${variacaoSaldo >= 0 ? "+" : ""}${R(variacaoSaldo)} no período`} destaque={b.saldoFinal >= 0 ? COR.ok : COR.critico} />
          <Kpi titulo="Aplicações financeiras" valor={R(b.aplicacoes)} icone={PiggyBank} variacao={null} detalhe="saldo no fim do período" destaque={COR.secundaria} />
          <Kpi titulo="Fluxo de caixa líquido" valor={R(f.liquido)} icone={Scale} variacao={null} detalhe={`previsto ${R(f.liquidoPrevisto)}`} destaque={f.liquido >= 0 ? COR.ok : COR.critico} />
          <Kpi titulo="Entradas realizadas" valor={R(f.entradasRealizadas)} icone={ArrowDownCircle} variacao={null} detalhe={`previstas ${R(f.entradasPrevistas)} · ${fmtP(pct(f.entradasRealizadas, f.entradasPrevistas))} realizado`} destaque={COR.ok} />
          <Kpi titulo="Saídas realizadas" valor={R(f.saidasRealizadas)} icone={ArrowUpCircle} variacao={null} detalhe={`previstas ${R(f.saidasPrevistas)} · ${fmtP(pct(f.saidasRealizadas, f.saidasPrevistas))} realizado`} destaque={COR.critico} />
          <Kpi titulo="Obrigações vencidas" valor={R(rec.pagarVencidos)} icone={FileWarning} variacao={null} detalhe="contas a pagar vencidas e não pagas, hoje" destaque={COR.critico} />
          <Kpi titulo="Valores a receber vencidos" valor={R(rec.receberVencidos)} icone={AlertTriangle} variacao={null} detalhe="contas a receber vencidas, hoje" destaque={COR.atencao} />
        </div>
      </Secao>

      <Painel titulo="Fluxo de caixa" subtitulo="Entradas e saídas realizadas (cheias) e previstas pelo vencimento (claras), com o saldo acumulado das contas. Sem transferências entre contas." icone={LineChart}>
        <GraficoFluxo dados={v.serie} />
      </Painel>

      <Secao titulo="Resultado do período (competência)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Kpi titulo="Receita líquida" valor={R(dre.receitaLiquida)} icone={Coins} variacao={null} detalhe={`bruta ${R(dre.receitaBruta)}`} destaque={COR.primaria} />
          <Kpi titulo="Total de custos" valor={R(dre.custos)} icone={Receipt} variacao={null} detalhe={`${fmtP(pct(dre.custos, dre.receitaLiquida))} da receita`} destaque={COR.atencao} />
          <Kpi titulo="Total de despesas" valor={R(dre.despesasOperacionais)} icone={Receipt} variacao={null} detalhe={`${fmtP(pct(dre.despesasOperacionais, dre.receitaLiquida))} da receita`} destaque={COR.atencao} />
          <Kpi titulo="Resultado operacional" valor={R(dre.resultadoOperacional)} icone={Gauge} variacao={null} detalhe={`margem ${fmtP(pct(dre.resultadoOperacional, dre.receitaLiquida))}`} destaque={dre.resultadoOperacional >= 0 ? COR.ok : COR.critico} />
          <Kpi titulo="Resultado financeiro" valor={R(dre.receitasFinanceiras - dre.despesasFinanceiras)} icone={Landmark} variacao={null} detalhe={`receitas ${R(dre.receitasFinanceiras)} · despesas ${R(dre.despesasFinanceiras)}`} destaque={COR.secundaria} />
          <Kpi titulo={dre.lucroLiquido >= 0 ? "Lucro do período" : "Prejuízo do período"} valor={R(dre.lucroLiquido)} icone={dre.lucroLiquido >= 0 ? TrendingUp : TrendingDown} variacao={null}
            detalhe={`margem ${fmtP(pct(dre.lucroLiquido, dre.receitaLiquida))} · despesas totais ${R(despesasDre(dre))}`} destaque={dre.lucroLiquido >= 0 ? COR.ok : COR.critico} />
        </div>
      </Secao>

      <Secao titulo="Projeção e capital de giro">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Saldo projetado em 30 dias" valor={R(v.proj.d30)} icone={CalendarClock} variacao={null} detalhe={`60 d: ${R(v.proj.d60)} · 90 d: ${R(v.proj.d90)}`} destaque={v.proj.d30 >= 0 ? COR.ok : COR.critico} />
          <Kpi titulo="Necessidade de capital de giro" valor={R(ncg)} icone={Scale} variacao={null} detalhe="a receber − a pagar operacional (sem estoque)" destaque={COR.secundaria} />
          <Kpi titulo="Receita comprometida com despesas fixas" valor={fmtP(comprometimento)} icone={Gauge} variacao={null} detalhe={`${R(v.fixas)} de despesas fixas no período`} destaque={comprometimento !== null && comprometimento > 70 ? COR.critico : comprometimento !== null && comprometimento > 50 ? COR.atencao : COR.ok} />
          <Kpi titulo="Saldo disponível hoje" valor={R(b.disponivelFinal)} icone={Wallet} variacao={null} detalhe="contas correntes, caixa, aplicações e cartões" destaque={COR.ok} />
        </div>
      </Secao>

      <Painel titulo="Saldo por conta e por banco" subtitulo="Saldo inicial e final do período, entradas, saídas e transferências entre contas." icone={Landmark}
        acao={<Alternador valor={agrupar} onChange={x => setAgrupar(x as "conta" | "banco")} opcoes={[["conta", "Por conta"], ["banco", "Por banco"]]} />}>
        {agrupar === "banco" ? (
          <RankingBarras itens={b.porInstituicao.map(i => ({ chave: i.instituicao, nome: i.instituicao, valor: i.saldoFinal, detalhe: `início ${R(i.saldoInicial)} · ${i.contas} conta(s)` }))} formatar={RC} limite={20} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                  <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Conta</th><th className="bg-slate-50 px-3 py-2 text-left">Tipo</th>
                  <th className="bg-slate-50 px-3 py-2">Saldo inicial</th><th className="bg-slate-50 px-3 py-2">Entradas</th><th className="bg-slate-50 px-3 py-2">Saídas</th>
                  <th className="bg-slate-50 px-3 py-2">Transferências</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {b.contas.filter(c => c.saldoInicial || c.saldoFinal || c.entradas || c.saidas).sort((x, y) => y.saldoFinal - x.saldoFinal).map(c => (
                  <tr key={c.cdBanco} className={`border-b border-slate-100 last:border-0 ${c.tipo === "ajuste" ? "text-slate-400" : "text-slate-700"}`}>
                    <td className="px-3 py-2 font-semibold">{c.banco}</td>
                    <td className="px-3 py-2 text-xs">{ROTULO_TIPO_CONTA[c.tipo]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{RC(c.saldoInicial)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{c.entradas ? RC(c.entradas) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-600">{c.saidas ? RC(c.saidas) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{c.transfEntrada || c.transfSaida ? RC(c.transfEntrada - c.transfSaida) : "—"}</td>
                    <td className={`px-3 py-2 text-right font-bold tabular-nums ${c.saldoFinal < 0 ? "text-red-600" : "text-slate-900"}`}>{RC(c.saldoFinal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {b.ajustes !== 0 && <p className="mt-2 text-xs text-slate-400">Contas de ajuste/transitórias ({RC(b.ajustes)}) aparecem em cinza e não entram nos saldos consolidados.</p>}
          </div>
        )}
      </Painel>
    </div>
  );
}

// ---------------- Contas a receber ----------------

function ContasReceber({ dados, v }: { dados: RespostaFinanceiro; v: Calculos }) {
  const { rec, recebidos: r } = v;
  const nome = (k: number | null) => (k === null ? "Sem convênio" : dados.nomes.fornecedores[k] ?? `Código ${k}`);
  const aVencer = FAIXAS_A_VENCER.reduce((s, f) => s + (rec.receberFaixas[f] ?? 0), 0);
  const inadimplencia = pct(rec.receberVencidos, rec.receberTotal);
  const indice = dso(rec.receberTotal, dados.receita90);
  const porOrigem = Object.fromEntries(rec.porOrigem.map(o => [o.origem, o])) as Record<Origem, (typeof rec.porOrigem)[number]>;
  const [visao, setVisao] = useState<"vencimento" | "competencia">("vencimento");

  function exportar() {
    const faixas = [...FAIXAS_A_VENCER, ...FAIXAS_VENCIDAS];
    const cab = ["Convênio", ...faixas.map(f => ROTULO_FAIXA[f]), "Vencido", "Total"];
    const corpo = rec.porConvenio.map(c => [nome(c.cdFornecedor), ...faixas.map(f => (c.faixas[f] ?? 0).toFixed(2).replace(".", ",")), c.vencidos.toFixed(2).replace(".", ","), c.total.toFixed(2).replace(".", ",")]);
    const csv = [cab, ...corpo].map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "envelhecimento-por-convenio.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <Secao titulo="Posição de hoje">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Total de títulos a receber" valor={R(rec.receberTotal)} icone={Banknote} variacao={null} detalhe={`${R(aVencer)} a vencer · ${R(rec.receberVencidos)} vencidos`} destaque={COR.primaria} />
          <Kpi titulo="A receber de convênios" valor={R(porOrigem.convenio?.total ?? 0)} icone={Receipt} variacao={null} detalhe={`${R(porOrigem.convenio?.vencidos ?? 0)} vencidos`} destaque={COR_ORIGEM.convenio} />
          <Kpi titulo="A receber de particulares" valor={R(porOrigem.particular?.total ?? 0)} icone={Wallet} variacao={null} detalhe={`${R(porOrigem.particular?.vencidos ?? 0)} vencidos`} destaque={COR_ORIGEM.particular} />
          <Kpi titulo="Outros a receber" valor={R(porOrigem.outros?.total ?? 0)} icone={Coins} variacao={null} detalhe={`${R(porOrigem.outros?.vencidos ?? 0)} vencidos`} destaque={COR_ORIGEM.outros} />
          <Kpi titulo="Inadimplência" valor={fmtP(inadimplencia)} icone={AlertTriangle} variacao={null} detalhe="vencido ÷ total a receber" destaque={inadimplencia !== null && inadimplencia > 10 ? COR.critico : COR.atencao} />
          <Kpi titulo="DSO (prazo médio de recebíveis)" valor={fmtD(indice)} icone={Hourglass} variacao={null} detalhe="a receber ÷ receita média diária (90 dias)" destaque={COR.secundaria} />
          <Kpi titulo="Previsão de recebimentos" valor={R(rec.receberFaixas.a30 ?? 0)} icone={CalendarClock} variacao={null} detalhe={`30 dias · 31–60: ${R(rec.receberFaixas.a60 ?? 0)} · 61–90: ${R(rec.receberFaixas.a90 ?? 0)}`} destaque={COR.ok} />
          <Kpi titulo="Em conciliação" valor={R(dados.naoConciliado.valor)} icone={Clock3} variacao={null} detalhe={`${fmtN(dados.naoConciliado.parcelas)} recebimentos dos últimos 90 dias sem conciliar`} destaque={COR.atencao} />
        </div>
      </Secao>

      <Secao titulo="Recebimentos do período">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Recebido no período" valor={R(r.recebido)} icone={CheckCircle2} variacao={null} detalhe={`${fmtN(r.parcelas)} parcelas · ${fmtN(r.integral)} integrais`} destaque={COR.ok} />
          <Kpi titulo="Recebido dentro do prazo" valor={fmtP(r.percentualNoPrazo)} icone={Gauge} variacao={null} detalhe={`${R(r.noPrazo)} até o vencimento`} destaque={COR.ok} />
          <Kpi titulo="Prazo médio de recebimento" valor={fmtD(r.prazoMedio)} icone={Hourglass} variacao={null} detalhe={`da emissão ao recebimento · atraso médio ${fmtD(r.atrasoMedio)}`} destaque={COR.secundaria} />
          <Kpi titulo="Recuperação de inadimplência" valor={R(r.atrasado)} icone={TrendingUp} variacao={null} detalhe="recebido depois do vencimento" destaque={COR.primaria} />
          <Kpi titulo="Recebimentos antecipados" valor={R(r.antecipado)} icone={ArrowDownCircle} variacao={null} detalhe="recebido antes do vencimento" destaque={COR.ok} />
          <Kpi titulo="Parcialmente recebidos" valor={fmtN(r.parciais)} icone={FileWarning} variacao={null} detalhe={`${R(r.parcialValor)} a menos que o previsto (sem taxa de cartão)`} destaque={COR.atencao} />
          <Kpi titulo="Baixados por perda" valor={R(r.perda)} icone={TrendingDown} variacao={null} detalhe="perda informada na baixa" destaque={COR.critico} />
          <Kpi titulo="Negociação e cobrança" valor="—" icone={Scale} variacao={null} detalhe="não registrados no Clinux (sem boletos/remessas)" destaque="#94a3b8" />
        </div>
      </Secao>

      <Painel titulo="Envelhecimento dos recebíveis" subtitulo="Valores em aberto por faixa de vencimento, hoje." icone={CalendarRange}>
        <GraficoEnvelhecimento porOrigem={rec.porOrigem} />
      </Painel>

      <Painel titulo="Envelhecimento por convênio" subtitulo="Faturas e lançamentos em aberto por cliente (particulares ficam fora)." icone={Receipt}
        acao={<button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><Download size={15} />CSV</button>}>
        {rec.porConvenio.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                  <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Convênio</th>
                  <th className="bg-slate-50 px-3 py-2">A vencer</th>
                  {FAIXAS_VENCIDAS.map(f => <th key={f} className="bg-slate-50 px-3 py-2">{ROTULO_FAIXA[f].replace("Vencidos ", "")}</th>)}
                  <th className="rounded-r-xl bg-slate-50 px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {rec.porConvenio.slice(0, 25).map(c => (
                  <tr key={String(c.cdFornecedor)} className="border-b border-slate-100 last:border-0 text-slate-700">
                    <td className="max-w-[260px] truncate px-3 py-2 font-semibold" title={nome(c.cdFornecedor)}>{nome(c.cdFornecedor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{R(FAIXAS_A_VENCER.reduce((s, f) => s + (c.faixas[f] ?? 0), 0))}</td>
                    {FAIXAS_VENCIDAS.map(f => <td key={f} className={`px-3 py-2 text-right tabular-nums ${c.faixas[f] ? "font-semibold text-red-600" : "text-slate-300"}`}>{c.faixas[f] ? R(c.faixas[f]) : "—"}</td>)}
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">{R(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-8 text-center text-sm text-slate-400">Nenhum título de convênio em aberto.</p>}
      </Painel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Painel titulo="Evolução mensal dos atrasos" subtitulo="Valor vencido e não recebido no fim de cada mês (vencidos há até 1 ano)." icone={TrendingDown}>
          <GraficoAtrasos dados={v.atrasos} />
        </Painel>
        <Painel titulo="Atraso médio por convênio" subtitulo="Dias depois do vencimento, ponderados pelo valor recebido no período." icone={Clock3}>
          <RankingBarras itens={r.porConvenio.filter(c => c.atrasoMedio > 0).map(c => ({ chave: String(c.cdFornecedor), nome: nome(c.cdFornecedor), valor: c.atrasoMedio, detalhe: `prazo médio ${fmtD(c.prazoMedio)} · ${R(c.recebido)}` }))}
            formatar={fmtD} cor={COR.atencao} vazio="Nenhum convênio pagou com atraso no período." />
        </Painel>
      </div>

      <Painel titulo={visao === "vencimento" ? "A receber por mês de vencimento" : "A receber por competência"} subtitulo="Títulos em aberto hoje." icone={CalendarRange}
        acao={<Alternador valor={visao} onChange={x => setVisao(x as "vencimento" | "competencia")} opcoes={[["vencimento", "Vencimento"], ["competencia", "Competência"]]} />}>
        <GraficoMensal dados={(visao === "vencimento" ? rec.porVencimento : rec.porCompetencia).map(p => ({ ...p, rotulo: rotuloMes(p.mes) }))} cor={COR.primaria} rotulo="A receber" />
      </Painel>

      <p className="text-xs text-slate-400">
        Recebíveis por unidade: o Clinux tem uma só unidade cadastrada. Títulos de particulares (U) ficam agrupados como “particulares” e não aparecem por paciente.
        {(rec.receberFaixas.v181 ?? 0) > 0 && ` ${RC(rec.receberFaixas.v181 ?? 0)} estão vencidos há mais de 180 dias: confira se não são títulos já recebidos e não baixados.`}
      </p>
    </div>
  );
}
