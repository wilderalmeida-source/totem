'use server'
import { DateRange } from "react-day-picker"

/* =======================
   TIPOS
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
  ds_observacao?: string,
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

// 🔹 filtros para busca (entrada)
export type AtendimentoFiltro = {
  buscaMedic?: string
  buscaSala?: string
  buscaPaciente?: string
  buscaStatus?: string
  date?: DateRange
  cd_paciente?: number
  dt_nascimento?: string
}

export type Senha = {
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
  dt_entrada?: string;
  dt_saida?: string | null;
  dt_sala?: string;
  ds_paciente?: string;
  atendimentos?: Atendimento[];
}

export type Paciente = {
  cd_paciente?: number
  ds_paciente?: string
  ds_nome?: string
  dt_nascimento?: string
  ds_cpf?:string
}

export type Modalidade = { cd_modalidade: number; ds_modalidade: string }
export type ModalidadesResponse = Modalidade[]
export type SenhasResponse = { senhas: Senha[],senhasnr:Senha[] }
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
//======================================
//ESTATITICAS DE VOZ//
//======================================
export type VoiceStatsEvent = {
  type: "stats:update";
  payload: {
    dailyUsage: {
      date: string;
      chars: number;
      requests: number;
    }[];
  }
};
export type DailyUsage = {
  date: string;
  chars: number;
  requests: number;
};

export type WeekVoice = {
  id: number;
  year: number;
  week: number;
  voiceName: string;
  createdAt: string;
};

export type StatsResponse = {
  currentWeek: {
    year: number;
    week: number;
    voiceName: string;
    autoVoice: string;
    overrideVoice: string | null;
    envForced: string | null;
    hasOverride: boolean;
  };
  rate: number;
  dailyUsage: DailyUsage[];
  weekVoices: WeekVoice[];
};
export type VoiceItem = {
  name: string;
  tier: "premium" | "cheap";
  gender: "female" | "male"
};
export type DictItem = {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string
};
const API_INTERNA= process.env.LINK_API_INTERNA
const TOKEN_API_INT = `Bearer ${process.env.TOKEN_API_INT}`
/* =======================
   ATENDIMENTOS
======================= */
export const BuscaAtendimentos = async ({
  buscaMedic,
  buscaSala,
  buscaPaciente,
  buscaStatus,
  date,
  cd_paciente,
  dt_nascimento,
}: AtendimentoFiltro): Promise<Atendimento[]> => {
  let newBuscaMedic: number | undefined
  let newBuscasala: number | undefined
  let newBuscastatus: number | undefined
  const toDate = date?.to ?? date?.from

  if (buscaMedic && buscaMedic !== 'TODOS') newBuscaMedic = parseInt(buscaMedic)
  if (buscaSala && buscaSala !== 'TODOS') newBuscasala = parseInt(buscaSala)
  if (buscaStatus && buscaStatus !== 'TODOS') newBuscastatus = parseInt(buscaStatus)

  const params = new URLSearchParams()
  if (newBuscaMedic) params.append("medico", String(newBuscaMedic))
  if (newBuscasala) params.append("sala", String(newBuscasala))
  if (buscaPaciente) params.append("busca", buscaPaciente)
  if (newBuscastatus) params.append("status", String(newBuscastatus))
  if (date?.from) params.append("data_inicial", date.from.toString())
  if (toDate) params.append("data_final", toDate.toString())
  if (cd_paciente) params.append("cd_paciente", String(cd_paciente))
  if (dt_nascimento) params.append("dt_nascimento", String(dt_nascimento))

  const response = await fetch(
    `${API_INTERNA}/clinux/agenda?${params.toString()}`,
    {
      next: { tags: ['agenda'] },
      cache: 'no-cache',
      method: 'GET',
      headers: { 'Content-Type': 'application/json',
        Authorization: TOKEN_API_INT
       },
    }
  )
  return response.json() as Promise<Atendimento[]>
}

export const CadastraAtendimentos = async ({
  cd_paciente,
}: { cd_paciente: number }): Promise<Atendimento[]> => {
  const response = await fetch(`${API_INTERNA}/clinux/agenda`, {
    next: { tags: ['agenda'] },
    cache: 'no-cache',
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ cd_paciente }),
  })
  return response.json() as Promise<Atendimento[]>
}

export const AtualizaAtendimentos = async (
  cd_atendimento: number[],
  ds_senha: string | undefined = undefined,
  cd_senha: number | undefined = undefined
): Promise<Atendimento[]> => {
  const response = await fetch(`${API_INTERNA}/clinux/agenda`, {
    next: { tags: ['agenda'] },
    cache: 'no-cache',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ cd_atendimento, cd_senha, ds_senha }),
  })
  return response.json() as Promise<Atendimento[]>
}
/* =======================
   DOCUMENTOS
======================= */
export const DocumentData = async (cd_atendimento: number): Promise<Documento[]> => {
  const response = await fetch(`${API_INTERNA}/clinux/documentos`, {
    next: { tags: ['agenda'] },
    cache: 'no-cache',
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ cd_atendimento }),
  })
  return response.json() as Promise<Documento[]>
}

/* =======================
   Medicos e Salas
======================= */
export const medFetch = async (): Promise<unknown[]> => {
  const medicos = await fetch(`${API_INTERNA}/clinux/medicos`,{
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  return medicos.json() as Promise<unknown[]>
}

export const salasFetch = async (): Promise<unknown[]> => {
  const salas = await fetch(`${API_INTERNA}/clinux/salas`,{
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  return salas.json() as Promise<unknown[]>
}
/* =======================
   PACIENTES
======================= */
export const buscaPaciente = async ({
  ds_paciente,
  cd_paciente,
  dt_nascimento,
  ds_cpf,
  tipo
}: {
  ds_paciente?: string
  cd_paciente?: number
  dt_nascimento?: string
  ds_cpf?: string
  tipo?: string
}): Promise<Paciente[]> => {
  const params = new URLSearchParams()
  if (ds_paciente) params.append("ds_paciente", ds_paciente)
  if (cd_paciente) params.append("cd_paciente", cd_paciente.toString())
  if (dt_nascimento) params.append("dt_nascimento", dt_nascimento)
  if (ds_cpf) params.append("ds_cpf", ds_cpf)
  if (tipo) params.append("tipo", tipo)
  if (!ds_paciente && !cd_paciente && !dt_nascimento && !ds_cpf && !tipo) return []

  const response = await fetch(
    `${API_INTERNA}/clinux/pacientes?${params.toString()}`,
    { next: { tags: ['pacientes'] }, 
    cache: 'no-cache', 
    method: 'GET', 
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT } }
  )
  return response.json() as Promise<Paciente[]>
}
export const CadastraPaciente = async ({
  ds_paciente,
  dt_nascimento,
}: Partial<Paciente>): Promise<Paciente> => {
  const response = await fetch(`${API_INTERNA}/clinux/pacientes`, {
    next: { tags: ['agenda'] },
    cache: 'no-cache',
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ ds_paciente, dt_nascimento }),
  })
  return response.json() as Promise<Paciente>
}

/* =======================
   SENHAS
======================= */
export const CadastraSenha = async (data: Senha): Promise<Senha> => {
  const response = await fetch(`${API_INTERNA}/clinux/senhas`, {
    next: { tags: ['agenda'] },
    cache: 'no-cache',
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify(data),
  })
  return response.json() as Promise<Senha>
}
export const BuscaSenha = async (): Promise<SenhasResponse> => {
  const response = await fetch(`${API_INTERNA}/clinux/senhas`, {
    next: { tags: ['pacientes'] },
    cache: 'no-cache',
    method: 'GET',
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
    },
  })
  return response.json() as Promise<SenhasResponse>
}

/* =======================
   MODALIDADES
======================= */
export const BuscaModalidades = async (cd_modalidade: number): Promise<ModalidadesResponse> => {
  const response = await fetch(
    `${API_INTERNA}/clinux/modalidades?cd_modalidade=${cd_modalidade}`,
    { next: { tags: ['pacientes'] }, 
    cache: 'no-cache', 
    method: 'GET', 
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
})
  return response.json() as Promise<ModalidadesResponse>
}
/* =======================
   VOZ GOOGLE
======================= */
export const VoiceGoogle = async (texto: string) => {
  const response = await fetch(`${API_INTERNA}/clinux/voice`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ text: texto }),
  });
  if (!response.ok) {
    console.warn("Falha ao chamar /clinux/voice:", await response.text());
  }
  return response.json();
}
/* =======================
   VOZ STATUS
======================= */
export const VoiceStatus = async () => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/stats`,{headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },});
  return res.json();
}
export const VoiceList = async () => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/voices`,{headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     }});
  return await res.json();
}
/* =======================
   CONFIGURA VOZ
======================= */
export const ApplyVoiceOverride = async (year: number, week: number, selectedVoice: string) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/override`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({
      year: year,
      week: week,
      voiceName: selectedVoice,
    }),
  });
  return await res.json()
}
export const ClearVoiceOverride = async (year: number, week: number) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/override/${year}/${week}`, {
    method: "DELETE",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  return await res.json()
}
export const SetRate = async (rate: number) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/rate`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ rate }),
  })
  if (!res.ok) {
    console.warn("Falha ao chamar /clinux/voice:", await res.text());
  }
  return res.json();
}
export const SetVolume = async (volume: number) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/volume`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ volume }),
  })
  if (!res.ok) {
    console.warn("Falha ao chamar /clinux/voice:", await res.text());
  }
  return res.json();
}
/* =======================
   DICIONARIO
======================= */
export const DictionaryList = async (search?: string) => {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(`${API_INTERNA}/clinux/voice/dictionary${q}`,{
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  if (res.status == 200) {
    return await res.json()
  }
}
export const DictionaryUpsert = async (key: string, value: string) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/dictionary`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ key, value }),
  })
  if (res.status == 200) {
    return await res.json()
  }
}
export const DictionaryUpdate = async (key: string, value: string) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/dictionary/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ value }),
  })
  if (res.status == 200) {
    return await res.json()
  }
}
export const DictionaryDelete = async (key: string) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/dictionary/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  if (res.status == 200) {
    return await res.json()
  }
}
/* =======================
   TESTA VOZ
======================= */
export const PlaySoundTest = async (voiceName: string, rate: number, volume: number) => {
  const res = await fetch(`${API_INTERNA}/clinux/voice/play`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({ voiceName, rate, volume }),
  })
  if (res.status == 200) {
    return await res.json()
  }
}
/* =======================
   INICIA CHAMADA DE ATENÇÂO
======================= */
export const AtentionSound = async (TorP:string) => {
  const res = await fetch(`${API_INTERNA}/clinux/atencao?TorP=${TorP}`,{
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
  })
  if (res.status == 200) {
    return await res.json()
  }
}
/* =======================
   Gravar som de Atenção
======================= */
export const AtentionCreateSound = async (value: string) => {
  const res = await fetch(`${API_INTERNA}/clinux/atencao`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     },
    body: JSON.stringify({text:value}),
  })
  if (res.status == 200) {
    return await res.json()
  }
}
export const AtentionGetText = async () => {
  const res = await fetch(`${API_INTERNA}/clinux/atencao/text`, {
    method: "GET",
    headers: { 'Content-Type': 'application/json',
      Authorization: TOKEN_API_INT
     }
  })
  if (res.status == 200) {
    return await res.json()
  }
}