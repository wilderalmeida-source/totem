import {
  AudioLines,
  Briefcase,
  Wallet,
  FileSpreadsheet,
  FileWarning,
  FileStack,
  KeyRound,
  FileSearch,
  ScanSearch,
  Waves,
  Receipt,
  Layers,
  Banknote,
  TableProperties,
  BadgeCheck,
  BellRing,
  BookOpenText,
  ChartNoAxesCombined,
  Activity,
  ShieldAlert,
  FileText,
  SlidersHorizontal,
  Clock3,
  ConciergeBell,
  Gauge,
  History,
  IdCard,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MonitorPlay,
  Palette,
  UserCog,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react'

// Lista única das telas de administração: o menu lateral, a Central e as páginas de cada área usam a mesma
// fonte, com um ícone diferente para cada seção. A cor dos ícones vem do tema (classe system-icon).
// Áreas: "totem" (configurações do totem, painéis e voz), "analiticos" (dashboards — nem todos ligados ao totem)
// e "sistema" (conta, usuários e licença, comuns às duas). "central" são as páginas de entrada.
export type AdminArea = 'central' | 'totem' | 'analiticos' | 'sistema'

export type AdminSection = {
  href: string
  label: string
  title: string
  description: string
  icon: LucideIcon
  permission: string | null
  area: AdminArea
  // Só nos Analíticos: categoria do dashboard (Recepção, Direção, Financeiro) ou "config" (configuração comum).
  categoria?: CategoriaAnalitico | 'config'
}

// Categorias dos Analíticos: cada uma tem uma página com os seus dashboards (um botão para cada).
export type CategoriaAnalitico = 'recepcao' | 'direcao' | 'financeiro' | 'faturamento'
export const CATEGORIAS_ANALITICOS: Record<CategoriaAnalitico, { href: string; label: string; title: string; description: string; icon: LucideIcon }> = {
  recepcao: { href: '/analiticos/recepcao', label: 'Recepção', title: 'Recepção e atendimento', description: 'Tempo de espera, desempenho da recepção e erros de atendimento.', icon: ConciergeBell },
  direcao: { href: '/analiticos/direcao', label: 'Direção', title: 'Direção', description: 'Painel executivo da diretoria e produção médica (laudos).', icon: Briefcase },
  faturamento: { href: '/analiticos/faturamento', label: 'Faturamento', title: 'Faturamento', description: 'Produção, faturamento por convênio, produção pendente, lotes, glosas e auditoria.', icon: FileSpreadsheet },
  financeiro: { href: '/analiticos/financeiro', label: 'Financeiro', title: 'Financeiro', description: 'Visão geral, fluxo de caixa, contas a receber, contas a pagar e DRE.', icon: Wallet },
}
export const ORDEM_CATEGORIAS: CategoriaAnalitico[] = ['recepcao', 'direcao', 'faturamento', 'financeiro']

// As duas áreas com página própria (botões da Central e seletor do menu lateral).
export const ADMIN_AREAS = {
  totem: { href: '/configuracoes/totem', label: 'Totem', title: 'Configurações do Totem', description: 'Painéis, voz, guichês, recepções, acesso ao totem e acompanhamento do funcionamento.', icon: MonitorSmartphone },
  analiticos: { href: '/analiticos', label: 'Analíticos', title: 'Analíticos', description: 'Dashboards da clínica por categoria: recepção, direção e financeiro.', icon: ChartNoAxesCombined },
} as const
export type AreaComPagina = keyof typeof ADMIN_AREAS

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: '/licenca', label: 'Licença do sistema', title: 'Licença do sistema', description: 'Envie o arquivo de licença e consulte a ativação desta instalação.', icon: BadgeCheck, permission: 'USUARIOS', area: 'sistema' },
  { href: '/configuracoes', label: 'Central', title: 'Central', description: 'Escolha entre as configurações do Totem e os Analíticos.', icon: LayoutDashboard, permission: null, area: 'central' },
  { href: ADMIN_AREAS.totem.href, label: 'Visão geral', title: ADMIN_AREAS.totem.title, description: ADMIN_AREAS.totem.description, icon: ADMIN_AREAS.totem.icon, permission: null, area: 'central' },
  { href: ADMIN_AREAS.analiticos.href, label: 'Visão geral', title: ADMIN_AREAS.analiticos.title, description: ADMIN_AREAS.analiticos.description, icon: ADMIN_AREAS.analiticos.icon, permission: null, area: 'central' },
  { href: '/analiticos/recepcao', label: 'Recepção', title: 'Recepção e atendimento', description: 'Dashboards da recepção.', icon: ConciergeBell, permission: null, area: 'central' },
  { href: '/analiticos/direcao', label: 'Direção', title: 'Direção', description: 'Dashboards da direção.', icon: Briefcase, permission: null, area: 'central' },
  { href: '/analiticos/faturamento', label: 'Faturamento', title: 'Faturamento', description: 'Dashboards de faturamento.', icon: FileSpreadsheet, permission: null, area: 'central' },
  { href: '/analiticos/financeiro', label: 'Financeiro', title: 'Financeiro', description: 'Dashboards financeiros.', icon: Wallet, permission: null, area: 'central' },
  { href: '/dashboard', label: 'Tempo de espera', title: 'Tempo de espera', description: 'Espera dos pacientes no atendimento, agendamento e entrega de exames: picos e metas.', icon: ChartNoAxesCombined, permission: 'DASHBOARD', area: 'analiticos', categoria: 'recepcao' },
  { href: '/desempenho', label: 'Desempenho', title: 'Desempenho da recepção', description: 'Tempo de ficha por convênio, funcionário e médico, com filtros por clique.', icon: Activity, permission: 'DASHBOARD', area: 'analiticos', categoria: 'recepcao' },
  { href: '/erros', label: 'Erros de atendimento', title: 'Erros de atendimento', description: 'Campos corrigidos depois da ficha: por funcionário, modalidade, convênio e campo.', icon: ShieldAlert, permission: 'DASHBOARD', area: 'analiticos', categoria: 'recepcao' },
  { href: '/faturamento', label: 'Visão geral do faturamento', title: 'Visão geral do faturamento', description: 'Produção, faturável, faturado, pendente, faturas enviadas, glosas, convênios, modalidades e evolução.', icon: FileSpreadsheet, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/producao', label: 'Produção de exames', title: 'Produção de exames', description: 'Exames e valor por dia, semana, mês e ano, por modalidade, convênio e procedimento, dia da semana e turno.', icon: Activity, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/pendencias', label: 'Produção pendente', title: 'Produção pendente de faturamento', description: 'Exames realizados e não faturados: valor, antiguidade, motivo da pendência, convênio e lista para exportar.', icon: FileWarning, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/convenios', label: 'Faturamento por convênio', title: 'Faturamento por convênio', description: 'Faturado, ticket, glosa, recebimento e demora de cada operadora, concentração e quedas anormais.', icon: Receipt, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/modalidades', label: 'Modalidades e procedimentos', title: 'Modalidades e procedimentos', description: 'Produzido e faturado por modalidade e procedimento, contraste, glosa, crescimento e comparativos com convênios.', icon: Layers, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/lotes', label: 'Lotes (faturas)', title: 'Lotes de faturamento', description: 'Faturas enviadas aos convênios: situação, valores, recebimento, competência e guias de cada lote.', icon: FileStack, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/glosas', label: 'Glosas e recursos', title: 'Glosas e recursos', description: 'Glosas por convênio, procedimento, motivo e categoria TISS, recorrências, recursos e valores revertidos.', icon: ShieldAlert, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/guias', label: 'Guias e autorizações', title: 'Guias e autorizações', description: 'Guias autorizadas, pendentes, negadas, vencidas e canceladas, tempo de autorização e vencimentos próximos.', icon: KeyRound, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/demonstrativos', label: 'Demonstrativos de retorno', title: 'Demonstrativos de retorno', description: 'Apresentado × processado × liberado × glosado nos retornos TISS importados, divergências e guias sem retorno.', icon: FileSearch, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/produtividade', label: 'Produtividade do faturamento', title: 'Produtividade do faturamento', description: 'Faturas e guias por dia, prazo exame → fatura, rejeições, retrabalho e faturamento por colaborador.', icon: Gauge, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/faturamento/auditoria', label: 'Auditoria do faturamento', title: 'Auditoria automática do faturamento', description: 'Possíveis inconsistências: sem faturamento, duplicidades, datas, valores, convênio, lotes e demonstrativos.', icon: ScanSearch, permission: 'FATURAMENTO', area: 'analiticos', categoria: 'faturamento' },
  { href: '/financeiro', label: 'Visão geral financeira', title: 'Visão geral financeira', description: 'Saldos inicial e final, saldo por conta e banco, fluxo de caixa, resultado do período, projeção e capital de giro.', icon: Wallet, permission: 'FINANCEIRO', area: 'analiticos', categoria: 'financeiro' },
  { href: '/financeiro/fluxo', label: 'Fluxo de caixa', title: 'Fluxo de caixa', description: 'Diário a anual, operacional × investimentos × financiamentos, projeção de 7 dias a 12 meses, cenários, simulações e alerta de caixa.', icon: Waves, permission: 'FINANCEIRO', area: 'analiticos', categoria: 'financeiro' },
  { href: '/financeiro/receber', label: 'Contas a receber', title: 'Contas a receber', description: 'Recebíveis por convênio e particular, envelhecimento, inadimplência, DSO e prazo de recebimento.', icon: Banknote, permission: 'FINANCEIRO', area: 'analiticos', categoria: 'financeiro' },
  { href: '/financeiro/pagar', label: 'Contas a pagar', title: 'Contas a pagar', description: 'Obrigações dos próximos dias, fornecedores, categorias, centros de custo, juros, descontos e prazos.', icon: Receipt, permission: 'FINANCEIRO', area: 'analiticos', categoria: 'financeiro' },
  { href: '/dre', label: 'DRE', title: 'DRE — Demonstração do Resultado', description: 'DRE por competência no padrão CPC: mensal, trimestral, anual, acumulada, análise vertical e horizontal, até o lançamento.', icon: TableProperties, permission: 'DRE', area: 'analiticos', categoria: 'financeiro' },
  { href: '/diretoria', label: 'Diretoria', title: 'Dashboard da Diretoria', description: 'Receita, EBITDA, lucro, caixa, contas a receber e a pagar, faturamento, glosas e rankings executivos.', icon: Briefcase, permission: 'DIRETORIA', area: 'analiticos', categoria: 'direcao' },
  { href: '/laudos', label: 'Laudos', title: 'Laudos', description: 'Médicos que mais laudam, tempo de laudo, atrasos, revisões e retificações.', icon: FileText, permission: 'DASHBOARD', area: 'analiticos', categoria: 'direcao' },
  { href: '/configuracao-analises', label: 'Configurar analíticos', title: 'Configurar analíticos', description: 'Modalidades, médicos e convênios que entram em cada tela de análise.', icon: SlidersHorizontal, permission: 'DASHBOARD', area: 'analiticos', categoria: 'config' },
  { href: '/temas', label: 'Temas', title: 'Temas', description: 'Escolha o visual do sistema e a aparência clara ou escura.', icon: Palette, permission: 'PAINEIS', area: 'totem' },
  { href: '/informativos', label: 'Informativos', title: 'Informativos', description: 'Cadastre, ordene e programe os avisos de texto dos painéis dos Temas 1 e 2.', icon: Megaphone, permission: 'PAINEIS', area: 'totem' },
  { href: '/acesso-totem', label: 'Acesso ao totem', title: 'Acesso ao totem', description: 'Cadastre colaboradores, cartões e PINs para liberar os terminais.', icon: IdCard, permission: 'USUARIOS', area: 'totem' },
  { href: '/configuracao-atrasos', label: 'Atrasos', title: 'Atrasos', description: 'Defina a tolerância e o horário usado para destacar exames atrasados.', icon: Clock3, permission: 'PAINEIS', area: 'totem' },
  { href: '/atencao', label: 'Aviso de atenção', title: 'Aviso de atenção', description: 'Configure e reproduza o aviso sonoro da recepção.', icon: BellRing, permission: 'ATENCAO', area: 'totem' },
  { href: '/configuracao', label: 'Voz e áudio', title: 'Voz e áudio', description: 'Escolha vozes, velocidade, volume e regras automáticas.', icon: AudioLines, permission: 'VOZ', area: 'totem' },
  { href: '/dic', label: 'Dicionário', title: 'Dicionário', description: 'Ajuste a pronúncia de nomes e termos usados nas chamadas.', icon: BookOpenText, permission: 'DICIONARIO', area: 'totem' },
  { href: '/guiche', label: 'Guichês', title: 'Guichês', description: 'Cadastre e organize os pontos de atendimento.', icon: ConciergeBell, permission: 'GUICHES', area: 'totem' },
  { href: '/recepcao', label: 'Recepções', title: 'Recepções', description: 'Associe modalidades às recepções e localizações.', icon: MapPin, permission: 'RECEPCOES', area: 'totem' },
  { href: '/setup-painel', label: 'Painéis', title: 'Painéis', description: 'Distribua serviços e modalidades entre os painéis.', icon: MonitorPlay, permission: 'PAINEIS', area: 'totem' },
  { href: '/status', label: 'Status', title: 'Status e consumo', description: 'Acompanhe a voz ativa, uso diário e histórico.', icon: Gauge, permission: 'STATUS', area: 'totem' },
  { href: '/logs', label: 'Logs', title: 'Logs do sistema', description: 'Consulte a jornada do totem e ações administrativas.', icon: History, permission: 'LOGS', area: 'totem' },
  { href: '/usuarios', label: 'Usuários', title: 'Usuários', description: 'Cadastre e gerencie o acesso administrativo.', icon: UserCog, permission: 'USUARIOS', area: 'sistema' },
  { href: '/alterar-senha', label: 'Minha senha', title: 'Minha senha', description: 'Troque com segurança a senha da sua conta.', icon: KeyRound, permission: null, area: 'sistema' },
]

export function allowedSections(permissions: string[]) {
  return ADMIN_SECTIONS.filter(section => !section.permission || permissions.includes('*') || permissions.includes(section.permission))
}

export const sectionsOfArea = (permissions: string[], area: AdminArea) => allowedSections(permissions).filter(section => section.area === area)

export const sectionsOfCategoria = (permissions: string[], categoria: CategoriaAnalitico | 'config') =>
  sectionsOfArea(permissions, 'analiticos').filter(section => section.categoria === categoria)

/** Categoria dos Analíticos da página atual (a página da categoria ou um dos seus dashboards). */
export function categoriaOfPath(pathname: string): CategoriaAnalitico | null {
  for (const id of ORDEM_CATEGORIAS) if (CATEGORIAS_ANALITICOS[id].href === pathname) return id
  const c = ADMIN_SECTIONS.find(item => item.href === pathname)?.categoria
  return c && c !== 'config' ? c : null
}

/** Área da página atual (as páginas de "sistema" e a Central não têm área própria). */
export function areaOfPath(pathname: string): AreaComPagina | null {
  if (pathname.startsWith('/analiticos/')) return 'analiticos'
  for (const [id, area] of Object.entries(ADMIN_AREAS) as Array<[AreaComPagina, (typeof ADMIN_AREAS)[AreaComPagina]]>) if (area.href === pathname) return id
  const section = ADMIN_SECTIONS.find(item => item.href === pathname)
  return section?.area === 'totem' || section?.area === 'analiticos' ? section.area : null
}
