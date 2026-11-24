"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, Clock3, Download, FileCheck2, FileQuestion, KeyRound, Layers, Receipt, Search, ShieldAlert, Stethoscope, TrendingUp, XCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Kpi, Painel, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { ROTULO_SITUACAO_GUIA, pct, porGuia, tempoAutorizacao, type ExameGuia, type RespostaGuias, type SituacaoGuia } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const COR_SIT: Record<SituacaoGuia, string> = { autorizada: "#10b981", pendente: "#f59e0b", vencida: "#ef4444", cancelada: "#94a3b8" };
type Filtro = "todas" | SituacaoGuia | "negada" | "divergente" | "utilizada";

export default function GuiasAutorizacoes() {
  const [f, setF] = useFiltrosFaturamento();
  const { dados, carregando, erro, atualizar } = useResumo<RespostaGuias>("/api/backend/clinux/faturamento/guias", { ...f, base: "realizacao" });
  const [dim, setDim] = useState<"convenio" | "modalidade" | "procedimento">("convenio");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");

  const nome = (tipo: "convenios" | "modalidades" | "procedimentos", id: number | null) => (id === null ? "—" : dados?.nomes[tipo][id] ?? `Código ${id}`);

  const v = useMemo(() => {
    if (!dados) return null;
    const guias = porGuia(dados.exames);
    const cont = (s: SituacaoGuia) => guias.filter(g => g.situacao === s);
    const valorEx = (fn: (e: ExameGuia) => boolean) => dados.exames.filter(fn).reduce((s, e) => s + e.valor, 0);
    const negadas = guias.filter(g => g.negada);
    const motivos = new Map<string, number>();
    for (const e of dados.exames.filter(x => x.negada)) { const k = e.motivoGlosa ?? e.pendencia ?? "Sem motivo informado"; motivos.set(k, (motivos.get(k) ?? 0) + 1); }
    const meses = [...new Set(dados.mensal.map(m => m.mes))].sort();
    return {
      guias, total: guias.length, autorizadas: cont("autorizada").length, pendentes: cont("pendente").length, vencidas: cont("vencida").length,
      canceladas: cont("cancelada").length, negadas: negadas.length, divergentes: guias.filter(g => g.divergente).length, utilizadas: guias.filter(g => g.faturada).length,
      valorAutorizadas: valorEx(e => e.situacao === "autorizada"), valorPendentes: valorEx(e => e.situacao === "pendente"), valorNegadas: valorEx(e => e.negada),
      tempo: tempoAutorizacao(dados.exames),
      motivos: [...motivos.entries()].map(([chave, n]) => ({ chave, nome: chave, valor: n })).sort((a, b) => b.valor - a.valor),
      mensal: meses.map(mes => ({ mes, rotulo: rotuloMes(mes), ...Object.fromEntries((["autorizada", "pendente", "vencida", "cancelada"] as SituacaoGuia[]).map(s => [s, dados.mensal.filter(m => m.mes === mes && m.situacao === s).reduce((a, m) => a + m.guias, 0)])) })),
    };
  }, [dados]);

  const ranking = useMemo(() => {
    if (!dados) return [];
    const k = (e: ExameGuia) => (dim === "convenio" ? e.cdConvenio : dim === "modalidade" ? e.cdModalidade : e.cdProcedimento);
    const t = dim === "convenio" ? "convenios" : dim === "modalidade" ? "modalidades" : "procedimentos";
    const m = new Map<string, { chave: string; nome: string; guias: Set<string>; pendentes: number; negadas: number }>();
    for (const e of dados.exames) {
      const key = String(k(e));
      const g = m.get(key) ?? { chave: key, nome: nome(t, k(e)), guias: new Set<string>(), pendentes: 0, negadas: 0 };
      g.guias.add(e.guia ?? `x${e.cdExame}`); if (e.situacao === "pendente") g.pendentes++; if (e.negada) g.negadas++;
      m.set(key, g);
    }
    return [...m.values()].map(g => ({ chave: g.chave, nome: g.nome, valor: g.guias.size, detalhe: `${fmtN(g.pendentes)} pend. · ${fmtN(g.negadas)} negadas` })).sort((a, b) => b.valor - a.valor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, dim]);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return (dados?.exames ?? []).filter(e => {
      const ok = filtro === "todas" || (filtro === "negada" ? e.negada : filtro === "divergente" ? e.divergente : filtro === "utilizada" ? e.faturado : e.situacao === filtro);
      return ok && (!b || [e.guia, e.autorizacao, e.cdExame, nome("convenios", e.cdConvenio), nome("procedimentos", e.cdProcedimento)].join(" ").toLowerCase().includes(b));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, filtro, busca]);

  function exportar() {
    const cab = ["Guia", "Autorização", "Exame", "Atendimento", "Convênio", "Procedimento", "Solicitação", "Autorização em", "Validade", "Data do exame", "Situação", "Negada", "Divergência", "Faturada", "Valor", "Motivo"];
    const corpo = lista.map(e => [e.guia ?? "", e.autorizacao ?? "", e.cdExame, e.cdAtendimento, nome("convenios", e.cdConvenio), nome("procedimentos", e.cdProcedimento), e.solicitacao ?? "", e.dataAutorizacao ?? "", e.validade ?? "", e.data, ROTULO_SITUACAO_GUIA[e.situacao], e.negada ? "sim" : "", e.divergente ? "autorização depois do exame" : "", e.faturado ? "sim" : "", e.valor.toFixed(2).replace(".", ","), e.motivoGlosa ?? e.pendencia ?? ""]);
    const csv = [cab, ...corpo].map(l => l.map(y => `"${String(y).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `guias-${f.inicio}-a-${f.fim}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando guias e autorizações…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/guias" titulo="Guias e autorizações" icone={KeyRound} descricao="Situação das guias e autorizações registradas nos exames do Clinux (pela data do exame)."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Total de guias" valor={fmtN(v.total)} icone={Receipt} variacao={null} detalhe={`${fmtN(dados.exames.length)} exames de convênio`} destaque={COR.primaria} />
              <Kpi titulo="Autorizadas" valor={fmtN(v.autorizadas)} icone={CheckCircle2} variacao={null} detalhe={`${R(v.valorAutorizadas)} · ${fmtN(v.utilizadas)} utilizadas (faturadas)`} destaque={COR.ok} />
              <Kpi titulo="Pendentes" valor={fmtN(v.pendentes)} icone={FileQuestion} variacao={null} detalhe={`${fmtP(pct(v.pendentes, v.total))} · ${R(v.valorPendentes)} sem número de autorização`} destaque={COR.atencao} />
              <Kpi titulo="Negadas" valor={fmtN(v.negadas)} icone={XCircle} variacao={null} detalhe={`${fmtP(pct(v.negadas, v.total))} · ${R(v.valorNegadas)} (glosa de autorização ou pendência “negada”)`} destaque={COR.critico} />
              <Kpi titulo="Vencidas" valor={fmtN(v.vencidas)} icone={CalendarClock} variacao={null} detalhe="validade da senha antes do exame" destaque={COR.critico} />
              <Kpi titulo="Canceladas" valor={fmtN(v.canceladas)} icone={Ban} variacao={null} detalhe="atendimento cancelado com guia" destaque={COR.texto} />
              <Kpi titulo="Com divergência" valor={fmtN(v.divergentes)} icone={ShieldAlert} variacao={null} detalhe="autorização com data posterior ao exame" destaque={COR.atencao} />
              <Kpi titulo="Tempo médio de autorização" valor={v.tempo === null ? "—" : `${v.tempo.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="da solicitação à autorização" destaque={COR.secundaria} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Evolução mensal dos status" subtitulo="Guias por mês do exame (12 meses)." icone={TrendingUp}>
                {v.mensal.length ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer>
                      <BarChart data={v.mensal} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
                        <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
                        <YAxis tick={eixo} tickLine={false} axisLine={false} width={48} />
                        <Tooltip content={({ active, payload }) => active && payload?.length ? <CaixaTooltip titulo={String((payload[0].payload as { rotulo: string }).rotulo)} linhas={(Object.keys(COR_SIT) as SituacaoGuia[]).map(s => ({ cor: COR_SIT[s], rotulo: ROTULO_SITUACAO_GUIA[s], valor: fmtN(Number((payload[0].payload as Record<string, number>)[s]) || 0) }))} /> : null} />
                        <Legend wrapperStyle={{ fontSize: 12 }} formatter={x => ROTULO_SITUACAO_GUIA[x as SituacaoGuia] ?? x} />
                        {(Object.keys(COR_SIT) as SituacaoGuia[]).map((s, i) => <Bar key={s} dataKey={s} stackId="a" fill={COR_SIT[s]} radius={i === 3 ? [4, 4, 0, 0] : undefined} maxBarSize={34} />)}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <Vazio altura={280} />}
              </Painel>
              <Painel titulo="Guias por" icone={Layers} acao={<Alternador valor={dim} onChange={x => setDim(x as typeof dim)} opcoes={[["convenio", "Convênio"], ["modalidade", "Modalidade"], ["procedimento", "Procedimento"]]} />}>
                <RankingBarras itens={ranking} formatar={fmtN} limite={10} />
              </Painel>
              <Painel titulo="Principais motivos de negativa" subtitulo="Motivo da glosa de autorização ou da pendência." icone={XCircle}>
                <RankingBarras itens={v.motivos} formatar={fmtN} cor={COR.critico} limite={10} vazio="Nenhuma guia negada no período." />
              </Painel>
              <Painel titulo="Guias próximas do vencimento" subtitulo="Exames dos próximos 30 dias com a autorização vencendo antes ou até 7 dias depois." icone={CalendarClock}>
                {dados.proximas.length ? (
                  <div className="max-h-[300px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-1.5">Guia</th><th className="px-2 py-1.5">Convênio</th><th className="px-2 py-1.5">Exame em</th><th className="px-2 py-1.5">Validade</th></tr></thead>
                      <tbody>{dados.proximas.map(p => (
                        <tr key={p.cdExame} className="border-b border-slate-100"><td className="px-2 py-1.5 font-semibold">{p.guia ?? "—"}<span className="block text-xs text-slate-400">exame {p.cdExame}</span></td><td className="px-2 py-1.5">{nome("convenios", p.cdConvenio)}</td><td className="px-2 py-1.5">{data(p.data)}</td>
                          <td className={`px-2 py-1.5 font-bold ${p.validade && p.validade < p.data ? "text-red-600" : "text-amber-600"}`}>{data(p.validade)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p className="py-8 text-center text-sm text-slate-400">Nenhuma autorização vencendo nos próximos exames.</p>}
              </Painel>
            </div>

            <Secao titulo="Consulta de guias" acao={
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><Search size={15} className="text-slate-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Guia, autorização, exame…" className="w-48 bg-transparent outline-none" /></label>
                <Alternador valor={filtro} onChange={x => setFiltro(x as Filtro)} opcoes={[["todas", "Todas"], ["autorizada", "Autorizadas"], ["pendente", "Pendentes"], ["negada", "Negadas"], ["vencida", "Vencidas"], ["cancelada", "Canceladas"], ["divergente", "Divergências"], ["utilizada", "Utilizadas"]]} />
                <button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} />CSV</button>
              </div>
            }>
              <Painel titulo={`${fmtN(lista.length)} exames${lista.length > 300 ? " · mostrando 300 (o CSV tem todos)" : ""}`} icone={Stethoscope}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2">Guia / autorização</th><th className="bg-slate-50 px-3 py-2">Convênio</th><th className="bg-slate-50 px-3 py-2">Procedimento</th>
                      <th className="bg-slate-50 px-3 py-2">Solicitação</th><th className="bg-slate-50 px-3 py-2">Autorização</th><th className="bg-slate-50 px-3 py-2">Validade</th><th className="bg-slate-50 px-3 py-2">Exame</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Situação</th>
                    </tr></thead>
                    <tbody>
                      {lista.slice(0, 300).map(e => (
                        <tr key={e.cdExame} className="border-b border-slate-100 align-top last:border-0">
                          <td className="whitespace-nowrap px-3 py-2"><b>{e.guia ?? <span className="text-red-600">sem guia</span>}</b><span className="block text-xs text-slate-500">{e.autorizacao ? `aut. ${e.autorizacao}` : "sem autorização"}</span></td>
                          <td className="max-w-[170px] truncate px-3 py-2">{nome("convenios", e.cdConvenio)}</td>
                          <td className="max-w-[220px] truncate px-3 py-2" title={nome("procedimentos", e.cdProcedimento)}>{nome("procedimentos", e.cdProcedimento)}</td>
                          <td className="whitespace-nowrap px-3 py-2">{data(e.solicitacao)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 ${e.divergente ? "font-bold text-amber-700" : ""}`}>{data(e.dataAutorizacao)}</td>
                          <td className={`whitespace-nowrap px-3 py-2 ${e.situacao === "vencida" ? "font-bold text-red-600" : ""}`}>{data(e.validade)}</td>
                          <td className="whitespace-nowrap px-3 py-2">{data(e.data)}<span className="block text-xs text-slate-400">exame {e.cdExame}</span></td>
                          <td className="px-3 py-2 text-xs"><span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: COR_SIT[e.situacao] }}>{ROTULO_SITUACAO_GUIA[e.situacao]}</span>
                            {e.negada && <span className="mt-1 block font-bold text-red-600">negada{e.motivoGlosa || e.pendencia ? `: ${e.motivoGlosa ?? e.pendencia}` : ""}</span>}
                            {e.faturado && <span className="mt-1 flex items-center gap-1 text-emerald-700"><FileCheck2 size={12} />faturada</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>
            <p className="text-xs text-slate-400">O Clinux não guarda um status próprio da guia nem o histórico de status: a situação é derivada dos campos do exame (número e data da autorização, validade da senha, atendimento cancelado, glosa e pendência). Guias por unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
