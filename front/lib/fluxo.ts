// Fluxo de caixa: histórico agrupado, classificação operacional/investimento/financiamento, projeção diária de 12 meses
// (títulos já lançados + estimativa do que ainda não foi lançado), cenários, simulações e confiabilidade da previsão.
import { categoria, normalizar, type ContaFin } from "@/lib/diretoria";

export type RespostaFluxo = {
  periodo: { inicio: string; fim: string; agrupar: "dia" | "mes" }
  hoje: string
  contas: ContaFin[]
  bancos: Array<{ cdBanco: number; banco: string; saldoAtual: number; saldoInicial: number; saldoFinal: number; entradas: number; saidas: number; transferencias: number }>
  historico: Array<{ periodo: string; cdConta: number; realizado: number; previsto: number }>
  projecao: Array<{ dia: string; cdConta: number; tipo: string | null; valor: number }>
  vencidos: Array<{ cdConta: number; tipo: string | null; valor: number }>
  base: Array<{ mes: string; cdConta: number; valor: number }>
  previsao: Array<{ mes: string; despesa: boolean; previsto: number; realizado: number }>
  atualizadoEm: string
};

export type CategoriaFluxo = "operacional" | "investimento" | "financiamento";
export const ROTULO_CATEGORIA: Record<CategoriaFluxo, string> = { operacional: "Operacional", investimento: "Investimentos", financiamento: "Financiamentos" };

/** Operacional, investimento (imobilizado) ou financiamento (empréstimos recebidos e amortizados). */
export function categoriaFluxo(c: Pick<ContaFin, "conta" | "despesa" | "linha">): CategoriaFluxo {
  const cat = categoria(c);
  const n = normalizar(c.conta);
  if (cat === "amortizacao" || (!c.despesa && n.includes("EMPRESTIMO"))) return "financiamento";
  if (cat === "investimento" || n.includes("IMOBILIZ") || n.includes("IMBOLIZ")) return "investimento";
  return "operacional";
}

// ---------- Datas ----------

const DIA = 86_400_000;
const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const somarDias = (d: string, n: number) => iso(t(d) + n * DIA);
const diasNoMes = (mes: string) => { const [a, m] = mes.split("-").map(Number); return new Date(Date.UTC(a, m, 0)).getUTCDate(); };

// ---------- Histórico ----------

export type Escala = "dia" | "semana" | "mes" | "ano";
export type PontoHistorico = {
  chave: string; rotulo: string; entradas: number; saidas: number; entradasPrevistas: number; saidasPrevistas: number; saldo: number
  categorias: Record<CategoriaFluxo, { entradas: number; saidas: number }>
};

export function historicoAgrupado(dados: RespostaFluxo, escala: Escala, saldoInicial: number): PontoHistorico[] {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const chave = (d: string) => {
    if (escala === "dia") return d;
    if (escala === "mes") return d.slice(0, 7);
    if (escala === "ano") return d.slice(0, 4);
    const ms = t(d), dow = (new Date(ms).getUTCDay() + 6) % 7;
    return iso(ms - dow * DIA);
  };
  const rotulo = (k: string) => (escala === "ano" ? k : escala === "mes" ? `${k.slice(5, 7)}/${k.slice(2, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`);
  const vazio = (k: string): PontoHistorico => ({
    chave: k, rotulo: rotulo(k), entradas: 0, saidas: 0, entradasPrevistas: 0, saidasPrevistas: 0, saldo: 0,
    categorias: { operacional: { entradas: 0, saidas: 0 }, investimento: { entradas: 0, saidas: 0 }, financiamento: { entradas: 0, saidas: 0 } },
  });
  const mapa = new Map<string, PontoHistorico>();
  // Todos os períodos do intervalo, mesmo sem movimento.
  for (let ms = t(dados.periodo.inicio); ms <= t(dados.periodo.fim); ms += DIA) { const k = chave(iso(ms)); if (!mapa.has(k)) mapa.set(k, vazio(k)); }
  for (const h of dados.historico) {
    const c = contas.get(h.cdConta);
    if (!c) continue;
    const p = mapa.get(chave(h.periodo)) ?? vazio(chave(h.periodo));
    const cat = categoriaFluxo(c);
    if (c.despesa) { p.saidas += h.realizado; p.saidasPrevistas += h.previsto; p.categorias[cat].saidas += h.realizado; }
    else { p.entradas += h.realizado; p.entradasPrevistas += h.previsto; p.categorias[cat].entradas += h.realizado; }
    mapa.set(p.chave, p);
  }
  let saldo = saldoInicial;
  return [...mapa.values()].sort((a, b) => a.chave.localeCompare(b.chave)).map(p => { saldo += p.entradas - p.saidas; return { ...p, saldo }; });
}

export function totaisHistorico(pontos: PontoHistorico[]) {
  const r = { entradas: 0, saidas: 0, entradasPrevistas: 0, saidasPrevistas: 0, categorias: { operacional: { entradas: 0, saidas: 0 }, investimento: { entradas: 0, saidas: 0 }, financiamento: { entradas: 0, saidas: 0 } } as Record<CategoriaFluxo, { entradas: number; saidas: number }> };
  for (const p of pontos) {
    r.entradas += p.entradas; r.saidas += p.saidas; r.entradasPrevistas += p.entradasPrevistas; r.saidasPrevistas += p.saidasPrevistas;
    for (const c of Object.keys(r.categorias) as CategoriaFluxo[]) { r.categorias[c].entradas += p.categorias[c].entradas; r.categorias[c].saidas += p.categorias[c].saidas; }
  }
  return r;
}

// ---------- Projeção ----------

export type Premissas = {
  variacaoEntradas: number      // % sobre todas as entradas
  aumentoDespesas: number       // % sobre todas as saídas
  atrasoConvenios: number       // dias de atraso das faturas de convênio (títulos F)
  recuperacaoVencidos: number   // % do a receber vencido que entra nos próximos 30 dias
  estimarNaoLancado: boolean    // completar com a média mensal o que ainda não foi lançado
  investimentos: Array<{ dia: string; valor: number; descricao?: string }>
};
export const CENARIOS: Record<"realista" | "otimista" | "pessimista", Premissas> = {
  realista: { variacaoEntradas: 0, aumentoDespesas: 0, atrasoConvenios: 0, recuperacaoVencidos: 50, estimarNaoLancado: true, investimentos: [] },
  otimista: { variacaoEntradas: 5, aumentoDespesas: -3, atrasoConvenios: 0, recuperacaoVencidos: 80, estimarNaoLancado: true, investimentos: [] },
  pessimista: { variacaoEntradas: -10, aumentoDespesas: 5, atrasoConvenios: 30, recuperacaoVencidos: 20, estimarNaoLancado: true, investimentos: [] },
};

export type DiaProjetado = { dia: string; entradasLancadas: number; entradasEstimadas: number; saidasLancadas: number; saidasEstimadas: number; saldo: number };

/** Média mensal realizada (entradas e saídas operacionais) dos últimos meses completos disponíveis (até 3). */
export function mediaMensal(dados: RespostaFluxo, meses = 3) {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const lista = [...new Set(dados.base.map(b => b.mes))].sort().slice(-meses);
  let e = 0, s = 0;
  for (const b of dados.base) {
    if (!lista.includes(b.mes)) continue;
    const c = contas.get(b.cdConta);
    if (!c || categoriaFluxo(c) !== "operacional") continue;
    if (c.despesa) s += b.valor; else e += b.valor;
  }
  return { entradas: lista.length ? e / lista.length : 0, saidas: lista.length ? s / lista.length : 0, meses: lista };
}

/** Projeção diária a partir de hoje: títulos lançados + estimativa do não lançado + premissas do cenário. */
export function projetar(dados: RespostaFluxo, saldoInicial: number, p: Premissas, dias = 366): DiaProjetado[] {
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const hoje = dados.hoje;
  const fimMs = t(hoje) + (dias - 1) * DIA;
  const pontos = new Map<string, DiaProjetado>();
  for (let ms = t(hoje); ms <= fimMs; ms += DIA) { const d = iso(ms); pontos.set(d, { dia: d, entradasLancadas: 0, entradasEstimadas: 0, saidasLancadas: 0, saidasEstimadas: 0, saldo: 0 }); }
  const lancadoOperacional = new Map<string, { e: number; s: number }>(); // por mês
  const somarDia = (d: string, campo: keyof Omit<DiaProjetado, "dia" | "saldo">, v: number) => { const x = pontos.get(d); if (x) x[campo] += v; };

  for (const r of dados.projecao) {
    const c = contas.get(r.cdConta);
    if (!c) continue;
    let dia = r.dia;
    if (!c.despesa && r.tipo === "F" && p.atrasoConvenios) dia = somarDias(dia, p.atrasoConvenios);
    somarDia(dia, c.despesa ? "saidasLancadas" : "entradasLancadas", r.valor);
    if (categoriaFluxo(c) === "operacional") {
      const m = lancadoOperacional.get(r.dia.slice(0, 7)) ?? { e: 0, s: 0 };
      if (c.despesa) m.s += r.valor; else m.e += r.valor;
      lancadoOperacional.set(r.dia.slice(0, 7), m);
    }
  }
  // Vencidos em aberto: obrigações vencidas saem nos próximos 7 dias; parte do a receber vencido entra em 30 dias.
  let pagarVencido = 0, receberVencido = 0;
  for (const v of dados.vencidos) { const c = contas.get(v.cdConta); if (!c) continue; if (c.despesa) pagarVencido += v.valor; else receberVencido += v.valor; }
  for (let i = 0; i < 7; i++) somarDia(somarDias(hoje, i), "saidasLancadas", pagarVencido / 7);
  const recuperar = (receberVencido * p.recuperacaoVencidos) / 100;
  for (let i = 0; i < 30; i++) somarDia(somarDias(hoje, i), "entradasLancadas", recuperar / 30);

  // Estimativa do que ainda não foi lançado: média mensal operacional menos o já lançado no mês, distribuída nos dias.
  if (p.estimarNaoLancado) {
    const media = mediaMensal(dados);
    const meses = [...new Set([...pontos.keys()].map(d => d.slice(0, 7)))];
    for (const mes of meses) {
      const diasDoMes = [...pontos.keys()].filter(d => d.startsWith(mes));
      const fracao = diasDoMes.length / diasNoMes(mes);
      const lanc = lancadoOperacional.get(mes) ?? { e: 0, s: 0 };
      const extraE = Math.max(0, media.entradas * fracao - lanc.e), extraS = Math.max(0, media.saidas * fracao - lanc.s);
      for (const d of diasDoMes) { somarDia(d, "entradasEstimadas", extraE / diasDoMes.length); somarDia(d, "saidasEstimadas", extraS / diasDoMes.length); }
    }
  }
  for (const inv of p.investimentos) if (inv.valor) somarDia(inv.dia < hoje ? hoje : inv.dia, "saidasLancadas", inv.valor);

  const fe = 1 + p.variacaoEntradas / 100, fs = 1 + p.aumentoDespesas / 100;
  let saldo = saldoInicial;
  return [...pontos.values()].map(x => {
    const r = { ...x, entradasLancadas: x.entradasLancadas * fe, entradasEstimadas: x.entradasEstimadas * fe, saidasLancadas: x.saidasLancadas * fs, saidasEstimadas: x.saidasEstimadas * fs };
    saldo += r.entradasLancadas + r.entradasEstimadas - r.saidasLancadas - r.saidasEstimadas;
    return { ...r, saldo };
  });
}

export const HORIZONTES = [7, 15, 30, 60, 90, 180, 365] as const;

export function resumoHorizontes(dias: DiaProjetado[], saldoInicial: number) {
  return HORIZONTES.map(h => {
    const trecho = dias.slice(0, h);
    const entradas = trecho.reduce((s, d) => s + d.entradasLancadas + d.entradasEstimadas, 0);
    const saidas = trecho.reduce((s, d) => s + d.saidasLancadas + d.saidasEstimadas, 0);
    const minimo = trecho.reduce((m, d) => Math.min(m, d.saldo), saldoInicial);
    return { dias: h, entradas, saidas, saldoFinal: trecho.at(-1)?.saldo ?? saldoInicial, minimo };
  });
}

/** Primeiro dia em que o saldo projetado fica abaixo do mínimo e quanto falta no pior momento. */
export function alertaCaixa(dias: DiaProjetado[], saldoMinimo: number) {
  const primeiro = dias.find(d => d.saldo < saldoMinimo) ?? null;
  const pior = dias.reduce<DiaProjetado | null>((m, d) => (!m || d.saldo < m.saldo ? d : m), null);
  return { primeiro, pior, necessidade: pior ? Math.max(0, saldoMinimo - pior.saldo) : 0 };
}

// ---------- Previsto x realizado ----------

export function confiabilidade(dados: RespostaFluxo) {
  const meses = [...new Set(dados.previsao.map(p => p.mes))].sort();
  const linhas = meses.map(mes => {
    const e = dados.previsao.find(p => p.mes === mes && !p.despesa) ?? { previsto: 0, realizado: 0 };
    const s = dados.previsao.find(p => p.mes === mes && p.despesa) ?? { previsto: 0, realizado: 0 };
    const acerto = (prev: number, real: number) => (Math.max(prev, real) ? Math.max(0, Math.round((1 - Math.abs(real - prev) / Math.max(prev, real)) * 1000) / 10) : null);
    return { mes, entradasPrevistas: e.previsto, entradasRealizadas: e.realizado, saidasPrevistas: s.previsto, saidasRealizadas: s.realizado, acertoEntradas: acerto(e.previsto, e.realizado), acertoSaidas: acerto(s.previsto, s.realizado) };
  });
  const media = (l: Array<number | null>) => { const v = l.filter((x): x is number => x !== null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  return { linhas, entradas: media(linhas.map(l => l.acertoEntradas)), saidas: media(linhas.map(l => l.acertoSaidas)) };
}
