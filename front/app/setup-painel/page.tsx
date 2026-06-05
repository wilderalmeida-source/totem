'use client'

import { useEffect, useMemo, useState } from 'react'
import Base from '@/components/ui/base'
import { buscaModalidades, Modalidade } from '@/services/api'



type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

interface ConfigPainel {
    painel: number
    atendimento: number[]
    marcacao: number[]
    resultado: number[]
}

const PAINEIS = [1, 2, 3, 4, 5]

const SERVICOS: { key: ServicoPainel; label: string }[] = [
    { key: 'atendimento', label: 'Atendimento' },
    { key: 'marcacao', label: 'Marcação' },
    { key: 'resultado', label: 'Resultado' },
]

export default function ConfiguracaoPaineisPage() {
    const [ativo, setAtivo] = useState(false)
    const [modalidades, setModalidades] = useState<Modalidade[]>([])
    const [config, setConfig] = useState<ConfigPainel[]>(
        PAINEIS.map((painel) => ({
            painel,
            atendimento: [],
            marcacao: [],
            resultado: [],
        }))
    )

    useEffect(() => {
        async function carregar() {
            const response = await buscaModalidades(10000)
            setModalidades(response ?? [])
        }

        void carregar()
    }, [])

    function modalidadeJaUsadaNoServico(
        modalidadeId: number,
        servico: ServicoPainel
    ) {
        return config.some((painel) => painel[servico].includes(modalidadeId))
    }

    function adicionarModalidade(
        painelNumero: number,
        servico: ServicoPainel,
        modalidadeId: number
    ) {
        if (modalidadeJaUsadaNoServico(modalidadeId, servico)) {
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
        for (const servico of SERVICOS) {
            const usadas = config.flatMap((painel) => painel[servico.key])

            const modalidadesFora = modalidades.filter(
                (modalidade) => !usadas.includes(modalidade.cd_modalidade)
            )

            if (modalidadesFora.length > 0) {
                alert(
                    `Existem modalidades sem painel no serviço ${servico.label}: ${modalidadesFora
                        .map((m) => m.ds_modalidade)
                        .join(', ')}`
                )
                return false
            }
        }

        return true
    }

    function salvarConfiguracao() {
        if (!validarConfiguracao()) return

        const payload = {
            ativo,
            paineis: config,
        }

        console.log('Salvar no backend:', payload)
        alert('Configuração pronta para salvar.')
    }

    return (
        <Base>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Configuração dos painéis
                    </h1>

                    <button className="h-10 w-10 rounded-lg bg-neutral-800 text-white text-xl">
                        ...
                    </button>
                </div>

                <div className="mb-8 rounded-2xl border bg-white p-5 shadow-sm">
                    <label className="flex items-center gap-4 text-lg font-semibold text-gray-800">
                        <button
                            type="button"
                            onClick={() => setAtivo((old) => !old)}
                            className={`relative h-8 w-16 rounded-full transition ${ativo ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${ativo ? 'left-9' : 'left-1'
                                    }`}
                            />
                        </button>

                        Ativar seleção de modalidade no totem
                    </label>
                </div>

                <div className="space-y-6">
                    {config.map((painel) => (
                        <div
                            key={painel.painel}
                            className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                        >
                            <div className="flex items-center gap-4 border-b bg-white px-6 py-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                                    {painel.painel}
                                </div>

                                <h2 className="text-xl font-bold text-gray-900">
                                    Painel {painel.painel}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
                                {SERVICOS.map((servico) => (
                                    <BlocoServico
                                        key={servico.key}
                                        titulo={servico.label}
                                        modalidades={modalidades}
                                        selecionadas={painel[servico.key]}
                                        onAdd={(id) =>
                                            adicionarModalidade(painel.painel, servico.key, id)
                                        }
                                        onRemove={(id) =>
                                            removerModalidade(painel.painel, servico.key, id)
                                        }
                                        isDisabled={(id) =>
                                            modalidadeJaUsadaNoServico(id, servico.key)
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
    modalidades: Modalidade[]
    selecionadas: number[]
    onAdd: (id: number) => void
    onRemove: (id: number) => void
    isDisabled: (id: number) => boolean
}

function BlocoServico({
    titulo,
    modalidades,
    selecionadas,
    onAdd,
    onRemove,
    isDisabled,
}: BlocoServicoProps) {
    const modalidadesDisponiveis = useMemo(() => {
        return modalidades.filter((modalidade) => !selecionadas.includes(modalidade.cd_modalidade))
    }, [modalidades, selecionadas])

    return (
        <div className="p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                {titulo}
            </h3>

            <select
                className="mb-4 h-12 w-full rounded-lg bg-gray-600 px-4 text-lg font-semibold text-white outline-none"
                defaultValue=""
                onChange={(e) => {
                    const value = Number(e.target.value)
                    if (value) onAdd(value)
                    e.target.value = ''
                }}
            >
                <option value="">+ Adicionar</option>

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
                {selecionadas.length === 0 && (
                    <div className="flex w-full items-center justify-center text-gray-400">
                        Nenhuma
                    </div>
                )}

                {selecionadas.map((id) => {
                    const modalidade = modalidades.find((item) => item.cd_modalidade === id)

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