'use client'

import { useEffect, useMemo, useState } from 'react'
import Base from '@/components/ui/base'
import { buscaModalidades, buscarConfiguracaoPaineis, Modalidade, salvarConfiguracaoPaineis } from '@/services/api'

type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

interface ConfigPainel {
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

const PAINEIS = [1, 2, 3, 4, 5]

const SERVICOS: { key: ServicoPainel; label: string }[] = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'marcacao', label: 'Marcação' },
  { key: 'resultado', label: 'Resultado' },
]

function criarConfigInicial(): ConfigPainel[] {
  return PAINEIS.map((painel) => ({
    painel,
    ativo: false,
    ip: '',
    atendimento: [],
    marcacao: [],
    resultado: [],
    universal: {
      atendimento: false,
      marcacao: false,
      resultado: false,
    },
  }))
}

function mascararIp(value: string) {
  return value
    .replace(/[^\d.]/g, '')
    .split('.')
    .slice(0, 4)
    .map((parte) => parte.slice(0, 3))
    .join('.')
}

function ipValido(ip: string) {
  const partes = ip.split('.')

  if (partes.length !== 4) return false

  return partes.every((parte) => {
    if (parte === '') return false
    const numero = Number(parte)
    return numero >= 0 && numero <= 255
  })
}

export default function ConfiguracaoPaineisPage() {
  const [ativo, setAtivo] = useState(false)
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [config, setConfig] = useState<ConfigPainel[]>(criarConfigInicial())

  useEffect(() => {
  async function carregar() {
    try {
      const responseModalidades = await buscaModalidades(10000)
      setModalidades(responseModalidades ?? [])

      const responseConfig = await buscarConfiguracaoPaineis()

      if (responseConfig) {
        setAtivo(responseConfig.ativo ?? false)

        if (Array.isArray(responseConfig.paineis) && responseConfig.paineis.length > 0) {
          setConfig(responseConfig.paineis)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração dos painéis:', error)
    }
  }

  void carregar()
}, [])

  function alterarPainelAtivo(painelNumero: number, valor: boolean) {
    setConfig((old) =>
      old.map((painel) =>
        painel.painel === painelNumero
          ? {
              ...painel,
              ativo: valor,
              ip: valor ? painel.ip : '',
              atendimento: valor ? painel.atendimento : [],
              marcacao: valor ? painel.marcacao : [],
              resultado: valor ? painel.resultado : [],
              universal: valor
                ? painel.universal
                : {
                    atendimento: false,
                    marcacao: false,
                    resultado: false,
                  },
            }
          : painel
      )
    )
  }

  function atualizarIp(painelNumero: number, ip: string) {
    setConfig((old) =>
      old.map((painel) =>
        painel.painel === painelNumero
          ? { ...painel, ip: mascararIp(ip) }
          : painel
      )
    )
  }

  function existeUniversalEmOutroPainel(
    painelNumero: number,
    servico: ServicoPainel
  ) {
    return config.some(
      (painel) =>
        painel.ativo &&
        painel.painel !== painelNumero &&
        painel.universal[servico]
    )
  }

  function modalidadeJaUsadaNoServico(
    painelNumero: number,
    modalidadeId: number,
    servico: ServicoPainel
  ) {
    return config.some(
      (painel) =>
        painel.ativo &&
        painel.painel !== painelNumero &&
        painel[servico].includes(modalidadeId)
    )
  }

  function alterarUniversal(
    painelNumero: number,
    servico: ServicoPainel,
    valor: boolean
  ) {
    const painelAtual = config.find((painel) => painel.painel === painelNumero)

    if (!painelAtual?.ativo) {
      alert('Ative o painel antes de configurar os serviços.')
      return
    }

    if (valor) {
      if (existeUniversalEmOutroPainel(painelNumero, servico)) {
        alert('Esse serviço já está marcado como universal em outro painel.')
        return
      }

      const outroPainelComModalidade = config.some(
        (painel) =>
          painel.ativo &&
          painel.painel !== painelNumero &&
          painel[servico].length > 0
      )

      if (outroPainelComModalidade) {
        alert(
          'Não é possível marcar como universal, pois outro painel já possui modalidades nesse serviço.'
        )
        return
      }
    }

    setConfig((old) =>
      old.map((painel) =>
        painel.painel === painelNumero
          ? {
              ...painel,
              [servico]: valor ? [] : painel[servico],
              universal: {
                ...painel.universal,
                [servico]: valor,
              },
            }
          : painel
      )
    )
  }

  function adicionarModalidade(
    painelNumero: number,
    servico: ServicoPainel,
    modalidadeId: number
  ) {
    const painelAtual = config.find((painel) => painel.painel === painelNumero)

    if (!painelAtual?.ativo) {
      alert('Ative o painel antes de adicionar modalidades.')
      return
    }

    if (painelAtual.universal[servico]) {
      alert('Este serviço está como universal neste painel.')
      return
    }

    if (existeUniversalEmOutroPainel(painelNumero, servico)) {
      alert(
        'Não é possível adicionar modalidade. Esse serviço já está como universal em outro painel.'
      )
      return
    }

    if (modalidadeJaUsadaNoServico(painelNumero, modalidadeId, servico)) {
      alert('Essa modalidade já foi vinculada a esse serviço em outro painel.')
      return
    }

    setConfig((old) =>
      old.map((painel) =>
        painel.painel === painelNumero
          ? {
              ...painel,
              [servico]: [...painel[servico], modalidadeId],
            }
          : painel
      )
    )
  }

  function removerModalidade(
    painelNumero: number,
    servico: ServicoPainel,
    modalidadeId: number
  ) {
    setConfig((old) =>
      old.map((painel) =>
        painel.painel === painelNumero
          ? {
              ...painel,
              [servico]: painel[servico].filter((id) => id !== modalidadeId),
            }
          : painel
      )
    )
  }

  function validarConfiguracao() {
    if (!ativo) return true

    const paineisAtivos = config.filter((painel) => painel.ativo)

    if (paineisAtivos.length < 1) {
      alert('Ative pelo menos 1 painel para usar a seleção de modalidade.')
      return false
    }

    for (const painel of paineisAtivos) {
      if (!ipValido(painel.ip)) {
        alert(`Informe um IP válido para o Painel ${painel.painel}.`)
        return false
      }
    }

    for (const servico of SERVICOS) {
      const temUniversal = paineisAtivos.some(
        (painel) => painel.universal[servico.key]
      )

      if (temUniversal) continue

      const usadas = paineisAtivos.flatMap((painel) => painel[servico.key])

      const modalidadesFora = modalidades.filter(
        (modalidade) => !usadas.includes(modalidade.cd_modalidade)
      )

      if (modalidadesFora.length > 0) {
        alert(
          `Existem modalidades sem painel no serviço ${
            servico.label
          }: ${modalidadesFora.map((m) => m.ds_modalidade).join(', ')}`
        )
        return false
      }
    }

    return true
  }
async function salvarConfiguracao() {
  if (!validarConfiguracao()) return

  const payload = {
    ativo,
    paineis: config,
  }

  try {
    await salvarConfiguracaoPaineis(payload)
    alert('Configuração salva com sucesso.')
  } catch (error) {
    console.error(error)
    alert(error instanceof Error ? error.message : 'Erro ao salvar configuração dos painéis.')
  }
}

  return (
    <Base>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Configuração dos painéis
          </h1>
        </div>

        <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
          <label className="flex items-center gap-4 text-lg font-semibold text-gray-800">
            <button
              type="button"
              onClick={() => setAtivo((old) => !old)}
              className={`relative h-8 w-16 rounded-full transition ${
                ativo ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                  ativo ? 'left-9' : 'left-1'
                }`}
              />
            </button>

            Ativar seleção de modalidade no totem
          </label>

          {ativo && (
            <p className="mt-3 text-sm font-medium text-gray-500">
              Para salvar, é necessário ativar pelo menos 1 painel.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {config.map((painel) => (
            <div
              key={painel.painel}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                !painel.ativo ? 'opacity-75' : ''
              }`}
            >
              <div className="flex flex-col gap-4 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${
                      painel.ativo ? 'bg-blue-600' : 'bg-gray-400'
                    }`}
                  >
                    {painel.painel}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Painel {painel.painel}
                    </h2>

                    <button
                      type="button"
                      onClick={() =>
                        alterarPainelAtivo(painel.painel, !painel.ativo)
                      }
                      className={`mt-2 rounded-full px-4 py-1 text-sm font-bold text-white ${
                        painel.ativo ? 'bg-green-600' : 'bg-gray-400'
                      }`}
                    >
                      {painel.ativo ? 'Painel ativo' : 'Painel inativo'}
                    </button>
                  </div>
                </div>

                <input
                  disabled={!painel.ativo}
                  value={painel.ip}
                  onChange={(e) => atualizarIp(painel.painel, e.target.value)}
                  placeholder="IP do painel. Ex: 192.168.0.10"
                  className="h-12 w-full rounded-xl border px-4 text-lg font-semibold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 md:w-80"
                />
              </div>

              <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                {SERVICOS.map((servico) => (
                  <BlocoServico
                    key={servico.key}
                    titulo={servico.label}
                    painelAtivo={painel.ativo}
                    modalidades={modalidades}
                    selecionadas={painel[servico.key]}
                    universal={painel.universal[servico.key]}
                    universalBloqueado={existeUniversalEmOutroPainel(
                      painel.painel,
                      servico.key
                    )}
                    onUniversalChange={(valor) =>
                      alterarUniversal(painel.painel, servico.key, valor)
                    }
                    onAdd={(id) =>
                      adicionarModalidade(painel.painel, servico.key, id)
                    }
                    onRemove={(id) =>
                      removerModalidade(painel.painel, servico.key, id)
                    }
                    isDisabled={(id) =>
                      modalidadeJaUsadaNoServico(
                        painel.painel,
                        id,
                        servico.key
                      ) ||
                      existeUniversalEmOutroPainel(painel.painel, servico.key)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={salvarConfiguracao}
          className="mt-8 h-14 rounded-xl bg-green-600 px-10 text-xl font-bold text-white shadow-sm hover:bg-green-700"
        >
          Salvar Configuração
        </button>
      </div>
    </Base>
  )
}

interface BlocoServicoProps {
  titulo: string
  painelAtivo: boolean
  modalidades: Modalidade[]
  selecionadas: number[]
  universal: boolean
  universalBloqueado: boolean
  onUniversalChange: (valor: boolean) => void
  onAdd: (id: number) => void
  onRemove: (id: number) => void
  isDisabled: (id: number) => boolean
}

function BlocoServico({
  titulo,
  painelAtivo,
  modalidades,
  selecionadas,
  universal,
  universalBloqueado,
  onUniversalChange,
  onAdd,
  onRemove,
  isDisabled,
}: BlocoServicoProps) {
  const modalidadesDisponiveis = useMemo(() => {
    return modalidades.filter(
      (modalidade) => !selecionadas.includes(modalidade.cd_modalidade)
    )
  }, [modalidades, selecionadas])

  return (
    <div className="p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
        {titulo}
      </h3>

      <div className="mb-4 rounded-xl border bg-gray-50 p-3">
        <label
          className={`mb-2 flex items-center gap-2 font-semibold ${
            !painelAtivo ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          <input
            type="radio"
            disabled={!painelAtivo}
            checked={!universal}
            onChange={() => onUniversalChange(false)}
          />
          Selecionar modalidades
        </label>

        <label
          className={`flex items-center gap-2 font-semibold ${
            !painelAtivo || universalBloqueado
              ? 'text-gray-400'
              : 'text-blue-700'
          }`}
        >
          <input
            type="radio"
            checked={universal}
            disabled={!painelAtivo || universalBloqueado}
            onChange={() => onUniversalChange(true)}
          />
          Universal
        </label>
      </div>

      <select
        disabled={universal || !painelAtivo}
        className={`mb-4 h-12 w-full rounded-lg px-4 text-lg font-semibold outline-none ${
          universal || !painelAtivo
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-neutral-800 text-white'
        }`}
        defaultValue=""
        onChange={(e) => {
          const value = Number(e.target.value)
          if (value) onAdd(value)
          e.target.value = ''
        }}
      >
        <option value="">
          {!painelAtivo
            ? 'Painel inativo'
            : universal
              ? 'Universal ativado'
              : '+ Adicionar'}
        </option>

        {modalidadesDisponiveis.map((modalidade) => (
          <option
            key={modalidade.cd_modalidade}
            value={modalidade.cd_modalidade}
            disabled={isDisabled(modalidade.cd_modalidade)}
          >
            {modalidade.ds_modalidade}
          </option>
        ))}
      </select>

      <div className="flex min-h-28 flex-wrap gap-3 rounded-xl border bg-gray-50 p-4">
        {!painelAtivo && (
          <div className="flex w-full items-center justify-center text-gray-400">
            Painel inativo
          </div>
        )}

        {painelAtivo && universal && (
          <div className="flex h-10 items-center rounded-full border border-green-200 bg-green-50 px-4 font-semibold text-green-700">
            Todas as modalidades
          </div>
        )}

        {painelAtivo && !universal && selecionadas.length === 0 && (
          <div className="flex w-full items-center justify-center text-gray-400">
            Nenhuma
          </div>
        )}

        {painelAtivo &&
          !universal &&
          selecionadas.map((id) => {
            const modalidade = modalidades.find(
              (item) => item.cd_modalidade === id
            )

            return (
              <div
                key={id}
                className="flex h-10 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700"
              >
                <span>{modalidade?.ds_modalidade ?? id}</span>

                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}
