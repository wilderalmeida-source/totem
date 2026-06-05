'use client'

import { useCallback, useEffect, useState } from 'react'

import { buscaAtendimentos, buscaPaciente, type Atendimento, type Paciente } from '@/services/api'
import type { TipoBusca } from '@/lib/patientUtils'

const STATUS_VALIDOS = [2, 3, 7]

interface UseDatePatientSearchParams {
  nome: string
  tipo: TipoBusca
}

export function useDatePatientSearch({ nome, tipo }: UseDatePatientSearchParams) {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [atendimentosHoje, setAtendimentosHoje] = useState<Atendimento[]>([])
  const [idsComExame, setIdsComExame] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    if (!nome) return

    setLoading(true)
    setError(null)

    try {
      if (tipo === 'DATA') {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const [responsePacientes, responseAtendimentos] = await Promise.all([
          buscaPaciente({ dt_nascimento: nome, tipo: 'DATA' }),
          buscaAtendimentos({ dt_nascimento: nome, date: { from: hoje } }),
        ])

        const atendimentosValidos = (responseAtendimentos ?? []).filter(
          (atendimento) =>
            atendimento.exames &&
            atendimento.exames.length > 0 &&
            atendimento.ds_status &&
            STATUS_VALIDOS.includes(atendimento.ds_status)
        )

        const ids = new Set<number>()
        const atendimentosUnicos = atendimentosValidos.filter((atendimento) => {
          const id = atendimento.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente
          if (!id || ids.has(id)) return false
          ids.add(id)
          return true
        })

        const listaPacientes = Array.isArray(responsePacientes) ? responsePacientes : []

        setAtendimentosHoje(atendimentosUnicos)
        setIdsComExame(ids)
        setPacientes(listaPacientes.filter((paciente) => !paciente.cd_paciente || !ids.has(paciente.cd_paciente)))
        return
      }

      const response = await buscaPaciente({ ds_paciente: nome, tipo: 'NOME' })
      setPacientes(Array.isArray(response) ? response : [])
      setAtendimentosHoje([])
      setIdsComExame(new Set())
    } catch (err) {
      console.error('[useDatePatientSearch] erro:', err)
      setError('Erro ao buscar pacientes.')
    } finally {
      setLoading(false)
    }
  }, [nome, tipo])

  useEffect(() => {
    void carregarDados()
  }, [carregarDados])

  return {
    pacientes,
    atendimentosHoje,
    idsComExame,
    loading,
    error,
    reload: carregarDados,
  }
}
