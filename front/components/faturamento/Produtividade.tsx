"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, FileStack, Gauge, Receipt, Repeat, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, RankingBarras } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, useFiltrosFaturamento, useResumo, type FiltrosFat } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { diasUteis, pct, prazoFaturamento, variacao, type RespostaProdutividade } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtD = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

function anterior(f: FiltrosFat): FiltrosFat {
  const dias = Math.round((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000) + 1;
  const d = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  return { ...f, preset: "custom", inicio: d(f.inicio, -dias), fim: d(f.inicio, -1) };
}
const totais = (d: RespostaProdutividade) => ({
  faturas: d.porDia.reduce((s, x) => s + x.faturas, 0), valor: d.porDia.reduce((s, x) => s + x.valor, 0),
  exames: d.porDia.reduce((s, x) => s + x.exames, 0), guias: d.porDia.reduce((s, x) => s + x.guias, 0), glosas: d.rejeicoes.reduce((s, x) => s + x.glosas, 0),
});

export default function ProdutividadeFaturamento() {
  const [f, setF] = useFiltrosFaturamento();
  const atual = useResumo<RespostaProdutividade>("/api/backend/clinux/faturamento/produtividade", f);
  const ant = useResumo<RespostaProdutividade>("/api/backend/clinux/faturamento/produtividade", anterior(f));
  const [prazo, setPrazo] = useState("30");
  const [metrica, setMetrica] = useState<"valor" | "faturas" | "guias">("valor");

  const v = useMemo(() => {
    if (!atual.dados) return null;
    const t = totais(atual.dados), a = ant.dados ? totais(ant.dados) : null;
    const uteis = diasUteis(atual.dados.periodo.inicio, atual.dados.periodo.fim);
    const diasComEnvio = atual.dados.porDia.filter(x => x.faturas > 0).length;
    const pz = prazoFaturamento(atual.dados.prazo, Number(prazo));
    const porMes = new Map<string, { valor: number; faturas: number; guias: number }>();
    for (const x of atual.dados.porDia) { const k = x.dia.slice(0, 7); const g = porMes.get(k) ?? { valor: 0, faturas: 0, guias: 0 }; g.valor += x.valor; g.faturas += x.faturas; g.guias += x.guias; porMes.set(k, g); }
    return { t, a, uteis, diasComEnvio, pz, porMes: [...porMes.entries()].sort(([x], [y]) => x.localeCompare(y)) };
  }, [atual.dados, ant.dados, prazo]);

  const carregando = atual.carregando || ant.carregando;
  const d = atual.dados;

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando a produtividade…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/produtividade" titulo="Produtividade do faturamento" icone={Gauge} descricao="Eficiência do processo de faturamento: faturas emitidas, guias, prazos, rejeições, retrabalho e responsáveis."
          atualizadoEm={d?.atualizadoEm} carregando={carregando} onAtualizar={() => { atual.atualizar(); ant.atualizar(); }} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {atual.erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{atual.erro}</div>}

        {d && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Faturas (lotes) enviadas" valor={fmtN(v.t.faturas)} icone={FileStack} variacao={v.a ? variacao(v.t.faturas, v.a.faturas) : null} menorMelhor={false} detalhe={`${fmtD(v.diasComEnvio ? v.t.faturas / v.diasComEnvio : 0)} por dia com envio`} destaque={COR.primaria} />
              <Kpi titulo="Guias faturadas" valor={fmtN(v.t.guias)} icone={Receipt} variacao={v.a ? variacao(v.t.guias, v.a.guias) : null} menorMelhor={false} detalhe={`${fmtD(v.uteis ? v.t.guias / v.uteis : 0)} por dia útil · ${fmtN(v.t.exames)} exames`} destaque={COR.secundaria} />
              <Kpi titulo="Valor faturado" valor={R(v.t.valor)} icone={TrendingUp} variacao={v.a ? variacao(v.t.valor, v.a.valor) : null} menorMelhor={false} detalhe={`${R(v.uteis ? v.t.valor / v.uteis : 0)} por dia útil (${v.uteis} dias úteis)`} destaque={COR.ok} />
              <Kpi titulo="Tempo exame → fatura" valor={v.pz.media === null ? "—" : `${fmtD(v.pz.media)} dias`} icone={Clock3} variacao={null} detalhe="média dos exames faturados no período" destaque={COR.atencao} />
              <Kpi titulo={`Faturados em até ${prazo} dias`} valor={fmtP(v.pz.percentual)} icone={CheckCircle2} variacao={null} detalhe={`${fmtN(v.pz.dentro)} de ${fmtN(v.pz.total)} exames`} destaque={(v.pz.percentual ?? 0) >= 80 ? COR.ok : COR.critico} />
              <Kpi titulo="Rejeições (glosas)" valor={fmtN(v.t.glosas)} icone={ShieldAlert} variacao={v.a ? variacao(v.t.glosas, v.a.glosas) : null} detalhe={`${fmtP(pct(v.t.glosas, v.t.exames))} dos exames faturados`} destaque={COR.critico} />
              <Kpi titulo="Retrabalho" valor={fmtN(d.refaturados)} icone={Repeat} variacao={null} detalhe="exames que já estiveram em outra fatura (log do Clinux)" destaque={COR.atencao} />
              <Kpi titulo="Responsáveis" valor={fmtN(d.porColaborador.filter(c => c.colaborador !== "Não informado").length)} icone={Users} variacao={null} detalhe="colaboradores que emitiram faturas" destaque={COR.texto} />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">Prazo interno para faturar:</span>
              <Alternador valor={prazo} onChange={setPrazo} opcoes={[["7", "7 dias"], ["15", "15 dias"], ["30", "30 dias"], ["45", "45 dias"], ["60", "60 dias"]]} />
              <span className="text-xs text-slate-500">Prazos contratuais de cada convênio não estão no Clinux; escolha o prazo de referência. Comparação: período anterior de mesma duração.</span>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Faturamento por dia" subtitulo="Pela emissão das faturas." icone={CalendarDays}
                acao={<Alternador valor={metrica} onChange={x => setMetrica(x as typeof metrica)} opcoes={[["valor", "Valor"], ["faturas", "Faturas"], ["guias", "Guias"]]} />}>
                <GraficoMensal dados={[...d.porDia].sort((a, b) => a.dia.localeCompare(b.dia)).map(x => ({ mes: x.dia, rotulo: x.dia.split("-").reverse().slice(0, 2).join("/"), valor: x[metrica] }))} cor={COR.primaria} rotulo={metrica === "valor" ? "Faturado" : metrica === "faturas" ? "Faturas" : "Guias"} />
              </Painel>
              <Painel titulo="Faturamento por mês" icone={TrendingUp}>
                <GraficoMensal dados={v.porMes.map(([mes, x]) => ({ mes, rotulo: rotuloMes(mes), valor: x[metrica] }))} cor={COR.ok} rotulo={metrica === "valor" ? "Faturado" : metrica === "faturas" ? "Faturas" : "Guias"} />
              </Painel>
              <Painel titulo="Valor faturado por competência" icone={FileStack}>
                <GraficoMensal dados={[...d.competencia].filter(c => c.competencia).sort((a, b) => a.competencia!.localeCompare(b.competencia!)).map(c => ({ mes: c.competencia!, rotulo: rotuloMes(c.competencia!), valor: c.valor }))} cor={COR.secundaria} rotulo="Faturado" />
              </Painel>
              <Painel titulo="Dias entre o exame e a fatura" subtitulo="Quantidade de exames por número de dias (120 = 120 ou mais)." icone={Clock3}>
                <GraficoMensal dados={[...d.prazo].sort((a, b) => a.dias - b.dias).map(x => ({ mes: String(x.dias), rotulo: `${x.dias}d`, valor: x.exames }))} cor={COR.atencao} rotulo="Exames" />
              </Painel>
              <Painel titulo="Rejeições por mês" subtitulo="Glosas registradas (data da glosa)." icone={ShieldAlert}>
                <GraficoMensal dados={[...d.rejeicoes].sort((a, b) => a.mes.localeCompare(b.mes)).map(x => ({ mes: x.mes, rotulo: rotuloMes(x.mes), valor: x.glosas }))} cor={COR.critico} rotulo="Glosas" />
              </Painel>
              <Painel titulo="Por colaborador" subtitulo="Quem emitiu as faturas (campo responsável do título)." icone={Users}>
                <RankingBarras itens={[...d.porColaborador].sort((a, b) => b.valor - a.valor).map(c => ({ chave: c.colaborador, nome: c.colaborador, valor: c.valor, detalhe: `${fmtN(c.faturas)} faturas · ${fmtN(c.guias)} guias` }))} limite={10} cor={COR.secundaria} vazio="O Clinux não registrou o responsável." />
              </Painel>
            </div>
            <p className="text-xs text-slate-400">Retrabalho: exames das faturas do período com troca de fatura registrada no log do Clinux (campo da fatura no exame). Pendências e sua evolução estão em “Produção pendente”.</p>
          </div>
        )}
      </div>
    </main>
  );
}
