'use client'

import React, { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Base from '@/components/ui/base'
import { modalContext } from '@/components/modals/providers'
import { TotemHeader } from '@/components/totem/totemHeader'
import { PatientSearchInput } from '@/components/totem/patientSearchInput'
import { VirtualKeyboard } from '@/components/totem/virtualKeyboard'
import { DatePatientList } from '@/components/totem/datePatientList'
import { useDatePatientSearch } from '@/hooks/useDatePatientSearch'
import { TipoBusca } from '@/lib/patientUtils'
import { buscarPacienteNomeData } from '@/services/buscaNomeData'
import type { Paciente } from '@/services/api'
import type { DadosPaciente } from '@/components/modals/patientModal'
import { buscarConfiguracaoPaineis } from '@/services/api'
import { formatarDataNascimento } from '@/lib/formatdate'

const SERVICO_LABEL: Record<string, string> = {
  C: 'Entrega de Exames',
  D: 'Agendamento',
}
interface PainelConfig {
  painel: number
  ativo: boolean
  ip: string
  atendimento: number[]
  marcacao: number[]
  resultado: number[]
  universal: {
    atendimento: boolean
    marcacao: boolean
    resultado: boolean
  }
}
export default function DataNasc() {
  const url = useSearchParams()
  const router = useRouter()

  const {
    setShowModal,
    setDados,
    setExames,
    setTentativas,
    setInvalido,
    setLoading,
  } = useContext(modalContext)

  const nome = url.get('nome') ?? ''
  const servico = url.get('servico') ?? ''
  const tipo = (url.get('tipo') ?? 'DATA') as TipoBusca
  const preferencial = Number(url.get('preferencial') ?? 0)

  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const title = useMemo(() => SERVICO_LABEL[servico] ?? 'Atendimento', [servico])

  const tituloBusca = useMemo(() => {
    if (tipo === 'DATA') return formatarDataNascimento(nome)
    return nome
  }, [nome, tipo])

  const {
    pacientes,
    atendimentosHoje,
    idsComExame,
    loading,
    error,
  } = useDatePatientSearch({ nome, tipo })

  const updateSearchText = useCallback((value: string) => {
    setText((value ?? '').toUpperCase())
  }, [])

  const abrirModal = useCallback(
    (dados: DadosPaciente) => {
      setDados(dados)
      setExames(null)
      setTentativas(null)
      setInvalido(null)
      setShowModal(true)
    },
    [setDados, setExames, setInvalido, setShowModal, setTentativas]
  )

  async function abrirPacienteComBusca(paciente: Paciente) {
    setLoading(true)
    setInvalido(null)
    setTentativas(null)

    try {
      const dsPaciente = tipo === 'DATA' ? paciente.ds_paciente ?? text : nome
      const dtNascimento = tipo === 'DATA' ? nome : paciente.dt_nascimento ?? text

      const result = await buscarPacienteNomeData({
        ds_paciente: dsPaciente,
        dt_nascimento: dtNascimento,
        servico,
        preferencial,
      })

      const configPainel = await buscarConfiguracaoPaineis()

      const paineisAtivos =
        configPainel?.paineis?.filter((painel: PainelConfig) => painel.ativo) ?? []

      const temSelecaoModalidadeAtiva =
        configPainel?.ativo === true && paineisAtivos.length >= 2

      const naoTemExames = !result.exames || result.exames.length === 0

      if (temSelecaoModalidadeAtiva && naoTemExames && result.dados) {
        sessionStorage.setItem(
          'pacienteModalidade',
          JSON.stringify({
            dados: result.dados,
            exames: result.exames,
            tentativas: result.tentativas,
            invalido: result.invalido,
          })
        )

        router.replace(
          `/modalidades?servico=${servico}&preferencial=${preferencial}`
        )

        return
      }
      setDados(result.dados)
      setExames(result.exames)
      setTentativas(result.tentativas)
      setInvalido(result.invalido)
      setShowModal(true)
    } finally {
      setLoading(false)
    }
  }

  function avancar() {
    if (!text.trim()) {
      window.alert(tipo === 'DATA' ? 'Digite o nome do paciente' : 'Digite a data de nascimento')
      return
    }

    abrirModal(
      tipo === 'DATA'
        ? {
          ds_paciente: text.trim(),
          dt_nascimento: nome,
          tipo: 'NEW',
          servico,
          preferencial,
        }
        : {
          ds_paciente: nome,
          dt_nascimento: text,
          tipo: 'NEW',
          servico,
          preferencial,
        }
    )
  }

  function voltar() {
    router.replace(`/totem?servico=${servico}&preferencial=${preferencial}`)
  }

  function abrirQRCode() {
    abrirModal({
      qr: true,
      ds_paciente: 'Escaneie o QRCode.',
      servico,
      preferencial,
    })
  }

  return (
    <div className="overflow-hidden h-screen">
      <TotemHeader
        title={title}
        onAdvance={avancar}
        onBack={voltar}
      />

      <Base>
        <div className="px-3 flex w-full h-full flex-col justify-start">
          <h2 className="mb-3 content-center text-4xl">{tituloBusca}</h2>

          <PatientSearchInput
            tipo={tipo === 'DATA' ? 'NOME' : 'DATA'}
            value={text}
            inputRef={inputRef}
            onChange={(event) => updateSearchText(event.target.value)}
            onQRCodeClick={abrirQRCode}
          />

          <DatePatientList
            tipo={tipo}
            filtro={text}
            pacientes={pacientes}
            atendimentosHoje={atendimentosHoje}
            idsComExame={idsComExame}
            loading={loading}
            error={error}
            onPatientClick={abrirPacienteComBusca}
          />

          <VirtualKeyboard
            tipo={tipo === 'DATA' ? 'NOME' : 'DATA'}
            value={text}
            onChange={updateSearchText}
          />
        </div>
      </Base>
    </div>
  )
}
