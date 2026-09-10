'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { buscaPacientesComExames, buscaPaciente, type PacienteComExame, type Paciente } from '@/services/api'
import type { TipoBusca } from '@/lib/patientUtils'

interface UseDatePatientSearchParams {
  nome: string
  tipo: TipoBusca
  filtroNome?: string
  filtroNascimento?: string
}

export function useDatePatientSearch({ nome, tipo, filtroNome, filtroNascimento }: UseDatePatientSearchParams) {
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [atendimentosHoje, setAtendimentosHoje] = useState<PacienteComExame[]>([])
  const [idsComExame, setIdsComExame] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sequence = useRef(0)

  const carregarDados = useCallback(async () => {
    const requestId = ++sequence.current
    if (!nome) return
    setLoading(true)
    setError(null)
    try {
      if (tipo === 'DATA') {
        const [responsePacientes, responseAtendimentos] = await Promise.all([
          buscaPaciente({ dt_nascimento: nome, tipo: 'DATA', ds_paciente: filtroNome?.trim() || undefined }),
          buscaPacientesComExames(nome, filtroNome),
        ])
        if (requestId !== sequence.current) return
        const ids = new Set<number>()
        const unicos = responseAtendimentos.filter(atendimento => {
          const id = atendimento.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente
          if (!id || ids.has(id)) return false
          ids.add(id)
          return true
        })
        setAtendimentosHoje(unicos)
        setIdsComExame(ids)
        setPacientes(responsePacientes.filter(paciente => !paciente.cd_paciente || !ids.has(paciente.cd_paciente)))
      } else {
        const response = await buscaPaciente({ ds_paciente: nome, tipo: 'NOME', dt_nascimento: filtroNascimento })
        if (requestId !== sequence.current) return
        setPacientes(response)
        setAtendimentosHoje([])
        setIdsComExame(new Set())
      }
    } catch (err) {
      if (requestId !== sequence.current) return
      setPacientes([])
      setAtendimentosHoje([])
      setIdsComExame(new Set())
      setError(err instanceof Error ? err.message : 'Erro ao buscar pacientes.')
    } finally {
      if (requestId === sequence.current) setLoading(false)
    }
  }, [nome, tipo, filtroNome, filtroNascimento])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => { void carregarDados() }, 250)
    return () => { clearTimeout(timer); sequence.current += 1 }
  }, [carregarDados])

  return { pacientes, atendimentosHoje, idsComExame, loading, error, reload: carregarDados }
}
