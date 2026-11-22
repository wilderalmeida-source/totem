import {
  AudioLines,
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
  KeyRound,
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
}

// As duas áreas com página própria (botões da Central e seletor do menu lateral).
export const ADMIN_AREAS = {
  totem: { href: '/configuracoes/totem', label: 'Totem', title: 'Configurações do Totem', description: 'Painéis, voz, guichês, recepções, acesso ao totem e acompanhamento do funcionamento.', icon: MonitorSmartphone },
  analiticos: { href: '/analiticos', label: 'Analíticos', title: 'Analíticos', description: 'Dashboards da clínica: tempo de espera, desempenho da recepção, erros de atendimento e mais.', icon: ChartNoAxesCombined },
} as const
export type AreaComPagina = keyof typeof ADMIN_AREAS

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: '/licenca', label: 'Licença do sistema', title: 'Licença do sistema', description: 'Envie o arquivo de licença e consulte a ativação desta instalação.', icon: BadgeCheck, permission: 'USUARIOS', area: 'sistema' },
  { href: '/configuracoes', label: 'Central', title: 'Central', description: 'Escolha entre as configurações do Totem e os Analíticos.', icon: LayoutDashboard, permission: null, area: 'central' },
  { href: ADMIN_AREAS.totem.href, label: 'Visão geral', title: ADMIN_AREAS.totem.title, description: ADMIN_AREAS.totem.description, icon: ADMIN_AREAS.totem.icon, permission: null, area: 'central' },
  { href: ADMIN_AREAS.analiticos.href, label: 'Visão geral', title: ADMIN_AREAS.analiticos.title, description: ADMIN_AREAS.analiticos.description, icon: ADMIN_AREAS.analiticos.icon, permission: null, area: 'central' },
  { href: '/dashboard', label: 'Tempo de espera', title: 'Tempo de espera', description: 'Espera dos pacientes no atendimento, agendamento e entrega de exames: picos e metas.', icon: ChartNoAxesCombined, permission: 'DASHBOARD', area: 'analiticos' },
  { href: '/desempenho', label: 'Desempenho', title: 'Desempenho da recepção', description: 'Tempo de ficha por convênio, funcionário e médico, com filtros por clique.', icon: Activity, permission: 'DASHBOARD', area: 'analiticos' },
  { href: '/erros', label: 'Erros de atendimento', title: 'Erros de atendimento', description: 'Campos corrigidos depois da ficha: por funcionário, modalidade, convênio e campo.', icon: ShieldAlert, permission: 'DASHBOARD', area: 'analiticos' },
  { href: '/laudos', label: 'Laudos', title: 'Laudos', description: 'Médicos que mais laudam, tempo de laudo, atrasos, revisões e retificações.', icon: FileText, permission: 'DASHBOARD', area: 'analiticos' },
  { href: '/configuracao-analises', label: 'Configurar analíticos', title: 'Configurar analíticos', description: 'Modalidades, médicos e convênios que entram em cada tela de análise.', icon: SlidersHorizontal, permission: 'DASHBOARD', area: 'analiticos' },
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

/** Área da página atual (as páginas de "sistema" e a Central não têm área própria). */
export function areaOfPath(pathname: string): AreaComPagina | null {
  for (const [id, area] of Object.entries(ADMIN_AREAS) as Array<[AreaComPagina, (typeof ADMIN_AREAS)[AreaComPagina]]>) if (area.href === pathname) return id
  const section = ADMIN_SECTIONS.find(item => item.href === pathname)
  return section?.area === 'totem' || section?.area === 'analiticos' ? section.area : null
}
