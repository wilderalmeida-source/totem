import { DateRange } from "react-day-picker"

/* =======================
   ATENDIMENTOS
======================= */
export type Sala = {
  cd_modalidade: number
  ds_sala?: string
}

export type ExameProc = {
  dt_assinado: string
  procedimentos_exames_cd_procedimentoToprocedimentos?: {
    ds_procedimento: string
  }
}

export type Atendimento = {
  cd_atendimento: number
  salas: Sala
  ds_observacao?: string
  status?: number
  nr_controle?: number
  dt_data?: string
  dt_hora?: string
  ds_status?: number
  ds_senha?: string
  dt_hora_senha?: string
  exames?: ExameProc[]
  medicos_atendimentos_cd_medicoTomedicos?: { ds_medico: string }
  pacientes_atendimentos_cd_pacienteTopacientes?: {
    ds_paciente: string
    cd_paciente: number
    ds_telefone?: string
    ds_celular?: string
    ds_celular_web?: string
    ds_cpf?: string
    dt_nascimento?: string
  }
}

export type AtendimentoFiltro = {
  buscaMedic?: string
  buscaSala?: string
  buscaPaciente?: string
  buscaStatus?: string
  date?: DateRange
  cd_paciente?: number
  dt_nascimento?: string
  tipo?: string
}

/* =======================
   SENHAS
======================= */
export type Senha = {
  cd_paciente?:number
  servico?:string | null
  preferencial?:number | null | undefined
  cd_modalidade?:number | null 
  cd_senha?: number
  nr_senha?: number
  nr_modalidade?: number
  ds_local?: string
  sn_preferencial?: boolean
  ds_opcao?: string | null
  ds_fila?: string
  nr_controle?: number
  method?: string
  sn_especial?: boolean
  dt_entrada?: string
  dt_saida?: string | null
  dt_sala?: string
  ds_paciente?: string
  atendimentos?: Atendimento[]
}

export type SenhasResponse = {
  senhas: Senha[]
  senhasnr: Senha[]
}

/* =======================
   PACIENTES
======================= */
export type Paciente = {
  cd_paciente?: number
  ds_paciente?: string
  ds_nome?: string
  dt_nascimento?: string
  ds_cpf?: string
  tentativas?: number | null
}

/* =======================
   MODALIDADES
======================= */
export type Modalidade = {
  cd_modalidade: number
  ds_modalidade: string
}

export type ModalidadesResponse = Modalidade[]

/* =======================
   DOCUMENTOS
======================= */
export type Documento = {
  cd_documento: number | null
  cd_atendimento: number | null
  ds_documento: string | null
  bb_documento: string | null
  dt_documento: string | null
  cd_funcionario: number | null
  ds_arquivo: string | null
  cd_tipo: number | null
  nr_documento: string | null
  cd_paciente: number | null
  dt_scanner: string | null
  sn_convertido: boolean | null
  atendimentos: string | null
  pacientes: string | null
  atendimentos_documentos_tipos?: { ds_tipo: string | null }
  arquivo: string | null
}

/* =======================
   VOZ
======================= */
export type VoiceStatsEvent = {
  type: "stats:update"
  payload: {
    dailyUsage: DailyUsage[]
  }
}

export type DailyUsage = {
  date: string
  chars: number
  requests: number
}

export type WeekVoice = {
  id: number
  year: number
  week: number
  voiceName: string
  createdAt: string
}

export type StatsResponse = {
  currentWeek: {
    year: number
    week: number
    voiceName: string
    autoVoice: string
    overrideVoice: string | null
    envForced: string | null
    hasOverride: boolean
  }
  rate: number
  dailyUsage: DailyUsage[]
  weekVoices: WeekVoice[]
}

export type VoiceItem = {
  name: string
  tier: "premium" | "cheap"
  gender: "female" | "male"
}

export type DictItem = {
  id: number
  key: string
  value: string
  createdAt: string
  updatedAt: string
}
