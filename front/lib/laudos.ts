// Dashboard de Laudos: uma linha por exame realizado (vinda de /clinux/dashboard/laudos), agregada no navegador
// para que um clique em médico, modalidade, convênio ou dia filtre a tela inteira.

export type TipoLaudo = "laudo" | "revisao" | "retificacao";

export type LinhaLaudo = {
  id: number                 // cd_exame
  cdAtendimento: number
  cdPaciente: number | null
  data: string               // dia do laudo (pendente: dia do exame), YYYY-MM-DD
  dataExame: string          // dia do exame
  realizado: string | null   // data do exame + H. Saída (dt_hora_saida)
  finalizado: boolean        // tem D. Laudo: só esses entram nos cálculos
  assinado: string | null    // D. Laudo
  prazo: string | null       // data/hora de entrega prometida
  prazoRecalculado?: boolean // entrega do Clinux anterior ao atendimento (exame transferido): prazo pela modalidade
  horas: number | null       // realizado → laudo (só finalizados)
  atrasoHoras: number | null // (laudo, ou agora se pendente) − prazo; > 0 = atrasado
  cdMedico: number | null    // médico executor responsável (na revisão/retificação, o do laudo corrigido)
  cdMedicoExame: number | null
  atribuidoPor: "laudo" | "laudo_anterior" | "proprio_exame"
  cdExameOrigem: number | null
  cdModalidade: number | null
  cdConvenio: number | null
  cdProcedimento: number | null
  tipo: TipoLaudo
};

export type NomesLaudos = {
  medicos: Record<number, string>; modalidades: Record<number, string>; convenios: Record<number, string>
  procedimentos: Record<number, string>; pacientes: Record<number, string>
};

export type DimLaudo = "medico" | "modalidade" | "convenio" | "data";
export type SelecaoLaudo = Partial<Record<DimLaudo, string>>;

export const ROTULO_DIM_LAUDO: Record<DimLaudo, string> = { medico: "Médico", modalidade: "Modalidade", convenio: "Convênio", data: "Dia" };

// Mínimo de laudos para entrar nos pódios e nos rankings de tempo/taxa (o resto aparece em cinza).
export const MINIMO_LAUDOS = 10;

export function chaveLaudo(l: LinhaLaudo, d: DimLaudo): string {
  switch (d) {
    case "medico": return String(l.cdMedico ?? "-");
    case "modalidade": return String(l.cdModalidade ?? "-");
    case "convenio": return String(l.cdConvenio ?? "-");
    case "data": return l.data;
  }
}

export function nomeLaudo(l: LinhaLaudo, d: DimLaudo, nomes: NomesLaudos): string {
  switch (d) {
    case "medico": return l.cdMedico === null ? "Sem médico" : nomes.medicos[l.cdMedico] ?? `Médico ${l.cdMedico}`;
    case "modalidade": return l.cdModalidade === null ? "Não identificada" : nomes.modalidades[l.cdModalidade] ?? `Modalidade ${l.cdModalidade}`;
    case "convenio": return l.cdConvenio === null ? "Sem convênio" : nomes.convenios[l.cdConvenio] ?? `Convênio ${l.cdConvenio}`;
    case "data": { const [, m, dd] = l.data.split("-"); return `${dd}/${m}`; }
  }
}

export function filtrarLaudos(linhas: LinhaLaudo[], sel: SelecaoLaudo, ignorar?: DimLaudo) {
  const ativos = (Object.entries(sel) as Array<[DimLaudo, string | undefined]>).filter(([d, v]) => v !== undefined && d !== ignorar);
  if (!ativos.length) return linhas;
  return linhas.filter(l => ativos.every(([d, v]) => chaveLaudo(l, d) === v));
}

const arred = (n: number) => Math.round(n * 10) / 10;
// Taxas de revisão/retificação costumam ser bem pequenas (1 em centenas de laudos): guardam 3 casas.
const arred3 = (n: number) => Math.round(n * 1000) / 1000;

function mediana(ordenados: number[]) {
  if (!ordenados.length) return 0;
  const m = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[m] : (ordenados[m - 1] + ordenados[m]) / 2;
}

// Limite inferior de Wilson (95%) da proporção de acertos, em 0–100: a taxa "garantida" pelo volume.
export function wilson(sucessos: number, n: number): number {
  if (!n) return 0;
  const z = 1.96, p = Math.max(0, Math.min(1, sucessos / n));
  const centro = p + (z * z) / (2 * n);
  const margem = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return arred(((centro - margem) / (1 + (z * z) / n)) * 100);
}

export const atrasado = (l: LinhaLaudo) => l.prazo !== null && (l.atrasoHoras ?? 0) > 0;
// Entra na conta do prazo: finalizado, com prazo e com data de laudo.
const medePrazo = (l: LinhaLaudo) => l.finalizado && l.prazo !== null && l.atrasoHoras !== null;

export type EstatLaudo = {
  exames: number            // exames a laudar (sem revisão/retificação), finalizados ou não
  assinados: number         // laudos finalizados: base de todos os cálculos
  pendentes: number         // ainda não finalizados (só informativo)
  comTempo: number          // laudos com tempo calculado (têm H. Saída)
  mediaHoras: number
  medianaHoras: number
  comPrazo: number
  atrasados: number
  percentualNoPrazo: number
  percentualAtraso: number
  pendentesAtrasados: number
  revisoes: number
  retificacoes: number
  taxaRevisao: number       // revisões por 100 laudos
  taxaRetificacao: number
  nota: number              // desempenho: laudos no prazo e sem correção, ajustado pelo volume
};

export function estatLaudos(linhas: LinhaLaudo[]): EstatLaudo {
  // Os cálculos usam só exames finalizados; os não finalizados contam apenas como pendentes.
  const laudos = linhas.filter(l => l.tipo === "laudo");
  const assinados = laudos.filter(l => l.finalizado);
  const pendentes = laudos.filter(l => !l.finalizado);
  const horas = assinados.map(l => l.horas).filter((h): h is number => h !== null).sort((a, b) => a - b);
  const comPrazo = assinados.filter(medePrazo);
  const atrasados = comPrazo.filter(atrasado);
  const revisoes = linhas.filter(l => l.tipo === "revisao" && l.finalizado).length;
  const retificacoes = linhas.filter(l => l.tipo === "retificacao" && l.finalizado).length;
  const n = assinados.length;
  return {
    exames: laudos.length,
    assinados: n,
    pendentes: pendentes.length,
    comTempo: horas.length,
    mediaHoras: horas.length ? arred(horas.reduce((s, h) => s + h, 0) / horas.length) : 0,
    medianaHoras: arred(mediana(horas)),
    comPrazo: comPrazo.length,
    atrasados: atrasados.length,
    percentualNoPrazo: comPrazo.length ? arred(((comPrazo.length - atrasados.length) / comPrazo.length) * 100) : 0,
    percentualAtraso: comPrazo.length ? arred((atrasados.length / comPrazo.length) * 100) : 0,
    pendentesAtrasados: pendentes.filter(atrasado).length,
    revisoes,
    retificacoes,
    taxaRevisao: n ? arred3((revisoes / n) * 100) : 0,
    taxaRetificacao: n ? arred3((retificacoes / n) * 100) : 0,
    nota: wilson(n - atrasados.length - revisoes - retificacoes, n),
  };
}

export type GrupoLaudo = EstatLaudo & { chave: string; nome: string };

export function agruparLaudos(linhas: LinhaLaudo[], d: DimLaudo, nomes: NomesLaudos): GrupoLaudo[] {
  const mapa = new Map<string, { nome: string; linhas: LinhaLaudo[] }>();
  for (const l of linhas) {
    const k = chaveLaudo(l, d);
    const g = mapa.get(k);
    if (g) g.linhas.push(l);
    else mapa.set(k, { nome: nomeLaudo(l, d, nomes), linhas: [l] });
  }
  return [...mapa.entries()].map(([chave, g]) => ({ chave, nome: g.nome, ...estatLaudos(g.linhas) }));
}

export function podiosMedicos(grupos: GrupoLaudo[], minimo = MINIMO_LAUDOS) {
  const validos = grupos.filter(g => g.chave !== "-");
  return {
    maisLaudos: [...validos].filter(g => g.assinados > 0).sort((a, b) => b.assinados - a.assinados || a.medianaHoras - b.medianaHoras).slice(0, 3),
    maisRapidos: [...validos].filter(g => g.comTempo >= minimo).sort((a, b) => a.medianaHoras - b.medianaHoras || b.assinados - a.assinados).slice(0, 3),
    desempenho: [...validos].filter(g => g.assinados >= minimo).sort((a, b) => b.nota - a.nota || b.exames - a.exames).slice(0, 3),
  };
}

/** "45 min", "6,5 h", "3,2 dias". */
export function formatarHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
  return `${(h / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}
