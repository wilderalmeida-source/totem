"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpCircle, BadgePercent, CalendarClock, CheckCircle2, Clock3, CreditCard, FileWarning, Hourglass, Layers, PieChart, Receipt,
  Repeat, Sparkles, Truck, Wallet,
} from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import { formatarReais } from "@/lib/diretoria";
import { resumoPagar, type RespostaFinanceiro } from "@/lib/financeiro";

const R = (n: number) => formatarReais(n, true);
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const fmtD = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function ContasPagar({ dados }: { dados: RespostaFinanceiro }) {
  const r = useMemo(() => resumoPagar(dados), [dados]);
  const [base, setBase] = useState<"aberto" | "pago">("pago");
  const contas = useMemo(() => new Map(dados.contas.map(c => [c.cdConta, c])), [dados.contas]);
  const nomeFornecedor = (k: string) => (k === "-" ? "Sem fornecedor" : dados.nomes.fornecedores[Number(k)] ?? `Código ${k}`);
  const nomeCentro = (k: string) => (k === "-" ? "Sem centro de custo" : dados.nomes.centros?.[Number(k)] ?? `Centro ${k}`);
  const total = base === "pago" ? r.pago : r.total;
  const itens = (l: Array<{ chave: string; valor: number }>, nome: (k: string) => string, detalhe?: (k: string) => string | undefined): ItemRanking[] =>
    l.map(x => ({ chave: x.chave, nome: nome(x.chave), valor: x.valor, detalhe: [fmtP(pct(x.valor, total)), detalhe?.(x.chave)].filter(Boolean).join(" · ") }));
  const fonte = base === "pago" ? r.pagoPor : r.aberto;

  if (!dados.pagar) return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">O backend publicado ainda não tem os dados de contas a pagar: publique a imagem nova do back.</p>;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Posição de hoje e pagamentos do período</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Total a pagar" valor={R(r.total)} icone={Receipt} variacao={null} detalhe="parcelas em aberto, hoje" destaque={COR.primaria} />
          <Kpi titulo="Total vencido" valor={R(r.vencido)} icone={FileWarning} variacao={null} detalhe={`${fmtP(pct(r.vencido, r.total))} do total a pagar`} destaque={COR.critico} />
          <Kpi titulo="Total a vencer" valor={R(r.aVencer)} icone={CalendarClock} variacao={null} detalhe={`${R(r.proximos[2].valor)} nos próximos 30 dias`} destaque={COR.atencao} />
          <Kpi titulo="Total pago no período" valor={R(r.pago)} icone={ArrowUpCircle} variacao={null} detalhe={`${r.parcelas.toLocaleString("pt-BR")} parcelas`} destaque={COR.ok} />
          <Kpi titulo="Pagamentos antecipados" valor={R(r.antecipado)} icone={CheckCircle2} variacao={null} detalhe={`${fmtP(pct(r.antecipado, r.pago))} do pago · no prazo ${fmtP(pct(r.noPrazo, r.pago))}`} destaque={COR.ok} />
          <Kpi titulo="Pagamentos com atraso" valor={R(r.atrasado)} icone={AlertTriangle} variacao={null} detalhe={`${fmtP(r.percentualAtrasado)} do pago · atraso médio ${fmtD(r.atrasoMedio)}`} destaque={COR.critico} />
          <Kpi titulo="Juros e multas pagos" valor={R(r.juros + r.multa)} icone={BadgePercent} variacao={null} detalhe={`juros ${R(r.juros)} · multa/mora ${R(r.multa)}`} destaque={COR.critico} />
          <Kpi titulo="Descontos obtidos" valor={R(r.desconto)} icone={Sparkles} variacao={null} detalhe={`${fmtP(pct(r.desconto, r.pago + r.desconto))} sobre o devido`} destaque={COR.ok} />
          <Kpi titulo="Prazo médio de pagamento" valor={fmtD(r.prazoMedio)} icone={Hourglass} variacao={null} detalhe="da emissão do título ao pagamento (ponderado)" destaque={COR.secundaria} />
          <Kpi titulo="Despesas recorrentes" valor={R(r.recorrente)} icone={Repeat} variacao={null} detalhe={`${fmtP(pct(r.recorrente, r.pago))} do pago · fornecedor e conta pagos em 3+ dos últimos 6 meses`} destaque={COR.primaria} />
          <Kpi titulo="Despesas extraordinárias" valor={R(r.extraordinario)} icone={Layers} variacao={null} detalhe={`${fmtP(pct(r.extraordinario, r.pago))} do pago · sem recorrência`} destaque={COR.atencao} />
          <Kpi titulo="Concentração em fornecedores" valor={fmtP(r.concentracao.top5)} icone={PieChart} variacao={null} detalhe={`5 maiores · 10 maiores: ${fmtP(r.concentracao.top10)} · ${r.concentracao.fornecedores} fornecedores pagos`} destaque={COR.secundaria} />
        </div>
      </section>

      <Painel titulo="Obrigações dos próximos dias" subtitulo={`Valores a vencer acumulados a partir de hoje (sem os ${R(r.vencido)} já vencidos).`} icone={Clock3}>
        <div className="grid gap-3 sm:grid-cols-5">
          {r.proximos.map(p => (
            <div key={p.prazo} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Próximos {p.dias} dias</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{R(p.valor)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${r.aVencer ? Math.min(100, (p.valor / r.aVencer) * 100) : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </Painel>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Composição das despesas</h2>
          <Alternador valor={base} onChange={x => setBase(x as "aberto" | "pago")} opcoes={[["pago", "Pago no período"], ["aberto", "Em aberto hoje"]]} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          <Painel titulo="Por fornecedor" subtitulo="Porcentagem sobre o total." icone={Truck}><RankingBarras itens={itens(fonte.fornecedor, nomeFornecedor)} cor={COR.atencao} limite={10} /></Painel>
          <Painel titulo="Por categoria" subtitulo="Grupo do plano de contas." icone={Layers}><RankingBarras itens={itens(fonte.categoria, k => k)} cor={COR.primaria} limite={10} /></Painel>
          <Painel titulo="Por conta" subtitulo="Conta do plano de contas." icone={Receipt}><RankingBarras itens={itens(fonte.conta, k => contas.get(Number(k))?.conta ?? `Conta ${k}`, k => contas.get(Number(k))?.grupo ?? undefined)} cor={COR.primaria} limite={10} /></Painel>
          <Painel titulo="Por centro de custo" subtitulo="Com o rateio do título, quando houver." icone={Wallet}><RankingBarras itens={itens(fonte.centro, nomeCentro)} cor={COR.secundaria} limite={10} /></Painel>
          {base === "pago"
            ? <Painel titulo="Por forma de pagamento" subtitulo="Forma registrada na baixa da parcela." icone={CreditCard}><RankingBarras itens={itens(r.pagoPor.forma, k => k)} cor={COR.ok} limite={10} /></Painel>
            : <Painel titulo="Por forma de pagamento" subtitulo="Só existe depois do pagamento." icone={CreditCard}><p className="py-8 text-center text-sm text-slate-400">Escolha “Pago no período” para ver por forma de pagamento.</p></Painel>}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Total por unidade: o Clinux tem uma só unidade cadastrada. Compras de material sem conta no plano de contas ficam fora. Juros, multa e desconto vêm dos campos da baixa da parcela no Clinux.
      </p>
    </div>
  );
}
