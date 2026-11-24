// Estrutura gerencial da DRE (regime de competência), compatível com o CPC 26: receita bruta, deduções, receita
// líquida, custos, lucro bruto, despesas operacionais, depreciação/amortização, resultado antes do financeiro,
// EBITDA (conciliado), resultado financeiro, resultado antes dos tributos sobre o lucro, tributos e lucro líquido.
// Cada conta do plano de contas do Clinux é associada a uma ou mais FOLHAS (com percentual de rateio) ou fica FORA da
// DRE (empréstimos recebidos/amortizados, imobilizado, ajustes). Valores: receitas positivas, despesas negativas.

export type Folha = { id: string; nome: string }
export type Grupo = { id: string; nome: string; tipo: 'grupo'; folhas: Folha[] }
export type Total = { id: string; nome: string; tipo: 'total'; soma: Array<{ id: string; sinal: 1 | -1 }>; memo?: boolean }
export type LinhaEstrutura = Grupo | Total

export const ESTRUTURA_DRE: LinhaEstrutura[] = [
  { id: 'RB', nome: 'Receita bruta de serviços', tipo: 'grupo', folhas: [
    { id: 'RB.CONV', nome: 'Receita de convênios' },
    { id: 'RB.PART', nome: 'Receita de atendimentos particulares' },
    { id: 'RB.EMP', nome: 'Receita de contratos empresariais' },
    { id: 'RB.OUT', nome: 'Outras receitas operacionais' },
  ] },
  { id: 'DED', nome: '(−) Deduções da receita bruta', tipo: 'grupo', folhas: [
    { id: 'DED.DESC', nome: 'Descontos incondicionais' },
    { id: 'DED.TRIB', nome: 'Tributos incidentes sobre a receita' },
    { id: 'DED.AJ', nome: 'Ajustes de receita, cancelamentos e glosas' },
  ] },
  { id: 'RL', nome: 'Receita operacional líquida', tipo: 'total', soma: [{ id: 'RB', sinal: 1 }, { id: 'DED', sinal: 1 }] },
  { id: 'CSP', nome: '(−) Custos dos serviços prestados', tipo: 'grupo', folhas: [
    { id: 'CSP.MED', nome: 'Custos com médicos e laudos' },
    { id: 'CSP.MAT', nome: 'Custos com materiais e insumos' },
    { id: 'CSP.CONT', nome: 'Custos com contrastes' },
    { id: 'CSP.PES', nome: 'Custos com pessoal operacional' },
    { id: 'CSP.MAN', nome: 'Custos com manutenção operacional' },
    { id: 'CSP.INF', nome: 'Infraestrutura diretamente atribuível' },
  ] },
  { id: 'LB', nome: 'Lucro bruto', tipo: 'total', soma: [{ id: 'RL', sinal: 1 }, { id: 'CSP', sinal: 1 }] },
  { id: 'DOP', nome: '(−) Despesas operacionais', tipo: 'grupo', folhas: [
    { id: 'DOP.ADM', nome: 'Despesas administrativas' },
    { id: 'DOP.COM', nome: 'Despesas comerciais' },
    { id: 'DOP.TEC', nome: 'Despesas com tecnologia' },
    { id: 'DOP.PES', nome: 'Despesas com pessoal administrativo' },
    { id: 'DOP.OUT', nome: 'Outras receitas e despesas operacionais' },
  ] },
  { id: 'DA', nome: '(−) Depreciação e amortização', tipo: 'grupo', folhas: [
    { id: 'DA.DEP', nome: 'Depreciação' },
    { id: 'DA.AMO', nome: 'Amortização' },
  ] },
  { id: 'EBIT', nome: 'Resultado antes das receitas e despesas financeiras', tipo: 'total', soma: [{ id: 'LB', sinal: 1 }, { id: 'DOP', sinal: 1 }, { id: 'DA', sinal: 1 }] },
  { id: 'EBITDA', nome: 'EBITDA gerencial (resultado operacional + depreciação e amortização)', tipo: 'total', soma: [{ id: 'EBIT', sinal: 1 }, { id: 'DA', sinal: -1 }], memo: true },
  { id: 'RF', nome: 'Resultado financeiro líquido', tipo: 'grupo', folhas: [
    { id: 'RF.REC', nome: 'Receitas financeiras' },
    { id: 'RF.DES', nome: 'Despesas financeiras' },
  ] },
  { id: 'LAIR', nome: 'Resultado antes dos tributos sobre o lucro', tipo: 'total', soma: [{ id: 'EBIT', sinal: 1 }, { id: 'RF', sinal: 1 }] },
  { id: 'IR', nome: '(−) Tributos sobre o lucro', tipo: 'grupo', folhas: [{ id: 'IR.IRCS', nome: 'IRPJ e CSLL' }] },
  { id: 'LL', nome: 'Lucro ou prejuízo líquido', tipo: 'total', soma: [{ id: 'LAIR', sinal: 1 }, { id: 'IR', sinal: 1 }] },
]

export const FORA = 'FORA'
export const FOLHAS = ESTRUTURA_DRE.flatMap(l => (l.tipo === 'grupo' ? l.folhas.map(f => f.id) : []))

export type ContaClinux = { cdConta: number; conta: string; grupo: string | null; despesa: boolean; linha: string | null }

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

/** Sugestão de associação pela classificação do Clinux e pelo nome da conta. null = sem classificação. */
export function sugerirFolha(c: ContaClinux): string | null {
  const n = norm(c.conta), l = norm(c.linha), g = norm(c.grupo)
  const tem = (...p: string[]) => p.some(x => n.includes(x))
  if (n.startsWith('AJUSTE DE SALDO') || g === 'FINANCIAMENTOS' || l.includes('AMORTIZ') || l.includes('IMOBILIZ') || l.includes('INVESTIMENTO')) return FORA
  if (tem('EMPRESTIMO CONSORCIO', 'EMPRESTIMO BANCARIO') && !c.despesa) return FORA
  // Tributos
  if (tem('IRPJ', 'CSLL')) return 'IR.IRCS'
  if (tem('COFINS', 'PIS ', 'PIS/', 'ISSQN', ' ISS', 'SIMPLES NACIONAL')) return 'DED.TRIB'
  if (tem('TARIFA DE CARTAO', 'ALUGUEL MAQUINA CARTAO')) return 'RF.DES'
  if (tem('DESCONTO') && !c.despesa) return 'DED.DESC'
  if (tem('CANCELAMENTO', 'DEVOLUC', 'REEMBOLSO A PACIENTE', 'ESTORNO DEBITO', 'GLOSA')) return 'DED.AJ'
  if (l.includes('DEDUC')) return 'DED.AJ'
  // Receitas
  if (!c.despesa) {
    if (l.includes('FINANCEIRA') || tem('RENDIMENTO', 'JUROS', 'APLICACAO')) return 'RF.REC'
    if (tem('PARTICULAR')) return 'RB.PART'
    if (tem('EMPRESA', 'CONTRATO')) return 'RB.EMP'
    if (tem('CONVENIO', 'PREFEITURA', 'SUS')) return 'RB.CONV'
    if (l.includes('NAO OPERACIONAL')) return 'DOP.OUT'
    if (l.includes('RECEITA')) return 'RB.OUT'
    return null
  }
  // Despesas
  if (l.includes('FINANCEIRA')) return 'RF.DES'
  if (tem('DEPRECIAC')) return 'DA.DEP'
  if (tem('CONTRASTE')) return 'CSP.CONT'
  if (tem('HONORARIOS MEDICOS', 'TELEOPERACAO', 'LAUDO')) return 'CSP.MED'
  if (tem('MATERIAIS E MEDICAMENTOS', 'MATERIAL MEDICO', 'GASES MEDICINAIS', 'MATERIAL DE ENTREGA', 'IMPRESSAO EXAMES', 'FILME')) return 'CSP.MAT'
  if (tem('MANUTENCAO DE EQUIPAMENTO', 'SEGUROS MAQUINAS')) return 'CSP.MAN'
  if (tem('ENERGIA', 'AGUA E ESGOTO', 'ALUGUE', 'LAVANDE', 'LIXO HOSPITALAR', 'CONDOMINIO')) return 'CSP.INF'
  if (tem('SOFTWARE', 'INFORMATICA', 'TELEFONE E INTERNET', 'SISTEMA')) return 'DOP.TEC'
  if (l.includes('COMERCIAL') || g.includes('COMERCIAL')) return 'DOP.COM'
  if (l.includes('PESSOAL') || g.includes('PESSOAL')) return 'DOP.PES'
  if (l.includes('ADMINISTRATIVA') || g.includes('ADMINISTRATIVA') || g.includes('DIRETORIA')) return 'DOP.ADM'
  if (l.includes('OPERACIONAL') || g.includes('OPERACIONAL')) return 'CSP.INF'
  if (l.includes('NAO OPERACIONAL')) return 'DOP.OUT'
  return null
}

