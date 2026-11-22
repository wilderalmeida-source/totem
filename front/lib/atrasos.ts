// Atraso dos pacientes: chegada prevista (horário do exame − antecedência da sala) × H. Entrada.
// Agregado no navegador para os cliques filtrarem a aba inteira.

export type LinhaAtraso = {
  id: number
  cdAtendimento: number
  data: string
  horaExame: string
  horaChegada: string       // chegada prevista
  horaEntrada: string
  antecedencia: number      // min que a sala pede de antecedência
  atraso: number            // entrada − chegada prevista (min); positivo = chegou depois
  atrasoExame: number       // entrada − horário do exame (min); positivo = chegou depois do exame
  fonte: "clinux" | "totem" // de onde veio a entrada
  cdMedico: number | null
  medico: string | null
  cdConvenio: number | null
  convenio: string | null
  modalidade: string
  cdPaciente: number
  paciente: string | null
}

export type DimAtraso = "modalidade" | "medico" | "convenio" | "data" | "hora" | "faixa";
export type SelecaoAtraso = Partial<Record<DimAtraso, string>>;

export const ROTULO_DIM_ATRASO: Record<DimAtraso, string> = {
  modalidade: "Modalidade", medico: "Médico", convenio: "Convênio", data: "Dia", hora: "Horário do exame", faixa: "Chegada",
};

// Faixas de chegada em relação à chegada prevista (a tolerância define o "no horário").
export const FAIXAS = [
  { id: "1-adiantado", nome: "Mais de 30 min antes", cor: "#0ea5e9" },
  { id: "2-antes", nome: "Até 30 min antes", cor: "#10b981" },
  { id: "3-tolerancia", nome: "Dentro da tolerância", cor: "#84cc16" },
  { id: "4-ate15", nome: "Até 15 min atrasado", cor: "#f59e0b" },
  { id: "5-ate30", nome: "15 a 30 min atrasado", cor: "#f97316" },
  { id: "6-ate60", nome: "30 a 60 min atrasado", cor: "#ef4444" },
  { id: "7-mais60", nome: "Mais de 1 h atrasado", cor: "#b91c1c" },
] as const;

export function faixa(l: LinhaAtraso, tolerancia: number) {
  if (l.atraso < -30) return FAIXAS[0];
  if (l.atraso <= 0) return FAIXAS[1];
  if (l.atraso <= tolerancia) return FAIXAS[2];
  if (l.atraso <= 15) return FAIXAS[3];
  if (l.atraso <= 30) return FAIXAS[4];
  if (l.atraso <= 60) return FAIXAS[5];
  return FAIXAS[6];
}

export const atrasado = (l: LinhaAtraso, tolerancia: number) => l.atraso > tolerancia;

export function chaveAtraso(l: LinhaAtraso, d: DimAtraso, tolerancia: number): string {
  switch (d) {
    case "modalidade": return l.modalidade;
    case "medico": return String(l.cdMedico ?? "-");
    case "convenio": return String(l.cdConvenio ?? "-");
    case "data": return l.data;
    case "hora": return l.horaExame.slice(0, 2);
    case "faixa": return faixa(l, tolerancia).id;
  }
}

export function nomeAtraso(l: LinhaAtraso, d: DimAtraso, tolerancia: number): string {
  switch (d) {
    case "modalidade": return l.modalidade;
    case "medico": return l.medico ?? "Sem médico";
    case "convenio": return l.convenio ?? "Sem convênio";
    case "data": { const [, m, dd] = l.data.split("-"); return `${dd}/${m}`; }
    case "hora": return `${l.horaExame.slice(0, 2)}h`;
    case "faixa": return faixa(l, tolerancia).nome;
  }
}

export function filtrarAtrasos(linhas: LinhaAtraso[], sel: SelecaoAtraso, tolerancia: number, ignorar?: DimAtraso) {
  const ativos = (Object.entries(sel) as Array<[DimAtraso, string | undefined]>).filter(([d, v]) => v !== undefined && d !== ignorar);
  if (!ativos.length) return linhas;
  return linhas.filter(l => ativos.every(([d, v]) => chaveAtraso(l, d, tolerancia) === v));
}

const arred = (n: number) => Math.round(n * 10) / 10;

export type EstatAtraso = {
  total: number
  atrasados: number
  percentual: number
  mediaAtraso: number       // média de minutos de quem chegou atrasado (além da chegada prevista)
  minutosAtraso: number     // soma desses minutos
  aposExame: number         // chegaram depois do próprio horário do exame
  percentualAposExame: number
  pontuais: number
}

export function estatAtraso(linhas: LinhaAtraso[], tolerancia: number): EstatAtraso {
  const atr = linhas.filter(l => atrasado(l, tolerancia));
  const minutos = atr.reduce((s, l) => s + l.atraso, 0);
  const aposExame = linhas.filter(l => l.atrasoExame > 0).length;
  return {
    total: linhas.length,
    atrasados: atr.length,
    percentual: linhas.length ? arred((atr.length / linhas.length) * 100) : 0,
    mediaAtraso: atr.length ? arred(minutos / atr.length) : 0,
    minutosAtraso: arred(minutos),
    aposExame,
    percentualAposExame: linhas.length ? arred((aposExame / linhas.length) * 100) : 0,
    pontuais: linhas.length - atr.length,
  };
}

export type GrupoAtraso = EstatAtraso & { chave: string; nome: string };

export function agruparAtrasos(linhas: LinhaAtraso[], d: DimAtraso, tolerancia: number): GrupoAtraso[] {
  const mapa = new Map<string, { nome: string; linhas: LinhaAtraso[] }>();
  for (const l of linhas) {
    const k = chaveAtraso(l, d, tolerancia);
    const g = mapa.get(k);
    if (g) g.linhas.push(l);
    else mapa.set(k, { nome: nomeAtraso(l, d, tolerancia), linhas: [l] });
  }
  return [...mapa.entries()].map(([chave, g]) => ({ chave, nome: g.nome, ...estatAtraso(g.linhas, tolerancia) }));
}
