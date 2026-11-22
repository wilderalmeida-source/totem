// Agregações da tela Desempenho. Tudo roda no navegador sobre as linhas do backend, para que cada clique
// (convênio, funcionário, médico, modalidade, dia, hora) filtre todos os gráficos na hora.

export type LinhaDesempenho = {
  id: number
  cdAtendimento: number  // nº do atendimento no Clinux (no agendamento: o primeiro exame marcado)
  data: string
  horaSenha: string
  horaChamada: string
  horaFim: string
  horaMarcada: string | null
  espera: number           // senha emitida → chamada no guichê (min)
  ficha: number            // chamada → ficha concluída / marcação gravada (min)
  atraso: number | null    // ficha concluída − horário marcado do exame (min); positivo = depois do horário
  chegouNoHorario: boolean | null
  exames: number
  cdFuncionario: number | null
  funcionario: string | null
  cdMedico: number | null
  medico: string | null
  cdConvenio: number | null
  convenio: string | null
  modalidade: string
  cdPaciente: number | null
  paciente: string | null
  preferencial: boolean
}

// Abaixo disso a média é instável (uma ficha demorada distorce tudo): o item vai para o fim do ranking
// e não entra nos destaques.
export const MINIMO_AMOSTRA = 5

export type Dimensao = 'convenio' | 'funcionario' | 'medico' | 'modalidade' | 'data' | 'hora'
export type Selecao = Partial<Record<Dimensao, string>>

export const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  convenio: 'Convênio', funcionario: 'Funcionário', medico: 'Médico', modalidade: 'Modalidade', data: 'Dia', hora: 'Horário',
}

const SEM_NOME: Record<Dimensao, string> = {
  convenio: 'Sem convênio', funcionario: 'Não informado', medico: 'Sem médico', modalidade: 'Não identificada', data: '', hora: '',
}

// Chave estável (texto) e nome de exibição de uma linha para cada dimensão.
export function chave(l: LinhaDesempenho, d: Dimensao): string {
  switch (d) {
    case 'convenio': return String(l.cdConvenio ?? '-')
    case 'funcionario': return String(l.cdFuncionario ?? '-')
    case 'medico': return String(l.cdMedico ?? '-')
    case 'modalidade': return l.modalidade
    case 'data': return l.data
    case 'hora': return l.horaChamada.slice(0, 2)
  }
}

export function nome(l: LinhaDesempenho, d: Dimensao): string {
  switch (d) {
    case 'convenio': return l.convenio ?? SEM_NOME.convenio
    case 'funcionario': return l.funcionario ?? SEM_NOME.funcionario
    case 'medico': return l.medico ?? SEM_NOME.medico
    case 'modalidade': return l.modalidade
    case 'data': { const [, m, dd] = l.data.split('-'); return `${dd}/${m}` }
    case 'hora': return `${l.horaChamada.slice(0, 2)}h`
  }
}

export function filtrar(linhas: LinhaDesempenho[], sel: Selecao, ignorar?: Dimensao) {
  const ativos = (Object.entries(sel) as Array<[Dimensao, string | undefined]>).filter(([d, v]) => v !== undefined && d !== ignorar)
  if (!ativos.length) return linhas
  return linhas.filter(l => ativos.every(([d, v]) => chave(l, d) === v))
}

const arred = (n: number) => Math.round(n * 10) / 10

export function percentil(ordenados: number[], p: number) {
  if (!ordenados.length) return 0
  const pos = (ordenados.length - 1) * p
  const base = Math.floor(pos)
  const prox = ordenados[base + 1]
  return prox === undefined ? ordenados[base] : ordenados[base] + (pos - base) * (prox - ordenados[base])
}

export type Estatisticas = {
  total: number
  mediaFicha: number
  medianaFicha: number
  p90Ficha: number
  mediaEspera: number
  mediaTotal: number        // espera + ficha
  percentualMeta: number
  exames: number
  comHorario: number        // pacientes que chegaram até o horário marcado
  atrasados: number         // desses, quantos tiveram a ficha concluída depois do horário marcado
  percentualAtrasados: number
  minutosAtraso: number     // soma dos minutos de atraso causados (só de quem chegou no horário)
  mediaAtraso: number
}

export function estatisticas(linhas: LinhaDesempenho[], metaFicha: number): Estatisticas {
  const total = linhas.length
  const fichas = linhas.map(l => l.ficha).sort((a, b) => a - b)
  const soma = (f: (l: LinhaDesempenho) => number) => linhas.reduce((acc, l) => acc + f(l), 0)
  const noHorario = linhas.filter(l => l.chegouNoHorario === true && l.atraso !== null)
  const atrasadas = noHorario.filter(l => (l.atraso ?? 0) > 0)
  const minutosAtraso = atrasadas.reduce((acc, l) => acc + (l.atraso ?? 0), 0)
  return {
    total,
    mediaFicha: total ? arred(soma(l => l.ficha) / total) : 0,
    medianaFicha: arred(percentil(fichas, 0.5)),
    p90Ficha: arred(percentil(fichas, 0.9)),
    mediaEspera: total ? arred(soma(l => l.espera) / total) : 0,
    mediaTotal: total ? arred(soma(l => l.espera + l.ficha) / total) : 0,
    percentualMeta: total ? arred((linhas.filter(l => l.ficha <= metaFicha).length / total) * 100) : 0,
    exames: soma(l => l.exames),
    comHorario: noHorario.length,
    atrasados: atrasadas.length,
    percentualAtrasados: noHorario.length ? arred((atrasadas.length / noHorario.length) * 100) : 0,
    minutosAtraso: arred(minutosAtraso),
    mediaAtraso: atrasadas.length ? arred(minutosAtraso / atrasadas.length) : 0,
  }
}

export type Grupo = Estatisticas & { chave: string; nome: string }

export function agrupar(linhas: LinhaDesempenho[], d: Dimensao, metaFicha: number): Grupo[] {
  const mapa = new Map<string, { nome: string; linhas: LinhaDesempenho[] }>()
  for (const l of linhas) {
    const k = chave(l, d)
    const g = mapa.get(k)
    if (g) g.linhas.push(l)
    else mapa.set(k, { nome: nome(l, d), linhas: [l] })
  }
  return [...mapa.entries()].map(([k, g]) => ({ chave: k, nome: g.nome, ...estatisticas(g.linhas, metaFicha) }))
}

// Datas do período sem buracos (dias sem fichas aparecem zerados).
export function diasDoPeriodo(inicio: string, fim: string) {
  const dias: string[] = []
  const d = new Date(`${inicio}T12:00:00Z`)
  const f = new Date(`${fim}T12:00:00Z`)
  while (d <= f && dias.length < 400) { dias.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1) }
  return dias
}

// Pódio "mais rápidos": menor ficha mediana (uma ficha travada não derruba ninguém), com volume mínimo
// para não premiar quem fez duas fichas. Empate → quem fez mais fichas.
export const MINIMO_PODIO = 10

export function maisRapidos(grupos: Grupo[], minimo = MINIMO_PODIO): Grupo[] {
  return grupos.filter(g => g.chave !== '-' && g.total >= minimo)
    .sort((a, b) => a.medianaFicha - b.medianaFicha || a.mediaFicha - b.mediaFicha || b.total - a.total)
    .slice(0, 3)
}
