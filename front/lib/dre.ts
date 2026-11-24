// Módulo DRE: monta o demonstrativo a partir dos valores mensais por conta (competência) e da associação das contas
// às linhas da estrutura. Receitas entram positivas e despesas negativas; os totais somam as linhas com o sinal.

export type Folha = { id: string; nome: string };
export type LinhaEstrutura =
  | { id: string; nome: string; tipo: "grupo"; folhas: Folha[] }
  | { id: string; nome: string; tipo: "total"; soma: Array<{ id: string; sinal: 1 | -1 }>; memo?: boolean };
export type ItemAssociacao = { folha: string; pct: number };
export type ContaDre = { cdConta: number; conta: string; grupo: string | null; despesa: boolean; itens: ItemAssociacao[]; salvo: boolean; ajuste?: boolean };
export type ValorDre = { mes: string; cdConta: number | null; valor: number; titulos: number };
export type StatusMes = "aberto" | "em_aprovacao" | "fechado";
export type RespostaValores = {
  de: string; ate: string; centro?: number | null; contas: ContaDre[]; valores: ValorDre[]; atualizadoEm: string
  // Meses fechados: associação das contas no momento do fechamento (a DRE do mês não muda com a estrutura atual).
  mapeamentoMes?: Record<string, Record<string, ItemAssociacao[]>>
  fechamentos?: Record<string, { status: StatusMes; versao: number | null; aguardando: number | null }>
};

export const FORA = "FORA";
export const SEM_CONTA = 0; // lançamentos sem conta no Clinux

// ---------- Períodos ----------

export const deslocarMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
export const intervaloMeses = (de: string, ate: string) => {
  const r: string[] = [];
  for (let m = de; m <= ate; m = deslocarMes(m, 1)) r.push(m);
  return r;
};
const NOMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const rotuloMes = (mes: string) => `${NOMES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

export type Visao = "mensal" | "trimestral" | "anual" | "acumulado" | "doze";
export type Coluna = { chave: string; rotulo: string; meses: string[]; total?: boolean };

/** Colunas da visão escolhida, até o mês de referência. */
export function colunasDaVisao(visao: Visao, ref: string): Coluna[] {
  const ano = Number(ref.slice(0, 4)), mesRef = Number(ref.slice(5, 7));
  const doAno = (a: number, ate = 12) => intervaloMeses(`${a}-01`, `${a}-${String(ate).padStart(2, "0")}`);
  if (visao === "mensal") {
    const meses = doAno(ano, mesRef);
    return [...meses.map(m => ({ chave: m, rotulo: rotuloMes(m), meses: [m] })), { chave: "total", rotulo: `Acum. ${ano}`, meses, total: true }];
  }
  if (visao === "trimestral") {
    const cols: Coluna[] = [];
    for (let t = 1; t <= Math.ceil(mesRef / 3); t++) {
      const meses = doAno(ano, Math.min(t * 3, mesRef)).slice((t - 1) * 3);
      cols.push({ chave: `T${t}`, rotulo: `${t}º tri/${String(ano).slice(2)}${t * 3 > mesRef ? "*" : ""}`, meses });
    }
    return [...cols, { chave: "total", rotulo: `Acum. ${ano}`, meses: doAno(ano, mesRef), total: true }];
  }
  if (visao === "anual") {
    return [ano - 2, ano - 1, ano].map(a => ({ chave: String(a), rotulo: a === ano && mesRef < 12 ? `${a} (até ${rotuloMes(ref)})` : String(a), meses: doAno(a, a === ano ? mesRef : 12) }));
  }
  if (visao === "acumulado") {
    return [ano - 1, ano].map(a => ({ chave: String(a), rotulo: `Jan–${NOMES[mesRef - 1]}/${String(a).slice(2)}`, meses: doAno(a, mesRef) }));
  }
  const atual = intervaloMeses(deslocarMes(ref, -11), ref), anterior = intervaloMeses(deslocarMes(ref, -23), deslocarMes(ref, -12));
  return [
    { chave: "ant12", rotulo: `12 meses até ${rotuloMes(deslocarMes(ref, -12))}`, meses: anterior },
    { chave: "ult12", rotulo: `12 meses até ${rotuloMes(ref)}`, meses: atual },
  ];
}

// ---------- Cálculo ----------

export type Celula = {
  linhas: Map<string, number>                          // grupos, folhas e totais
  contas: Map<string, Map<number, number>>             // folha -> conta -> valor (com sinal e rateio)
  semClassificacao: Map<number, number>                // conta (0 = sem conta) -> valor
  fora: number
};

export function calcularCelula(estrutura: LinhaEstrutura[], dados: Pick<RespostaValores, "contas" | "valores" | "mapeamentoMes">, meses: string[]): Celula {
  const conjunto = new Set(meses);
  const contas = new Map(dados.contas.map(c => [c.cdConta, c]));
  const linhas = new Map<string, number>();
  const porFolha = new Map<string, Map<number, number>>();
  const semClassificacao = new Map<number, number>();
  let fora = 0;
  for (const v of dados.valores) {
    if (!conjunto.has(v.mes)) continue;
    const c = v.cdConta === null ? undefined : contas.get(v.cdConta);
    const itens = (v.cdConta !== null && dados.mapeamentoMes?.[v.mes]?.[String(v.cdConta)]) || c?.itens || [];
    if (!c || !itens.length) {
      const k = v.cdConta ?? SEM_CONTA;
      // Sem conta: o tipo (receita/despesa) é desconhecido; entra pelo valor bruto.
      semClassificacao.set(k, (semClassificacao.get(k) ?? 0) + (c?.despesa ? -v.valor : v.valor));
      continue;
    }
    const assinado = c.despesa ? -v.valor : v.valor;
    for (const it of itens) {
      const parte = (assinado * it.pct) / 100;
      if (it.folha === FORA) { fora += parte; continue; }
      linhas.set(it.folha, (linhas.get(it.folha) ?? 0) + parte);
      const m = porFolha.get(it.folha) ?? new Map<number, number>();
      m.set(c.cdConta, (m.get(c.cdConta) ?? 0) + parte);
      porFolha.set(it.folha, m);
    }
  }
  for (const l of estrutura) {
    if (l.tipo === "grupo") linhas.set(l.id, l.folhas.reduce((s, f) => s + (linhas.get(f.id) ?? 0), 0));
    else linhas.set(l.id, l.soma.reduce((s, x) => s + x.sinal * (linhas.get(x.id) ?? 0), 0));
  }
  return { linhas, contas: porFolha, semClassificacao, fora };
}

export const valorLinha = (c: Celula, id: string) => c.linhas.get(id) ?? 0;
export const totalSemClassificacao = (c: Celula) => [...c.semClassificacao.values()].reduce((s, v) => s + v, 0);

/** Análise vertical: % sobre a receita operacional líquida. */
export const analiseVertical = (c: Celula, valor: number) => {
  const rl = valorLinha(c, "RL");
  return rl ? Math.round((valor / Math.abs(rl)) * 1000) / 10 : null;
};

/** Análise horizontal: variação % contra a coluna anterior (sobre o valor absoluto da base). */
export const analiseHorizontal = (atual: number, anterior: number) => (anterior ? Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10 : null);

export type Indicadores = { margemBruta: number | null; margemOperacional: number | null; margemEbitda: number | null; margemLiquida: number | null; pctCustos: number | null; pctDespesas: number | null };

export function indicadores(c: Celula): Indicadores {
  const rl = valorLinha(c, "RL");
  const p = (v: number) => (rl ? Math.round((v / Math.abs(rl)) * 1000) / 10 : null);
  return {
    margemBruta: p(valorLinha(c, "LB")), margemOperacional: p(valorLinha(c, "EBIT")), margemEbitda: p(valorLinha(c, "EBITDA")),
    margemLiquida: p(valorLinha(c, "LL")), pctCustos: p(-valorLinha(c, "CSP")), pctDespesas: p(-(valorLinha(c, "DOP") + valorLinha(c, "DA"))),
  };
}

/** Contas que mais mudaram o resultado entre duas colunas (diferença com sinal: positiva melhora o lucro). */
export function maioresImpactos(a: Celula, b: Celula, nomes: Map<number, string>, limite = 10) {
  const total = (c: Celula) => {
    const m = new Map<number, number>();
    for (const porConta of c.contas.values()) for (const [k, v] of porConta) m.set(k, (m.get(k) ?? 0) + v);
    return m;
  };
  const ta = total(a), tb = total(b);
  const chaves = new Set([...ta.keys(), ...tb.keys()]);
  return [...chaves].map(k => ({ cdConta: k, conta: nomes.get(k) ?? `Conta ${k}`, antes: ta.get(k) ?? 0, depois: tb.get(k) ?? 0, impacto: (tb.get(k) ?? 0) - (ta.get(k) ?? 0) }))
    .filter(x => x.impacto !== 0).sort((x, y) => Math.abs(y.impacto) - Math.abs(x.impacto)).slice(0, limite);
}

export const formatarValor = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- Fechamento ----------

/** Situação de uma coluna: fechada se todos os meses estão fechados; em aprovação ou provisória caso contrário. */
export function statusColuna(meses: string[], fechamentos: RespostaValores["fechamentos"] = {}): StatusMes | "parcial" {
  const st = meses.map(m => fechamentos[m]?.status ?? "aberto");
  if (st.every(s => s === "fechado")) return "fechado";
  if (st.some(s => s === "fechado")) return "parcial";
  if (st.some(s => s === "em_aprovacao")) return "em_aprovacao";
  return "aberto";
}

// ---------- Orçamento ----------

/** Folhas de receita: o orçamento é digitado em valores positivos e recebe o sinal da natureza da linha. */
export const folhaDeReceita = (folha: string) => folha.startsWith("RB.") || folha === "RF.REC";

/** Orçamento por folha e mês (valores digitados) no formato de célula, com os totais da estrutura. */
export function celulaOrcada(estrutura: LinhaEstrutura[], orcamentos: Record<number, Record<string, number[]>>, meses: string[]): Celula {
  const linhas = new Map<string, number>();
  for (const m of meses) {
    const ano = Number(m.slice(0, 4)), i = Number(m.slice(5, 7)) - 1;
    for (const [folha, valores] of Object.entries(orcamentos[ano] ?? {})) {
      const v = valores[i] ?? 0;
      if (!v) continue;
      linhas.set(folha, (linhas.get(folha) ?? 0) + (folhaDeReceita(folha) ? v : -v));
    }
  }
  for (const l of estrutura) {
    if (l.tipo === "grupo") linhas.set(l.id, l.folhas.reduce((s, f) => s + (linhas.get(f.id) ?? 0), 0));
    else linhas.set(l.id, l.soma.reduce((s, x) => s + x.sinal * (linhas.get(x.id) ?? 0), 0));
  }
  return { linhas, contas: new Map(), semClassificacao: new Map(), fora: 0 };
}

export const temOrcamento = (orcamentos: Record<number, Record<string, number[]>>, meses: string[]) =>
  meses.some(m => Object.values(orcamentos[Number(m.slice(0, 4))] ?? {}).some(v => v[Number(m.slice(5, 7)) - 1]));

/** Realizado por folha e mês (valor positivo na natureza da linha) para pré-preencher o orçamento. */
export function realizadoPorFolha(estrutura: LinhaEstrutura[], dados: RespostaValores, ano: number, fator = 1): Record<string, number[]> {
  const r: Record<string, number[]> = {};
  for (let i = 0; i < 12; i++) {
    const mes = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const c = calcularCelula(estrutura, dados, [mes]);
    for (const l of estrutura) if (l.tipo === "grupo") for (const f of l.folhas) {
      const v = c.linhas.get(f.id) ?? 0;
      if (!v) continue;
      (r[f.id] ??= Array(12).fill(0))[i] = Math.round((folhaDeReceita(f.id) ? v : -v) * fator * 100) / 100;
    }
  }
  return r;
}
