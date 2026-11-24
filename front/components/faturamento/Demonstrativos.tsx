"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Clock3, FileQuestion, FileSearch, Loader2, Receipt, Scale, TrendingUp, Wallet } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { demonstrativoPendente, pct, situacaoTiss, type ItemDemonstrativo, type RespostaDemonstrativos } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const RC = (n: number) => formatarReais(n);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default function DemonstrativosRetorno() {
  const [f, setF] = useFiltrosFaturamento("ano");
  const { dados, carregando, erro, atualizar } = useResumo<RespostaDemonstrativos>("/api/backend/clinux/faturamento/demonstrativos", f);
  const [aberto, setAberto] = useState<number | null>(null);
  const [itens, setItens] = useState<Record<number, ItemDemonstrativo[] | "carregando" | string>>({});
  const [soDivergentes, setSoDivergentes] = useState(true);

  const v = useMemo(() => {
    if (!dados) return null;
    const d = dados.demonstrativos;
    const soma = (k: "informado" | "processado" | "liberado" | "glosado" | "pagos" | "linhas" | "divergentes") => d.reduce((s, x) => s + x[k], 0);
    const tempos = d.filter(x => x.data && x.protocoloData).map(x => (Date.parse(x.data!) - Date.parse(x.protocoloData!)) / 86_400_000).filter(x => x >= 0);
    const agrupar = (chave: (x: (typeof d)[number]) => string) => {
      const m = new Map<string, { chave: string; liberado: number; informado: number; glosado: number; qtd: number }>();
      for (const x of d) { const k = chave(x); const g = m.get(k) ?? { chave: k, liberado: 0, informado: 0, glosado: 0, qtd: 0 }; g.liberado += x.liberado; g.informado += x.informado; g.glosado += x.glosado; g.qtd++; m.set(k, g); }
      return [...m.values()];
    };
    return {
      qtd: d.length, informado: soma("informado"), processado: soma("processado"), liberado: soma("liberado"), glosado: soma("glosado"), pagos: soma("pagos"),
      linhas: soma("linhas"), divergentes: soma("divergentes"), comDivergencia: d.filter(x => x.divergentes > 0).length, pendentes: d.filter(demonstrativoPendente).length,
      tempo: tempos.length ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10 : null,
      porConvenio: agrupar(x => x.convenio ?? "Sem convênio").sort((a, b) => b.liberado - a.liberado),
      porMes: agrupar(x => (x.data ?? "").slice(0, 7)).filter(x => x.chave).sort((a, b) => a.chave.localeCompare(b.chave)),
    };
  }, [dados]);

  async function abrir(cd: number) {
    setAberto(a => (a === cd ? null : cd));
    if (itens[cd]) return;
    setItens(x => ({ ...x, [cd]: "carregando" }));
    try {
      const r = await fetch(`/api/backend/clinux/faturamento/demonstrativos/${cd}/itens`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Erro");
      setItens(x => ({ ...x, [cd]: j.itens }));
    } catch (e) { setItens(x => ({ ...x, [cd]: e instanceof Error ? e.message : "Erro" })); }
  }

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando os demonstrativos…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/demonstrativos" titulo="Demonstrativos de retorno" icone={FileSearch} descricao="O que foi apresentado à operadora contra o que ela informou ter processado, liberado e glosado (retornos TISS importados no Clinux)."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p><b>Dados parciais:</b> o retorno TISS só foi importado no Clinux em alguns meses (o levantamento mostrou retornos em 2025 e em jan/2026). Meses sem importação aparecem sem demonstrativo. Esta tela não altera demonstrativos nem confirma pagamentos.</p>
        </div>
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Demonstrativos" valor={fmtN(v.qtd)} icone={FileSearch} variacao={null} detalhe={`${fmtN(v.linhas)} itens · ${fmtN(v.pendentes)} com situação pendente`} destaque={COR.primaria} />
              <Kpi titulo="Valor apresentado" valor={R(v.informado)} icone={Receipt} variacao={null} detalhe={`processado ${R(v.processado)}`} destaque={COR.texto} />
              <Kpi titulo="Valor liberado" valor={R(v.liberado)} icone={Wallet} variacao={null} detalhe={`${fmtP(pct(v.liberado, v.informado))} do apresentado · informado como pago ${R(v.pagos)}`} destaque={COR.ok} />
              <Kpi titulo="Valor glosado" valor={R(v.glosado)} icone={AlertTriangle} variacao={null} detalhe={`${fmtP(pct(v.glosado, v.informado))} do apresentado`} destaque={COR.critico} />
              <Kpi titulo="Apresentado − liberado" valor={R(v.informado - v.liberado)} icone={Scale} variacao={null} detalhe={`processado − liberado: ${R(v.processado - v.liberado)}`} destaque={COR.atencao} />
              <Kpi titulo="Com divergências" valor={fmtN(v.comDivergencia)} icone={Scale} variacao={null} detalhe={`${fmtN(v.divergentes)} itens em que apresentado ≠ liberado + glosado`} destaque={COR.atencao} />
              <Kpi titulo="Guias sem retorno identificado" valor={fmtN(dados.semRetorno.guias)} icone={FileQuestion} variacao={null} detalhe={`${fmtN(dados.semRetorno.exames)} de ${fmtN(dados.semRetorno.faturados)} exames faturados no período · ${R(dados.semRetorno.valor)}`} destaque={COR.critico} />
              <Kpi titulo="Envio → retorno" valor={v.tempo === null ? "—" : `${v.tempo.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="data do protocolo até o retorno" destaque={COR.secundaria} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Evolução dos valores liberados" subtitulo="Por mês do retorno." icone={TrendingUp}><GraficoMensal dados={v.porMes.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.liberado }))} cor={COR.ok} rotulo="Liberado" /></Painel>
              <Painel titulo="Evolução das diferenças" subtitulo="Apresentado − liberado por mês do retorno." icone={Scale}><GraficoMensal dados={v.porMes.map(x => ({ mes: x.chave, rotulo: rotuloMes(x.chave), valor: x.informado - x.liberado }))} cor={COR.atencao} rotulo="Diferença" /></Painel>
              <Painel titulo="Demonstrativos por convênio" icone={Receipt} className="xl:col-span-2"><RankingBarras itens={v.porConvenio.map(x => ({ chave: x.chave, nome: x.chave, valor: x.liberado, detalhe: `${x.qtd} demonstr. · ${fmtP(pct(x.liberado, x.informado))} liberado` }))} limite={10} cor={COR.ok} vazio="Nenhum retorno importado no período." /></Painel>
            </div>

            <Painel titulo="Consulta de demonstrativos" subtitulo="Clique num demonstrativo para ver os itens." icone={FileSearch}
              acao={<label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={soDivergentes} onChange={e => setSoDivergentes(e.target.checked)} className="h-4 w-4 accent-blue-600" />Itens: só divergências e glosas</label>}>
              {dados.demonstrativos.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1150px] text-sm">
                    <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                      <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Demonstrativo</th><th className="bg-slate-50 px-3 py-2 text-left">Operadora</th><th className="bg-slate-50 px-3 py-2 text-left">Protocolo</th>
                      <th className="bg-slate-50 px-3 py-2">Apresentado</th><th className="bg-slate-50 px-3 py-2">Processado</th><th className="bg-slate-50 px-3 py-2">Liberado</th><th className="bg-slate-50 px-3 py-2">Glosado</th>
                      <th className="bg-slate-50 px-3 py-2">Guias</th><th className="rounded-r-xl bg-slate-50 px-3 py-2 text-left">Situação</th>
                    </tr></thead>
                    <tbody>
                      {dados.demonstrativos.map(d => {
                        const it = itens[d.cdRetorno];
                        return (
                          <Fragment key={d.cdRetorno}>
                            <tr onClick={() => void abrir(d.cdRetorno)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                              <td className="whitespace-nowrap px-3 py-2"><span className="flex items-center gap-1 font-bold">{aberto === d.cdRetorno ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{d.demonstrativo ?? d.cdRetorno}</span><span className="block pl-5 text-xs text-slate-400">retorno {data(d.data)}{d.descricao ? ` · ${d.descricao}` : ""}</span></td>
                              <td className="max-w-[180px] truncate px-3 py-2">{d.convenio ?? "—"}</td>
                              <td className="max-w-[160px] truncate px-3 py-2 text-xs" title={d.protocolos ?? ""}>{d.protocolos ?? "—"}<span className="block text-slate-400">{data(d.protocoloData)}</span></td>
                              <td className="px-3 py-2 text-right tabular-nums">{RC(d.informado)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{RC(d.processado)}</td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{RC(d.liberado)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-red-600">{d.glosado ? RC(d.glosado) : "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{fmtN(d.guias)}{d.divergentes ? <span className="block text-xs font-bold text-amber-700">{d.divergentes} diverg.</span> : null}</td>
                              <td className="px-3 py-2 text-xs">{d.situacoes.length ? d.situacoes.map(situacaoTiss).join(", ") : "sem situação"}</td>
                            </tr>
                            {aberto === d.cdRetorno && (
                              <tr className="border-b border-slate-100 bg-slate-50/60"><td colSpan={9} className="px-6 py-3">
                                {it === "carregando" || it === undefined ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={15} className="animate-spin" />Carregando os itens…</p>
                                  : typeof it === "string" ? <p className="text-sm text-red-600">{it}</p> : (
                                    <table className="w-full text-xs">
                                      <thead><tr className="text-left text-slate-500"><th className="px-2 py-1">Guia</th><th className="px-2 py-1">Procedimento</th><th className="px-2 py-1 text-right">Apresentado</th><th className="px-2 py-1 text-right">Processado</th><th className="px-2 py-1 text-right">Liberado</th><th className="px-2 py-1 text-right">Glosado</th><th className="px-2 py-1">Glosa / situação</th><th className="px-2 py-1">Exame</th></tr></thead>
                                      <tbody>{it.filter(x => !soDivergentes || x.glosado > 0 || Math.abs(x.informado - x.liberado - x.glosado) > 0.01).slice(0, 500).map((x, i) => {
                                        const div = Math.abs(x.informado - x.liberado - x.glosado) > 0.01;
                                        return (
                                          <tr key={i} className={`border-t border-slate-200 ${div ? "bg-amber-50" : ""}`}>
                                            <td className="px-2 py-1">{x.guia ?? "—"}<span className="block text-slate-400">{data(x.realizado)}</span></td>
                                            <td className="px-2 py-1">{x.codigo ? `${x.codigo} · ` : ""}{x.procedimento ?? "—"}{x.quantidade && x.quantidade > 1 ? ` ×${x.quantidade}` : ""}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{RC(x.informado)}</td><td className="px-2 py-1 text-right tabular-nums">{RC(x.processado)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{RC(x.liberado)}</td><td className="px-2 py-1 text-right tabular-nums text-red-600">{x.glosado ? RC(x.glosado) : ""}</td>
                                            <td className="px-2 py-1">{x.glosaCodigo ? `${x.glosaCodigo} ` : ""}{x.glosa ?? ""}<span className="block text-slate-400">{situacaoTiss(x.situacao)}{div ? " · valores não fecham" : ""}</span></td>
                                            <td className="px-2 py-1">{x.cdExame ?? <span className="text-amber-700">não ligado</span>}</td>
                                          </tr>
                                        );
                                      })}</tbody>
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
              ) : <p className="py-10 text-center text-sm text-slate-400">Nenhum retorno TISS importado no período. Experimente o período “Ano” ou datas de 2025.</p>}
            </Painel>
          </div>
        )}
      </div>
    </main>
  );
}
