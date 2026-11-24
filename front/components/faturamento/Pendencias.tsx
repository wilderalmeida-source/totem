"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, Clock3, Download, FileWarning, Hourglass, KeyRound, Layers, ListChecks, Receipt, Search, Stethoscope, TrendingDown } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { ROTULO_TIPO_PENDENCIA, diasMedios, pct, resumoPendencias, tipoPendencia, type RespostaPendencias, type RespostaResumo } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const LIMITE_TABELA = 300;

export default function ProducaoPendente() {
  const [f, setF] = useFiltrosFaturamento("trimestre");
  const filtros = { ...f, base: "realizacao" as const };
  const p = useResumo<RespostaPendencias>("/api/backend/clinux/faturamento/pendencias", filtros);
  const r = useResumo<RespostaResumo>("/api/backend/clinux/faturamento/resumo", filtros);
  const [ordem, setOrdem] = useState<"antigos" | "valor">("antigos");
  const [busca, setBusca] = useState("");
  const [agrupar, setAgrupar] = useState<"convenio" | "modalidade" | "procedimento" | "motivo" | "tipo">("convenio");

  const v = useMemo(() => (p.dados ? resumoPendencias(p.dados.exames) : null), [p.dados]);
  const lista = useMemo(() => {
    if (!p.dados) return [];
    const b = busca.trim().toLowerCase();
    const l = b ? p.dados.exames.filter(e => [e.cdExame, e.cdAtendimento, e.convenio, e.procedimento, e.modalidade, e.motivo, e.guia].join(" ").toLowerCase().includes(b)) : p.dados.exames;
    return [...l].sort((a, z) => (ordem === "valor" ? z.valor - a.valor : z.dias - a.dias));
  }, [p.dados, busca, ordem]);

  function exportar() {
    const cab = ["Exame", "Atendimento", "Data de realização", "Dias pendente", "Convênio", "Modalidade", "Código do procedimento", "Procedimento", "Valor faturável", "Guia", "Autorização", "Validade da autorização", "Tipo", "Motivo", "Pendência desde", "Observação"];
    const corpo = lista.map(e => [e.cdExame, e.cdAtendimento, e.data, e.dias, e.convenio ?? "", e.modalidade ?? "", e.cdProcedimento ?? "", e.procedimento ?? "", e.valor.toFixed(2).replace(".", ","), e.guia ?? "", e.autorizacao ?? "", e.validade ?? "", ROTULO_TIPO_PENDENCIA[tipoPendencia(e)], e.motivo ?? "", e.pendenciaDesde ?? "", e.observacao ?? ""]);
    const csv = [cab, ...corpo].map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `producao-pendente-${f.inicio}-a-${f.fim}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const grupos = v ? { convenio: v.porConvenio, modalidade: v.porModalidade, procedimento: v.porProcedimento, motivo: v.porMotivo, tipo: v.porTipo }[agrupar] : [];
  const carregando = p.carregando || r.carregando;

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Procurando a produção pendente…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/pendencias" titulo="Produção pendente de faturamento" icone={FileWarning}
          descricao="Exames de convênio realizados e ainda sem fatura. Esta tela só mostra os problemas: a correção é feita no Clinux."
          atualizadoEm={p.dados?.atualizadoEm} carregando={carregando} onAtualizar={() => { p.atualizar(); r.atualizar(); }} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {(p.erro || r.erro) && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{p.erro || r.erro}</div>}

        {p.dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Exames realizados e não faturados" valor={fmtN(v.exames)} icone={FileWarning} variacao={null} detalhe={`${r.dados ? fmtP(pct(r.dados.totais.examesPendentes, r.dados.totais.examesConvenio)) : "—"} dos exames de convênio do período`} destaque={COR.atencao} />
              <Kpi titulo="Valor faturável pendente" valor={R(v.valor)} icone={Receipt} variacao={null} detalhe={r.dados ? `${fmtP(pct(r.dados.totais.pendente, r.dados.totais.faturavel))} pendente · ${fmtP(pct(r.dados.totais.faturado, r.dados.totais.faturavel))} faturado` : ""} destaque={COR.critico} />
              <Kpi titulo="Pendentes há quanto tempo" valor={v.diasMedios === null ? "—" : `${v.diasMedios.toLocaleString("pt-BR")} dias`} icone={Hourglass} variacao={null} detalhe="média desde a realização" destaque={COR.secundaria} />
              <Kpi titulo="Tempo médio até faturar" valor={r.dados && diasMedios(r.dados.totais) !== null ? `${diasMedios(r.dados.totais)!.toLocaleString("pt-BR")} dias` : "—"} icone={Clock3} variacao={null} detalhe="dos exames já faturados no período" destaque={COR.primaria} />
              <Kpi titulo="Pendências de autorização" valor={fmtN(v.porTipo.find(t => t.chave === ROTULO_TIPO_PENDENCIA.autorizacao)?.exames ?? 0)} icone={KeyRound} variacao={null} detalhe={`${fmtN(v.semAutorizacao)} sem autorização · ${fmtN(v.autorizacaoVencida)} com validade vencida`} destaque={COR.critico} />
              <Kpi titulo="Pendências de documentação" valor={fmtN(v.porTipo.find(t => t.chave === ROTULO_TIPO_PENDENCIA.documentacao)?.exames ?? 0)} icone={ListChecks} variacao={null} detalhe="assinatura, pedido médico, digitalização" destaque={COR.atencao} />
              <Kpi titulo="Sem guia" valor={fmtN(v.semGuia)} icone={Receipt} variacao={null} detalhe="exames pendentes sem número de guia" destaque={COR.atencao} />
              <Kpi titulo="Com motivo informado" valor={fmtN(p.dados.exames.filter(e => e.motivo).length)} icone={Search} variacao={null} detalhe="pendência registrada no Clinux" destaque={COR.texto} />
            </div>

            <Painel titulo="Por antiguidade" subtitulo="Quantidade e valor por tempo desde a realização." icone={Hourglass}>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {v.faixas.map(x => (
                  <div key={x.id} className={`rounded-2xl border p-4 ${x.min > 7 ? "border-red-200 bg-red-50/40" : "border-slate-200"}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{x.rotulo}</p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{fmtN(x.exames)}</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-600">{R(x.valor)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Acumulado: {v.maisDe.map(m => `mais de ${m.dias} dia${m.dias > 1 ? "s" : ""}: ${fmtN(m.exames)} (${R(m.valor)})`).join(" · ")}.</p>
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Pendências por" icone={Layers}
                acao={<Alternador valor={agrupar} onChange={x => setAgrupar(x as typeof agrupar)} opcoes={[["convenio", "Convênio"], ["modalidade", "Modalidade"], ["procedimento", "Procedimento"], ["motivo", "Motivo"], ["tipo", "Tipo"]]} />}>
                <RankingBarras itens={grupos.map(g => ({ chave: g.chave, nome: g.chave, valor: g.valor, detalhe: `${fmtN(g.exames)} exames` }))} cor={COR.atencao} limite={12} vazio="Nenhuma pendência." />
              </Painel>
              <Painel titulo="Evolução das pendências" subtitulo="Produção de convênio ainda sem fatura no fim de cada mês (exames de até 1 ano)." icone={TrendingDown}>
                <GraficoMensal dados={[...p.dados.evolucao].sort((a, b) => a.mes.localeCompare(b.mes)).map(x => ({ mes: x.mes, rotulo: rotuloMes(x.mes), valor: x.valor }))} cor={COR.atencao} rotulo="Pendente" />
              </Painel>
            </div>
            <Painel titulo="Pendências por data de realização" icone={CalendarRange}>
              <GraficoMensal dados={v.porData.map(x => ({ mes: x.chave, rotulo: x.chave.split("-").reverse().slice(0, 2).join("/"), valor: x.valor }))} cor={COR.critico} rotulo="Pendente" />
            </Painel>

            <Secao titulo="Relação dos exames pendentes" acao={
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><Search size={15} className="text-slate-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar exame, convênio, motivo…" className="w-56 bg-transparent outline-none" /></label>
                <Alternador valor={ordem} onChange={x => setOrdem(x as typeof ordem)} opcoes={[["antigos", "Mais antigos"], ["valor", "Maior valor"]]} />
                <button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} />CSV</button>
              </div>
            }>
              <Painel titulo={`${fmtN(lista.length)} exames${lista.length > LIMITE_TABELA ? ` · mostrando ${LIMITE_TABELA} (o CSV tem todos)` : ""}`} subtitulo={p.dados.exames.length >= p.dados.limite ? `Limite de ${fmtN(p.dados.limite)} exames atingido: use os filtros.` : "Use os filtros de convênio e modalidade no topo."} icone={Stethoscope}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2">Exame / atend.</th><th className="bg-slate-50 px-3 py-2">Realização</th><th className="bg-slate-50 px-3 py-2">Convênio</th>
                      <th className="bg-slate-50 px-3 py-2">Procedimento</th><th className="bg-slate-50 px-3 py-2 text-right">Valor</th><th className="bg-slate-50 px-3 py-2">Guia / autorização</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Motivo</th>
                    </tr></thead>
                    <tbody>
                      {lista.slice(0, LIMITE_TABELA).map(e => (
                        <tr key={e.cdExame} className="border-b border-slate-100 align-top last:border-0">
                          <td className="whitespace-nowrap px-3 py-2"><b>{e.cdExame}</b><span className="block text-xs text-slate-400">atend. {e.cdAtendimento}</span></td>
                          <td className="whitespace-nowrap px-3 py-2">{data(e.data)}<span className={`block text-xs font-bold ${e.dias > 30 ? "text-red-600" : e.dias > 7 ? "text-amber-600" : "text-slate-400"}`}>{e.dias} dias</span></td>
                          <td className="max-w-[180px] truncate px-3 py-2" title={e.convenio ?? ""}>{e.convenio ?? "—"}<span className="block text-xs text-slate-400">{e.modalidade ?? ""}</span></td>
                          <td className="max-w-[240px] truncate px-3 py-2" title={e.procedimento ?? ""}>{e.procedimento ?? "—"}<span className="block text-xs text-slate-400">código {e.cdProcedimento ?? "—"}</span></td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{formatarReais(e.valor)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs">{e.guia ?? <span className="font-bold text-red-600">sem guia</span>}<span className="block text-slate-500">{e.autorizacao ? `aut. ${e.autorizacao}${e.validade ? ` · val. ${data(e.validade)}` : ""}` : <span className="font-bold text-red-600">sem autorização</span>}</span></td>
                          <td className="max-w-[260px] px-3 py-2 text-xs">{e.motivo ? <b className="text-slate-700">{e.motivo}</b> : <span className="text-slate-400">sem motivo informado</span>}{e.pendenciaDesde && <span className="block text-slate-400">desde {data(e.pendenciaDesde)}</span>}{e.observacao && <span className="block text-slate-500">{e.observacao}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>
            <p className="text-xs text-slate-400">Pendente = exame de convênio sem fatura no Clinux. Motivo = pendência ativa do exame (cadastro de pendências do Clinux). Link direto para o Clinux: não há endereço autorizado conhecido; use o número do exame/atendimento para localizar.</p>
          </div>
        )}
      </div>
    </main>
  );
}
