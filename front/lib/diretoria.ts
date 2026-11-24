// Dashboard da Diretoria: cálculo dos indicadores a partir dos agregados mensais de /clinux/diretoria/resumo.
// O DRE segue a classificação do próprio plano de contas do Clinux (linha de resultado de cada conta).

export type Regime = "caixa" | "competencia";

export type ContaFin = { cdConta: number; conta: string; grupo: string | null; despesa: boolean; linha: string | null; variavel: boolean };
export type ValorFin = { regime: Regime; mes: string; cdConta: number; valor: number };
export type Aberto = { cdConta: number | null; cdFornecedor: number | null; faixa: string; valor: number; parcelas: number };
export type Producao = {
  mes: string; nivel: "total" | "convenio" | "modalidade"; cdConvenio: number | null; cdModalidade: number | null
  exames: number; valor: number; convenio: number; particular: number; faturado: number; naoFaturado: number; repasse: number; glosa: number; perda: number
};

export type RespostaDiretoria = {
  mes: string
  contas: ContaFin[]
  financeiro: ValorFin[]
  abertos: Aberto[]
  bancos: Array<{ cdBanco: number; banco: string; saldo: number }>
  producao: Producao[]
  faturamentoEnviado: Array<{ mes: string; faturado: number; exames: number }>
  naoFaturado12m: { valor: number; exames: number }
  glosasRecuperadas: Array<{ mes: string; recuperado: number }>
  despesasFornecedor: Array<{ mes: string; cdFornecedor: number | null; valor: number }>
  despesasCentro: Array<{ mes: string; cdCentro: number | null; linha: string | null; valor: number }>
  procedimentos: Array<{ cdProcedimento: number | null; examesAno: number; valorAno: number; repasseAno: number; examesMes: number; valorMes: number; repasseMes: number }>
  perdasMotivo: Array<{ motivo: string; examesAno: number; valorAno: number; examesMes: number; valorMes: number }>
  perdasTitulos: Array<{ mes: string; perda: number }>
  nomes: { fornecedores: Record<number, string>; modalidades: Record<number, string>; centros: Record<number, string>; procedimentos: Record<number, string> }
  atualizadoEm: string
};

// ---------- Meses ----------

export function deslocarMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Os n meses que terminam em `mes` (inclusive), do mais antigo ao mais novo. */
export function mesesAte(mes: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => deslocarMes(mes, i - n + 1));
}

/** Janeiro até o mês (acumulado do ano). */
export function acumuladoAno(mes: string): string[] {
  return mesesAte(mes, Number(mes.slice(5, 7)));
}

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (mes: string) => `${NOMES_MES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

// ---------- Classificação das contas ----------

export type Categoria =
  | "receita" | "deducao" | "custo" | "administrativa" | "pessoal" | "comercial"
  | "recFin" | "despFin" | "naoOperacional" | "amortizacao" | "investimento" | "ajuste" | "outraReceita" | "outraDespesa";

export const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export function categoria(c: Pick<ContaFin, "conta" | "despesa" | "linha">): Categoria {
  const l = normalizar(c.linha);
  if (normalizar(c.conta).startsWith("AJUSTE DE SALDO")) return "ajuste";
  if (l.includes("AMORTIZ")) return "amortizacao";
  if (l.includes("IMOBILIZ") || l.includes("INVESTIMENTO")) return "investimento";
  if (l.includes("DEDUC")) return "deducao";
  if (l.includes("NAO OPERACIONAL")) return "naoOperacional";
  if (l.includes("RECEITA FINANCEIRA")) return "recFin";
  if (l.includes("DESPESA FINANCEIRA")) return "despFin";
  if (l.includes("RECEITA")) return "receita";
  if (l.includes("PESSOAL")) return "pessoal";
  if (l.includes("COMERCIAL")) return "comercial";
  if (l.includes("ADMINISTRATIVA") || l.includes("DIRETORIA")) return "administrativa";
  if (l.includes("OPERACIONAL") || l.includes("CUSTO")) return "custo";
  return c.despesa ? "outraDespesa" : "outraReceita";
}

// ---------- DRE ----------

export type Dre = {
  receitaBruta: number; deducoes: number; receitaLiquida: number; custos: number; lucroBruto: number
  administrativas: number; pessoal: number; comerciais: number; despesasOperacionais: number; resultadoOperacional: number
  ebitda: number; receitasFinanceiras: number; despesasFinanceiras: number; naoOperacional: number; lucroLiquido: number
  variaveis: number; margemContribuicao: number; margemEbitda: number | null; margemLiquida: number | null; margemContribuicaoPct: number | null
  amortizacoes: number; investimentos: number; outrasReceitas: number; outrasDespesas: number
  totalRecebido: number; totalPago: number
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

export function calcularDre(dados: Pick<RespostaDiretoria, "contas" | "financeiro">, regime: Regime, meses: string[]): Dre {
  const conjunto = new Set(meses);
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const soma: Record<Categoria, number> = {
    receita: 0, deducao: 0, custo: 0, administrativa: 0, pessoal: 0, comercial: 0, recFin: 0, despFin: 0,
    naoOperacional: 0, amortizacao: 0, investimento: 0, ajuste: 0, outraReceita: 0, outraDespesa: 0,
  };
  let variaveis = 0, recebido = 0, pago = 0;
  for (const v of dados.financeiro) {
    if (v.regime !== regime || !conjunto.has(v.mes)) continue;
    const c = contas.get(v.cdConta);
    if (!c) continue;
    const cat = categoria(c);
    if (cat === "ajuste") continue;
    // Não operacional pode ser receita ou despesa: guarda o líquido.
    soma[cat] += cat === "naoOperacional" && c.despesa ? -v.valor : v.valor;
    if (c.despesa) pago += v.valor; else recebido += v.valor;
    if (c.variavel && c.despesa && cat !== "amortizacao" && cat !== "investimento") variaveis += v.valor;
  }
  const receitaLiquida = soma.receita - soma.deducao;
  const lucroBruto = receitaLiquida - soma.custo;
  const despesasOperacionais = soma.administrativa + soma.pessoal + soma.comercial;
  const resultadoOperacional = lucroBruto - despesasOperacionais;
  // O plano de contas do Clinux não tem depreciação/amortização contábil: EBITDA = resultado operacional
  // (antes do resultado financeiro e do não operacional).
  const ebitda = resultadoOperacional;
  const lucroLiquido = resultadoOperacional + soma.recFin - soma.despFin + soma.naoOperacional;
  const margemContribuicao = soma.receita - variaveis;
  return {
    receitaBruta: soma.receita, deducoes: soma.deducao, receitaLiquida, custos: soma.custo, lucroBruto,
    administrativas: soma.administrativa, pessoal: soma.pessoal, comerciais: soma.comercial, despesasOperacionais, resultadoOperacional,
    ebitda, receitasFinanceiras: soma.recFin, despesasFinanceiras: soma.despFin, naoOperacional: soma.naoOperacional, lucroLiquido,
    variaveis, margemContribuicao,
    margemEbitda: pct(ebitda, receitaLiquida), margemLiquida: pct(lucroLiquido, receitaLiquida), margemContribuicaoPct: pct(margemContribuicao, soma.receita),
    amortizacoes: soma.amortizacao, investimentos: soma.investimento, outrasReceitas: soma.outraReceita, outrasDespesas: soma.outraDespesa,
    totalRecebido: recebido, totalPago: pago,
  };
}

/** Despesas totais do DRE (deduções + custos + operacionais + financeiras). */
export const despesasDre = (d: Dre) => d.deducoes + d.custos + d.despesasOperacionais + d.despesasFinanceiras;

// ---------- Produção ----------

export type TotalProducao = { exames: number; valor: number; convenio: number; particular: number; faturado: number; naoFaturado: number; repasse: number; glosa: number; perda: number };

const zeroProducao = (): TotalProducao => ({ exames: 0, valor: 0, convenio: 0, particular: 0, faturado: 0, naoFaturado: 0, repasse: 0, glosa: 0, perda: 0 });

function somarProducao(alvo: TotalProducao, p: TotalProducao) {
  alvo.exames += p.exames; alvo.valor += p.valor; alvo.convenio += p.convenio; alvo.particular += p.particular;
  alvo.faturado += p.faturado; alvo.naoFaturado += p.naoFaturado; alvo.repasse += p.repasse; alvo.glosa += p.glosa; alvo.perda += p.perda;
}

export function producaoTotal(linhas: Producao[], meses: string[]): TotalProducao {
  const conjunto = new Set(meses);
  const t = zeroProducao();
  for (const p of linhas) if (p.nivel === "total" && conjunto.has(p.mes)) somarProducao(t, p);
  return t;
}

export function producaoPor(linhas: Producao[], nivel: "convenio" | "modalidade", meses: string[]): Map<number | null, TotalProducao> {
  const conjunto = new Set(meses);
  const mapa = new Map<number | null, TotalProducao>();
  for (const p of linhas) {
    if (p.nivel !== nivel || !conjunto.has(p.mes)) continue;
    const k = nivel === "convenio" ? p.cdConvenio : p.cdModalidade;
    const t = mapa.get(k) ?? zeroProducao();
    somarProducao(t, p);
    mapa.set(k, t);
  }
  return mapa;
}

export const somaMeses = <T extends { mes: string }>(l: T[], meses: string[], campo: (x: T) => number) => {
  const conjunto = new Set(meses);
  return l.reduce((s, x) => (conjunto.has(x.mes) ? s + campo(x) : s), 0);
};

// ---------- Em aberto, saldos e previsão de caixa ----------

export const FAIXAS_VENCIDAS = ["v1", "v31", "v91"] as const; // até 1 ano em atraso
export type ResumoAberto = { total: number; vencidas: number; vencidasMaisDeUmAno: number; aVencer30: number; aVencer60: number; aVencer90: number; aVencerDepois: number };

export function resumoAbertos(dados: Pick<RespostaDiretoria, "contas" | "abertos">) {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const novo = (): ResumoAberto => ({ total: 0, vencidas: 0, vencidasMaisDeUmAno: 0, aVencer30: 0, aVencer60: 0, aVencer90: 0, aVencerDepois: 0 });
  const receber = novo(), pagar = novo(), divida = novo();
  const inadimplencia = new Map<number | null, number>();
  for (const a of dados.abertos) {
    const c = a.cdConta === null ? undefined : contas.get(a.cdConta);
    if (!c) continue;
    const cat = categoria(c);
    if (cat === "ajuste") continue;
    const alvos = c.despesa ? (cat === "amortizacao" ? [pagar, divida] : [pagar]) : [receber];
    for (const r of alvos) {
      r.total += a.valor;
      if ((FAIXAS_VENCIDAS as readonly string[]).includes(a.faixa)) r.vencidas += a.valor;
      else if (a.faixa === "v365") r.vencidasMaisDeUmAno += a.valor;
      else if (a.faixa === "a30") r.aVencer30 += a.valor;
      else if (a.faixa === "a60") r.aVencer60 += a.valor;
      else if (a.faixa === "a90") r.aVencer90 += a.valor;
      else r.aVencerDepois += a.valor;
    }
    if (!c.despesa && (FAIXAS_VENCIDAS as readonly string[]).includes(a.faixa)) inadimplencia.set(a.cdFornecedor, (inadimplencia.get(a.cdFornecedor) ?? 0) + a.valor);
  }
  return { receber, pagar, divida, inadimplencia };
}

export function saldos(bancos: RespostaDiretoria["bancos"]) {
  const arred = (n: number) => (Math.abs(n) < 0.005 ? 0 : n);
  const lista = bancos.map(b => ({ ...b, saldo: arred(b.saldo) }));
  return {
    consolidado: lista.reduce((s, b) => s + b.saldo, 0),
    // Disponível: só contas com saldo positivo (contas devedoras, como consórcio e cartão, ficam fora).
    disponivel: lista.reduce((s, b) => s + Math.max(0, b.saldo), 0),
    lista: lista.filter(b => b.saldo !== 0).sort((a, b) => b.saldo - a.saldo),
  };
}

/** Saldo disponível + a receber − a pagar, até 30, 60 e 90 dias (sem contar o que já está vencido). */
export function previsaoCaixa(disponivel: number, receber: ResumoAberto, pagar: ResumoAberto) {
  const d30 = disponivel + receber.aVencer30 - pagar.aVencer30;
  const d60 = d30 + receber.aVencer60 - pagar.aVencer60;
  const d90 = d60 + receber.aVencer90 - pagar.aVencer90;
  return { d30, d60, d90 };
}

// ---------- Utilitários ----------

export const variacao = (atual: number, anterior: number) => (anterior ? Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10 : null);

export function formatarReais(n: number, compacto = false): string {
  const abs = Math.abs(n);
  if (compacto && abs >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (compacto && abs >= 10_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: abs >= 1000 ? 0 : 2 });
}
