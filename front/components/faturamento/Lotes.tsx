"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock3, Download, FileStack, Hourglass, Loader2, Receipt, Search, TrendingUp, Wallet } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { pct, type Lote, type RespostaLotes } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const dias = (de: string | null, ate: string | null) => (de && ate ? Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000) : null);
const SITUACAO: Record<Lote["situacao"], [string, string]> = {
  recebida: ["Recebida", "bg-emerald-100 text-emerald-800"], parcial: ["Recebida em parte", "bg-sky-100 text-sky-800"],
  aguardando: ["Aguardando", "bg-slate-100 text-slate-600"], atrasada: ["Atrasada (sem retorno)", "bg-red-100 text-red-700"],
};
type ExameLote = { cdExame: number; cdAtendimento: number; data: string; guia: string | null; procedimento: string | null; valor: number; glosa: number; motivo: string | null };

export default function LotesFaturamento() {
  const [f, setF] = useFiltrosFaturamento("trimestre");
  const { dados, carregando, erro, atualizar } = useResumo<RespostaLotes>("/api/backend/clinux/faturamento/lotes", f);
  const [filtroSit, setFiltroSit] = useState<"todas" | Lote["situacao"]>("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);
  const [exames, setExames] = useState<Record<number, ExameLote[] | "carregando" | string>>({});

  const v = useMemo(() => {
    if (!dados) return null;
    const l = dados.lotes;
    const soma = (x: Lote[], k: "valor" | "recebido" | "exames" | "guias" | "glosa") => x.reduce((s, y) => s + y[k], 0);
    const por = (s: Lote["situacao"]) => l.filter(x => x.situacao === s);
    const recebidas = por("recebida");
    const tempos = recebidas.map(x => dias(x.emissao, x.ultimoRecebimento)).filter((x): x is number => x !== null);
    const criacao = l.map(x => dias(x.cadastro, x.emissao)).filter((x): x is number => x !== null && x >= 0);
    const agrupar = (chave: (x: Lote) => string) => {
      const m = new Map<string, { chave: string; lotes: number; valor: number }>();
      for (const x of l) { const k = chave(x); const g = m.get(k) ?? { chave: k, lotes: 0, valor: 0 }; g.lotes++; g.valor += x.valor; m.set(k, g); }
      return [...m.values()];
    };
    return {
      total: l.length, valor: soma(l, "valor"), recebido: soma(l, "recebido"), exames: soma(l, "exames"), guias: soma(l, "guias"), glosa: soma(l, "glosa"),
      recebidas: recebidas.length, valorRecebidas: soma(recebidas, "valor"), parciais: por("parcial").length, aguardando: por("aguardando").length,
      atrasadas: por("atrasada").length, valorAtrasado: soma(por("atrasada"), "valor") - soma(por("atrasada"), "recebido"),
      valorPendente: soma(l, "valor") - soma(l, "recebido"),
      tempoRetorno: tempos.length ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10 : null,
      tempoEnvio: criacao.length ? Math.round((criacao.reduce((a, b) => a + b, 0) / criacao.length) * 10) / 10 : null,
      porConvenio: agrupar(x => x.convenio ?? "Sem convênio").sort((a, b) => b.lotes - a.lotes),
      porCompetencia: agrupar(x => x.competencia ?? "sem competência").sort((a, b) => a.chave.localeCompare(b.chave)),
      porMes: agrupar(x => x.emissao.slice(0, 7)).sort((a, b) => a.chave.localeCompare(b.chave)),
      atrasadasMes: agrupar(x => (x.situacao === "atrasada" ? x.emissao.slice(0, 7) : "")).filter(x => x.chave).sort((a, b) => a.chave.localeCompare(b.chave)),
    };
  }, [dados]);

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return (dados?.lotes ?? []).filter(x => (filtroSit === "todas" || x.situacao === filtroSit) && (!b || [x.cdLancamento, x.numero, x.documento, x.convenio, x.competencia].join(" ").toLowerCase().includes(b)));
  }, [dados, filtroSit, busca]);

  async function abrir(cd: number) {
    setAberto(a => (a === cd ? null : cd));
    if (exames[cd]) return;
    setExames(e => ({ ...e, [cd]: "carregando" }));
    try {
      const r = await fetch(`/api/backend/clinux/faturamento/lotes/${cd}/exames`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      setExames(e => ({ ...e, [cd]: j.exames }));
    } catch (er) { setExames(e => ({ ...e, [cd]: er instanceof Error ? er.message : "Erro" })); }
  }

  function exportar() {
    const cab = ["Lote (título)", "Número da fatura", "Documento", "Convênio", "Competência", "Cadastro", "Emissão (envio)", "Vencimento", "Valor apresentado", "Recebido", "Último recebimento", "Situação", "Exames", "Guias", "Glosa", "Responsável"];
    const corpo = lista.map(x => [x.cdLancamento, x.numero ?? "", x.documento ?? "", x.convenio ?? "", x.competencia ?? "", x.cadastro ?? "", x.emissao, x.vencimento ?? "", x.valor.toFixed(2).replace(".", ","), x.recebido.toFixed(2).replace(".", ","), x.ultimoRecebimento ?? "", SITUACAO[x.situacao][0], x.exames, x.guias, x.glosa.toFixed(2).replace(".", ","), x.responsavel ?? ""]);
    const csv = [cab, ...corpo].map(l => l.map(y => `"${String(y).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `lotes-${f.inicio}-a-${f.fim}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando os lotes…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/lotes" titulo="Lotes de faturamento" icone={FileStack} descricao="Faturas de convênio emitidas no Clinux (pela data de emissão). Esta tela não cria, corrige, reenvia nem exclui lotes."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Lotes enviados" valor={fmtN(v.total)} icone={FileStack} variacao={null} detalhe={`${R(v.valor)} apresentado · média ${formatarReais(v.total ? v.valor / v.total : 0)} por lote`} destaque={COR.primaria} />
              <Kpi titulo="Processados (recebidos)" valor={fmtN(v.recebidas)} icone={CheckCircle2} variacao={null} detalhe={`${fmtP(pct(v.recebidas, v.total))} dos lotes · ${R(v.valorRecebidas)}`} destaque={COR.ok} />
              <Kpi titulo="Pendentes" valor={fmtN(v.aguardando + v.parciais)} icone={Hourglass} variacao={null} detalhe={`${fmtN(v.aguardando)} aguardando · ${fmtN(v.parciais)} recebidos em parte · ${R(v.valorPendente)} a receber`} destaque={COR.atencao} />
              <Kpi titulo="Sem retorno no prazo" valor={fmtN(v.atrasadas)} icone={AlertTriangle} variacao={null} detalhe={`${fmtP(pct(v.atrasadas, v.total))} dos lotes · ${R(v.valorAtrasado)} vencido`} destaque={COR.critico} />
              <Kpi titulo="Guias por lote" valor={v.total ? (v.guias / v.total).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"} icone={Receipt} variacao={null} detalhe={`${fmtN(v.guias)} guias · ${fmtN(v.exames)} exames`} destaque={COR.secundaria} />
              <Kpi titulo="Envio → recebimento" valor={v.tempoRetorno === null ? "—" : `${v.tempoRetorno.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="média dos lotes já recebidos" destaque={COR.secundaria} />
              <Kpi titulo="Criação → envio" valor={v.tempoEnvio === null ? "—" : `${v.tempoEnvio.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="do cadastro do título à emissão" destaque={COR.texto} />
              <Kpi titulo="Recebido" valor={R(v.recebido)} icone={Wallet} variacao={null} detalhe={`${fmtP(pct(v.recebido, v.valor))} do apresentado · glosa nos exames ${R(v.glosa)}`} destaque={COR.ok} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Evolução mensal de envio" subtitulo="Valor dos lotes por mês de emissão." icone={TrendingUp}>
                <GraficoMensal dados={v.porMes.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.valor }))} cor={COR.primaria} rotulo="Enviado" />
              </Painel>
              <Painel titulo="Lotes sem retorno no prazo" subtitulo="Valor dos lotes atrasados por mês de emissão." icone={AlertTriangle}>
                <GraficoMensal dados={v.atrasadasMes.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.valor }))} cor={COR.critico} rotulo="Atrasado" />
              </Painel>
              <Painel titulo="Lotes por convênio" icone={Receipt}><RankingBarras itens={v.porConvenio.map(x => ({ chave: x.chave, nome: x.chave, valor: x.lotes, detalhe: R(x.valor) }))} formatar={fmtN} limite={12} /></Painel>
              <Painel titulo="Lotes por competência" icone={FileStack}><RankingBarras itens={[...v.porCompetencia].reverse().map(x => ({ chave: x.chave, nome: x.chave.length === 7 ? rotuloMes(x.chave) : x.chave, valor: x.lotes, detalhe: R(x.valor) }))} formatar={fmtN} limite={12} cor={COR.secundaria} /></Painel>
            </div>

            <Secao titulo="Relação dos lotes" acao={
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><Search size={15} className="text-slate-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Número, convênio, competência…" className="w-52 bg-transparent outline-none" /></label>
                <Alternador valor={filtroSit} onChange={x => setFiltroSit(x as typeof filtroSit)} opcoes={[["todas", "Todas"], ["aguardando", "Aguardando"], ["parcial", "Parcial"], ["atrasada", "Atrasadas"], ["recebida", "Recebidas"]]} />
                <button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} />CSV</button>
              </div>
            }>
              <Painel titulo={`${fmtN(lista.length)} lotes`} subtitulo="Clique num lote para ver as guias e os exames." icone={FileStack}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2">Lote</th><th className="bg-slate-50 px-3 py-2">Convênio</th><th className="bg-slate-50 px-3 py-2">Competência</th>
                      <th className="bg-slate-50 px-3 py-2">Envio / vencimento</th><th className="bg-slate-50 px-3 py-2 text-right">Apresentado</th><th className="bg-slate-50 px-3 py-2 text-right">Recebido</th>
                      <th className="bg-slate-50 px-3 py-2 text-right">Guias / exames</th><th className="bg-slate-50 px-3 py-2">Situação</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Responsável</th>
                    </tr></thead>
                    <tbody>
                      {lista.slice(0, 400).map(x => {
                        const ex = exames[x.cdLancamento];
                        return (
                          <Fragment key={x.cdLancamento}>
                            <tr onClick={() => void abrir(x.cdLancamento)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                              <td className="whitespace-nowrap px-3 py-2"><span className="flex items-center gap-1 font-bold">{aberto === x.cdLancamento ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{x.numero ?? x.cdLancamento}</span><span className="block pl-5 text-xs text-slate-400">título {x.cdLancamento}{x.documento ? ` · doc. ${x.documento}` : ""}</span></td>
                              <td className="max-w-[200px] truncate px-3 py-2" title={x.convenio ?? ""}>{x.convenio ?? "—"}</td>
                              <td className="px-3 py-2">{x.competencia ? rotuloMes(x.competencia) : "—"}</td>
                              <td className="whitespace-nowrap px-3 py-2">{data(x.emissao)}<span className="block text-xs text-slate-400">venc. {data(x.vencimento)}</span></td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatarReais(x.valor)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{x.recebido ? formatarReais(x.recebido) : "—"}{x.ultimoRecebimento && <span className="block text-xs text-slate-400">{data(x.ultimoRecebimento)}</span>}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmtN(x.guias)} / {fmtN(x.exames)}</td>
                              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SITUACAO[x.situacao][1]}`}>{SITUACAO[x.situacao][0]}</span></td>
                              <td className="max-w-[160px] truncate px-3 py-2 text-xs text-slate-500">{x.responsavel ?? "—"}</td>
                            </tr>
                            {aberto === x.cdLancamento && (
                              <tr className="border-b border-slate-100 bg-slate-50/60"><td colSpan={9} className="px-6 py-3">
                                {ex === "carregando" || ex === undefined ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Carregando os exames…</p>
                                  : typeof ex === "string" ? <p className="text-sm text-red-600">{ex}</p>
                                    : !ex.length ? <p className="text-sm text-slate-400">Nenhum exame ligado a este lote.</p> : (
                                      <table className="w-full text-xs">
                                        <thead><tr className="text-left text-slate-500"><th className="px-2 py-1">Guia</th><th className="px-2 py-1">Exame / atend.</th><th className="px-2 py-1">Data</th><th className="px-2 py-1">Procedimento</th><th className="px-2 py-1 text-right">Valor</th><th className="px-2 py-1 text-right">Glosa</th><th className="px-2 py-1">Motivo</th></tr></thead>
                                        <tbody>{ex.slice(0, 500).map(e => (
                                          <tr key={e.cdExame} className="border-t border-slate-200"><td className="px-2 py-1">{e.guia ?? "—"}</td><td className="px-2 py-1">{e.cdExame} / {e.cdAtendimento}</td><td className="px-2 py-1">{data(e.data)}</td><td className="px-2 py-1">{e.procedimento ?? "—"}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{formatarReais(e.valor)}</td><td className="px-2 py-1 text-right tabular-nums text-red-600">{e.glosa ? formatarReais(e.glosa) : ""}</td><td className="px-2 py-1">{e.motivo ?? ""}</td></tr>
                                        ))}</tbody>
                                      </table>
                                    )}
                              </td></tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>
            <p className="text-xs text-slate-400">Lote = fatura de convênio no Clinux. O Clinux não guarda o status do lote na operadora: a situação vem das parcelas do título (recebida, recebida em parte, aguardando ou atrasada quando venceu sem recebimento). Protocolo, valor processado e motivo de rejeição só existem nos retornos TISS importados, que não são usados todo mês. Filtros de modalidade e procedimento não se aplicam aos lotes.</p>
          </div>
        )}
      </div>
    </main>
  );
}
