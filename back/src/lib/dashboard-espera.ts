// Analíticos de tempo de espera, com o mesmo critério do histórico da tela inicial:
// atendimentos_senhas.dt_entrada (senha emitida) até dt_saida (status muda para Atendido/Entregue),
// um registro por paciente no dia. Atendimento e Entrega são calculados separadamente.

export type EsperaRegistro = {
  data: string          // YYYY-MM-DD
  horaSenha: string     // HH:MM:SS
  minutos: number       // espera em minutos (>= 0)
  modalidade: string
  preferencial: boolean
  senha: string | null
  cdPaciente: number | null
}

export const FAIXAS = [
  { label: '0–5 min', min: 0, max: 5 },
  { label: '5–10 min', min: 5, max: 10 },
  { label: '10–15 min', min: 10, max: 15 },
  { label: '15–30 min', min: 15, max: 30 },
  { label: '30–45 min', min: 30, max: 45 },
  { label: '45–60 min', min: 45, max: 60 },
  { label: '60+ min', min: 60, max: Infinity },
] as const

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const arred = (n: number) => Math.round(n * 10) / 10

export function percentil(ordenados: number[], p: number) {
  if (!ordenados.length) return 0
  const pos = (ordenados.length - 1) * p
  const base = Math.floor(pos)
  const resto = pos - base
  const prox = ordenados[base + 1]
  return prox === undefined ? ordenados[base] : ordenados[base] + resto * (prox - ordenados[base])
}

function resumo(valores: number[], metaMinutos: number) {
  const ord = [...valores].sort((a, b) => a - b)
  const total = ord.length
  const soma = ord.reduce((acc, v) => acc + v, 0)
  const dentro = ord.filter(v => v <= metaMinutos).length
  return {
    total,
    media: total ? arred(soma / total) : 0,
    mediana: arred(percentil(ord, 0.5)),
    p90: arred(percentil(ord, 0.9)),
    maximo: total ? arred(ord[total - 1]) : 0,
    minimo: total ? arred(ord[0]) : 0,
    dentroMeta: dentro,
    percentualMeta: total ? arred((dentro / total) * 100) : 0,
  }
}

function agrupar<K>(registros: EsperaRegistro[], chave: (r: EsperaRegistro) => K) {
  const mapa = new Map<K, number[]>()
  for (const r of registros) {
    const k = chave(r)
    const lista = mapa.get(k)
    if (lista) lista.push(r.minutos)
    else mapa.set(k, [r.minutos])
  }
  return mapa
}

function diasEntre(inicio: string, fim: string) {
  const dias: string[] = []
  const d = new Date(`${inicio}T12:00:00Z`)
  const f = new Date(`${fim}T12:00:00Z`)
  while (d <= f && dias.length < 400) {
    dias.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return dias
}

export function diaSemana(data: string) {
  return new Date(`${data}T12:00:00Z`).getUTCDay()
}

export function calcularEspera(
  atual: EsperaRegistro[],
  anterior: EsperaRegistro[],
  opts: { inicio: string; fim: string; metaMinutos: number; pendentes?: number },
) {
  const { inicio, fim, metaMinutos, pendentes = 0 } = opts
  const geral = resumo(atual.map(r => r.minutos), metaMinutos)
  const prev = resumo(anterior.map(r => r.minutos), metaMinutos)

  const porDiaMapa = agrupar(atual, r => r.data)
  const porDia = diasEntre(inicio, fim).map(data => {
    const r = resumo(porDiaMapa.get(data) ?? [], metaMinutos)
    return { data, total: r.total, media: r.media, mediana: r.mediana, p90: r.p90, percentualMeta: r.percentualMeta }
  })

  const porHoraMapa = agrupar(atual, r => Number(r.horaSenha.slice(0, 2)))
  const horas = [...porHoraMapa.keys()].sort((a, b) => a - b)
  const porHora = horas.length
    ? Array.from({ length: horas[horas.length - 1] - horas[0] + 1 }, (_, i) => {
      const hora = horas[0] + i
      const r = resumo(porHoraMapa.get(hora) ?? [], metaMinutos)
      return { hora: `${String(hora).padStart(2, '0')}h`, total: r.total, media: r.media, p90: r.p90 }
    })
    : []

  const porModalidade = [...agrupar(atual, r => r.modalidade).entries()]
    .map(([modalidade, valores]) => {
      const r = resumo(valores, metaMinutos)
      return { modalidade, total: r.total, media: r.media, mediana: r.mediana, p90: r.p90, percentualMeta: r.percentualMeta }
    })
    .sort((a, b) => b.media - a.media)

  const distribuicao = FAIXAS.map(f => ({
    faixa: f.label,
    total: atual.filter(r => r.minutos >= f.min && r.minutos < f.max).length,
    acimaMeta: f.min >= metaMinutos,
  }))

  const porTipoMapa = agrupar<string>(atual, r => (r.preferencial ? 'Preferencial' : 'Normal'))
  const porTipo = ['Normal', 'Preferencial'].map(tipo => {
    const r = resumo(porTipoMapa.get(tipo) ?? [], metaMinutos)
    return { tipo, total: r.total, media: r.media, mediana: r.mediana }
  })

  // Mapa de calor: dia da semana x hora (média em minutos).
  const calor = agrupar(atual, r => `${diaSemana(r.data)}|${Number(r.horaSenha.slice(0, 2))}`)
  const mapaCalor = DIAS_SEMANA.map((dia, idx) => ({
    dia,
    indice: idx, // 0 = domingo, igual ao EXTRACT(DOW) do PostgreSQL
    celulas: (horas.length ? Array.from({ length: horas[horas.length - 1] - horas[0] + 1 }, (_, i) => horas[0] + i) : []).map(hora => {
      const valores = calor.get(`${idx}|${hora}`) ?? []
      const r = resumo(valores, metaMinutos)
      return { hora, total: r.total, media: r.media }
    }),
  })).filter(linha => linha.celulas.some(c => c.total > 0))

  const maioresEsperas = [...atual]
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 10)
    .map(r => ({ data: r.data, horaSenha: r.horaSenha.slice(0, 5), cdPaciente: r.cdPaciente, modalidade: r.modalidade, preferencial: r.preferencial, minutos: arred(r.minutos) }))

  const variacao = (a: number, b: number) => (b ? arred(((a - b) / b) * 100) : null)

  return {
    periodo: { inicio, fim, metaMinutos },
    resumo: { ...geral, pendentes },
    anterior: { media: prev.media, mediana: prev.mediana, p90: prev.p90, total: prev.total, percentualMeta: prev.percentualMeta },
    variacao: {
      media: variacao(geral.media, prev.media),
      mediana: variacao(geral.mediana, prev.mediana),
      p90: variacao(geral.p90, prev.p90),
      total: variacao(geral.total, prev.total),
      percentualMeta: prev.total ? arred(geral.percentualMeta - prev.percentualMeta) : null,
    },
    porDia,
    porHora,
    porModalidade,
    distribuicao,
    porTipo,
    mapaCalor,
    maioresEsperas,
  }
}

export type EsperaDashboard = ReturnType<typeof calcularEspera>
