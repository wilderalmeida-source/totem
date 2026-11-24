// Dashboards de Faturamento: tipos da API e cálculos (percentuais, tickets, séries, pendências).
import { normalizar } from "@/lib/diretoria";

export type Metricas = {
  exames: number; producao: number; faturavel: number; examesConvenio: number; examesParticular: number; faturados: number; faturado: number
  pendente: number; examesPendentes: number; glosa: number; examesGlosados: number; guiasFaturadas: number; faturas: number; diasAteFaturar: number
};
export type Grupo = Metricas & { id: number | null };
export type RespostaResumo = {
  periodo: { inicio: string; fim: string; base: "realizacao" | "envio" }
  anterior: Metricas & { inicio: string; fim: string }
  totais: Metricas
  dias: Array<Metricas & { dia: string }>
  convenios: Grupo[]; modalidades: Grupo[]; procedimentos: Grupo[]
  semana: Array<{ dow: number; turno: "manha" | "tarde" | "noite"; exames: number; producao: number }>
  mensal: Array<Metricas & { mes: string }>
  faturas: Array<{ cdFornecedor: number | null; faturas: number; valor: number; recebido: number; aberto: number }>
  nomes: { convenios: Record<number, string>; modalidades: Record<number, string>; procedimentos: Record<number, string> }
  atualizadoEm: string
};
export type ExamePendente = {
  cdExame: number; cdAtendimento: number; data: string; cdConvenio: number | null; convenio: string | null; cdModalidade: number | null; modalidade: string | null
  cdProcedimento: number | null; procedimento: string | null; valor: number; dias: number; guia: string | null; autorizacao: string | null; validade: string | null
  motivo: string | null; pendenciaDesde: string | null; observacao: string | null
};
export type RespostaPendencias = { periodo: { inicio: string; fim: string }; exames: ExamePendente[]; limite: number; evolucao: Array<{ mes: string; exames: number; valor: number }>; atualizadoEm: string };

// ---------- Indicadores ----------

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
export const variacao = (a: number, b: number) => (b ? Math.round(((a - b) / Math.abs(b)) * 1000) / 10 : null);
export const ticket = (m: Pick<Metricas, "producao" | "exames">) => (m.exames ? m.producao / m.exames : 0);
export const diasMedios = (m: Pick<Metricas, "diasAteFaturar" | "faturados">) => (m.faturados ? Math.round((m.diasAteFaturar / m.faturados) * 10) / 10 : null);
/** Taxa inicial de glosa: valor glosado sobre o valor faturado. */
export const taxaGlosa = (m: Pick<Metricas, "glosa" | "faturado">) => pct(m.glosa, m.faturado);

const zero = (): Metricas => ({ exames: 0, producao: 0, faturavel: 0, examesConvenio: 0, examesParticular: 0, faturados: 0, faturado: 0, pendente: 0, examesPendentes: 0, glosa: 0, examesGlosados: 0, guiasFaturadas: 0, faturas: 0, diasAteFaturar: 0 });
export function somar(lista: Metricas[]): Metricas {
  const t = zero();
  for (const m of lista) for (const k of Object.keys(t) as Array<keyof Metricas>) t[k] += m[k];
  return t;
}

// ---------- Séries ----------

export type Escala = "dia" | "semana" | "mes" | "ano";
const DIA = 86_400_000;
const chaveEscala = (d: string, e: Escala) => {
  if (e === "dia") return d;
  if (e === "mes") return d.slice(0, 7);
  if (e === "ano") return d.slice(0, 4);
  const t = Date.parse(`${d}T00:00:00Z`), dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DIA).toISOString().slice(0, 10);
};
export const rotuloEscala = (k: string, e: Escala) => (e === "ano" ? k : e === "mes" ? `${k.slice(5, 7)}/${k.slice(2, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`);

/** Agrupa a série diária na escala, com todos os períodos do intervalo (mesmo vazios). */
export function serie(dias: RespostaResumo["dias"], inicio: string, fim: string, e: Escala) {
  const mapa = new Map<string, Metricas>();
  for (let t = Date.parse(`${inicio}T00:00:00Z`); t <= Date.parse(`${fim}T00:00:00Z`); t += DIA) { const k = chaveEscala(new Date(t).toISOString().slice(0, 10), e); if (!mapa.has(k)) mapa.set(k, zero()); }
  for (const d of dias) { const k = chaveEscala(d.dia, e); mapa.set(k, somar([mapa.get(k) ?? zero(), d])); }
  return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([chave, m]) => ({ chave, rotulo: rotuloEscala(chave, e), ...m, ticket: ticket(m) }));
}

/** Maiores picos e maiores quedas (contra o período anterior da própria série). */
export function picosEQuedas<T extends { chave: string; producao: number; exames: number }>(s: T[], n = 3) {
  const comValor = s.filter(x => x.exames > 0);
  const picos = [...comValor].sort((a, b) => b.producao - a.producao).slice(0, n);
  const quedas = s.slice(1).map((x, i) => ({ ...x, anterior: s[i].producao, queda: variacao(x.producao, s[i].producao) }))
    .filter(x => x.queda !== null && x.queda < 0).sort((a, b) => (a.queda ?? 0) - (b.queda ?? 0)).slice(0, n);
  return { picos, quedas };
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const TURNOS: Array<[RespostaResumo["semana"][number]["turno"], string]> = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]];

// ---------- Pendências ----------

export const FAIXAS_PENDENCIA = [
  { id: "1", rotulo: "Até 1 dia", min: 0, max: 1 },
  { id: "3", rotulo: "2 a 3 dias", min: 2, max: 3 },
  { id: "7", rotulo: "4 a 7 dias", min: 4, max: 7 },
  { id: "15", rotulo: "8 a 15 dias", min: 8, max: 15 },
  { id: "30", rotulo: "16 a 30 dias", min: 16, max: 30 },
  { id: "31", rotulo: "Mais de 30 dias", min: 31, max: Infinity },
] as const;

/** Tipo da pendência pelo motivo informado no Clinux (ou pela falta de guia/autorização no exame). */
export type TipoPendencia = "autorizacao" | "documentacao" | "cadastro" | "sem_motivo";
export const ROTULO_TIPO_PENDENCIA: Record<TipoPendencia, string> = { autorizacao: "Autorização / guia", documentacao: "Documentação", cadastro: "Cadastro / códigos", sem_motivo: "Sem motivo informado" };
export function tipoPendencia(e: Pick<ExamePendente, "motivo" | "guia" | "autorizacao">): TipoPendencia {
  const m = normalizar(e.motivo);
  if (!m) return !e.autorizacao || !e.guia ? "autorizacao" : "sem_motivo";
  if (/AUTORIZ|SENHA|GUIA|ELEGIBIL|VALIDADE/.test(m)) return "autorizacao";
  if (/CODIGO|CRM|CADASTR|MEDICO SOLICITANTE CADASTRADO|DIVERGENTE/.test(m)) return "cadastro";
  return "documentacao";
}

export function resumoPendencias(exames: ExamePendente[]) {
  const total = exames.reduce((s, e) => s + e.valor, 0);
  const faixas = FAIXAS_PENDENCIA.map(f => {
    const l = exames.filter(e => e.dias >= f.min && e.dias <= f.max);
    return { ...f, exames: l.length, valor: l.reduce((s, e) => s + e.valor, 0) };
  });
  // "Há mais de N dias" (acumulado), como no indicador pedido.
  const maisDe = [1, 3, 7, 15, 30].map(n => { const l = exames.filter(e => e.dias > n); return { dias: n, exames: l.length, valor: l.reduce((s, e) => s + e.valor, 0) }; });
  const agrupar = (chave: (e: ExamePendente) => string) => {
    const m = new Map<string, { chave: string; exames: number; valor: number }>();
    for (const e of exames) { const k = chave(e); const g = m.get(k) ?? { chave: k, exames: 0, valor: 0 }; g.exames++; g.valor += e.valor; m.set(k, g); }
    return [...m.values()].sort((a, b) => b.valor - a.valor);
  };
  return {
    exames: exames.length, valor: total,
    diasMedios: exames.length ? Math.round((exames.reduce((s, e) => s + e.dias, 0) / exames.length) * 10) / 10 : null,
    faixas, maisDe,
    porConvenio: agrupar(e => e.convenio ?? "Sem convênio"),
    porModalidade: agrupar(e => e.modalidade ?? "Sem modalidade"),
    porProcedimento: agrupar(e => e.procedimento ?? "Sem procedimento"),
    porData: agrupar(e => e.data).sort((a, b) => a.chave.localeCompare(b.chave)),
    porMotivo: agrupar(e => e.motivo ?? "Sem motivo informado"),
    porTipo: agrupar(e => ROTULO_TIPO_PENDENCIA[tipoPendencia(e)]),
    semGuia: exames.filter(e => !e.guia).length,
    semAutorizacao: exames.filter(e => !e.autorizacao).length,
    autorizacaoVencida: exames.filter(e => e.validade && e.validade < e.data).length,
  };
}

// ---------- Rodada 1: cruzamentos, lotes e glosas ----------

export type Mini = { exames: number; producao: number; faturavel: number; faturado: number; faturados: number; glosa: number };
export type RespostaCruzado = {
  periodo: { inicio: string; fim: string }
  convMod: Array<Mini & { convenio: number | null; modalidade: number | null }>
  procConv: Array<Mini & { procedimento: number | null; convenio: number | null }>
  mensalConv: Array<Mini & { mes: string; convenio: number | null }>
  mensalMod: Array<Mini & { mes: string; modalidade: number | null }>
  mensalProc: Array<Mini & { mes: string; procedimento: number | null }>
  processamento: Array<{ convenio: number | null; faturas: number; valor: number; recebido: number; abertas: number; valorAberto: number; atrasadas: number; valorAtrasado: number; diasReceber: number | null; recebidas: number }>
  nomes: { convenios: Record<number, string>; modalidades: Record<number, string>; procedimentos: Record<number, string> }
  atualizadoEm: string
};
export type Lote = {
  cdLancamento: number; numero: string | null; documento: string | null; cdConvenio: number | null; convenio: string | null; competencia: string | null
  cadastro: string | null; emissao: string; vencimento: string | null; valor: number; recebido: number; ultimoRecebimento: string | null
  situacao: "recebida" | "atrasada" | "parcial" | "aguardando"; exames: number; guias: number; valorExames: number; glosa: number; responsavel: string | null
};
export type RespostaLotes = { periodo: { inicio: string; fim: string }; lotes: Lote[]; atualizadoEm: string };
export type ExameGlosado = {
  cdExame: number; cdAtendimento: number; data: string; dataGlosa: string | null; cdConvenio: number | null; cdModalidade: number | null; cdProcedimento: number | null
  guia: string | null; lote: number | null; codigo: string | null; motivo: string | null; valorExame: number; glosa: number
  dataRecurso: string | null; recorrido: number; recebido: number; dataRecebimento: string | null; aceite: boolean; justificativa: string | null; protocolo: string | null
};
export type RespostaGlosas = {
  periodo: { inicio: string; fim: string; base: "realizacao" | "envio" }
  exames: ExameGlosado[]; limite: number
  base: Array<{ cdConvenio: number | null; cdModalidade: number | null; cdProcedimento: number | null; faturado: number; faturados: number; guias: number }>
  retorno: Array<{ mes: string; cdConvenio: number | null; apresentado: number; liberado: number; glosado: number; linhas: number; linhasGlosa: number }>
  historico: Array<{ mes: string; codigo: string | null; cdConvenio: number | null; glosa: number; exames: number }>
  nomes: { convenios: Record<number, string>; modalidades: Record<number, string>; procedimentos: Record<number, string> }
  atualizadoEm: string
};

/** Crescimento do último mês contra o anterior e alerta de queda anormal (abaixo de 70% da média dos 3 meses anteriores). */
export function tendencia(serie: Array<{ mes: string; valor: number }>) {
  const s = [...serie].sort((a, b) => a.mes.localeCompare(b.mes));
  const ult = s.at(-1), pen = s.at(-2), base = s.slice(-4, -1);
  const media = base.length ? base.reduce((x, y) => x + y.valor, 0) / base.length : 0;
  return {
    crescimento: ult && pen ? variacao(ult.valor, pen.valor) : null,
    quedaAnormal: Boolean(ult && base.length >= 2 && media > 0 && ult.valor < media * 0.7),
    mediaAnterior: media,
  };
}

/** Participação dos N maiores no total. */
export function concentracao(valores: number[], n: number) {
  const total = valores.reduce((s, v) => s + v, 0);
  return total ? pct([...valores].sort((a, b) => b - a).slice(0, n).reduce((s, v) => s + v, 0), total) : null;
}

/** Procedimento com contraste pelo nome (o Clinux não tem um campo para isso). */
export const comContraste = (nome: string | null | undefined) => /CONTRAST|C\/\s*CONT|COM\s+CONT|C\/\s*GADO|GADOLIN/.test(normalizar(nome));

/** Classificação da glosa pelo código TISS (tabela de motivos de glosa). */
export type CategoriaGlosa = "administrativa" | "autorizacao" | "valor" | "tecnica" | "documentacao" | "prazo" | "outros";
export const ROTULO_CATEGORIA_GLOSA: Record<CategoriaGlosa, string> = {
  administrativa: "Administrativa (beneficiário, prestador, assinaturas)", autorizacao: "Autorização", valor: "Divergência de valor / contratual",
  tecnica: "Técnica (procedimento, materiais, taxas)", documentacao: "Documentação", prazo: "Prazo", outros: "Outros / sem código",
};
export function categoriaGlosa(codigo: string | null | undefined): CategoriaGlosa {
  const c = Number(String(codigo ?? "").trim());
  if (!Number.isFinite(c) || c <= 0 || c % 100 === 99) return "outros";
  const g = Math.floor(c / 100);
  if (g === 14) return "autorizacao";
  if (g === 17) return "valor";
  if (g === 15 || g === 16) return "prazo";
  if (g === 18 || (g >= 20 && g <= 29)) return "tecnica";
  if (g === 30 || g === 31) return "documentacao";
  if (g >= 10 && g <= 13) return "administrativa";
  return "outros";
}

/** Situação do recurso de uma glosa. Recurso pendente não é perda; deferido não é recebido. */
export type SituacaoRecurso = "sem_recurso" | "em_analise" | "revertido" | "definitiva";
export const ROTULO_RECURSO: Record<SituacaoRecurso, string> = { sem_recurso: "Sem recurso", em_analise: "Recurso em análise", revertido: "Revertido (recebido)", definitiva: "Glosa aceita (definitiva)" };
export function situacaoRecurso(e: Pick<ExameGlosado, "dataRecurso" | "recebido" | "aceite">): SituacaoRecurso {
  if (e.aceite) return "definitiva";
  if (e.recebido > 0) return "revertido";
  if (e.dataRecurso) return "em_analise";
  return "sem_recurso";
}

/** Motivos que se repetem em 3 ou mais meses dos últimos 12. */
export function motivosRecorrentes(historico: RespostaGlosas["historico"]) {
  const m = new Map<string, { codigo: string; meses: Set<string>; glosa: number; exames: number }>();
  for (const h of historico) {
    const k = h.codigo ?? "-";
    const g = m.get(k) ?? { codigo: k, meses: new Set<string>(), glosa: 0, exames: 0 };
    g.meses.add(h.mes); g.glosa += h.glosa; g.exames += h.exames; m.set(k, g);
  }
  return [...m.values()].filter(g => g.meses.size >= 3).map(g => ({ codigo: g.codigo, meses: g.meses.size, glosa: g.glosa, exames: g.exames })).sort((a, b) => b.meses - a.meses || b.glosa - a.glosa);
}

/** Meses com glosa acima de 1,5x a média dos 3 meses anteriores. */
export function aumentosAnormais(historico: RespostaGlosas["historico"]) {
  const porMes = new Map<string, number>();
  for (const h of historico) porMes.set(h.mes, (porMes.get(h.mes) ?? 0) + h.glosa);
  const s = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));
  return s.map(([mes, v], i) => {
    const ant = s.slice(Math.max(0, i - 3), i).map(x => x[1]);
    const media = ant.length ? ant.reduce((a, b) => a + b, 0) / ant.length : 0;
    return { mes, glosa: v, media, anormal: ant.length >= 2 && media > 0 && v > media * 1.5 };
  });
}

// ---------- Rodada 2: guias, demonstrativos, produtividade e auditoria ----------

export type SituacaoGuia = "autorizada" | "pendente" | "vencida" | "cancelada";
export const ROTULO_SITUACAO_GUIA: Record<SituacaoGuia, string> = { autorizada: "Autorizada", pendente: "Pendente (sem autorização)", vencida: "Vencida antes do exame", cancelada: "Cancelada" };
export type ExameGuia = {
  cdExame: number; cdAtendimento: number; data: string; cdConvenio: number | null; cdModalidade: number | null; cdProcedimento: number | null
  guia: string | null; autorizacao: string | null; solicitacao: string | null; dataAutorizacao: string | null; validade: string | null
  situacao: SituacaoGuia; negada: boolean; divergente: boolean; faturado: boolean; valor: number; motivoGlosa: string | null; pendencia: string | null
};
export type RespostaGuias = {
  periodo: { inicio: string; fim: string }; exames: ExameGuia[]; limite: number
  mensal: Array<{ mes: string; situacao: SituacaoGuia; exames: number; guias: number; valor: number }>
  proximas: Array<{ cdExame: number; cdAtendimento: number; data: string; cdConvenio: number | null; cdProcedimento: number | null; guia: string | null; autorizacao: string | null; validade: string | null; valor: number }>
  nomes: { convenios: Record<number, string>; modalidades: Record<number, string>; procedimentos: Record<number, string> }
  atualizadoEm: string
};

/** Agrupa os exames por guia; a situação da guia é a pior entre os exames (cancelada > vencida > pendente > autorizada). */
const PESO: Record<SituacaoGuia, number> = { cancelada: 4, vencida: 3, pendente: 2, autorizada: 1 };
export function porGuia(exames: ExameGuia[]) {
  const m = new Map<string, { guia: string; exames: ExameGuia[]; situacao: SituacaoGuia; negada: boolean; divergente: boolean; faturada: boolean; valor: number }>();
  for (const e of exames) {
    const k = e.guia ?? `sem-guia-${e.cdExame}`;
    const g = m.get(k) ?? { guia: e.guia ?? "sem guia", exames: [], situacao: e.situacao, negada: false, divergente: false, faturada: false, valor: 0 };
    g.exames.push(e); g.valor += e.valor; g.negada ||= e.negada; g.divergente ||= e.divergente; g.faturada ||= e.faturado;
    if (PESO[e.situacao] > PESO[g.situacao]) g.situacao = e.situacao;
    m.set(k, g);
  }
  return [...m.values()];
}

/** Dias entre a solicitação e a autorização (média), só onde há as duas datas. */
export function tempoAutorizacao(exames: ExameGuia[]) {
  const d = exames.filter(e => e.solicitacao && e.dataAutorizacao).map(e => (Date.parse(e.dataAutorizacao!) - Date.parse(e.solicitacao!)) / 86_400_000).filter(x => x >= 0 && x < 365);
  return d.length ? Math.round((d.reduce((a, b) => a + b, 0) / d.length) * 10) / 10 : null;
}

export type Demonstrativo = {
  cdRetorno: number; data: string | null; descricao: string | null; cdConvenio: number | null; convenio: string | null; linhas: number; guias: number
  protocolos: string | null; demonstrativo: number | null; protocoloData: string | null; informado: number; processado: number; liberado: number; glosado: number
  linhasGlosa: number; divergentes: number; pagos: number; situacoes: string[]
};
export type RespostaDemonstrativos = { periodo: { inicio: string; fim: string }; demonstrativos: Demonstrativo[]; semRetorno: { exames: number; guias: number; valor: number; faturados: number }; atualizadoEm: string };
export type ItemDemonstrativo = { guia: string | null; protocolo: string | null; realizado: string | null; procedimento: string | null; codigo: string | null; quantidade: number | null; informado: number; processado: number; liberado: number; glosado: number; glosaCodigo: string | null; glosa: string | null; situacao: string | null; cdExame: number | null };

/** Situação TISS do protocolo/guia no retorno da operadora. */
export const SITUACAO_TISS: Record<string, string> = {
  "1": "Recebido", "2": "Em análise", "3": "Liberado para pagamento", "4": "Encerrado sem pagamento", "5": "Analisado, aguardando liberação",
  "6": "Pagamento efetuado", "7": "Não localizado", "8": "Aguardando informação complementar",
};
export const situacaoTiss = (s: string | null | undefined) => (s ? SITUACAO_TISS[s] ?? `Situação ${s}` : "Sem situação");
/** Concluído = pagamento efetuado, liberado ou encerrado; o resto está pendente na operadora. */
export const demonstrativoPendente = (d: Pick<Demonstrativo, "situacoes">) => !d.situacoes.length || d.situacoes.some(s => !["3", "4", "6"].includes(s));

export type RespostaProdutividade = {
  periodo: { inicio: string; fim: string }
  porDia: Array<{ dia: string; faturas: number; valor: number; exames: number; guias: number }>
  porColaborador: Array<{ colaborador: string; faturas: number; valor: number; exames: number; guias: number }>
  prazo: Array<{ dias: number; exames: number; valor: number }>
  competencia: Array<{ competencia: string | null; faturas: number; valor: number }>
  rejeicoes: Array<{ mes: string; glosas: number; valor: number }>
  refaturados: number
  atualizadoEm: string
};

/** Dias úteis (segunda a sexta) entre duas datas, inclusive. */
export function diasUteis(inicio: string, fim: string) {
  let n = 0;
  for (let t = Date.parse(`${inicio}T00:00:00Z`); t <= Date.parse(`${fim}T00:00:00Z`); t += 86_400_000) { const d = new Date(t).getUTCDay(); if (d !== 0 && d !== 6) n++; }
  return n;
}

/** Percentual de exames faturados até N dias depois do exame, e o tempo médio (pela distribuição de dias). */
export function prazoFaturamento(hist: RespostaProdutividade["prazo"], limite: number) {
  const total = hist.reduce((s, h) => s + h.exames, 0);
  const dentro = hist.filter(h => h.dias <= limite).reduce((s, h) => s + h.exames, 0);
  return { total, dentro, percentual: pct(dentro, total), media: total ? Math.round((hist.reduce((s, h) => s + h.dias * h.exames, 0) / total) * 10) / 10 : null };
}

export type Gravidade = "alta" | "media" | "baixa";
export type ItemAuditoria = { exame: number | null; atendimento: number | null; lote: number | null; guia: string | null; data: string | null; convenio: string | null; procedimento: string | null; valor: number; detalhe: string | null };
export type Verificacao = { id: string; titulo: string; gravidade: Gravidade; descricao: string; quantidade: number; impacto: number; itens: ItemAuditoria[] };
export type RespostaAuditoria = {
  periodo: { inicio: string; fim: string }; verificacoes: Verificacao[]
  evolucao: Array<{ mes: string; sem_faturamento: number; faturado_cancelado: number; datas: number; sem_informacao: number; valor_zerado: number }>
  atualizadoEm: string
};
const ORDEM_GRAVIDADE: Record<Gravidade, number> = { alta: 0, media: 1, baixa: 2 };
export const ordenarVerificacoes = (l: Verificacao[]) => [...l].sort((a, b) => (b.quantidade > 0 ? 1 : 0) - (a.quantidade > 0 ? 1 : 0) || ORDEM_GRAVIDADE[a.gravidade] - ORDEM_GRAVIDADE[b.gravidade] || b.impacto - a.impacto);
