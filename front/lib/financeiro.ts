// Dashboard Financeiro (visão geral + contas a receber): cálculos sobre a resposta de /clinux/financeiro/resumo.
import { calcularDre, categoria, normalizar, type ContaFin, type Dre, type ValorFin } from "@/lib/diretoria";

export type BancoFin = {
  cdBanco: number; banco: string; saldoAtual: number; saldoInicial: number; saldoFinal: number
  entradas: number; saidas: number; transfEntrada: number; transfSaida: number
};
export type FluxoDia = { dia: string; tipo: "entrada" | "saida"; realizado: number; previsto: number };
export type AbertoFin = {
  receita: boolean; tipo: string | null; cdConta: number; cdFornecedor: number | null; faixa: string
  mesVencimento: string; mesCompetencia: string; valor: number; parcelas: number
};
export type RecebidoFin = {
  tipo: string | null; cdFornecedor: number | null; parcelas: number; recebido: number; previsto: number; noPrazo: number
  atrasado: number; antecipado: number; parciais: number; parcialValor: number; perda: number; diasEmissao: number; diasAtraso: number
};

export type RespostaFinanceiro = {
  periodo: { inicio: string; fim: string }
  contas: ContaFin[]
  bancos: BancoFin[]
  fluxo: FluxoDia[]
  financeiro: ValorFin[]
  abertos: AbertoFin[]
  recebidos: RecebidoFin[]
  atrasosMensais: Array<{ mes: string; tipo: string | null; valor: number }>
  receita90: number
  naoConciliado: { parcelas: number; valor: number }
  pagar?: {
    abertos: Array<{ cdFornecedor: number | null; cdConta: number; cdCentro: number | null; prazo: string; valor: number; parcelas: number }>
    pagos: PagoFin[]
    recorrentes: string[]
  }
  nomes: { fornecedores: Record<number, string>; centros?: Record<number, string> }
  atualizadoEm: string
};

export type PagoFin = {
  cdFornecedor: number | null; cdConta: number; cdCentro: number | null; forma: string | null; parcelas: number; pago: number; previsto: number
  juros: number; multa: number; desconto: number; antecipado: number; atrasado: number; noPrazo: number; diasPrazo: number; diasAtraso: number; vencidoAntes: number
};

// ---------- Bancos ----------

export type TipoConta = "corrente" | "aplicacao" | "caixa" | "cartao" | "credito" | "financiamento" | "ajuste";
export const ROTULO_TIPO_CONTA: Record<TipoConta, string> = {
  corrente: "Conta corrente", aplicacao: "Aplicação", caixa: "Caixa", cartao: "Recebíveis de cartão",
  credito: "Cartão de crédito", financiamento: "Financiamento/consórcio", ajuste: "Ajuste/transitória",
};

export function tipoConta(nome: string): TipoConta {
  const n = normalizar(nome);
  if (/AJUSTE|TRANSITORI|NAO FINANCEIRA/.test(n)) return "ajuste";
  if (/APLICAC|INVEST/.test(n)) return "aplicacao";
  if (/OPERACAO DE CARTAO|GETNET|CIELO|STONE|REDE /.test(n)) return "cartao";
  if (/CARTAO/.test(n)) return "credito";
  if (/CONSORCIO|FINANCIAMENTO|EMPRESTIMO|GRUPO CRI/.test(n)) return "financiamento";
  if (/CAIXA GERAL|^CAIXA$|DINHEIRO/.test(n)) return "caixa";
  return "corrente";
}

const INSTITUICOES: Array<[RegExp, string]> = [
  [/BRADESCO/, "Bradesco"], [/SANTANDER/, "Santander"], [/SICOOB/, "Sicoob"], [/UNICRED/, "Unicred"],
  [/CAIXA ECONOMICA|B\. CAIXA/, "Caixa Econômica"], [/BRASIL/, "Banco do Brasil"], [/GETNET/, "Getnet"], [/ITAU/, "Itaú"],
];
export function instituicao(nome: string): string {
  const n = normalizar(nome);
  return INSTITUICOES.find(([r]) => r.test(n))?.[1] ?? nome;
}

export type ContaBancaria = BancoFin & { tipo: TipoConta; instituicao: string };

export function resumoBancos(bancos: BancoFin[]) {
  const contas: ContaBancaria[] = bancos.map(b => ({ ...b, tipo: tipoConta(b.banco), instituicao: instituicao(b.banco) }));
  const soma = (l: ContaBancaria[], k: keyof Pick<BancoFin, "saldoInicial" | "saldoFinal" | "entradas" | "saidas">) => l.reduce((s, b) => s + b[k], 0);
  const operacionais = contas.filter(b => b.tipo !== "ajuste");
  const disponiveis = contas.filter(b => ["corrente", "aplicacao", "caixa", "cartao"].includes(b.tipo));
  const porInstituicao = new Map<string, { instituicao: string; saldoInicial: number; saldoFinal: number; contas: number }>();
  for (const b of operacionais) {
    const g = porInstituicao.get(b.instituicao) ?? { instituicao: b.instituicao, saldoInicial: 0, saldoFinal: 0, contas: 0 };
    g.saldoInicial += b.saldoInicial; g.saldoFinal += b.saldoFinal; g.contas += 1;
    porInstituicao.set(b.instituicao, g);
  }
  return {
    contas,
    saldoInicial: soma(operacionais, "saldoInicial"),
    saldoFinal: soma(operacionais, "saldoFinal"),
    disponivelFinal: disponiveis.reduce((s, b) => s + Math.max(0, b.saldoFinal), 0),
    aplicacoes: soma(contas.filter(b => b.tipo === "aplicacao"), "saldoFinal"),
    ajustes: soma(contas.filter(b => b.tipo === "ajuste"), "saldoFinal"),
    porInstituicao: [...porInstituicao.values()].sort((a, b) => b.saldoFinal - a.saldoFinal),
  };
}

// ---------- Fluxo de caixa ----------

export function resumoFluxo(fluxo: FluxoDia[]) {
  const r = { entradasRealizadas: 0, entradasPrevistas: 0, saidasRealizadas: 0, saidasPrevistas: 0 };
  for (const f of fluxo) {
    if (f.tipo === "entrada") { r.entradasRealizadas += f.realizado; r.entradasPrevistas += f.previsto; }
    else { r.saidasRealizadas += f.realizado; r.saidasPrevistas += f.previsto; }
  }
  return { ...r, liquido: r.entradasRealizadas - r.saidasRealizadas, liquidoPrevisto: r.entradasPrevistas - r.saidasPrevistas };
}

export type PontoFluxo = { chave: string; rotulo: string; entradas: number; saidas: number; entradasPrevistas: number; saidasPrevistas: number; saldo: number };

/** Agrupa o fluxo por dia (até 45 dias), semana (até 6 meses) ou mês, com saldo acumulado a partir do saldo inicial. */
export function serieFluxo(fluxo: FluxoDia[], inicio: string, fim: string, saldoInicial: number): PontoFluxo[] {
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1;
  const escala = dias <= 45 ? "dia" : dias <= 186 ? "semana" : "mes";
  const chave = (d: string) => {
    if (escala === "dia") return d;
    if (escala === "mes") return d.slice(0, 7);
    const t = Date.parse(`${d}T00:00:00Z`), dow = (new Date(t).getUTCDay() + 6) % 7;
    return new Date(t - dow * 86_400_000).toISOString().slice(0, 10);
  };
  const rotulo = (k: string) => (escala === "mes" ? `${k.slice(5, 7)}/${k.slice(2, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`);
  const mapa = new Map<string, PontoFluxo>();
  // Todos os buckets do período, mesmo sem movimento.
  for (let t = Date.parse(`${inicio}T00:00:00Z`); t <= Date.parse(`${fim}T00:00:00Z`); t += 86_400_000) {
    const k = chave(new Date(t).toISOString().slice(0, 10));
    if (!mapa.has(k)) mapa.set(k, { chave: k, rotulo: rotulo(k), entradas: 0, saidas: 0, entradasPrevistas: 0, saidasPrevistas: 0, saldo: 0 });
  }
  for (const f of fluxo) {
    const p = mapa.get(chave(f.dia));
    if (!p) continue;
    if (f.tipo === "entrada") { p.entradas += f.realizado; p.entradasPrevistas += f.previsto; }
    else { p.saidas += f.realizado; p.saidasPrevistas += f.previsto; }
  }
  let saldo = saldoInicial;
  return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave)).map(p => { saldo += p.entradas - p.saidas; return { ...p, saldo }; });
}

// ---------- Resultado (competência) ----------

/** Despesas fixas: custos e despesas operacionais de contas não variáveis. */
export function despesasFixas(dados: Pick<RespostaFinanceiro, "contas" | "financeiro">, meses: string[]) {
  const conjunto = new Set(meses);
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  let total = 0;
  for (const v of dados.financeiro) {
    if (v.regime !== "competencia" || !conjunto.has(v.mes)) continue;
    const c = contas.get(v.cdConta);
    if (!c?.despesa || c.variavel) continue;
    if (["custo", "administrativa", "pessoal", "comercial"].includes(categoria(c))) total += v.valor;
  }
  return total;
}

export function mesesDoPeriodo(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let [a, m] = inicio.slice(0, 7).split("-").map(Number);
  const [af, mf] = fim.slice(0, 7).split("-").map(Number);
  while (a < af || (a === af && m <= mf)) { meses.push(`${a}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; a++; } }
  return meses;
}

export const resultado = (dados: RespostaFinanceiro): Dre => calcularDre(dados, "competencia", mesesDoPeriodo(dados.periodo.inicio, dados.periodo.fim));

// ---------- Contas a receber e a pagar ----------

export const FAIXAS_VENCIDAS = ["v1", "v16", "v31", "v61", "v91", "v181"] as const;
export const FAIXAS_A_VENCER = ["a30", "a60", "a90", "a91"] as const;
export const ROTULO_FAIXA: Record<string, string> = {
  a30: "A vencer até 30 dias", a60: "A vencer 31–60", a90: "A vencer 61–90", a91: "A vencer +90",
  v1: "Vencidos 1–15 dias", v16: "16–30 dias", v31: "31–60 dias", v61: "61–90 dias", v91: "91–180 dias", v181: "Acima de 180 dias",
};
export type Origem = "convenio" | "particular" | "outros";
export const ROTULO_ORIGEM: Record<Origem, string> = { convenio: "Convênios (faturas)", particular: "Particulares (atendimento)", outros: "Outros recebimentos" };
export const origem = (tipo: string | null): Origem => (tipo === "F" ? "convenio" : tipo === "U" ? "particular" : "outros");
const vencida = (f: string) => (FAIXAS_VENCIDAS as readonly string[]).includes(f);

export type Envelhecimento = Record<string, number>;

export function resumoReceber(dados: RespostaFinanceiro) {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const receber = dados.abertos.filter(a => a.receita);
  const pagar = dados.abertos.filter(a => !a.receita);
  const faixas = (l: AbertoFin[]) => l.reduce<Envelhecimento>((r, a) => { r[a.faixa] = (r[a.faixa] ?? 0) + a.valor; return r; }, {});
  const total = (l: AbertoFin[]) => l.reduce((s, a) => s + a.valor, 0);
  const vencidos = (l: AbertoFin[]) => l.filter(a => vencida(a.faixa)).reduce((s, a) => s + a.valor, 0);

  const porOrigem = (["convenio", "particular", "outros"] as Origem[]).map(o => {
    const l = receber.filter(a => origem(a.tipo) === o);
    return { origem: o, total: total(l), vencidos: vencidos(l), faixas: faixas(l) };
  });

  // Envelhecimento por convênio (faturas F e lançamentos L com cliente).
  const porConvenio = new Map<number | null, { cdFornecedor: number | null; total: number; vencidos: number; faixas: Envelhecimento }>();
  for (const a of receber) {
    if (a.tipo === "U") continue;
    const g = porConvenio.get(a.cdFornecedor) ?? { cdFornecedor: a.cdFornecedor, total: 0, vencidos: 0, faixas: {} };
    g.total += a.valor; if (vencida(a.faixa)) g.vencidos += a.valor;
    g.faixas[a.faixa] = (g.faixas[a.faixa] ?? 0) + a.valor;
    porConvenio.set(a.cdFornecedor, g);
  }
  const porMes = (campo: "mesVencimento" | "mesCompetencia") => {
    const m = new Map<string, number>();
    for (const a of receber) m.set(a[campo], (m.get(a[campo]) ?? 0) + a.valor);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, valor]) => ({ mes, valor }));
  };
  // A pagar sem amortização de empréstimos (para capital de giro) e com ela (obrigações).
  const pagarOperacional = pagar.filter(a => { const c = contas.get(a.cdConta); return !c || categoria(c) !== "amortizacao"; });

  return {
    receberTotal: total(receber), receberVencidos: vencidos(receber), receberFaixas: faixas(receber),
    pagarTotal: total(pagar), pagarVencidos: vencidos(pagar), pagarFaixas: faixas(pagar),
    pagarOperacionalTotal: total(pagarOperacional),
    porOrigem,
    porConvenio: [...porConvenio.values()].sort((a, b) => b.total - a.total),
    porVencimento: porMes("mesVencimento"),
    porCompetencia: porMes("mesCompetencia"),
  };
}

export function resumoRecebidos(dados: RespostaFinanceiro) {
  const t = { parcelas: 0, recebido: 0, previsto: 0, noPrazo: 0, atrasado: 0, antecipado: 0, parciais: 0, parcialValor: 0, perda: 0, diasEmissao: 0, diasAtraso: 0 };
  const porConvenio = new Map<number | null, { cdFornecedor: number | null; recebido: number; diasAtraso: number; diasEmissao: number; atrasado: number }>();
  for (const r of dados.recebidos) {
    (Object.keys(t) as Array<keyof typeof t>).forEach(k => { t[k] += r[k]; });
    if (r.tipo === "F") {
      const g = porConvenio.get(r.cdFornecedor) ?? { cdFornecedor: r.cdFornecedor, recebido: 0, diasAtraso: 0, diasEmissao: 0, atrasado: 0 };
      g.recebido += r.recebido; g.diasAtraso += r.diasAtraso; g.diasEmissao += r.diasEmissao; g.atrasado += r.atrasado;
      porConvenio.set(r.cdFornecedor, g);
    }
  }
  const arred = (n: number) => Math.round(n * 10) / 10;
  return {
    ...t,
    integral: t.parcelas - t.parciais,
    percentualNoPrazo: t.recebido ? arred((t.noPrazo / t.recebido) * 100) : null,
    // Prazos ponderados pelo valor recebido.
    prazoMedio: t.recebido ? arred(t.diasEmissao / t.recebido) : null,
    atrasoMedio: t.recebido ? arred(t.diasAtraso / t.recebido) : null,
    porConvenio: [...porConvenio.values()].map(g => ({
      ...g, atrasoMedio: g.recebido ? arred(g.diasAtraso / g.recebido) : 0, prazoMedio: g.recebido ? arred(g.diasEmissao / g.recebido) : 0,
    })).sort((a, b) => b.atrasoMedio - a.atrasoMedio || b.recebido - a.recebido),
  };
}

/** DSO: saldo a receber ÷ receita média diária dos últimos 90 dias. */
export const dso = (aReceber: number, receita90: number) => (receita90 > 0 ? Math.round((aReceber / (receita90 / 90)) * 10) / 10 : null);

/** Saldo disponível + a receber − a pagar nos próximos 30/60/90 dias (vencidos não entram). */
export function projecao(disponivel: number, receber: Envelhecimento, pagar: Envelhecimento) {
  const d30 = disponivel + (receber.a30 ?? 0) - (pagar.a30 ?? 0);
  const d60 = d30 + (receber.a60 ?? 0) - (pagar.a60 ?? 0);
  const d90 = d60 + (receber.a90 ?? 0) - (pagar.a90 ?? 0);
  return { d30, d60, d90 };
}

// ---------- Contas a pagar ----------

export const PRAZOS_PAGAR = ["d7", "d15", "d30", "d60", "d90"] as const;
export const DIAS_PRAZO: Record<string, number> = { d7: 7, d15: 15, d30: 30, d60: 60, d90: 90 };

type Soma = Map<string, { chave: string; valor: number }>;
const somar = (m: Soma, chave: string, valor: number) => { const g = m.get(chave) ?? { chave, valor: 0 }; g.valor += valor; m.set(chave, g); };
const ordenar = (m: Soma) => [...m.values()].filter(x => Math.abs(x.valor) > 0.005).sort((a, b) => b.valor - a.valor);

export function resumoPagar(dados: RespostaFinanceiro) {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const abertos = dados.pagar?.abertos ?? [];
  const pagos = dados.pagar?.pagos ?? [];
  const recorrentes = new Set(dados.pagar?.recorrentes ?? []);
  const grupo = (cdConta: number) => contas.get(cdConta)?.grupo ?? "Sem grupo";

  // Em aberto
  let total = 0, vencido = 0;
  const porPrazo: Record<string, number> = {};
  const abertoPor = { fornecedor: new Map() as Soma, categoria: new Map() as Soma, conta: new Map() as Soma, centro: new Map() as Soma };
  for (const a of abertos) {
    total += a.valor;
    if (a.prazo === "vencido") vencido += a.valor;
    porPrazo[a.prazo] = (porPrazo[a.prazo] ?? 0) + a.valor;
    somar(abertoPor.fornecedor, String(a.cdFornecedor ?? "-"), a.valor);
    somar(abertoPor.categoria, grupo(a.cdConta), a.valor);
    somar(abertoPor.conta, String(a.cdConta), a.valor);
    somar(abertoPor.centro, String(a.cdCentro ?? "-"), a.valor);
  }
  // Obrigações acumuladas dos próximos N dias (sem o que já venceu).
  let acumulado = 0;
  const proximos = PRAZOS_PAGAR.map(p => { acumulado += porPrazo[p] ?? 0; return { prazo: p, dias: DIAS_PRAZO[p], valor: acumulado }; });

  // Pagos no período
  const t = { pago: 0, previsto: 0, juros: 0, multa: 0, desconto: 0, antecipado: 0, atrasado: 0, noPrazo: 0, diasPrazo: 0, diasAtraso: 0, parcelas: 0, recorrente: 0, extraordinario: 0 };
  const pagoPor = { fornecedor: new Map() as Soma, categoria: new Map() as Soma, conta: new Map() as Soma, centro: new Map() as Soma, forma: new Map() as Soma };
  for (const p of pagos) {
    t.pago += p.pago; t.previsto += p.previsto; t.juros += p.juros; t.multa += p.multa; t.desconto += p.desconto;
    t.antecipado += p.antecipado; t.atrasado += p.atrasado; t.noPrazo += p.noPrazo; t.diasPrazo += p.diasPrazo; t.diasAtraso += p.diasAtraso; t.parcelas += p.parcelas;
    if (recorrentes.has(`${p.cdFornecedor ?? "-"}|${p.cdConta}`)) t.recorrente += p.pago; else t.extraordinario += p.pago;
    somar(pagoPor.fornecedor, String(p.cdFornecedor ?? "-"), p.pago);
    somar(pagoPor.categoria, grupo(p.cdConta), p.pago);
    somar(pagoPor.conta, String(p.cdConta), p.pago);
    somar(pagoPor.centro, String(p.cdCentro ?? "-"), p.pago);
    somar(pagoPor.forma, p.forma ?? "Não informada", p.pago);
  }
  const arred = (n: number) => Math.round(n * 10) / 10;
  const fornecedores = ordenar(pagoPor.fornecedor).filter(f => f.chave !== "-");
  const fatia = (n: number) => (t.pago ? arred((fornecedores.slice(0, n).reduce((s, f) => s + f.valor, 0) / t.pago) * 100) : null);
  return {
    total, vencido, aVencer: total - vencido, porPrazo, proximos,
    pago: t.pago, juros: t.juros, multa: t.multa, desconto: t.desconto, antecipado: t.antecipado, atrasado: t.atrasado, noPrazo: t.noPrazo,
    parcelas: Math.round(t.parcelas), recorrente: t.recorrente, extraordinario: t.extraordinario,
    percentualAtrasado: t.pago ? arred((t.atrasado / t.pago) * 100) : null,
    prazoMedio: t.pago ? arred(t.diasPrazo / t.pago) : null,
    atrasoMedio: t.atrasado ? arred(t.diasAtraso / t.atrasado) : null,
    concentracao: { top5: fatia(5), top10: fatia(10), fornecedores: fornecedores.length },
    aberto: { fornecedor: ordenar(abertoPor.fornecedor), categoria: ordenar(abertoPor.categoria), conta: ordenar(abertoPor.conta), centro: ordenar(abertoPor.centro) },
    pagoPor: { fornecedor: ordenar(pagoPor.fornecedor), categoria: ordenar(pagoPor.categoria), conta: ordenar(pagoPor.conta), centro: ordenar(pagoPor.centro), forma: ordenar(pagoPor.forma) },
  };
}
