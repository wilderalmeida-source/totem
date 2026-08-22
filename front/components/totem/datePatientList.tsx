'use client'

import type { Atendimento, Paciente } from '@/services/api'
import type { TipoBusca } from '@/lib/patientUtils'
import { formatarDataNascimento } from '@/lib/formatdate'
import { auditTotem } from '@/lib/audit-client'

interface DatePatientListProps {
  tipo: TipoBusca
  filtro: string
  pacientes: Paciente[]
  atendimentosHoje: Atendimento[]
  idsComExame: Set<number>
  loading?: boolean
  error?: string | null
  onPatientClick: (paciente: Paciente) => void
}

function normalizar(value?: string | null) {
  return (value ?? '').toUpperCase().trim()
}

function onlyNumbers(value: string) {
  return (value ?? '').replace(/\D/g, '')
}

export function DatePatientList({
  tipo,
  filtro,
  pacientes,
  atendimentosHoje,
  idsComExame,
  loading,
  error,
  onPatientClick,
}: DatePatientListProps) {
  const filtroTexto = normalizar(filtro)
  const filtroNumerico = onlyNumbers(filtro)

  const listaVermelha = atendimentosHoje.filter((atendimento) => {
    const nome = normalizar(
      atendimento.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente
    )

    return !filtroTexto || nome.includes(filtroTexto)
  })

  const listaNormal = pacientes.filter((paciente) => {
    if (tipo === 'DATA') {
      if (paciente.cd_paciente && idsComExame.has(paciente.cd_paciente)) return false

      const nome = normalizar(paciente.ds_paciente ?? paciente.ds_nome)
      return !filtroTexto || nome.includes(filtroTexto)
    }

    const data = formatarDataNascimento(paciente.dt_nascimento)
    const dataNumerica = onlyNumbers(data)

    return !filtroNumerico || dataNumerica.includes(filtroNumerico)
  })

  return (
    <div className="flex mt-2">
      <ul className="px-3 h-48 w-full overflow-y-auto mb-5 rounded-lg border-2 border-gray-500">
        {loading && <li className="text-3xl mb-3">Buscando...</li>}

        {error && <li className="text-3xl mb-3 text-red-600">{error}</li>}

        {!loading &&
          !error &&
          listaVermelha.map((atendimento) => {
            const paciente = atendimento.pacientes_atendimentos_cd_pacienteTopacientes
            if (!paciente) return null

            return (
              <li
                key={`ex-${paciente.cd_paciente}`}
                className="cursor-pointer text-4xl mb-3 text-red-500 font-bold"
                onClick={() => { auditTotem('paciente_selecionado', 'paciente', { tipo, pacienteId: paciente.cd_paciente, possuiExame: true }); onPatientClick(paciente) }}
              >
                {paciente.ds_paciente}
              </li>
            )
          })}

        {!loading &&
          !error &&
          listaNormal.map((paciente, index) => {
            const label =
              tipo === 'DATA'
                ? paciente.ds_paciente ?? paciente.ds_nome ?? 'SEM NOME'
                : formatarDataNascimento(paciente.dt_nascimento)

            return (
              <li
                key={`pac-${paciente.cd_paciente ?? index}`}
                className="cursor-pointer text-4xl mb-3"
                onClick={() => { auditTotem('paciente_selecionado', 'paciente', { tipo, pacienteId: paciente.cd_paciente, possuiExame: false }); onPatientClick(paciente) }}
              >
                {label}
              </li>
            )
          })}
      </ul>
    </div>
  )
}
