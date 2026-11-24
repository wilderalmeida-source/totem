"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, BadgeDollarSign, CalendarRange, CheckCircle2, Clock3, FileSpreadsheet, FileStack, FileWarning, Layers, Receipt, ShieldAlert, Stethoscope,
  TrendingUp, Wallet,
} from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { GraficoProducaoFaturado } from "@/components/faturamento/graficos";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { diasMedios, pct, serie, taxaGlosa, ticket, variacao, type Grupo, type RespostaResumo } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

export default function VisaoGeralFaturamento() {
  const [f, setF] = useFiltrosFaturamento();
  const { dados, carregando, erro, atualizar } = useResumo<RespostaResumo>("/api/backend/clinux/faturamento/resumo", f);
  const [criterio, setCriterio] = useState<"faturado" | "faturavel" | "exames">("faturado");

  const v = useMemo(() => {
    if (!dados) return null;
    const t = dados.totais, a = dados.anterior;
    const enviado = dados.faturas.reduce((s, x) => s + x.valor, 0), faturasQtd = dados.faturas.reduce((s, x) => s + x.faturas, 0);
    const recebido = dados.faturas.reduce((s, x) => s + x.recebido, 0);
    const dias = serie(dados.dias, dados.periodo.inicio, dados.periodo.fim, "dia");
    const mensal = [...dados.mensal].sort((x, y) => x.mes.localeCompare(y.mes)).map(m => ({ ...m, rotulo: rotuloMes(m.mes), ticket: ticket(m) }));
    const ultimo = mensal.at(-1), penultimo = mensal.at(-2);
    return { t, a, enviado, faturasQtd, recebido, dias, mensal, variacaoMensal: ultimo && penultimo ? variacao(ultimo.producao, penultimo.producao) : null };
  }, [dados]);

  const ranking = (l: Grupo[], nomes: Record<number, string>, vazio: string): ItemRanking[] =>
    l.map(g => ({ chave: String(g.id), nome: g.id === null ? vazio : nomes[g.id] ?? `Código ${g.id}`, valor: criterio === "exames" ? g.faturados : g[criterio], detalhe: `${fmtN(g.faturados)} faturados · ${fmtP(pct(g.faturado, g.faturavel))} do faturável` }))
      .sort((x, y) => y.valor - x.valor);

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando o faturamento…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento" titulo="Visão geral do faturamento" icone={FileSpreadsheet} descricao="Produção, faturável, faturado e pendente, faturas enviadas, glosas e evolução."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} />
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <Secao titulo="Valores">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Produção total" valor={R(v.t.producao)} icone={Stethoscope} variacao={variacao(v.t.producao, v.a.producao)} menorMelhor={false} detalhe="vs período anterior" destaque={COR.texto} />
                <Kpi titulo="Produção faturável" valor={R(v.t.faturavel)} icone={Layers} variacao={variacao(v.t.faturavel, v.a.faturavel)} menorMelhor={false} detalhe="parte de convênio" destaque={COR.primaria} />
                <Kpi titulo="Total faturado" valor={R(v.t.faturado)} icone={CheckCircle2} variacao={variacao(v.t.faturado, v.a.faturado)} menorMelhor={false} detalhe={`${fmtP(pct(v.t.faturado, v.t.faturavel))} da produção faturável`} destaque={COR.ok} />
                <Kpi titulo="Pendente de faturamento" valor={R(v.t.pendente)} icone={FileWarning} variacao={variacao(v.t.pendente, v.a.pendente)} detalhe={`${fmtP(pct(v.t.pendente, v.t.faturavel))} aguardando envio`} destaque={COR.atencao} />
                <Kpi titulo="Enviado aos convênios" valor={R(v.enviado)} icone={Receipt} variacao={null} detalhe={`${fmtN(v.faturasQtd)} faturas emitidas no período · ${R(v.recebido)} já recebido`} destaque={COR.primaria} />
                <Kpi titulo="Valor glosado" valor={R(v.t.glosa)} icone={ShieldAlert} variacao={variacao(v.t.glosa, v.a.glosa)} detalhe={`taxa inicial de glosa ${fmtP(taxaGlosa(v.t))}`} destaque={COR.critico} />
                <Kpi titulo="Ticket médio dos exames" valor={formatarReais(ticket(v.t))} icone={BadgeDollarSign} variacao={variacao(ticket(v.t), ticket(v.a))} menorMelhor={false} detalhe="produção ÷ exames" destaque={COR.secundaria} />
                <Kpi titulo="Tempo até faturar" valor={diasMedios(v.t) === null ? "—" : `${diasMedios(v.t)!.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="da realização à emissão da fatura" destaque={COR.secundaria} />
              </div>
            </Secao>

            <Secao titulo="Quantidades">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi titulo="Exames realizados" valor={fmtN(v.t.exames)} icone={Stethoscope} variacao={variacao(v.t.exames, v.a.exames)} menorMelhor={false} detalhe={`${fmtN(v.t.examesConvenio)} de convênio · ${fmtN(v.t.examesParticular)} particulares`} destaque={COR.primaria} />
                <Kpi titulo="Exames faturados" valor={fmtN(v.t.faturados)} icone={CheckCircle2} variacao={variacao(v.t.faturados, v.a.faturados)} menorMelhor={false} detalhe={`${fmtP(pct(v.t.faturados, v.t.examesConvenio))} dos exames de convênio`} destaque={COR.ok} />
                <Kpi titulo="Exames não faturados" valor={fmtN(v.t.examesPendentes)} icone={FileWarning} variacao={variacao(v.t.examesPendentes, v.a.examesPendentes)} detalhe={`${fmtP(pct(v.t.examesPendentes, v.t.examesConvenio))} dos exames de convênio`} destaque={COR.atencao} />
                <Kpi titulo="Guias e faturas" valor={`${fmtN(v.t.guiasFaturadas)} · ${fmtN(v.t.faturas)}`} icone={FileStack} variacao={null} detalhe="guias faturadas · faturas (lotes) com exames do período" destaque={COR.secundaria} />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
                <span><b>Crescimento do faturamento:</b> {fmtP(variacao(v.t.faturado, v.a.faturado))} vs {v.a.inicio.split("-").reverse().join("/")} a {v.a.fim.split("-").reverse().join("/")}</span>
                <span><b>Variação mensal da produção:</b> {fmtP(v.variacaoMensal)} (último mês contra o anterior)</span>
                <span><b>Produção × faturamento:</b> {fmtP(pct(v.t.faturado, v.t.faturavel))} faturado · {fmtP(pct(v.t.pendente, v.t.faturavel))} não faturado</span>
                <span><b>Lotes rejeitados/pendentes e valores processados pela operadora:</b> o Clinux não registra o status do lote; o retorno TISS é importado só em alguns meses.</span>
              </div>
            </Secao>

            <Painel titulo="Evolução diária" subtitulo="Produção, faturado, pendente e glosa por dia (pela data escolhida no filtro)." icone={CalendarRange}>
              <GraficoProducaoFaturado dados={v.dias} />
            </Painel>
            <Painel titulo="Evolução mensal — 24 meses" subtitulo="Pela data de realização, com os filtros de convênio, modalidade e procedimento." icone={TrendingUp}>
              <GraficoProducaoFaturado dados={v.mensal} />
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Distribuição por situação" subtitulo="Valor da produção do período." icone={Wallet}>
                <RankingBarras itens={[
                  { chave: "f", nome: "Faturado", valor: v.t.faturado, detalhe: fmtP(pct(v.t.faturado, v.t.producao)) },
                  { chave: "p", nome: "Pendente de faturamento", valor: v.t.pendente, detalhe: fmtP(pct(v.t.pendente, v.t.producao)) },
                  { chave: "u", nome: "Particular (recebido no atendimento)", valor: v.t.producao - v.t.faturavel, detalhe: fmtP(pct(v.t.producao - v.t.faturavel, v.t.producao)) },
                  { chave: "g", nome: "Glosado", valor: v.t.glosa, detalhe: fmtP(pct(v.t.glosa, v.t.faturado)) + " do faturado", negativo: true },
                ]} />
              </Painel>
              <Painel titulo="Comparativo com o período anterior" subtitulo={`${v.a.inicio.split("-").reverse().join("/")} a ${v.a.fim.split("-").reverse().join("/")} (mesma duração).`} icone={TrendingUp}>
                <table className="w-full text-sm">
                  <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-1.5 text-left">Indicador</th><th className="px-2 py-1.5">Atual</th><th className="px-2 py-1.5">Anterior</th><th className="px-2 py-1.5">Variação</th></tr></thead>
                  <tbody>
                    {([["Produção", v.t.producao, v.a.producao, true], ["Faturável", v.t.faturavel, v.a.faturavel, true], ["Faturado", v.t.faturado, v.a.faturado, true], ["Pendente", v.t.pendente, v.a.pendente, true], ["Glosa", v.t.glosa, v.a.glosa, true], ["Exames", v.t.exames, v.a.exames, false], ["Exames faturados", v.t.faturados, v.a.faturados, false]] as const).map(([n, x, y, reais]) => {
                      const d = variacao(x, y), ruim = n === "Pendente" || n === "Glosa";
                      return <tr key={n} className="border-b border-slate-100 last:border-0"><td className="px-2 py-1.5 font-semibold">{n}</td><td className="px-2 py-1.5 text-right tabular-nums">{reais ? R(x) : fmtN(x)}</td><td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{reais ? R(y) : fmtN(y)}</td>
                        <td className={`px-2 py-1.5 text-right font-bold tabular-nums ${d === null ? "text-slate-400" : (d > 0) !== ruim ? "text-emerald-600" : "text-red-600"}`}>{d === null ? "—" : `${d > 0 ? "+" : ""}${fmtP(d)}`}</td></tr>;
                    })}
                  </tbody>
                </table>
              </Painel>
            </div>

            <Secao titulo="Rankings" acao={<Alternador valor={criterio} onChange={x => setCriterio(x as typeof criterio)} opcoes={[["faturado", "Faturado"], ["faturavel", "Faturável"], ["exames", "Exames faturados"]]} />}>
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <Painel titulo="Maiores convênios" icone={Receipt}><RankingBarras itens={ranking(dados.convenios, dados.nomes.convenios, "Sem convênio")} limite={10} formatar={criterio === "exames" ? fmtN : undefined} /></Painel>
                <Painel titulo="Faturamento por modalidade" icone={Layers}><RankingBarras itens={ranking(dados.modalidades, dados.nomes.modalidades, "Sem modalidade")} limite={10} cor={COR.secundaria} formatar={criterio === "exames" ? fmtN : undefined} /></Painel>
                <Painel titulo="Procedimentos mais faturados" icone={Stethoscope}><RankingBarras itens={ranking(dados.procedimentos, dados.nomes.procedimentos, "Sem procedimento")} limite={10} cor={COR.ok} formatar={criterio === "exames" ? fmtN : undefined} /></Painel>
              </div>
            </Secao>
            <p className="text-xs text-slate-400">Faturado = exame ligado a uma fatura de convênio no Clinux (o valor é o faturável do exame). Enviado = valor dos títulos das faturas emitidas no período. Faturamento por unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
