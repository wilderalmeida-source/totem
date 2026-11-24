// Financeiro · Exames e auditoria: ticket médio por modalidade e exames com valor fora do padrão
// (resposta de /clinux/financeiro/exames).

export type Rigor = "normal" | "extremo";

export type TicketModalidade = {
  cdModalidade: number | null; exames: number; atendimentos: number; valor: number; convenio: number; particular: number
  atendConvenio: number; atendParticular: number; medianaExame: number
  anterior: { atendimentos: number; valor: number } | null
};

export type ExameForaPadrao = {
  cdExame: number; cdAtendimento: number; cdPaciente: number | null; data: string
  cdProcedimento: number | null; cdModalidade: number | null; cdConvenio: number | null
  valor: number; convenio: number; particular: number
  grupo: { exames: number; media: number; desvio: number | null; q1: number; mediana: number; q3: number }
};

export type RespostaExames = {
  periodo: { inicio: string; fim: string }; anterior: { inicio: string; fim: string }; rigor: Rigor; minimoGrupo: number
  ticket: TicketModalidade[]
  foraDoPadrao: { total: number; impacto: number; limite: number; gruposAnalisados: number; examesAnalisados: number; itens: ExameForaPadrao[] }
  nomes: { modalidades: Record<number, string>; procedimentos: Record<number, string>; convenios: Record<number, string>; pacientes: Record<number, string> }
  atualizadoEm: string
};

const div = (a: number, b: number) => (b ? a / b : null);
const arred = (n: number | null, casas = 1) => (n === null ? null : Math.round(n * 10 ** casas) / 10 ** casas);

export type LinhaTicket = {
  cdModalidade: number | null; nome: string; exames: number; atendimentos: number; valor: number
  ticketAtendimento: number | null   // valor ÷ atendimentos com exame da modalidade
  ticketExame: number | null         // valor ÷ exames
  medianaExame: number
  ticketConvenio: number | null      // parte do convênio ÷ atendimentos com convênio
  ticketParticular: number | null    // parte particular ÷ atendimentos com particular
  participacao: number | null        // % do valor total do período
  ticketAnterior: number | null
  variacao: number | null            // % do ticket por atendimento em relação ao período anterior
};

export function ticketPorModalidade(d: RespostaExames): LinhaTicket[] {
  const total = d.ticket.reduce((s, t) => s + t.valor, 0);
  return d.ticket.map(t => {
    const ticketAtendimento = div(t.valor, t.atendimentos);
    const ticketAnterior = t.anterior ? div(t.anterior.valor, t.anterior.atendimentos) : null;
    return {
      cdModalidade: t.cdModalidade,
      nome: t.cdModalidade === null ? "Não identificada" : d.nomes.modalidades[t.cdModalidade] ?? `Modalidade ${t.cdModalidade}`,
      exames: t.exames, atendimentos: t.atendimentos, valor: t.valor,
      ticketAtendimento, ticketExame: div(t.valor, t.exames), medianaExame: t.medianaExame,
      ticketConvenio: div(t.convenio, t.atendConvenio), ticketParticular: div(t.particular, t.atendParticular),
      participacao: arred(total ? (t.valor / total) * 100 : null),
      ticketAnterior,
      variacao: ticketAtendimento !== null && ticketAnterior ? arred(((ticketAtendimento - ticketAnterior) / ticketAnterior) * 100) : null,
    };
  }).sort((a, b) => b.valor - a.valor);
}

/** Ticket médio geral: valor total ÷ atendimentos distintos (um atendimento com 2 modalidades conta nas duas). */
export function ticketGeral(linhas: LinhaTicket[]) {
  const valor = linhas.reduce((s, l) => s + l.valor, 0);
  const exames = linhas.reduce((s, l) => s + l.exames, 0);
  return { valor, exames, porExame: div(valor, exames) };
}

export type Desvio = {
  direcao: "acima" | "abaixo"
  diferenca: number          // valor − mediana do grupo (negativo = abaixo)
  percentual: number | null  // diferença em % da mediana
  desvios: number | null     // quantos desvios padrão da média do grupo
};

export function descreverDesvio(i: ExameForaPadrao): Desvio {
  const diferenca = i.valor - i.grupo.mediana;
  return {
    direcao: diferenca >= 0 ? "acima" : "abaixo",
    diferenca,
    percentual: arred(i.grupo.mediana ? (diferenca / i.grupo.mediana) * 100 : null),
    desvios: arred(i.grupo.desvio ? (i.valor - i.grupo.media) / i.grupo.desvio : null),
  };
}

export const nomePaciente = (d: RespostaExames, i: ExameForaPadrao) => (i.cdPaciente === null ? "—" : d.nomes.pacientes[i.cdPaciente] ?? `Paciente ${i.cdPaciente}`);
export const nomeProcedimento = (d: RespostaExames, i: ExameForaPadrao) => (i.cdProcedimento === null ? "—" : d.nomes.procedimentos[i.cdProcedimento] ?? `Procedimento ${i.cdProcedimento}`);
export const nomeConvenio = (d: RespostaExames, i: ExameForaPadrao) => (i.cdConvenio === null ? "Sem convênio" : d.nomes.convenios[i.cdConvenio] ?? `Convênio ${i.cdConvenio}`);
export const nomeModalidade = (d: RespostaExames, i: ExameForaPadrao) => (i.cdModalidade === null ? "Não identificada" : d.nomes.modalidades[i.cdModalidade] ?? `Modalidade ${i.cdModalidade}`);

const csv = (v: string | number | null) => {
  const s = v === null ? "" : typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Planilha (separador ";", decimal com vírgula) para abrir a auditoria no Excel. */
export function csvForaDoPadrao(d: RespostaExames, itens: ExameForaPadrao[]): string {
  const cab = ["Data", "Atendimento", "Exame", "Paciente", "Modalidade", "Procedimento", "Convênio", "Valor", "Convênio (R$)", "Particular (R$)",
    "Mediana do grupo", "Média do grupo", "Desvio padrão", "Desvios da média", "Diferença", "Diferença %", "Exames no grupo", "Situação"];
  const linhas = itens.map(i => {
    const x = descreverDesvio(i);
    return [i.data.split("-").reverse().join("/"), String(i.cdAtendimento), String(i.cdExame), nomePaciente(d, i), nomeModalidade(d, i), nomeProcedimento(d, i), nomeConvenio(d, i),
      i.valor, i.convenio, i.particular, i.grupo.mediana, i.grupo.media, i.grupo.desvio, x.desvios, x.diferenca, x.percentual, String(i.grupo.exames),
      x.direcao === "acima" ? "Acima do normal" : "Abaixo do normal"].map(csv).join(";");
  });
  return [cab.join(";"), ...linhas].join("\r\n");
}
