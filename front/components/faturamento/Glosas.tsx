"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, CalendarRange, Download, FileSearch, Gavel, Layers, Receipt, Repeat, Scale, ShieldAlert, Stethoscope, TrendingUp, Undo2 } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import {
  ROTULO_CATEGORIA_GLOSA, ROTULO_RECURSO, aumentosAnormais, categoriaGlosa, motivosRecorrentes, pct, situacaoRecurso,
  type ExameGlosado, type RespostaGlosas, type SituacaoRecurso,
} from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
type Dim = "convenio" | "modalidade" | "procedimento" | "motivo" | "categoria";

export default function GlosasRecursos() {
  const [f, setF] = useFiltrosFaturamento("trimestre");
  const { dados, carregando, erro, atualizar } = useResumo<RespostaGlosas>("/api/backend/clinux/faturamento/glosas", f);
  const [dim, setDim] = useState<Dim>("convenio");
  const [taxaDim, setTaxaDim] = useState<"convenio" | "modalidade" | "procedimento">("convenio");
  const [filtroRecurso, setFiltroRecurso] = useState<"todas" | SituacaoRecurso>("todas");

  const nomeConv = (id: number | null) => (id === null ? "Sem convênio" : dados?.nomes.convenios[id] ?? `Convênio ${id}`);
  const nomeMod = (id: number | null) => (id === null ? "Sem modalidade" : dados?.nomes.modalidades[id] ?? `Modalidade ${id}`);
  const nomeProc = (id: number | null) => (id === null ? "Sem procedimento" : dados?.nomes.procedimentos[id] ?? `Procedimento ${id}`);
  const nomeMotivo = (e: Pick<ExameGlosado, "codigo" | "motivo">) => `${e.codigo ? `${e.codigo} · ` : ""}${e.motivo ?? "Sem motivo"}`;

  const v = useMemo(() => {
    if (!dados) return null;
    const ex = dados.exames;
    const glosa = ex.reduce((s, e) => s + e.glosa, 0);
    const faturado = dados.base.reduce((s, b) => s + b.faturado, 0), guiasFat = dados.base.reduce((s, b) => s + b.guias, 0);
    const sit = (s: SituacaoRecurso) => ex.filter(e => situacaoRecurso(e) === s);
    const somaG = (l: ExameGlosado[]) => l.reduce((s, e) => s + e.glosa, 0);
    const comRecurso = ex.filter(e => e.dataRecurso);
    const recorrido = ex.reduce((s, e) => s + e.recorrido, 0), recebido = ex.reduce((s, e) => s + e.recebido, 0);
    const respostas = ex.filter(e => e.dataRecurso && e.dataRecebimento).map(e => (Date.parse(e.dataRecebimento!) - Date.parse(e.dataRecurso!)) / 86_400_000).filter(d => d >= 0);
    const agrupar = (chave: (e: ExameGlosado) => string) => {
      const m = new Map<string, { chave: string; glosa: number; exames: number; recorrido: number; recebido: number }>();
      for (const e of ex) { const k = chave(e); const g = m.get(k) ?? { chave: k, glosa: 0, exames: 0, recorrido: 0, recebido: 0 }; g.glosa += e.glosa; g.exames++; g.recorrido += e.recorrido; g.recebido += e.recebido; m.set(k, g); }
      return [...m.values()].sort((a, b) => b.glosa - a.glosa);
    };
    return {
      glosa, exames: ex.length, guias: new Set(ex.map(e => e.guia).filter(Boolean)).size, procedimentos: new Set(ex.map(e => e.cdProcedimento)).size,
      taxa: pct(glosa, faturado), pctGuias: pct(new Set(ex.map(e => e.guia).filter(Boolean)).size, guiasFat), medio: ex.length ? glosa / ex.length : 0,
      comRecurso: somaG(comRecurso), semRecurso: somaG(sit("sem_recurso")), emAnalise: somaG(sit("em_analise")), revertido: recebido, definitivas: somaG(sit("definitiva")),
      recorrido, qtdRecursos: comRecurso.length, aceitos: sit("revertido").length, negadosOuAceitos: sit("definitiva").length,
      tempoResposta: respostas.length ? Math.round((respostas.reduce((a, b) => a + b, 0) / respostas.length) * 10) / 10 : null,
      por: {
        convenio: agrupar(e => nomeConv(e.cdConvenio)), modalidade: agrupar(e => nomeMod(e.cdModalidade)), procedimento: agrupar(e => nomeProc(e.cdProcedimento)),
        motivo: agrupar(nomeMotivo), categoria: agrupar(e => ROTULO_CATEGORIA_GLOSA[categoriaGlosa(e.codigo)]),
      },
      competencia: agrupar(e => e.data.slice(0, 7)).sort((a, b) => a.chave.localeCompare(b.chave)),
      retornoData: agrupar(e => (e.dataGlosa ?? "").slice(0, 7)).filter(x => x.chave).sort((a, b) => a.chave.localeCompare(b.chave)),
      recorrentes: motivosRecorrentes(dados.historico), anormais: aumentosAnormais(dados.historico),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  // Taxa de glosa = glosado / faturado do grupo.
  const taxas = useMemo(() => {
    if (!dados) return [];
    const chave = (x: { cdConvenio: number | null; cdModalidade: number | null; cdProcedimento: number | null }) => (taxaDim === "convenio" ? x.cdConvenio : taxaDim === "modalidade" ? x.cdModalidade : x.cdProcedimento);
    const nome = (id: number | null) => (taxaDim === "convenio" ? nomeConv(id) : taxaDim === "modalidade" ? nomeMod(id) : nomeProc(id));
    const base = new Map<string, number>(), gl = new Map<string, number>();
    for (const b of dados.base) base.set(String(chave(b)), (base.get(String(chave(b))) ?? 0) + b.faturado);
    for (const e of dados.exames) gl.set(String(chave(e)), (gl.get(String(chave(e))) ?? 0) + e.glosa);
    return [...gl.entries()].filter(([, g]) => g > 0).map(([k, g]) => ({ chave: k, nome: nome(k === "null" ? null : Number(k)), valor: pct(g, base.get(k) ?? 0) ?? 0, detalhe: `${R(g)} de ${R(base.get(k) ?? 0)}` })).sort((a, b) => b.valor - a.valor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, taxaDim]);

  const lista = useMemo(() => (dados?.exames ?? []).filter(e => filtroRecurso === "todas" || situacaoRecurso(e) === filtroRecurso), [dados, filtroRecurso]);
  const retornoMes = useMemo(() => {
    const m = new Map<string, { apresentado: number; glosado: number; liberado: number }>();
    for (const r of dados?.retorno ?? []) { const g = m.get(r.mes) ?? { apresentado: 0, glosado: 0, liberado: 0 }; g.apresentado += r.apresentado; g.glosado += r.glosado; g.liberado += r.liberado; m.set(r.mes, g); }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [dados]);

  function exportar() {
    const cab = ["Exame", "Atendimento", "Data do exame", "Data da glosa", "Convênio", "Modalidade", "Procedimento", "Guia", "Lote", "Código", "Motivo", "Categoria", "Valor do exame", "Glosa", "Recurso em", "Recorrido", "Recebido", "Recebido em", "Situação do recurso", "Protocolo", "Justificativa"];
    const corpo = lista.map(e => [e.cdExame, e.cdAtendimento, e.data, e.dataGlosa ?? "", nomeConv(e.cdConvenio), nomeMod(e.cdModalidade), nomeProc(e.cdProcedimento), e.guia ?? "", e.lote ?? "", e.codigo ?? "", e.motivo ?? "", ROTULO_CATEGORIA_GLOSA[categoriaGlosa(e.codigo)], e.valorExame.toFixed(2).replace(".", ","), e.glosa.toFixed(2).replace(".", ","), e.dataRecurso ?? "", e.recorrido.toFixed(2).replace(".", ","), e.recebido.toFixed(2).replace(".", ","), e.dataRecebimento ?? "", ROTULO_RECURSO[situacaoRecurso(e)], e.protocolo ?? "", e.justificativa ?? ""]);
    const csv = [cab, ...corpo].map(l => l.map(y => `"${String(y).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `glosas-${f.inicio}-a-${f.fim}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando as glosas…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/glosas" titulo="Glosas e recursos" icone={ShieldAlert} descricao="Glosas registradas nos exames do Clinux (motivo TISS), recursos e valores revertidos."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} />
        <p className="-mt-3 px-1 text-xs text-slate-500">Nesta tela, “Data de envio” filtra pela <b>data da glosa</b> (retorno da operadora).</p>
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <Secao titulo="Glosas">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Valor inicialmente glosado" valor={R(v.glosa)} icone={ShieldAlert} variacao={null} detalhe={`${fmtN(v.exames)} procedimentos glosados · valor médio ${formatarReais(v.medio)}`} destaque={COR.critico} />
                <Kpi titulo="Percentual de glosa inicial" valor={fmtP(v.taxa)} icone={BadgePercent} variacao={null} detalhe="glosado ÷ faturado dos exames do período" destaque={COR.critico} />
                <Kpi titulo="Guias glosadas" valor={fmtN(v.guias)} icone={Receipt} variacao={null} detalhe={`${fmtP(v.pctGuias)} das guias faturadas · ${fmtN(v.procedimentos)} procedimentos diferentes`} destaque={COR.atencao} />
                <Kpi titulo="Glosas definitivas" valor={R(v.definitivas)} icone={Gavel} variacao={null} detalhe="glosa aceita no Clinux" destaque={COR.texto} />
              </div>
            </Secao>

            <Secao titulo="Recursos">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Glosas com recurso" valor={R(v.comRecurso)} icone={FileSearch} variacao={null} detalhe={`${fmtN(v.qtdRecursos)} procedimentos · sem recurso: ${R(v.semRecurso)}`} destaque={COR.primaria} />
                <Kpi titulo="Valor recorrido" valor={R(v.recorrido)} icone={Scale} variacao={null} detalhe="valor do recurso registrado" destaque={COR.secundaria} />
                <Kpi titulo="Valor revertido (recebido)" valor={R(v.revertido)} icone={Undo2} variacao={null} detalhe={`${fmtP(pct(v.revertido, v.recorrido))} do recorrido · ${fmtN(v.aceitos)} procedimentos`} destaque={COR.ok} />
                <Kpi titulo="Em análise" valor={R(v.emAnalise)} icone={CalendarRange} variacao={null} detalhe={`com recurso e sem recebimento — não é perda · resposta média ${v.tempoResposta === null ? "—" : `${v.tempoResposta.toLocaleString("pt-BR")} dias`}`} destaque={COR.atencao} />
              </div>
            </Secao>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Glosas por" icone={Layers}
                acao={<Alternador valor={dim} onChange={x => setDim(x as Dim)} opcoes={[["convenio", "Convênio"], ["modalidade", "Modalidade"], ["procedimento", "Procedimento"], ["motivo", "Motivo"], ["categoria", "Categoria"]]} />}>
                <RankingBarras itens={v.por[dim].map(g => ({ chave: g.chave, nome: g.chave, valor: g.glosa, detalhe: `${fmtN(g.exames)} proc.${g.recebido ? ` · revertido ${R(g.recebido)}` : ""}` }))} cor={COR.critico} limite={12} vazio="Nenhuma glosa." />
              </Painel>
              <Painel titulo="Taxa de glosa por" subtitulo="Glosado ÷ faturado do grupo." icone={BadgePercent}
                acao={<Alternador valor={taxaDim} onChange={x => setTaxaDim(x as typeof taxaDim)} opcoes={[["convenio", "Convênio"], ["modalidade", "Modalidade"], ["procedimento", "Procedimento"]]} />}>
                <RankingBarras itens={taxas} formatar={x => fmtP(x)} cor={COR.critico} limite={12} vazio="Nenhuma glosa." />
              </Painel>
              <Painel titulo="Glosas por competência" subtitulo="Mês do exame." icone={CalendarRange}>
                <GraficoMensal dados={v.competencia.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.glosa }))} cor={COR.critico} rotulo="Glosa" />
              </Painel>
              <Painel titulo="Glosas por data de retorno" subtitulo="Mês em que a glosa foi registrada." icone={CalendarRange}>
                <GraficoMensal dados={v.retornoData.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.glosa }))} cor={COR.atencao} rotulo="Glosa" />
              </Painel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Motivos recorrentes" subtitulo="Códigos que aparecem em 3 ou mais dos últimos 12 meses." icone={Repeat}>
                <RankingBarras itens={v.recorrentes.map(x => ({ chave: x.codigo, nome: `${x.codigo} · ${dados.exames.find(e => e.codigo === x.codigo)?.motivo ?? ROTULO_CATEGORIA_GLOSA[categoriaGlosa(x.codigo)]}`, valor: x.glosa, detalhe: `${x.meses} meses · ${fmtN(x.exames)} proc.` }))} cor={COR.critico} limite={10} vazio="Nenhum motivo recorrente." />
              </Painel>
              <Painel titulo="Evolução mensal e aumento anormal" subtitulo="12 meses. Meses acima de 1,5× a média dos 3 anteriores ficam destacados abaixo." icone={TrendingUp}>
                <GraficoMensal dados={v.anormais.map(x => ({ mes: x.mes, rotulo: rotuloMes(x.mes), valor: x.glosa }))} cor={COR.critico} rotulo="Glosa" />
                <p className="mt-2 text-xs">{v.anormais.filter(x => x.anormal).length ? <span className="font-bold text-red-600">Aumento anormal em: {v.anormais.filter(x => x.anormal).map(x => `${rotuloMes(x.mes)} (${R(x.glosa)}, média ${R(x.media)})`).join(" · ")}</span> : <span className="text-slate-500">Nenhum aumento anormal nos últimos 12 meses.</span>}</p>
              </Painel>
            </div>

            {retornoMes.length > 0 && (
              <Painel titulo="Retornos TISS importados: apresentado × glosado" subtitulo="Dados parciais: o retorno só foi importado no Clinux em alguns meses." icone={Scale}>
                <table className="w-full text-sm">
                  <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-1.5 text-left">Mês do retorno</th><th className="px-2 py-1.5">Apresentado</th><th className="px-2 py-1.5">Liberado</th><th className="px-2 py-1.5">Glosado</th><th className="px-2 py-1.5">% glosa</th></tr></thead>
                  <tbody>{retornoMes.map(([mes, x]) => (
                    <tr key={mes} className="border-b border-slate-100 last:border-0"><td className="px-2 py-1.5 font-semibold">{rotuloMes(mes)}</td><td className="px-2 py-1.5 text-right tabular-nums">{R(x.apresentado)}</td><td className="px-2 py-1.5 text-right tabular-nums">{R(x.liberado)}</td><td className="px-2 py-1.5 text-right tabular-nums text-red-600">{R(x.glosado)}</td><td className="px-2 py-1.5 text-right font-bold tabular-nums">{fmtP(pct(x.glosado, x.apresentado))}</td></tr>
                  ))}</tbody>
                </table>
              </Painel>
            )}

            <Secao titulo="Glosas de maior impacto" acao={
              <div className="flex flex-wrap items-center gap-2">
                <Alternador valor={filtroRecurso} onChange={x => setFiltroRecurso(x as typeof filtroRecurso)} opcoes={[["todas", "Todas"], ["sem_recurso", "Sem recurso"], ["em_analise", "Em análise"], ["revertido", "Revertidas"], ["definitiva", "Definitivas"]]} />
                <button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} />CSV</button>
              </div>
            }>
              <Painel titulo={`${fmtN(lista.length)} procedimentos glosados`} subtitulo="Do maior valor para o menor (mostrando 300; o CSV tem todos)." icone={Stethoscope}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2">Exame / guia</th><th className="bg-slate-50 px-3 py-2">Convênio</th><th className="bg-slate-50 px-3 py-2">Procedimento</th>
                      <th className="bg-slate-50 px-3 py-2">Motivo</th><th className="bg-slate-50 px-3 py-2 text-right">Glosa</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Recurso</th>
                    </tr></thead>
                    <tbody>
                      {lista.slice(0, 300).map(e => {
                        const s = situacaoRecurso(e);
                        return (
                          <tr key={e.cdExame} className="border-b border-slate-100 align-top last:border-0">
                            <td className="whitespace-nowrap px-3 py-2"><b>{e.cdExame}</b><span className="block text-xs text-slate-400">guia {e.guia ?? "—"} · {data(e.data)}{e.lote ? ` · lote ${e.lote}` : ""}</span></td>
                            <td className="max-w-[180px] truncate px-3 py-2">{nomeConv(e.cdConvenio)}</td>
                            <td className="max-w-[220px] truncate px-3 py-2" title={nomeProc(e.cdProcedimento)}>{nomeProc(e.cdProcedimento)}</td>
                            <td className="max-w-[280px] px-3 py-2 text-xs"><b>{e.codigo ?? "—"}</b> {e.motivo ?? ""}<span className="block text-slate-400">{ROTULO_CATEGORIA_GLOSA[categoriaGlosa(e.codigo)]}</span></td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-red-600">{formatarReais(e.glosa)}<span className="block text-xs font-normal text-slate-400">de {formatarReais(e.valorExame)}</span></td>
                            <td className="px-3 py-2 text-xs"><span className={`rounded-full px-2 py-0.5 font-bold ${s === "revertido" ? "bg-emerald-100 text-emerald-800" : s === "em_analise" ? "bg-amber-100 text-amber-800" : s === "definitiva" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"}`}>{ROTULO_RECURSO[s]}</span>
                              {e.dataRecurso && <span className="block text-slate-500">em {data(e.dataRecurso)}{e.recorrido ? ` · ${formatarReais(e.recorrido)}` : ""}</span>}
                              {e.recebido > 0 && <span className="block text-emerald-700">recebido {formatarReais(e.recebido)} {e.dataRecebimento ? `em ${data(e.dataRecebimento)}` : ""}</span>}
                              {e.protocolo && <span className="block text-slate-400">protocolo {e.protocolo}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Painel>
            </Secao>
            <p className="text-xs text-slate-400">Categorias pelo código TISS do motivo (14xx autorização, 17xx valor/contratual, 18xx e 20–29xx técnica, 30–31xx documentação, 10–13xx administrativa). Recurso em análise não é perda e valor revertido só conta quando recebido. Glosas por unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
