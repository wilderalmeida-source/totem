"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, CalendarClock, CalendarRange, Gauge, Landmark, LineChart as IconeLinha, Plus, Receipt,
  RefreshCw, Scale, ShieldCheck, Target, Trash2, Wallet, Wallet2, Waves, ShieldAlert } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Kpi, Painel, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoFluxo } from "@/components/dashboard/financeiro-charts";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { ROTULO_TIPO_CONTA, resumoBancos } from "@/lib/financeiro";
import {
  CENARIOS, HORIZONTES, alertaCaixa, confiabilidade, historicoAgrupado, mediaMensal, projetar, resumoHorizontes, somarDias, totaisHistorico,
  type CategoriaFluxo, type Escala, type Premissas, type RespostaFluxo,
} from "@/lib/fluxo";

const R = (n: number) => formatarReais(n, true);
const RC = (n: number) => formatarReais(n);
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const ESCALAS: Array<[Escala, string]> = [["dia", "Diário"], ["semana", "Semanal"], ["mes", "Mensal"], ["ano", "Anual"]];

function periodoDaEscala(e: Escala): [string, string] {
  const h = hojeIso(), d = new Date();
  if (e === "dia") return [`${h.slice(0, 7)}-01`, h];
  if (e === "semana") return [new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().slice(0, 10), h];
  if (e === "mes") return [new Date(d.getFullYear(), d.getMonth() - 11, 1).toISOString().slice(0, 10), h];
  return [`${d.getFullYear() - 4}-01-01`, h];
}
type Cenario = "realista" | "otimista" | "pessimista" | "simulacao";
const COR_CENARIO: Record<Cenario, string> = { realista: "#2563eb", otimista: "#10b981", pessimista: "#ef4444", simulacao: "#8b5cf6" };
const ROTULO_CENARIO: Record<Cenario, string> = { realista: "Realista", otimista: "Otimista", pessimista: "Pessimista", simulacao: "Simulação" };

export default function FluxoCaixa() {
  const [escala, setEscala] = useState<Escala>("dia");
  const [[inicio, fim], setPeriodo] = useState<[string, string]>(() => periodoDaEscala("dia"));
  const [dados, setDados] = useState<RespostaFluxo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [saldoMinimo, setSaldoMinimoEstado] = useState<number | null>(null);
  const [cenario, setCenario] = useState<Cenario>("realista");
  const [sim, setSim] = useState<Premissas>({ ...CENARIOS.realista, investimentos: [] });
  const pedido = useRef(0);

  useEffect(() => { try { const v = Number(localStorage.getItem("fluxo-saldo-minimo")); if (v > 0) setSaldoMinimoEstado(v); } catch { /* sem armazenamento */ } }, []);
  const setSaldoMinimo = (v: number) => { setSaldoMinimoEstado(v); try { localStorage.setItem("fluxo-saldo-minimo", String(v)); } catch { /* sem armazenamento */ } };

  const carregar = useCallback(async (forcar = false) => {
    const n = ++pedido.current;
    setCarregando(true);
    try {
      const agrupar = escala === "mes" || escala === "ano" ? "mes" : "dia";
      const res = await fetch(`/api/backend/clinux/financeiro/fluxo?${new URLSearchParams({ inicio, fim, agrupar, ...(forcar ? { atualizar: "1" } : {}) })}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Não foi possível carregar o fluxo de caixa.");
      if (n === pedido.current) { setDados(j); setErro(""); }
    } catch (e) { if (n === pedido.current) setErro(e instanceof Error ? e.message : "Erro"); } finally { if (n === pedido.current) setCarregando(false); }
  }, [inicio, fim, escala]);
  useEffect(() => { void carregar(); }, [carregar]);

  const v = useMemo(() => {
    if (!dados) return null;
    const periodo = resumoBancos(dados.bancos.map(b => ({ ...b, transfEntrada: 0, transfSaida: 0 })));
    const hoje = resumoBancos(dados.bancos.map(b => ({ ...b, saldoInicial: b.saldoAtual, saldoFinal: b.saldoAtual, transfEntrada: 0, transfSaida: 0 })));
    const pontos = historicoAgrupado(dados, escala, periodo.saldoInicial);
    const totais = totaisHistorico(pontos);
    const media = mediaMensal(dados);
    const minimo = saldoMinimo ?? Math.round(media.saidas / 2 / 1000) * 1000;
    const premissas: Record<Cenario, Premissas> = { ...CENARIOS, simulacao: sim };
    const projecoes = Object.fromEntries((Object.keys(premissas) as Cenario[]).map(c => [c, projetar(dados, hoje.disponivelFinal, premissas[c])])) as Record<Cenario, ReturnType<typeof projetar>>;
    const ativa = projecoes[cenario];
    return {
      periodo, hoje, pontos, totais, media, minimo, projecoes, ativa,
      horizontes: resumoHorizontes(ativa, hoje.disponivelFinal),
      porCenario: Object.fromEntries((Object.keys(projecoes) as Cenario[]).map(c => [c, resumoHorizontes(projecoes[c], hoje.disponivelFinal)])) as Record<Cenario, ReturnType<typeof resumoHorizontes>>,
      alerta: alertaCaixa(ativa, minimo),
      conf: confiabilidade(dados),
    };
  }, [dados, escala, saldoMinimo, cenario, sim]);

  const serieProjecao = useMemo(() => {
    if (!v) return [];
    // Um ponto por semana para o gráfico de 12 meses.
    const r = v.projecoes.realista;
    return r.map((d, idx) => ({ d, idx })).filter(({ idx }) => idx % 7 === 0 || idx === r.length - 1).map(({ d, idx }) => {
      return { dia: d.dia, rotulo: `${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`, realista: d.saldo, otimista: v.projecoes.otimista[idx].saldo, pessimista: v.projecoes.pessimista[idx].saldo, simulacao: v.projecoes.simulacao[idx].saldo };
    });
  }, [v]);

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Calculando o fluxo de caixa…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><Waves size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos · Financeiro</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Fluxo de caixa</h1>
              <p className="text-sm text-slate-500">Realizado × previsto, saldos por conta, projeção de 7 dias a 12 meses, cenários e simulações.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => void carregar(true)} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" aria-label="Telas do financeiro">
          {([["/financeiro", "Visão geral", Gauge], ["/financeiro/fluxo", "Fluxo de caixa", Waves], ["/financeiro/receber", "Contas a receber", Banknote], ["/financeiro/pagar", "Contas a pagar", Receipt], ["/financeiro/exames", "Exames e auditoria", ShieldAlert]] as const).map(([href, nome, Icone]) => (
            <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${href === "/financeiro/fluxo" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}><Icone size={16} />{nome}</Link>
          ))}
        </nav>

        <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <Alternador valor={escala} onChange={x => { setEscala(x as Escala); setPeriodo(periodoDaEscala(x as Escala)); }} opcoes={ESCALAS} />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
            <CalendarRange size={16} className="text-slate-400" />
            <input type="date" value={inicio} max={fim} onChange={e => { if (e.target.value) setPeriodo([e.target.value, fim]); }} className="bg-transparent outline-none" />
            <span className="text-slate-400">até</span>
            <input type="date" value={fim} min={inicio} onChange={e => { if (e.target.value) setPeriodo([inicio, e.target.value]); }} className="bg-transparent outline-none" />
          </label>
          <span className="text-xs text-slate-400">Fluxo consolidado (o Clinux tem uma só unidade). Transferências entre contas não entram nas entradas e saídas.</span>
        </section>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {v && dados && (
          <div className="space-y-8">
            <Secao titulo="Período">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Saldo inicial" valor={R(v.periodo.saldoInicial)} icone={Wallet2} variacao={null} detalhe={`em ${inicio.split("-").reverse().join("/")}`} destaque={COR.texto} />
                <Kpi titulo="Entradas realizadas" valor={R(v.totais.entradas)} icone={ArrowDownCircle} variacao={null} detalhe={`previstas ${R(v.totais.entradasPrevistas)} · ${fmtP(v.totais.entradasPrevistas ? Math.round((v.totais.entradas / v.totais.entradasPrevistas) * 1000) / 10 : null)}`} destaque={COR.ok} />
                <Kpi titulo="Saídas realizadas" valor={R(v.totais.saidas)} icone={ArrowUpCircle} variacao={null} detalhe={`previstas ${R(v.totais.saidasPrevistas)} · ${fmtP(v.totais.saidasPrevistas ? Math.round((v.totais.saidas / v.totais.saidasPrevistas) * 1000) / 10 : null)}`} destaque={COR.critico} />
                <Kpi titulo="Saldo final" valor={R(v.periodo.saldoFinal)} icone={Wallet} variacao={null} detalhe={`fluxo líquido ${R(v.totais.entradas - v.totais.saidas)}`} destaque={v.periodo.saldoFinal >= 0 ? COR.ok : COR.critico} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["operacional", "investimento", "financiamento"] as CategoriaFluxo[]).map(c => {
                  const x = v.totais.categorias[c], liq = x.entradas - x.saidas;
                  return <Kpi key={c} titulo={`Fluxo ${c === "operacional" ? "operacional" : c === "investimento" ? "de investimentos" : "de financiamentos"}`} valor={R(liq)} icone={c === "operacional" ? Gauge : c === "investimento" ? Target : Landmark} variacao={null}
                    detalhe={`entradas ${R(x.entradas)} · saídas ${R(x.saidas)}`} destaque={liq >= 0 ? COR.ok : COR.critico} />;
                })}
              </div>
            </Secao>

            <Painel titulo={`Fluxo ${ESCALAS.find(e => e[0] === escala)![1].toLowerCase()}`} subtitulo="Realizado (barras cheias), previsto pelo vencimento (claras) e saldo acumulado das contas." icone={IconeLinha}>
              <GraficoFluxo dados={v.pontos} />
            </Painel>

            <Painel titulo="Saldo por conta bancária" subtitulo="Saldo no início e no fim do período, entradas, saídas e transferências." icone={Landmark}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                    <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Conta</th><th className="bg-slate-50 px-3 py-2 text-left">Tipo</th><th className="bg-slate-50 px-3 py-2">Inicial</th>
                    <th className="bg-slate-50 px-3 py-2">Entradas</th><th className="bg-slate-50 px-3 py-2">Saídas</th><th className="bg-slate-50 px-3 py-2">Transferências</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Final</th>
                  </tr></thead>
                  <tbody>
                    {v.periodo.contas.filter(c => c.saldoInicial || c.saldoFinal || c.entradas || c.saidas).sort((a, b) => b.saldoFinal - a.saldoFinal).map(c => {
                      const transf = dados.bancos.find(b => b.cdBanco === c.cdBanco)?.transferencias ?? 0;
                      return (
                        <tr key={c.cdBanco} className={`border-b border-slate-100 last:border-0 ${c.tipo === "ajuste" ? "text-slate-400" : "text-slate-700"}`}>
                          <td className="px-3 py-2 font-semibold">{c.banco}</td><td className="px-3 py-2 text-xs">{ROTULO_TIPO_CONTA[c.tipo]}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{RC(c.saldoInicial)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{c.entradas ? RC(c.entradas) : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-600">{c.saidas ? RC(c.saidas) : "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">{transf ? RC(transf) : "—"}</td>
                          <td className={`px-3 py-2 text-right font-bold tabular-nums ${c.saldoFinal < 0 ? "text-red-600" : "text-slate-900"}`}>{RC(c.saldoFinal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Painel>

            <Secao titulo="Projeção" acao={<Alternador valor={cenario} onChange={x => setCenario(x as Cenario)} opcoes={(Object.keys(ROTULO_CENARIO) as Cenario[]).map(c => [c, ROTULO_CENARIO[c]])} />}>
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
                <ShieldCheck size={18} className="text-slate-400" />
                <label className="flex items-center gap-2 font-semibold text-slate-700">Saldo mínimo operacional
                  <input type="number" min={0} step={1000} value={Math.round(v.minimo)} onChange={e => setSaldoMinimo(Math.max(0, Number(e.target.value) || 0))} className="h-9 w-36 rounded-lg border border-slate-200 px-2 text-right font-bold" />
                </label>
                <span className="text-xs text-slate-500">Saldo de partida: {RC(v.hoje.disponivelFinal)} disponível hoje. Média mensal operacional ({v.media.meses.map(rotuloMes).join(", ") || "sem histórico"}): entradas {R(v.media.entradas)} · saídas {R(v.media.saidas)}.</span>
              </div>

              {v.alerta.primeiro ? (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                  <p><b>Alerta de insuficiência de caixa ({ROTULO_CENARIO[cenario].toLowerCase()}):</b> o saldo projetado fica abaixo do mínimo em <b>{v.alerta.primeiro.dia.split("-").reverse().join("/")}</b>.
                    O pior momento é {v.alerta.pior!.dia.split("-").reverse().join("/")} ({RC(v.alerta.pior!.saldo)}): necessidade futura de caixa de <b>{RC(v.alerta.necessidade)}</b>.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                  <ShieldCheck size={18} />Nenhuma insuficiência de caixa nos próximos 12 meses no cenário {ROTULO_CENARIO[cenario].toLowerCase()} (menor saldo: {RC(v.alerta.pior?.saldo ?? 0)}).
                </div>
              )}

              {cenario === "simulacao" && <Simulacao sim={sim} setSim={setSim} hoje={dados.hoje} />}

              <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {v.horizontes.map(h => (
                  <div key={h.dias} className={`rounded-2xl border bg-white p-4 ${h.minimo < v.minimo ? "border-red-200" : "border-slate-200"}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{h.dias === 365 ? "12 meses" : `${h.dias} dias`}</p>
                    <p className={`mt-1 text-xl font-extrabold tabular-nums ${h.saldoFinal < 0 ? "text-red-600" : "text-slate-900"}`}>{R(h.saldoFinal)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">+{R(h.entradas)} · −{R(h.saidas)}</p>
                    <p className={`text-[11px] ${h.minimo < v.minimo ? "font-bold text-red-600" : "text-slate-400"}`}>mínimo {R(h.minimo)}</p>
                  </div>
                ))}
              </div>

              <Painel titulo="Saldo projetado por cenário" subtitulo="Títulos já lançados + estimativa do que ainda não foi lançado (média mensal operacional). Linha tracejada: saldo mínimo." icone={IconeLinha}>
                {serieProjecao.length ? (
                  <div className="h-[340px]">
                    <ResponsiveContainer>
                      <LineChart data={serieProjecao} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
                        <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={16} />
                        <YAxis tick={eixo} tickLine={false} axisLine={false} width={70} tickFormatter={x => formatarReais(x, true).replace("R$ ", "")} />
                        <ReferenceLine y={v.minimo} stroke={COR.critico} strokeDasharray="6 4" />
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload as (typeof serieProjecao)[number];
                          return <CaixaTooltip titulo={p.dia.split("-").reverse().join("/")} linhas={(Object.keys(ROTULO_CENARIO) as Cenario[]).map(c => ({ cor: COR_CENARIO[c], rotulo: ROTULO_CENARIO[c], valor: formatarReais(p[c]) }))} />;
                        }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {(Object.keys(ROTULO_CENARIO) as Cenario[]).map(c => (
                          <Line key={c} name={ROTULO_CENARIO[c]} type="monotone" dataKey={c} stroke={COR_CENARIO[c]} strokeWidth={c === cenario ? 3.5 : 1.5} dot={false} strokeDasharray={c === "simulacao" ? "5 3" : undefined} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <Vazio altura={300} />}
              </Painel>

              <Painel titulo="Comparação dos cenários" subtitulo="Saldo projetado no fim de cada horizonte. Realista: premissas atuais · otimista: entradas +5%, despesas −3%, 80% dos vencidos recuperados · pessimista: entradas −10%, despesas +5%, convênios 30 dias atrasados, 20% recuperados." icone={Scale}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Cenário</th>
                      {HORIZONTES.map(h => <th key={h} className="bg-slate-50 px-3 py-2 last:rounded-r-xl">{h === 365 ? "12 meses" : `${h} dias`}</th>)}
                    </tr></thead>
                    <tbody>
                      {(Object.keys(ROTULO_CENARIO) as Cenario[]).map(c => (
                        <tr key={c} className={`border-b border-slate-100 last:border-0 ${c === cenario ? "bg-blue-50/50 font-bold" : ""}`}>
                          <td className="px-3 py-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COR_CENARIO[c] }} />{ROTULO_CENARIO[c]}</td>
                          {v.porCenario[c].map(h => <td key={h.dias} className={`px-3 py-2 text-right tabular-nums ${h.saldoFinal < v.minimo ? "text-red-600" : ""}`}>{R(h.saldoFinal)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>

            <Secao titulo="Previsto × realizado">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi titulo="Confiabilidade da previsão de saídas" valor={fmtP(v.conf.saidas)} icone={Target} variacao={null} detalhe="acerto médio, 12 meses: títulos lançados antes do mês × pago no mês" destaque={COR.primaria} />
                <Kpi titulo="Confiabilidade da previsão de entradas" valor={fmtP(v.conf.entradas)} icone={Target} variacao={null} detalhe="recebimentos de atendimento só existem depois do atendimento, por isso a previsão é baixa" destaque={COR.secundaria} />
                <Kpi titulo="Base da estimativa" valor={`${v.media.meses.length} meses`} icone={CalendarClock} variacao={null} detalhe="média dos últimos meses completos para o que ainda não foi lançado" destaque={COR.texto} />
              </div>
              <Painel titulo="Previsto no início do mês × realizado" subtitulo="Últimos 12 meses completos." icone={Scale}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Mês</th><th className="bg-slate-50 px-3 py-2">Entradas previstas</th><th className="bg-slate-50 px-3 py-2">Realizadas</th><th className="bg-slate-50 px-3 py-2">Acerto</th>
                      <th className="bg-slate-50 px-3 py-2">Saídas previstas</th><th className="bg-slate-50 px-3 py-2">Realizadas</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Acerto</th>
                    </tr></thead>
                    <tbody>
                      {v.conf.linhas.map(l => (
                        <tr key={l.mes} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 font-semibold">{rotuloMes(l.mes)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{R(l.entradasPrevistas)}</td><td className="px-3 py-2 text-right tabular-nums">{R(l.entradasRealizadas)}</td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums">{fmtP(l.acertoEntradas)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{R(l.saidasPrevistas)}</td><td className="px-3 py-2 text-right tabular-nums">{R(l.saidasRealizadas)}</td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums">{fmtP(l.acertoSaidas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>
          </div>
        )}
      </div>
    </main>
  );
}

function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold tracking-tight text-slate-900">{titulo}</h2>{acao}</div>
      {children}
    </section>
  );
}

function Simulacao({ sim, setSim, hoje }: { sim: Premissas; setSim: (p: Premissas) => void; hoje: string }) {
  const faixa = (rotulo: string, campo: "variacaoEntradas" | "aumentoDespesas" | "atrasoConvenios" | "recuperacaoVencidos", min: number, max: number, sufixo: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between font-semibold text-slate-700">{rotulo}<b className="tabular-nums text-violet-700">{sim[campo] > 0 && campo !== "recuperacaoVencidos" && campo !== "atrasoConvenios" ? "+" : ""}{sim[campo]}{sufixo}</b></span>
      <input type="range" min={min} max={max} value={sim[campo]} onChange={e => setSim({ ...sim, [campo]: Number(e.target.value) })} className="accent-violet-600" />
    </label>
  );
  return (
    <Painel titulo="Simulação" subtitulo="Ajuste as premissas e veja o efeito no saldo projetado e no alerta de caixa." icone={Scale}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {faixa("Atraso dos convênios", "atrasoConvenios", 0, 120, " dias")}
        {faixa("Aumento das despesas", "aumentoDespesas", -20, 50, "%")}
        {faixa("Variação das entradas", "variacaoEntradas", -50, 30, "%")}
        {faixa("Recuperação dos vencidos", "recuperacaoVencidos", 0, 100, "%")}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={sim.estimarNaoLancado} onChange={e => setSim({ ...sim, estimarNaoLancado: e.target.checked })} className="h-4 w-4 accent-violet-600" />
        Estimar pela média o que ainda não foi lançado (desmarque para ver só os títulos já lançados)
      </label>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-bold text-slate-700">Novos investimentos</p>
        {sim.investimentos.map((inv, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <input type="date" value={inv.dia} min={hoje} onChange={e => setSim({ ...sim, investimentos: sim.investimentos.map((x, j) => (j === i ? { ...x, dia: e.target.value || hoje } : x)) })} className="h-9 rounded-lg border border-slate-200 px-2" />
            <input type="number" min={0} step={1000} value={inv.valor} onChange={e => setSim({ ...sim, investimentos: sim.investimentos.map((x, j) => (j === i ? { ...x, valor: Number(e.target.value) || 0 } : x)) })} className="h-9 w-36 rounded-lg border border-slate-200 px-2 text-right" />
            <input value={inv.descricao ?? ""} placeholder="Descrição (ex.: novo ultrassom)" onChange={e => setSim({ ...sim, investimentos: sim.investimentos.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} className="h-9 min-w-[220px] flex-1 rounded-lg border border-slate-200 px-2" />
            <button onClick={() => setSim({ ...sim, investimentos: sim.investimentos.filter((_, j) => j !== i) })} aria-label="Remover" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
        ))}
        <button onClick={() => setSim({ ...sim, investimentos: [...sim.investimentos, { dia: somarDias(hoje, 30), valor: 100000 }] })} className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 hover:underline"><Plus size={14} />Adicionar investimento</button>
      </div>
    </Painel>
  );
}
