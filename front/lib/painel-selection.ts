type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

type PainelConfig = {
  ativo: boolean
  atendimento?: number[]
  marcacao?: number[]
  resultado?: number[]
  universal?: Partial<Record<ServicoPainel, boolean>>
}

type ConfiguracaoPaineis = {
  ativo?: boolean
  paineis?: PainelConfig[]
}

function servicoParaConfig(servico: string): ServicoPainel {
  if (servico === 'C') return 'resultado'
  if (servico === 'D') return 'marcacao'
  return 'atendimento'
}

export function deveSelecionarModalidade(
  configuracao: ConfiguracaoPaineis | null | undefined,
  servico: string
) {
  if (configuracao?.ativo !== true) return false

  const paineisAtivos = configuracao.paineis?.filter((painel) => painel.ativo) ?? []
  const servicoConfig = servicoParaConfig(servico)

  if (paineisAtivos.some((painel) => painel.universal?.[servicoConfig] === true)) {
    return false
  }

  return paineisAtivos.some(
    (painel) => Array.isArray(painel[servicoConfig]) && painel[servicoConfig]!.length > 0
  )
}
