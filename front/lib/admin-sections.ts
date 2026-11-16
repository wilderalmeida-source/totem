import {
  AudioLines,
  BadgeCheck,
  BellRing,
  BookOpenText,
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
  type LucideIcon,
} from 'lucide-react'

// Lista única das telas de administração: o menu lateral e os cartões da Central usam a mesma
// fonte, com um ícone diferente para cada seção. A cor dos ícones vem do tema (classe system-icon).
export type AdminSection = {
  href: string
  label: string
  title: string
  description: string
  icon: LucideIcon
  permission: string | null
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: '/licenca', label: 'Licença do sistema', title: 'Licença do sistema', description: 'Envie o arquivo de licença e consulte a ativação desta instalação.', icon: BadgeCheck, permission: 'USUARIOS' },
  { href: '/configuracoes', label: 'Central', title: 'Central de configurações', description: 'Gerencie os serviços e acompanhe o funcionamento do Totem em um só lugar.', icon: LayoutDashboard, permission: null },
  { href: '/temas', label: 'Temas', title: 'Temas', description: 'Escolha o visual do sistema e a aparência clara ou escura.', icon: Palette, permission: 'PAINEIS' },
  { href: '/informativos', label: 'Informativos', title: 'Informativos', description: 'Cadastre, ordene e programe os avisos de texto dos painéis dos Temas 1 e 2.', icon: Megaphone, permission: 'PAINEIS' },
  { href: '/acesso-totem', label: 'Acesso ao totem', title: 'Acesso ao totem', description: 'Cadastre colaboradores, cartões e PINs para liberar os terminais.', icon: IdCard, permission: 'USUARIOS' },
  { href: '/configuracao-atrasos', label: 'Atrasos', title: 'Atrasos', description: 'Defina a tolerância e o horário usado para destacar exames atrasados.', icon: Clock3, permission: 'PAINEIS' },
  { href: '/atencao', label: 'Aviso de atenção', title: 'Aviso de atenção', description: 'Configure e reproduza o aviso sonoro da recepção.', icon: BellRing, permission: 'ATENCAO' },
  { href: '/configuracao', label: 'Voz e áudio', title: 'Voz e áudio', description: 'Escolha vozes, velocidade, volume e regras automáticas.', icon: AudioLines, permission: 'VOZ' },
  { href: '/dic', label: 'Dicionário', title: 'Dicionário', description: 'Ajuste a pronúncia de nomes e termos usados nas chamadas.', icon: BookOpenText, permission: 'DICIONARIO' },
  { href: '/guiche', label: 'Guichês', title: 'Guichês', description: 'Cadastre e organize os pontos de atendimento.', icon: ConciergeBell, permission: 'GUICHES' },
  { href: '/recepcao', label: 'Recepções', title: 'Recepções', description: 'Associe modalidades às recepções e localizações.', icon: MapPin, permission: 'RECEPCOES' },
  { href: '/setup-painel', label: 'Painéis', title: 'Painéis', description: 'Distribua serviços e modalidades entre os painéis.', icon: MonitorPlay, permission: 'PAINEIS' },
  { href: '/status', label: 'Status', title: 'Status e consumo', description: 'Acompanhe a voz ativa, uso diário e histórico.', icon: Gauge, permission: 'STATUS' },
  { href: '/logs', label: 'Logs', title: 'Logs do sistema', description: 'Consulte a jornada do totem e ações administrativas.', icon: History, permission: 'LOGS' },
  { href: '/usuarios', label: 'Usuários', title: 'Usuários', description: 'Cadastre e gerencie o acesso administrativo.', icon: UserCog, permission: 'USUARIOS' },
  { href: '/alterar-senha', label: 'Minha senha', title: 'Minha senha', description: 'Troque com segurança a senha da sua conta.', icon: KeyRound, permission: null },
]

export function allowedSections(permissions: string[]) {
  return ADMIN_SECTIONS.filter(section => !section.permission || permissions.includes('*') || permissions.includes(section.permission))
}
