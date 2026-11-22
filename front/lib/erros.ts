// Agregações da tela "Erros de atendimento". Roda no navegador: cada clique (funcionário, modalidade,
// convênio, dia, campo, origem) filtra a tela inteira sem nova consulta.

export type OrigemErro = "exame" | "atendimento" | "paciente";

export const ROTULO_ORIGEM: Record<OrigemErro, string> = {
  exame: "Dados do exame",
  atendimento: "Dados do atendimento",
  paciente: "Cadastro do paciente",
};

// Ficha analisada: quem chamou a senha é quem concluiu a ficha.
export type AtendimentoErro = {
  cdAtendimento: number
  data: string
  horaFicha: string
  cdFuncionario: number | null
  funcionario: string | null
  cdMedico: number | null
  medico: string | null
  cdConvenio: number | null
  convenio: string | null
  modalidade: string
  cdPaciente: number | null
  paciente: string | null
}

// Uma linha de log_clinux: um campo alterado depois da ficha.
export type Alteracao = {
  id: number
  cdAtendimento: number
  origem: OrigemErro
  coluna: string
  campo: string
  registro: number          // cd_exame, cd_atendimento ou cd_paciente alterado
  antes: string | null
  depois: string | null
  alteradoEm: string        // YYYY-MM-DDTHH:MM:SS
  minutosAposFicha: number
  cdCorretor: number | null
  corretor: string | null
  sempre?: boolean          // erro de processo (ex.: botão Ficha não marcado): conta mesmo dentro da tolerância
}

// Erro = um campo de um atendimento corrigido depois da ficha (várias alterações seguidas do mesmo campo contam uma vez).
export type Erro = {
  id: string
  cdAtendimento: number
  origem: OrigemErro
  coluna: string
  campo: string
  antes: string | null
  depois: string | null
  alteradoEm: string
  minutosAposFicha: number
  alteracoes: number
  corretores: string[]
  preenchimento: boolean    // campo estava vazio na ficha e foi preenchido depois
}

export type OpcoesErro = { toleranciaMin: number; incluirPreenchimentos: boolean }

const vazio = (v: string | null) => v === null || v.trim() === "";

export function consolidarErros(alteracoes: Alteracao[], opcoes: OpcoesErro): Erro[] {
  const ordenadas = alteracoes
    .filter(a => a.sempre || a.minutosAposFicha >= opcoes.toleranciaMin)
    .sort((a, b) => a.alteradoEm.localeCompare(b.alteradoEm) || a.id - b.id);
  const mapa = new Map<string, Erro>();
  for (const a of ordenadas) {
    const k = `${a.cdAtendimento}|${a.origem}|${a.coluna}|${a.registro}`;
    const atual = mapa.get(k);
    const corretor = a.corretor ?? (a.cdCorretor !== null ? `Funcionário ${a.cdCorretor}` : "Não informado");
    if (!atual) {
      mapa.set(k, {
        id: k, cdAtendimento: a.cdAtendimento, origem: a.origem, coluna: a.coluna, campo: a.campo,
        antes: a.antes, depois: a.depois, alteradoEm: a.alteradoEm, minutosAposFicha: a.minutosAposFicha,
        alteracoes: 1, corretores: [corretor], preenchimento: vazio(a.antes),
      });
    } else {
      atual.depois = a.depois;
      atual.alteracoes += 1;
      if (!atual.corretores.includes(corretor)) atual.corretores.push(corretor);
    }
  }
  // Campo que voltou ao valor original não é erro.
  return [...mapa.values()].filter(e => (e.antes ?? "").trim() !== (e.depois ?? "").trim() && (opcoes.incluirPreenchimentos || !e.preenchimento));
}

export const MINIMO_FICHAS = 10;

export type DimAtendimento = "funcionario" | "modalidade" | "convenio" | "data" | "diaSemana" | "hora";
export type DimErro = "campo" | "origem";
export type DimensaoErro = DimAtendimento | DimErro;
export type SelecaoErro = Partial<Record<DimensaoErro, string>>;

export const ROTULO_DIM: Record<DimensaoErro, string> = {
  funcionario: "Funcionário", modalidade: "Modalidade", convenio: "Convênio", data: "Dia", diaSemana: "Dia da semana", hora: "Horário", campo: "Campo", origem: "Origem",
};

const DIM_ATENDIMENTO: DimAtendimento[] = ["funcionario", "modalidade", "convenio", "data", "diaSemana", "hora"];

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD, sem depender de fuso horário (algoritmo de Sakamoto). */
export function diaDaSemana(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = m < 3 ? a - 1 : a;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[m - 1] + d) % 7;
}
const ehDimAtendimento = (d: DimensaoErro): d is DimAtendimento => (DIM_ATENDIMENTO as string[]).includes(d);

export function chaveAtendimento(a: AtendimentoErro, d: DimAtendimento): string {
  switch (d) {
    case "funcionario": return String(a.cdFuncionario ?? "-");
    case "modalidade": return a.modalidade;
    case "convenio": return String(a.cdConvenio ?? "-");
    case "data": return a.data;
    case "diaSemana": return String(diaDaSemana(a.data));
    case "hora": return a.horaFicha.slice(0, 2);
  }
}

export function nomeAtendimento(a: AtendimentoErro, d: DimAtendimento): string {
  switch (d) {
    case "funcionario": return a.funcionario ?? "Não informado";
    case "modalidade": return a.modalidade;
    case "convenio": return a.convenio ?? "Sem convênio";
    case "data": { const [, m, dd] = a.data.split("-"); return `${dd}/${m}`; }
    case "diaSemana": return DIAS_SEMANA[diaDaSemana(a.data)];
    case "hora": return `${a.horaFicha.slice(0, 2)}h`;
  }
}

export function chaveErro(e: Erro, d: DimErro): string {
  return d === "origem" ? e.origem : `${e.origem}:${e.campo}`;
}

export function nomeErro(e: Erro, d: DimErro): string {
  return d === "origem" ? ROTULO_ORIGEM[e.origem] : e.campo;
}

export type BaseErros = { atendimentos: AtendimentoErro[]; erros: Erro[] };

// Filtros de atendimento recortam as fichas (e os erros delas); filtros de campo/origem recortam só os erros,
// mantendo todas as fichas no denominador da taxa.
export function filtrarErros(base: BaseErros, sel: SelecaoErro, ignorar?: DimensaoErro | DimensaoErro[]): BaseErros {
  const fora = Array.isArray(ignorar) ? ignorar : ignorar ? [ignorar] : [];
  const ativos = (Object.entries(sel) as Array<[DimensaoErro, string | undefined]>).filter(([d, v]) => v !== undefined && !fora.includes(d));
  const doAtendimento = ativos.filter((x): x is [DimAtendimento, string] => ehDimAtendimento(x[0]));
  const doErro = ativos.filter((x): x is [DimErro, string] => !ehDimAtendimento(x[0]));
  const atendimentos = doAtendimento.length ? base.atendimentos.filter(a => doAtendimento.every(([d, v]) => chaveAtendimento(a, d) === v)) : base.atendimentos;
  const ids = new Set(atendimentos.map(a => a.cdAtendimento));
  const erros = base.erros.filter(e => ids.has(e.cdAtendimento) && doErro.every(([d, v]) => chaveErro(e, d) === v));
  return { atendimentos, erros };
}

const arred = (n: number) => Math.round(n * 10) / 10;

export type ResumoErros = {
  analisados: number
  comErro: number
  taxa: number
  erros: number
  errosPorFicha: number
  porOrigem: Record<OrigemErro, number>
}

export function resumirErros({ atendimentos, erros }: BaseErros): ResumoErros {
  const comErro = new Set(erros.map(e => e.cdAtendimento)).size;
  const porOrigem: Record<OrigemErro, number> = { exame: 0, atendimento: 0, paciente: 0 };
  for (const e of erros) porOrigem[e.origem] += 1;
  return {
    analisados: atendimentos.length,
    comErro,
    taxa: atendimentos.length ? arred((comErro / atendimentos.length) * 100) : 0,
    erros: erros.length,
    errosPorFicha: atendimentos.length ? Math.round((erros.length / atendimentos.length) * 100) / 100 : 0,
    porOrigem,
  };
}

export type GrupoErro = { chave: string; nome: string; analisados: number; comErro: number; taxa: number; erros: number; origem?: OrigemErro };

export function agruparErros(base: BaseErros, d: DimensaoErro): GrupoErro[] {
  if (ehDimAtendimento(d)) {
    const errosPorAtendimento = new Map<number, number>();
    for (const e of base.erros) errosPorAtendimento.set(e.cdAtendimento, (errosPorAtendimento.get(e.cdAtendimento) ?? 0) + 1);
    const mapa = new Map<string, GrupoErro>();
    for (const a of base.atendimentos) {
      const k = chaveAtendimento(a, d);
      const g = mapa.get(k) ?? { chave: k, nome: nomeAtendimento(a, d), analisados: 0, comErro: 0, taxa: 0, erros: 0 };
      const n = errosPorAtendimento.get(a.cdAtendimento) ?? 0;
      g.analisados += 1;
      g.erros += n;
      if (n) g.comErro += 1;
      mapa.set(k, g);
    }
    return [...mapa.values()].map(g => ({ ...g, taxa: g.analisados ? arred((g.comErro / g.analisados) * 100) : 0 }));
  }
  // Campo/origem: taxa = fichas com aquele erro sobre todas as fichas analisadas.
  const total = base.atendimentos.length;
  const mapa = new Map<string, GrupoErro & { ids: Set<number> }>();
  for (const e of base.erros) {
    const k = chaveErro(e, d);
    const g = mapa.get(k) ?? { chave: k, nome: nomeErro(e, d), analisados: total, comErro: 0, taxa: 0, erros: 0, origem: e.origem, ids: new Set<number>() };
    g.erros += 1;
    g.ids.add(e.cdAtendimento);
    mapa.set(k, g);
  }
  return [...mapa.values()].map(({ ids, ...g }) => ({ ...g, comErro: ids.size, taxa: total ? arred((ids.size / total) * 100) : 0 }));
}

// ---- Pódios de funcionários ----
// "Quem menos erra": maior % de fichas sem correção (mínimo de MINIMO_FICHAS), empate → mais fichas.
// "Quem mais atende": mais fichas no período.
// "Melhor desempenho": junta as duas coisas pelo limite inferior de Wilson (95%) da taxa de acerto — a menor taxa
// de acerto "garantida" pelo volume. 100% em 12 fichas vale ~76; 98% em 400 fichas vale ~96. Assim quem faz
// muitas fichas com poucos erros fica na frente de quem fez poucas e acertou todas, e muito volume com muito erro
// não sobe.
export function notaDesempenho(analisados: number, comErro: number): number {
  if (!analisados) return 0;
  const z = 1.96, n = analisados, p = (analisados - comErro) / n;
  const centro = p + (z * z) / (2 * n);
  const margem = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return arred(((centro - margem) / (1 + (z * z) / n)) * 100);
}

export type Colocado = GrupoErro & { acerto: number; nota: number };

export function podiosFuncionarios(grupos: GrupoErro[]) {
  const validos: Colocado[] = grupos.filter(g => g.chave !== "-" && g.analisados > 0)
    .map(g => ({ ...g, acerto: arred(100 - g.taxa), nota: notaDesempenho(g.analisados, g.comErro) }));
  const comAmostra = validos.filter(g => g.analisados >= MINIMO_FICHAS);
  return {
    menosErra: [...comAmostra].sort((a, b) => b.acerto - a.acerto || b.analisados - a.analisados).slice(0, 3),
    maisAtende: [...validos].sort((a, b) => b.analisados - a.analisados || b.acerto - a.acerto).slice(0, 3),
    desempenho: [...comAmostra].sort((a, b) => b.nota - a.nota || b.analisados - a.analisados).slice(0, 3),
  };
}

// ---- Mapa de calor: dia da semana × hora da ficha ----
export type CelulaErro = { hora: number; analisados: number; comErro: number; erros: number; taxa: number };
export type LinhaCalorErro = { dia: number; nome: string; celulas: CelulaErro[] };

/** Linhas de segunda a sábado (domingo só se houver ficha), colunas da primeira à última hora com ficha. */
export function mapaCalorErros({ atendimentos, erros }: BaseErros): { horas: number[]; linhas: LinhaCalorErro[] } {
  if (!atendimentos.length) return { horas: [], linhas: [] };
  const porAtendimento = new Map<number, number>();
  for (const e of erros) porAtendimento.set(e.cdAtendimento, (porAtendimento.get(e.cdAtendimento) ?? 0) + 1);
  const celulas = new Map<string, CelulaErro>();
  let min = 23, max = 0;
  const dias = new Set<number>();
  for (const a of atendimentos) {
    const dia = diaDaSemana(a.data), hora = Number(a.horaFicha.slice(0, 2));
    if (!Number.isFinite(hora)) continue;
    min = Math.min(min, hora); max = Math.max(max, hora); dias.add(dia);
    const k = `${dia}|${hora}`;
    const c = celulas.get(k) ?? { hora, analisados: 0, comErro: 0, erros: 0, taxa: 0 };
    const n = porAtendimento.get(a.cdAtendimento) ?? 0;
    c.analisados += 1; c.erros += n; if (n) c.comErro += 1;
    celulas.set(k, c);
  }
  if (min > max) return { horas: [], linhas: [] };
  const horas = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const ordem = [1, 2, 3, 4, 5, 6, 0].filter(d => d !== 0 || dias.has(0));
  return {
    horas,
    linhas: ordem.map(dia => ({
      dia, nome: DIAS_SEMANA[dia],
      celulas: horas.map(hora => {
        const c = celulas.get(`${dia}|${hora}`) ?? { hora, analisados: 0, comErro: 0, erros: 0, taxa: 0 };
        return { ...c, taxa: c.analisados ? arred((c.comErro / c.analisados) * 100) : 0 };
      }),
    })),
  };
}
