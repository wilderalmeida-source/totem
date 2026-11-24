"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BadgeDollarSign, CalendarDays, CalendarRange, Clock3, Layers, Receipt, Stethoscope, TrendingDown, TrendingUp, Users } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { GraficoExamesValor, MapaSemanaTurno } from "@/components/faturamento/graficos";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { diasMedios, pct, picosEQuedas, serie, ticket, variacao, type Escala, type Grupo, type RespostaResumo } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

export default function ProducaoExames() {
  const [f, setF] = useFiltrosFaturamento();
  const { dados, carregando, erro, atualizar } = useResumo<RespostaResumo>("/api/backend/clinux/faturamento/resumo", { ...f, base: "realizacao" });
  const [escala, setEscala] = useState<Escala>("dia");
  const [metrica, setMetrica] = useState<"exames" | "producao">("exames");

  const v = useMemo(() => {
    if (!dados) return null;
    const pontos = serie(dados.dias, dados.periodo.inicio, dados.periodo.fim, escala);
    const mensal = [...dados.mensal].sort((a, b) => a.mes.localeCompare(b.mes)).map(m => ({ ...m, chave: m.mes, rotulo: rotuloMes(m.mes), ticket: ticket(m) }));
    const ult = mensal.at(-1), pen = mensal.at(-2), anoAnt = mensal.at(-13);
    return { pontos, mensal, pq: picosEQuedas(escala === "dia" ? pontos : mensal), crescMensal: ult && pen ? variacao(ult.producao, pen.producao) : null, crescAnual: ult && anoAnt ? variacao(ult.producao, anoAnt.producao) : null };
  }, [dados, escala]);

  const itens = (l: Grupo[], nomes: Record<number, string>, vazio: string, total: number): ItemRanking[] =>
    l.map(g => ({ chave: String(g.id), nome: g.id === null ? vazio : nomes[g.id] ?? `Código ${g.id}`, valor: metrica === "exames" ? g.exames : g.producao, detalhe: `${fmtP(pct(metrica === "exames" ? g.exames : g.producao, total))} · ticket ${formatarReais(ticket(g))}` }))
      .sort((a, b) => b.valor - a.valor);
  const total = dados ? (metrica === "exames" ? dados.totais.exames : dados.totais.producao) : 0;

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando a produção…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/producao" titulo="Produção de exames" icone={Activity} descricao="Produção registrada no Clinux e sua relação com o faturamento (pela data de realização)."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Exames realizados" valor={fmtN(dados.totais.exames)} icone={Stethoscope} variacao={variacao(dados.totais.exames, dados.anterior.exames)} menorMelhor={false} detalhe="vs período anterior" destaque={COR.primaria} />
              <Kpi titulo="Exames particulares" valor={fmtN(dados.totais.examesParticular)} icone={Users} variacao={variacao(dados.totais.examesParticular, dados.anterior.examesParticular)} menorMelhor={false} detalhe={`${fmtP(pct(dados.totais.examesParticular, dados.totais.exames))} dos exames`} destaque={COR.ok} />
              <Kpi titulo="Valor produzido" valor={R(dados.totais.producao)} icone={BadgeDollarSign} variacao={variacao(dados.totais.producao, dados.anterior.producao)} menorMelhor={false} detalhe={`valor médio ${formatarReais(ticket(dados.totais))}`} destaque={COR.ok} />
              <Kpi titulo="Faturada × não faturada" valor={`${fmtP(pct(dados.totais.faturado, dados.totais.faturavel))}`} icone={Receipt} variacao={null} detalhe={`${R(dados.totais.faturado)} faturado · ${R(dados.totais.pendente)} ainda não faturado`} destaque={COR.primaria} />
              <Kpi titulo="Crescimento mensal" valor={fmtP(v.crescMensal)} icone={TrendingUp} variacao={null} detalhe="último mês contra o anterior" destaque={COR.secundaria} />
              <Kpi titulo="Crescimento anual" valor={fmtP(v.crescAnual)} icone={TrendingUp} variacao={null} detalhe="último mês contra o mesmo mês do ano anterior" destaque={COR.secundaria} />
              <Kpi titulo="Tempo até o faturamento" valor={diasMedios(dados.totais) === null ? "—" : `${diasMedios(dados.totais)!.toLocaleString("pt-BR")} dias`} icone={Clock3} variacao={null} detalhe="realização → emissão da fatura" destaque={COR.atencao} />
              <Kpi titulo="Variação da produção" valor={fmtP(variacao(dados.totais.producao, dados.anterior.producao))} icone={CalendarRange} variacao={null} detalhe={`${R(dados.anterior.producao)} no período anterior`} destaque={COR.texto} />
            </div>

            <Painel titulo="Produção por período" subtitulo="Quantidade de exames (barras) e valor produzido (linha)." icone={CalendarDays}
              acao={<Alternador valor={escala} onChange={x => setEscala(x as Escala)} opcoes={[["dia", "Diária"], ["semana", "Semanal"], ["mes", "Mensal"], ["ano", "Anual"]]} />}>
              <GraficoExamesValor dados={v.pontos} />
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Evolução do ticket médio" subtitulo="Últimos 24 meses." icone={TrendingUp}><GraficoExamesValor dados={v.mensal} altura={260} /></Painel>
              <Painel titulo="Picos e quedas" subtitulo={escala === "dia" ? "Dias de maior produção e maiores quedas de um dia para o outro." : "Meses de maior produção e maiores quedas mês a mês (24 meses)."} icone={TrendingDown}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Maior produção</p>
                    {v.pq.picos.map(p => <p key={p.chave} className="flex justify-between border-b border-slate-100 py-1.5 text-sm"><span>{p.chave.length === 7 ? rotuloMes(p.chave) : p.chave.split("-").reverse().join("/")}</span><b className="tabular-nums">{R(p.producao)}</b></p>)}</div>
                  <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Maiores quedas</p>
                    {v.pq.quedas.length ? v.pq.quedas.map(p => <p key={p.chave} className="flex justify-between border-b border-slate-100 py-1.5 text-sm"><span>{p.chave.length === 7 ? rotuloMes(p.chave) : p.chave.split("-").reverse().join("/")}</span><b className="tabular-nums text-red-600">{fmtP(p.queda)}</b></p>) : <p className="text-sm text-slate-400">Sem quedas.</p>}</div>
                </div>
              </Painel>
            </div>

            <Secao titulo="Distribuição da produção" acao={<Alternador valor={metrica} onChange={x => setMetrica(x as typeof metrica)} opcoes={[["exames", "Quantidade"], ["producao", "Valor"]]} />}>
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <Painel titulo="Por modalidade" icone={Layers}><RankingBarras itens={itens(dados.modalidades, dados.nomes.modalidades, "Sem modalidade", total)} formatar={metrica === "exames" ? fmtN : undefined} limite={12} /></Painel>
                <Painel titulo="Por convênio" icone={Receipt}><RankingBarras itens={itens(dados.convenios, dados.nomes.convenios, "Sem convênio", total)} formatar={metrica === "exames" ? fmtN : undefined} cor={COR.secundaria} limite={12} /></Painel>
                <Painel titulo="Por procedimento" subtitulo="Participação de cada procedimento." icone={Stethoscope}><RankingBarras itens={itens(dados.procedimentos, dados.nomes.procedimentos, "Sem procedimento", total)} formatar={metrica === "exames" ? fmtN : undefined} cor={COR.ok} limite={12} /></Painel>
              </div>
              <Painel titulo="Dia da semana × turno" subtitulo="Turno pela hora da ficha: manhã até 12h, tarde até 18h, noite depois." icone={CalendarDays}>
                <MapaSemanaTurno dados={dados.semana} metrica={metrica} />
              </Painel>
            </Secao>
            <p className="text-xs text-slate-400">Exames por equipamento: o Clinux não tem equipamentos cadastrados. Por unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
