'use client'

import { useContext, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Base from '@/components/ui/base'
import { buscaModalidades, Modalidade,Paciente,Atendimento } from '@/services/api'
import { modalContext } from '@/components/modals/providers'
interface PacienteModalidadeStorage {
  dados: Paciente | null
  exames: Atendimento[] | null
  tentativas: number | null
  invalido: string | null
}
export default function ModalidadePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const servico = searchParams.get('servico') ?? ''
  const preferencial = Number(searchParams.get('preferencial') ?? 0)

  const {
    setShowModal,
    setDados,
    setExames,
    setInvalido,
    setLoading,
    setTentativas,
  } = useContext(modalContext)

  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [loading, setLoadingPage] = useState(true)
  const [pacienteStorage, setPacienteStorage] = useState<PacienteModalidadeStorage|null>(null)

  useEffect(() => {
    const storage = sessionStorage.getItem('pacienteModalidade')

    if (!storage) {
      router.replace(`/totem?servico=${servico}&preferencial=${preferencial}`)
      return
    }

    setPacienteStorage(JSON.parse(storage))
  }, [router, servico, preferencial])

  useEffect(() => {
    async function carregar() {
      try {
        const response = await buscaModalidades(10000)
        setModalidades(response ?? [])
      } finally {
        setLoadingPage(false)
      }
    }

    void carregar()
  }, [])

  function selecionarModalidade(modalidade: Modalidade) {
    if (!pacienteStorage?.dados) {
      window.alert('Dados do paciente não encontrados.')
      router.replace(`/totem?servico=${servico}&preferencial=${preferencial}`)
      return
    }

    const dadosComModalidade = {
      ...pacienteStorage.dados,
      servico,
      preferencial,
      cd_modalidade: modalidade.cd_modalidade,
      ds_modalidade: modalidade.ds_modalidade,
      modalidade: modalidade.cd_modalidade,
    }

    setLoading(false)
    setDados(dadosComModalidade)
    setExames(pacienteStorage.exames ?? [])
    setTentativas(pacienteStorage.tentativas ?? null)
    setInvalido(pacienteStorage.invalido ?? null)

    sessionStorage.removeItem('pacienteModalidade')

    setShowModal(true)
  }

  function voltar() {
    sessionStorage.removeItem('pacienteModalidade')
    router.replace(`/totem?servico=${servico}&preferencial=${preferencial}`)
  }

  return (
    <Base>
      <div className="flex h-full flex-col items-center justify-center px-6">
        <h1 className="mb-4 text-4xl font-bold">
          Escolha a modalidade
        </h1>

        <p className="mb-8 text-xl text-gray-500">
          Selecione para qual setor o paciente será encaminhado.
        </p>

        {loading && (
          <p className="text-2xl">Carregando modalidades...</p>
        )}

        {!loading && (
          <div className="grid w-full max-w-4xl grid-cols-2 gap-6">
            {modalidades.map((modalidade) => (
              <button
                key={modalidade.cd_modalidade}
                onClick={() => selecionarModalidade(modalidade)}
                className="h-32 rounded-xl bg-gray-600 text-3xl font-bold text-white hover:bg-gray-700"
              >
                {modalidade.ds_modalidade}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={voltar}
          className="mt-8 h-14 rounded-xl bg-red-600 px-10 text-xl font-bold text-white hover:bg-red-700"
        >
          Voltar
        </button>
      </div>
    </Base>
  )
}