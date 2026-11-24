"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, Clock3, FileStack, Layers, PieChart, Receipt, ShieldAlert, Stethoscope, TrendingDown, TrendingUp } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { GraficoProducaoFaturado } from "@/components/faturamento/graficos";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { concentracao, pct, taxaGlosa, tendencia, ticket, type RespostaCruzado, type RespostaResumo } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
type Criterio = "faturado" | "exames" | "ticket" | "glosa" | "demora";

export default function FaturamentoConvenios() {
  const [f, setF] = useFiltrosFaturamento();
  const r = useResumo<RespostaResumo>("/api/backend/clinux/faturamento/resumo", f);
  const c = useResumo<RespostaCruzado>("/api/backend/clinux/faturamento/cruzado", f);
  const [criterio, setCriterio] = useState<Criterio>("faturado");
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [procedimento, setProcedimento] = useState<number | null>(null);

  const linhas = useMemo(() => {
    if (!r.dados || !c.dados) return [];
    const totalFaturado = r.dados.totais.faturado;
    return r.dados.convenios.filter(g => g.examesConvenio > 0).map(g => {
      const proc = c.dados!.processamento.find(p => p.convenio === g.id);
      const lotes = r.dados!.faturas.find(x => x.cdFornecedor === g.id);
      const tend = tendencia(c.dados!.mensalConv.filter(x => x.convenio === g.id).map(x => ({ mes: x.mes, valor: x.faturavel })));
      return {
        id: g.id, nome: g.id === null ? "Sem convênio" : r.dados!.nomes.convenios[g.id] ?? c.dados!.nomes.convenios[g.id] ?? `Convênio ${g.id}`,
        faturado: g.faturado, faturavel: g.faturavel, participacao: pct(g.faturado, totalFaturado), exames: g.faturados, guias: g.guiasFaturadas,
        ticket: g.faturados ? g.faturado / g.faturados : 0, glosa: g.glosa, taxaGlosa: taxaGlosa(g), pendente: g.pendente,
        lotes: lotes?.faturas ?? 0, enviado: lotes?.valor ?? 0, recebido12: proc?.recebido ?? 0, valor12: proc?.valor ?? 0,
        abertas: proc?.abertas ?? 0, valorAberto: proc?.valorAberto ?? 0, atrasadas: proc?.atrasadas ?? 0, diasReceber: proc?.diasReceber ?? null, ...tend,
      };
    }).sort((a, b) => b.faturado - a.faturado);
  }, [r.dados, c.dados]);

  const ranking: ItemRanking[] = linhas.map(l => {
    const valor = criterio === "faturado" ? l.faturado : criterio === "exames" ? l.exames : criterio === "ticket" ? l.ticket : criterio === "glosa" ? l.glosa : l.diasReceber ?? 0;
    return { chave: String(l.id), nome: l.nome, valor, negativo: criterio === "glosa" || criterio === "demora", detalhe: criterio === "glosa" ? `taxa ${fmtP(l.taxaGlosa)}` : criterio === "demora" ? `${fmtN(l.abertas)} faturas em aberto` : `${fmtP(l.participacao)} do faturado` };
  }).sort((a, b) => b.valor - a.valor);
  const fmtCriterio = criterio === "exames" ? fmtN : criterio === "demora" ? (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias` : undefined;

  const sel = linhas.find(l => l.id === selecionado) ?? null;
  const detalhe = useMemo(() => {
    if (!c.dados || selecionado === null) return null;
    const mensal = c.dados.mensalConv.filter(x => x.convenio === selecionado).sort((a, b) => a.mes.localeCompare(b.mes))
      .map(x => ({ ...x, rotulo: rotuloMes(x.mes), pendente: x.faturavel - x.faturado }));
    const modalidades = c.dados.convMod.filter(x => x.convenio === selecionado).map(x => ({ chave: String(x.modalidade), nome: x.modalidade === null ? "Sem modalidade" : c.dados!.nomes.modalidades[x.modalidade] ?? `Modalidade ${x.modalidade}`, valor: x.faturado, detalhe: `${fmtN(x.faturados)} exames` })).sort((a, b) => b.valor - a.valor);
    return { mensal, modalidades };
  }, [c.dados, selecionado]);

  // Valor médio de um procedimento em cada convênio.
  const procedimentos = useMemo(() => {
    if (!c.dados) return [];
    const m = new Map<number, number>();
    for (const x of c.dados.procConv) if (x.procedimento !== null) m.set(x.procedimento, (m.get(x.procedimento) ?? 0) + x.faturavel);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => ({ id, nome: c.dados!.nomes.procedimentos[id] ?? `Procedimento ${id}` }));
  }, [c.dados]);
  const procAtual = procedimento ?? procedimentos[0]?.id ?? null;
  const comparacaoProc = c.dados && procAtual !== null
    ? c.dados.procConv.filter(x => x.procedimento === procAtual && x.exames > 0 && x.faturavel > 0).map(x => ({ chave: String(x.convenio), nome: x.convenio === null ? "Sem convênio" : c.dados!.nomes.convenios[x.convenio] ?? `Convênio ${x.convenio}`, valor: x.faturavel / x.exames, detalhe: `${fmtN(x.exames)} exames` })).sort((a, b) => b.valor - a.valor)
    : [];

  const carregando = r.carregando || c.carregando;
  const quedas = linhas.filter(l => l.quedaAnormal);

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando os convênios…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/convenios" titulo="Faturamento por convênio" icone={Receipt} descricao="Faturamento e comportamento de cada operadora: valores, glosa, recebimento e demora."
          atualizadoEm={r.dados?.atualizadoEm} carregando={carregando} onAtualizar={() => { r.atualizar(); c.atualizar(); }} />
        <BarraFiltros f={f} setF={setF} />
        {(r.erro || c.erro) && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{r.erro || c.erro}</div>}

        {r.dados && c.dados && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Convênios com faturamento" valor={fmtN(linhas.filter(l => l.faturado > 0).length)} icone={Receipt} variacao={null} detalhe={`${R(r.dados.totais.faturado)} faturado no período`} destaque={COR.primaria} />
              <Kpi titulo="Concentração nos maiores" valor={fmtP(concentracao(linhas.map(l => l.faturado), 3))} icone={PieChart} variacao={null} detalhe={`3 maiores · 5 maiores: ${fmtP(concentracao(linhas.map(l => l.faturado), 5))}`} destaque={COR.secundaria} />
              <Kpi titulo="Ticket médio faturado" valor={formatarReais(r.dados.totais.faturados ? r.dados.totais.faturado / r.dados.totais.faturados : 0)} icone={BadgeDollarSign} variacao={null} detalhe={`produção ${formatarReais(ticket(r.dados.totais))} por exame`} destaque={COR.ok} />
              <Kpi titulo="Taxa de glosa" valor={fmtP(taxaGlosa(r.dados.totais))} icone={ShieldAlert} variacao={null} detalhe={`${R(r.dados.totais.glosa)} glosado`} destaque={COR.critico} />
              <Kpi titulo="Faturas em aberto (12 meses)" valor={R(c.dados.processamento.reduce((s, p) => s + p.valorAberto, 0))} icone={FileStack} variacao={null} detalhe={`${fmtN(c.dados.processamento.reduce((s, p) => s + p.abertas, 0))} faturas · ${fmtN(c.dados.processamento.reduce((s, p) => s + p.atrasadas, 0))} atrasadas`} destaque={COR.atencao} />
              <Kpi titulo="Liberado pelos convênios (12 meses)" valor={R(c.dados.processamento.reduce((s, p) => s + p.recebido, 0))} icone={TrendingUp} variacao={null} detalhe={`de ${R(c.dados.processamento.reduce((s, p) => s + p.valor, 0))} faturados (diferença ${R(c.dados.processamento.reduce((s, p) => s + p.valor - p.recebido, 0))})`} destaque={COR.ok} />
              <Kpi titulo="Tempo médio de processamento" valor={(() => { const l = c.dados.processamento.filter(p => p.diasReceber !== null); const n = l.reduce((s, p) => s + p.recebidas, 0); return n ? `${(l.reduce((s, p) => s + (p.diasReceber ?? 0) * p.recebidas, 0) / n).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias` : "—"; })()} icone={Clock3} variacao={null} detalhe="emissão da fatura → recebimento total" destaque={COR.secundaria} />
              <Kpi titulo="Queda anormal" valor={fmtN(quedas.length)} icone={TrendingDown} variacao={null} detalhe={quedas.length ? quedas.slice(0, 3).map(q => q.nome).join(", ") : "nenhum convênio abaixo de 70% da média"} destaque={quedas.length ? COR.critico : COR.ok} />
            </div>

            <Secao titulo="Rankings" acao={<Alternador valor={criterio} onChange={x => setCriterio(x as Criterio)} opcoes={[["faturado", "Faturamento"], ["exames", "Exames"], ["ticket", "Ticket médio"], ["glosa", "Glosa"], ["demora", "Demora"]]} />}>
              <Painel titulo="Convênios" subtitulo="Clique numa linha da tabela abaixo para ver o detalhe do convênio." icone={Receipt}>
                <RankingBarras itens={ranking} limite={12} formatar={fmtCriterio} cor={criterio === "glosa" || criterio === "demora" ? COR.critico : COR.primaria} />
              </Painel>
            </Secao>

            <Painel titulo="Indicadores por convênio" subtitulo="Período filtrado; faturas, liberado e demora consideram as faturas emitidas nos 12 meses até o fim do período." icone={Layers}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-sm">
                  <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                    <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Convênio</th><th className="bg-slate-50 px-3 py-2">Faturado</th><th className="bg-slate-50 px-3 py-2">Part.</th>
                    <th className="bg-slate-50 px-3 py-2">Exames</th><th className="bg-slate-50 px-3 py-2">Guias</th><th className="bg-slate-50 px-3 py-2">Lotes</th><th className="bg-slate-50 px-3 py-2">Ticket</th>
                    <th className="bg-slate-50 px-3 py-2">Glosa</th><th className="bg-slate-50 px-3 py-2">Pendente</th><th className="bg-slate-50 px-3 py-2">Liberado 12m</th>
                    <th className="bg-slate-50 px-3 py-2">Em aberto</th><th className="bg-slate-50 px-3 py-2">Demora</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Últ. mês</th>
                  </tr></thead>
                  <tbody>
                    {linhas.map(l => (
                      <tr key={String(l.id)} onClick={() => setSelecionado(l.id === selecionado ? null : l.id)} className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${l.id === selecionado ? "bg-blue-50" : ""}`}>
                        <td className="max-w-[220px] truncate px-3 py-2 font-semibold" title={l.nome}>{l.quedaAnormal && <TrendingDown size={13} className="mr-1 inline text-red-600" />}{l.nome}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">{R(l.faturado)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmtP(l.participacao)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtN(l.exames)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtN(l.guias)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtN(l.lotes)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatarReais(l.ticket)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.glosa ? <span className="text-red-600">{R(l.glosa)} <span className="text-xs">({fmtP(l.taxaGlosa)})</span></span> : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">{l.pendente ? R(l.pendente) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.valor12 ? <>{R(l.recebido12)} <span className="text-xs text-slate-400">({fmtP(pct(l.recebido12, l.valor12))})</span></> : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.abertas ? <>{fmtN(l.abertas)} <span className="text-xs text-slate-400">{R(l.valorAberto)}</span>{l.atrasadas ? <span className="block text-xs font-bold text-red-600">{l.atrasadas} atrasadas</span> : null}</> : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.diasReceber === null ? "—" : `${l.diasReceber.toLocaleString("pt-BR")} d`}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${l.crescimento === null ? "text-slate-400" : l.crescimento >= 0 ? "text-emerald-600" : "text-red-600"}`}>{l.crescimento === null ? "—" : `${l.crescimento > 0 ? "+" : ""}${fmtP(l.crescimento)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Painel>

            {sel && detalhe && (
              <Secao titulo={`Detalhe: ${sel.nome}`}>
                <div className="grid gap-6 xl:grid-cols-3">
                  <Painel titulo="Faturamento mensal da operadora" subtitulo="Últimos 13 meses, pela data de realização." icone={TrendingUp} className="xl:col-span-2">
                    <GraficoProducaoFaturado dados={detalhe.mensal} altura={280} />
                  </Painel>
                  <Painel titulo="Por modalidade" subtitulo="Faturado no período." icone={Layers}><RankingBarras itens={detalhe.modalidades} limite={10} cor={COR.secundaria} /></Painel>
                </div>
              </Secao>
            )}

            <Painel titulo="Valor médio do procedimento por convênio" subtitulo="Compare quanto cada operadora paga pelo mesmo procedimento (faturável ÷ exames)." icone={Stethoscope}
              acao={<select value={procAtual ?? ""} onChange={e => setProcedimento(Number(e.target.value))} className="h-9 max-w-[320px] rounded-lg border border-slate-200 px-2 text-sm font-semibold">{procedimentos.map(p => <option key={p.id} value={p.id}>{p.id} · {p.nome}</option>)}</select>}>
              <RankingBarras itens={comparacaoProc} formatar={v => formatarReais(v)} limite={15} cor={COR.ok} vazio="Sem exames deste procedimento com convênio." />
            </Painel>
            <p className="text-xs text-slate-400">Lotes rejeitados e tempo de processamento pela operadora: o Clinux não registra o status do lote; a demora é medida da emissão da fatura ao recebimento total. Faturamento por unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
