"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, BarChart3, Briefcase, CalendarRange, CircleDollarSign, Coins, FileWarning,
  Gauge, Landmark, Layers, PiggyBank, Receipt, RefreshCw, Scale, ShieldAlert, Stethoscope, TrendingUp, Truck, Wallet,
} from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { GraficoMensal, GraficoProducao, GraficoResultado, RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import {
  acumuladoAno, calcularDre, categoria, deslocarMes, despesasDre, formatarReais, mesesAte, normalizar, previsaoCaixa, producaoPor,
  producaoTotal, resumoAbertos, rotuloMes, saldos, somaMeses, variacao, type Dre, type Regime, type RespostaDiretoria,
} from "@/lib/diretoria";

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const R = (n: number) => formatarReais(n, true);
const RC = (n: number) => formatarReais(n);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const chaveNome = (k: number | null) => String(k ?? "-");

// Linhas da tabela de comparativos: [rótulo, valor, quanto menor melhor?, é porcentagem?]
type LinhaComp = { rotulo: string; valor: (d: Dre) => number | null; menorMelhor?: boolean; pct?: boolean; destaque?: boolean };
const LINHAS_DRE: LinhaComp[] = [
  { rotulo: "Receita bruta", valor: d => d.receitaBruta, destaque: true },
  { rotulo: "(−) Deduções e impostos", valor: d => d.deducoes, menorMelhor: true },
  { rotulo: "Receita líquida", valor: d => d.receitaLiquida, destaque: true },
  { rotulo: "(−) Custos dos serviços", valor: d => d.custos, menorMelhor: true },
  { rotulo: "Lucro bruto", valor: d => d.lucroBruto, destaque: true },
  { rotulo: "(−) Despesas administrativas", valor: d => d.administrativas, menorMelhor: true },
  { rotulo: "(−) Despesas com pessoal", valor: d => d.pessoal, menorMelhor: true },
  { rotulo: "(−) Despesas comerciais", valor: d => d.comerciais, menorMelhor: true },
  { rotulo: "Resultado operacional (EBITDA)", valor: d => d.ebitda, destaque: true },
  { rotulo: "(+) Receitas financeiras", valor: d => d.receitasFinanceiras },
  { rotulo: "(−) Despesas financeiras", valor: d => d.despesasFinanceiras, menorMelhor: true },
  { rotulo: "(±) Não operacional", valor: d => d.naoOperacional },
  { rotulo: "Lucro líquido", valor: d => d.lucroLiquido, destaque: true },
  { rotulo: "Margem EBITDA", valor: d => d.margemEbitda, pct: true },
  { rotulo: "Margem líquida", valor: d => d.margemLiquida, pct: true },
  { rotulo: "Margem de contribuição", valor: d => d.margemContribuicaoPct, pct: true },
  { rotulo: "Despesas totais do DRE", valor: d => despesasDre(d), menorMelhor: true },
];

export default function DiretoriaPage() {
  const [mes, setMes] = useState(mesAtual);
  const [regime, setRegime] = useState<Regime>("caixa");
  const [periodoRanking, setPeriodoRanking] = useState<"mes" | "ano">("ano");
  const [dados, setDados] = useState<RespostaDiretoria | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const pedido = useRef(0);

  const carregar = useCallback(async (forcar = false) => {
    const n = ++pedido.current;
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/diretoria/resumo?${new URLSearchParams({ mes, ...(forcar ? { atualizar: "1" } : {}) })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      if (n === pedido.current) { setDados(json); setErro(""); }
    } catch (e) {
      if (n === pedido.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      if (n === pedido.current) setCarregando(false);
    }
  }, [mes]);

  useEffect(() => { void carregar(); }, [carregar]);

  const v = useMemo(() => {
    if (!dados || dados.mes !== mes) return null;
    const mAnt = deslocarMes(mes, -1), mAA = deslocarMes(mes, -12);
    const ytd = acumuladoAno(mes), ytdAnt = ytd.map(m => deslocarMes(m, -12));
    const dre = (meses: string[], r: Regime = regime) => calcularDre(dados, r, meses);
    const atual = dre([mes]), anterior = dre([mAnt]), anoAnterior = dre([mAA]), ano = dre(ytd), anoAnt = dre(ytdAnt);
    const caixa = dre([mes], "caixa"), caixaAnt = dre([mAnt], "caixa");
    const competencia = dre([mes], "competencia"), competenciaAnt = dre([mAnt], "competencia");
    const prod = producaoTotal(dados.producao, [mes]), prodAnt = producaoTotal(dados.producao, [mAnt]);
    const enviado = somaMeses(dados.faturamentoEnviado, [mes], x => x.faturado), enviadoAnt = somaMeses(dados.faturamentoEnviado, [mAnt], x => x.faturado);
    const recuperado = somaMeses(dados.glosasRecuperadas, [mes], x => x.recuperado);
    const abertos = resumoAbertos(dados);
    const s = saldos(dados.bancos);
    const prev = previsaoCaixa(s.disponivel, abertos.receber, abertos.pagar);
    const custoOperacional = (d: Dre) => d.custos + d.despesasOperacionais;
    const meses13 = mesesAte(mes, 13);
    const evolucao = meses13.map(m => { const d = dre([m]); return { mes: m, rotulo: rotuloMes(m), receita: d.receitaBruta, despesas: despesasDre(d), lucro: d.lucroLiquido, ebitda: d.ebitda }; });
    const fluxo = meses13.map(m => ({ mes: m, rotulo: rotuloMes(m), producao: producaoTotal(dados.producao, [m]).valor, faturado: somaMeses(dados.faturamentoEnviado, [m], x => x.faturado), recebido: dre([m], "caixa").totalRecebido }));
    const amortizacoes = meses13.map(m => ({ mes: m, rotulo: rotuloMes(m), valor: dre([m], "caixa").amortizacoes }));
    return { mAnt, mAA, ytd, atual, anterior, anoAnterior, ano, anoAnt, caixa, caixaAnt, competencia, competenciaAnt, prod, prodAnt, enviado, enviadoAnt, recuperado, abertos, s, prev, custoOperacional, evolucao, fluxo, amortizacoes };
  }, [dados, mes, regime]);

  const rk = useMemo(() => {
    if (!dados || !v) return null;
    const meses = periodoRanking === "mes" ? [mes] : v.ytd;
    const nomeF = (k: number | null) => (k === null ? "Sem convênio/fornecedor" : dados.nomes.fornecedores[k] ?? `Código ${k}`);
    const porConvenio = [...producaoPor(dados.producao, "convenio", meses).entries()];
    const faturamento: ItemRanking[] = porConvenio.map(([k, t]) => ({ chave: chaveNome(k), nome: nomeF(k), valor: t.valor, detalhe: `${fmtN(t.exames)} exames` })).sort((a, b) => b.valor - a.valor);
    const rentabilidade: ItemRanking[] = porConvenio.map(([k, t]) => {
      const res = t.valor - t.repasse - t.glosa;
      return { chave: chaveNome(k), nome: nomeF(k), valor: res, detalhe: t.valor ? `margem ${fmtP(Math.round((res / t.valor) * 1000) / 10)}` : undefined };
    }).sort((a, b) => b.valor - a.valor);
    const glosas: ItemRanking[] = porConvenio.map(([k, t]) => ({ chave: chaveNome(k), nome: nomeF(k), valor: t.glosa, detalhe: t.faturado ? `${fmtP(Math.round((t.glosa / t.faturado) * 1000) / 10)} do faturado` : undefined })).sort((a, b) => b.valor - a.valor);
    const inadimplencia: ItemRanking[] = [...v.abertos.inadimplencia.entries()].map(([k, valor]) => ({ chave: chaveNome(k), nome: nomeF(k), valor, negativo: true })).sort((a, b) => b.valor - a.valor);

    // Modalidade: produção − repasse médico − despesas do centro de custo com o mesmo nome (margem direta).
    const chaveTexto = (s: string) => normalizar(s).replace(/[^A-Z0-9]/g, "");
    const custoCentro = new Map<string, number>();
    const conjunto = new Set(meses);
    for (const c of dados.despesasCentro) {
      if (!conjunto.has(c.mes) || c.cdCentro === null) continue;
      const cat = categoria({ conta: "", despesa: true, linha: c.linha });
      if (cat === "amortizacao" || cat === "investimento" || cat === "ajuste") continue;
      const k = chaveTexto(dados.nomes.centros[c.cdCentro] ?? "");
      custoCentro.set(k, (custoCentro.get(k) ?? 0) + c.valor);
    }
    const modalidades: ItemRanking[] = [...producaoPor(dados.producao, "modalidade", meses).entries()].map(([k, t]) => {
      const nome = k === null ? "Sem modalidade" : dados.nomes.modalidades[k] ?? `Modalidade ${k}`;
      const custo = custoCentro.get(chaveTexto(nome)) ?? 0;
      const res = t.valor - t.repasse - custo;
      return { chave: chaveNome(k), nome, valor: res, detalhe: t.valor ? `margem ${fmtP(Math.round((res / t.valor) * 1000) / 10)}${custo ? "" : " · sem centro de custo"}` : undefined };
    }).sort((a, b) => b.valor - a.valor);

    const procedimentos: ItemRanking[] = dados.procedimentos.map(p => {
      const valor = periodoRanking === "mes" ? p.valorMes : p.valorAno, repasse = periodoRanking === "mes" ? p.repasseMes : p.repasseAno, exames = periodoRanking === "mes" ? p.examesMes : p.examesAno;
      return { chave: chaveNome(p.cdProcedimento), nome: p.cdProcedimento === null ? "Sem procedimento" : dados.nomes.procedimentos[p.cdProcedimento] ?? `Procedimento ${p.cdProcedimento}`, valor: valor - repasse, detalhe: `${fmtN(exames)} exames` };
    }).sort((a, b) => b.valor - a.valor);

    const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
    const porConta = new Map<number, number>();
    for (const f of dados.financeiro) {
      if (f.regime !== regime || !conjunto.has(f.mes)) continue;
      const c = contas.get(f.cdConta);
      if (!c?.despesa || ["ajuste", "amortizacao", "investimento"].includes(categoria(c))) continue;
      porConta.set(f.cdConta, (porConta.get(f.cdConta) ?? 0) + f.valor);
    }
    const despesas: ItemRanking[] = [...porConta.entries()].map(([k, valor]) => ({ chave: String(k), nome: contas.get(k)?.conta ?? `Conta ${k}`, valor, detalhe: contas.get(k)?.grupo ?? undefined })).sort((a, b) => b.valor - a.valor);

    const porFornecedor = new Map<number | null, number>();
    for (const f of dados.despesasFornecedor) if (conjunto.has(f.mes)) porFornecedor.set(f.cdFornecedor, (porFornecedor.get(f.cdFornecedor) ?? 0) + f.valor);
    const fornecedores: ItemRanking[] = [...porFornecedor.entries()].filter(([k]) => k !== null).map(([k, valor]) => ({ chave: chaveNome(k), nome: nomeF(k), valor })).sort((a, b) => b.valor - a.valor);

    const total = producaoTotal(dados.producao, meses);
    const perdas: ItemRanking[] = [
      ...dados.perdasMotivo.map(p => ({ chave: `m-${p.motivo}`, nome: `Exame perdido: ${p.motivo}`, valor: periodoRanking === "mes" ? p.valorMes : p.valorAno, detalhe: `${fmtN(periodoRanking === "mes" ? p.examesMes : p.examesAno)} exames` })),
      { chave: "glosas", nome: "Glosas dos convênios", valor: total.glosa },
      { chave: "titulos", nome: "Títulos baixados com perda", valor: somaMeses(dados.perdasTitulos, meses, x => x.perda) },
      { chave: "deducoes-cancel", nome: "Cancelamentos e devoluções (DRE)", valor: [...dados.financeiro].filter(f => f.regime === regime && conjunto.has(f.mes) && normalizar(contas.get(f.cdConta)?.conta).startsWith("CANCELAMENTO")).reduce((s, f) => s + f.valor, 0) },
    ].sort((a, b) => b.valor - a.valor);

    return { faturamento, rentabilidade, glosas, inadimplencia, modalidades, procedimentos, despesas, fornecedores, perdas };
  }, [dados, v, mes, periodoRanking, regime]);

  const rotuloRegime = regime === "caixa" ? "regime de caixa (pago/recebido no mês)" : "regime de competência (emissão do título)";

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando indicadores financeiros…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><Briefcase size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard da Diretoria</h1>
              <p className="text-sm text-slate-500">Indicadores executivos do Financeiro e do Faturamento do Clinux.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => void carregar(true)} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
            <CalendarRange size={16} className="text-slate-400" />Mês de referência
            <input type="month" value={mes} max={mesAtual()} onChange={e => e.target.value && setMes(e.target.value)} className="bg-transparent font-bold outline-none" />
          </label>
          <Alternador valor={regime} onChange={x => setRegime(x as Regime)} opcoes={[["caixa", "Regime de caixa"], ["competencia", "Competência"]]} />
          <span className="text-xs text-slate-400">DRE pela classificação do plano de contas do Clinux · {rotuloRegime}.</span>
        </section>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {v && rk && (
          <div className="space-y-8">
            <Secao titulo={`Resultado de ${rotuloMes(mes)}`}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                <KpiValor titulo="Receita bruta" valor={v.atual.receitaBruta} anterior={v.anterior.receitaBruta} anoAnterior={v.anoAnterior.receitaBruta} icone={CircleDollarSign} cor={COR.primaria} />
                <KpiValor titulo="Receita líquida" valor={v.atual.receitaLiquida} anterior={v.anterior.receitaLiquida} anoAnterior={v.anoAnterior.receitaLiquida} icone={Coins} cor={COR.primaria} />
                <KpiValor titulo="Lucro bruto" valor={v.atual.lucroBruto} anterior={v.anterior.lucroBruto} anoAnterior={v.anoAnterior.lucroBruto} icone={TrendingUp} cor={COR.ok} />
                <KpiValor titulo="EBITDA / resultado operacional" valor={v.atual.ebitda} anterior={v.anterior.ebitda} anoAnterior={v.anoAnterior.ebitda} icone={BarChart3} cor={COR.secundaria} extra={`margem ${fmtP(v.atual.margemEbitda)}`} />
                <KpiValor titulo="Lucro líquido" valor={v.atual.lucroLiquido} anterior={v.anterior.lucroLiquido} anoAnterior={v.anoAnterior.lucroLiquido} icone={PiggyBank} cor={v.atual.lucroLiquido >= 0 ? COR.ok : COR.critico} extra={`margem ${fmtP(v.atual.margemLiquida)}`} />
                <KpiValor titulo="Margem de contribuição" valor={v.atual.margemContribuicao} anterior={v.anterior.margemContribuicao} anoAnterior={v.anoAnterior.margemContribuicao} icone={Scale} cor={COR.ok} extra={`${fmtP(v.atual.margemContribuicaoPct)} da receita`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiValor titulo="Receita por competência" valor={v.competencia.receitaBruta} anterior={v.competenciaAnt.receitaBruta} icone={Receipt} cor={COR.primaria} extra="títulos emitidos no mês" />
                <Kpi titulo="Crescimento da receita" valor={fmtP(variacao(v.atual.receitaBruta, v.anterior.receitaBruta))} icone={TrendingUp} variacao={null}
                  detalhe={`no mês · ${fmtP(variacao(v.atual.receitaBruta, v.anoAnterior.receitaBruta))} vs ${rotuloMes(v.mAA)} · ${fmtP(variacao(v.ano.receitaBruta, v.anoAnt.receitaBruta))} no ano`} destaque={COR.primaria} />
                <Kpi titulo="Crescimento das despesas" valor={fmtP(variacao(despesasDre(v.atual), despesasDre(v.anterior)))} icone={TrendingUp} variacao={null}
                  detalhe={`no mês · ${fmtP(variacao(despesasDre(v.ano), despesasDre(v.anoAnt)))} no ano (receita: ${fmtP(variacao(v.ano.receitaBruta, v.anoAnt.receitaBruta))})`} destaque={COR.atencao} />
                <Kpi titulo="Meta e orçamento" valor="—" icone={Gauge} variacao={null} detalhe="ainda não cadastrados (próxima etapa)" destaque="#94a3b8" />
              </div>
            </Secao>

            <Secao titulo="Caixa e contas">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiValor titulo="Total recebido no mês" valor={v.caixa.totalRecebido} anterior={v.caixaAnt.totalRecebido} icone={ArrowDownCircle} cor={COR.ok} />
                <KpiValor titulo="Total pago no mês" valor={v.caixa.totalPago} anterior={v.caixaAnt.totalPago} icone={ArrowUpCircle} cor={COR.critico} menorMelhor />
                <Kpi titulo="Saldo disponível" valor={R(v.s.disponivel)} icone={Wallet} variacao={null} detalhe="contas com saldo positivo, hoje" destaque={COR.ok} />
                <Kpi titulo="Saldo consolidado dos bancos" valor={R(v.s.consolidado)} icone={Landmark} variacao={null} detalhe={`${v.s.lista.length} contas com saldo, hoje`} destaque={COR.primaria} />
                <Kpi titulo="A receber" valor={R(v.abertos.receber.total - v.abertos.receber.vencidasMaisDeUmAno)} icone={Banknote} variacao={null}
                  detalhe={`${R(v.abertos.receber.vencidas)} vencidas e não recebidas`} destaque={COR.primaria} />
                <Kpi titulo="A pagar" valor={R(v.abertos.pagar.total - v.abertos.pagar.vencidasMaisDeUmAno)} icone={Receipt} variacao={null}
                  detalhe={`${R(v.abertos.pagar.vencidas)} vencidas e não pagas`} destaque={COR.atencao} />
                <Kpi titulo="Endividamento" valor={R(v.abertos.divida.total)} icone={Scale} variacao={null} detalhe="parcelas de empréstimos e financiamentos em aberto" destaque={COR.secundaria} />
                <Kpi titulo="Previsão de caixa" valor={R(v.prev.d30)} icone={PiggyBank} variacao={null} detalhe={`30 dias · 60 d: ${R(v.prev.d60)} · 90 d: ${R(v.prev.d90)}`} destaque={v.prev.d30 >= 0 ? COR.ok : COR.critico} />
              </div>
              {(v.abertos.receber.vencidasMaisDeUmAno > 0 || v.abertos.pagar.vencidasMaisDeUmAno > 0) && (
                <p className="text-xs text-slate-500">
                  Fora dos totais acima: {R(v.abertos.receber.vencidasMaisDeUmAno)} a receber e {R(v.abertos.pagar.vencidasMaisDeUmAno)} a pagar vencidos há mais de 1 ano (provável título não baixado no Clinux).
                </p>
              )}
            </Secao>

            <Secao titulo="Produção e faturamento">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiValor titulo="Produção faturável" valor={v.prod.valor} anterior={v.prodAnt.valor} icone={Stethoscope} cor={COR.primaria} extra={`convênio ${R(v.prod.convenio)} · particular ${R(v.prod.particular)}`} />
                <Kpi titulo="Exames realizados" valor={fmtN(v.prod.exames)} icone={Layers} variacao={variacao(v.prod.exames, v.prodAnt.exames)} menorMelhor={false} detalhe={`vs ${rotuloMes(v.mAnt)}`} destaque={COR.primaria} />
                <Kpi titulo="Ticket médio por exame" valor={v.prod.exames ? RC(v.prod.valor / v.prod.exames) : "—"} icone={Coins} menorMelhor={false}
                  variacao={v.prod.exames && v.prodAnt.exames ? variacao(v.prod.valor / v.prod.exames, v.prodAnt.valor / v.prodAnt.exames) : null} detalhe={`vs ${rotuloMes(v.mAnt)}`} destaque={COR.ok} />
                <Kpi titulo="Custo médio por exame" valor={v.prod.exames ? RC(v.custoOperacional(v.atual) / v.prod.exames) : "—"} icone={Scale}
                  variacao={v.prod.exames && v.prodAnt.exames ? variacao(v.custoOperacional(v.atual) / v.prod.exames, v.custoOperacional(v.anterior) / v.prodAnt.exames) : null}
                  detalhe="custos + despesas operacionais ÷ exames" destaque={COR.atencao} />
                <KpiValor titulo="Faturamento enviado aos convênios" valor={v.enviado} anterior={v.enviadoAnt} icone={Receipt} cor={COR.primaria} extra="pela data do faturamento" />
                <Kpi titulo="Produção ainda não faturada" valor={R(dados!.naoFaturado12m.valor)} icone={FileWarning} variacao={null} detalhe={`${fmtN(dados!.naoFaturado12m.exames)} exames de convênio (últimos 12 meses)`} destaque={COR.atencao} />
                <Kpi titulo="Glosas" valor={R(v.prod.glosa)} icone={ShieldAlert} variacao={null} detalhe={`taxa ${fmtP(v.prod.faturado ? Math.round((v.prod.glosa / v.prod.faturado) * 1000) / 10 : null)} do faturado`} destaque={COR.critico} />
                <Kpi titulo="Glosas recuperadas" valor={R(v.recuperado)} icone={ShieldAlert} variacao={null} detalhe="recursos no mês" destaque={COR.ok} />
              </div>
            </Secao>

            <Secao titulo="Comparativos">
              <Painel titulo="DRE comparativo" subtitulo={`${rotuloMes(mes)} contra o mês anterior, o mesmo mês do ano anterior e o acumulado do ano · ${rotuloRegime}.`} icone={Scale}>
                <TabelaComparativa v={v} mes={mes} />
              </Painel>
              <div className="grid gap-6 xl:grid-cols-2">
                <Painel titulo="Receita, despesas, EBITDA e lucro" subtitulo="Últimos 13 meses." icone={BarChart3}>
                  <GraficoResultado dados={v.evolucao} />
                </Painel>
                <Painel titulo="Produção × faturamento × recebimento" subtitulo="Produção pela data do exame, faturamento pela data de envio, recebimento pelo caixa." icone={TrendingUp}>
                  <GraficoProducao dados={v.fluxo} />
                </Painel>
              </div>
              <Painel titulo="Evolução do endividamento" subtitulo={`Amortizações de empréstimos pagas por mês · saldo em aberto hoje: ${RC(v.abertos.divida.total)}.`} icone={Landmark}>
                <GraficoMensal dados={v.amortizacoes} rotulo="Amortizado" />
              </Painel>
            </Secao>

            <Secao titulo="Rankings" acao={<Alternador valor={periodoRanking} onChange={x => setPeriodoRanking(x as "mes" | "ano")} opcoes={[["mes", rotuloMes(mes)], ["ano", `Acumulado ${mes.slice(0, 4)}`]]} />}>
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <Painel titulo="Convênios com maior faturamento" subtitulo="Produção dos exames." icone={CircleDollarSign}><RankingBarras itens={rk.faturamento} /></Painel>
                <Painel titulo="Convênios mais rentáveis" subtitulo="Produção − repasse médico − glosas." icone={TrendingUp}><RankingBarras itens={rk.rentabilidade} cor={COR.ok} /></Painel>
                <Painel titulo="Convênios com maior inadimplência" subtitulo="Títulos a receber vencidos (até 1 ano), hoje." icone={AlertTriangle}><RankingBarras itens={rk.inadimplencia} cor={COR.critico} vazio="Nenhum título vencido." /></Painel>
                <Painel titulo="Convênios com mais glosas" subtitulo="Valor glosado dos exames." icone={ShieldAlert}><RankingBarras itens={rk.glosas} cor={COR.critico} vazio="Nenhuma glosa registrada." /></Painel>
                <Painel titulo="Modalidades mais rentáveis" subtitulo="Produção − repasse − despesas do centro de custo da modalidade." icone={Layers}><RankingBarras itens={rk.modalidades} cor={COR.ok} /></Painel>
                <Painel titulo="Procedimentos mais rentáveis" subtitulo="Produção − repasse médico." icone={Stethoscope}><RankingBarras itens={rk.procedimentos} cor={COR.ok} /></Painel>
                <Painel titulo="Maiores despesas" subtitulo="Por conta do plano de contas (sem empréstimos e investimentos)." icone={Receipt}><RankingBarras itens={rk.despesas} cor={COR.atencao} /></Painel>
                <Painel titulo="Maiores fornecedores" subtitulo="Despesas pagas por fornecedor." icone={Truck}><RankingBarras itens={rk.fornecedores} cor={COR.atencao} /></Painel>
                <Painel titulo="Principais causas de perdas" subtitulo="Exames perdidos, glosas, títulos baixados com perda e cancelamentos." icone={FileWarning}><RankingBarras itens={rk.perdas} cor={COR.critico} vazio="Nenhuma perda registrada." /></Painel>
              </div>
            </Secao>

            <p className="text-xs text-slate-400">
              Ainda não disponível: orçamento e metas (não existem no Clinux: precisam de cadastro), comparação entre unidades (o Clinux tem uma só unidade cadastrada) e retorno por equipamento.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

// KPI em reais com variação contra o mês anterior e, no detalhe, contra o mesmo mês do ano anterior.
function KpiValor({ titulo, valor, anterior, anoAnterior, icone, cor, extra, menorMelhor = false }: {
  titulo: string; valor: number; anterior: number; anoAnterior?: number; icone: typeof Wallet; cor: string; extra?: string; menorMelhor?: boolean;
}) {
  const partes = [extra, anoAnterior !== undefined ? `${fmtP(variacao(valor, anoAnterior))} vs ano anterior` : null].filter(Boolean);
  return <Kpi titulo={titulo} valor={R(valor)} icone={icone} variacao={variacao(valor, anterior)} menorMelhor={menorMelhor} detalhe={partes.join(" · ") || "vs mês anterior"} destaque={cor} />;
}

function Var({ atual, base, menorMelhor = false, pct = false }: { atual: number | null; base: number | null; menorMelhor?: boolean; pct?: boolean }) {
  if (atual === null || base === null) return <span className="text-slate-300">—</span>;
  const d = pct ? Math.round((atual - base) * 10) / 10 : variacao(atual, base);
  if (d === null || d === 0) return <span className="text-slate-400">{d === 0 ? "0" : "—"}</span>;
  const bom = menorMelhor ? d < 0 : d > 0;
  return <span className={`font-bold ${bom ? "text-emerald-600" : "text-red-600"}`}>{d > 0 ? "+" : ""}{d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{pct ? " p.p." : "%"}</span>;
}

function TabelaComparativa({ v, mes }: { v: { atual: Dre; anterior: Dre; anoAnterior: Dre; ano: Dre; anoAnt: Dre; mAnt: string; mAA: string }; mes: string }) {
  const fmt = (x: number | null, pct?: boolean) => (x === null ? "—" : pct ? fmtP(x) : RC(x));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-right text-xs uppercase tracking-wider text-slate-500">
            <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Linha</th>
            <th className="bg-slate-50 px-3 py-2">{rotuloMes(mes)}</th>
            <th className="bg-slate-50 px-3 py-2">{rotuloMes(v.mAnt)}</th>
            <th className="bg-slate-50 px-3 py-2">Var.</th>
            <th className="bg-slate-50 px-3 py-2">{rotuloMes(v.mAA)}</th>
            <th className="bg-slate-50 px-3 py-2">Var.</th>
            <th className="bg-slate-50 px-3 py-2">Acum. {mes.slice(0, 4)}</th>
            <th className="bg-slate-50 px-3 py-2">Acum. {Number(mes.slice(0, 4)) - 1}</th>
            <th className="rounded-r-xl bg-slate-50 px-3 py-2">Var.</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS_DRE.map(l => {
            const a = l.valor(v.atual), ant = l.valor(v.anterior), aa = l.valor(v.anoAnterior), ano = l.valor(v.ano), anoAnt = l.valor(v.anoAnt);
            return (
              <tr key={l.rotulo} className={`border-b border-slate-100 last:border-0 ${l.destaque ? "bg-blue-50/40 font-bold text-slate-900" : "text-slate-700"}`}>
                <td className="px-3 py-2">{l.rotulo}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(a, l.pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(ant, l.pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums"><Var atual={a} base={ant} menorMelhor={l.menorMelhor} pct={l.pct} /></td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(aa, l.pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums"><Var atual={a} base={aa} menorMelhor={l.menorMelhor} pct={l.pct} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(ano, l.pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(anoAnt, l.pct)}</td>
                <td className="px-3 py-2 text-right tabular-nums"><Var atual={ano} base={anoAnt} menorMelhor={l.menorMelhor} pct={l.pct} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
