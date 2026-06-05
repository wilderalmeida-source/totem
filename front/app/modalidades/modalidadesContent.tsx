'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Base from '@/components/ui/base'
import { buscaModalidades, Modalidade } from '@/services/api'


export default function ModalidadePage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const servico = searchParams.get('servico') ?? ''
    const preferencial = searchParams.get('preferencial') ?? '0'

    const [modalidades, setModalidades] = useState<Modalidade[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function carregar() {
            try {
                const response = await buscaModalidades(10000)
                setModalidades(response ?? [])
            } finally {
                setLoading(false)
            }
        }

        void carregar()
    }, [])

    function selecionarModalidade(modalidade: Modalidade) {
        router.push(
            `/totem?servico=${servico}&preferencial=${preferencial}&modalidade=${modalidade.cd_modalidade}`
        )
    }

    return (
        <Base>
            <div className="flex flex-col items-center justify-center h-full px-6">
                <h1 className="text-4xl font-bold mb-8">
                    Escolha a modalidade
                </h1>

                {loading && (
                    <p className="text-2xl">Carregando modalidades...</p>
                )}

                <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
                    {modalidades.map((modalidade) => (
                        <button
                            key={modalidade.cd_modalidade}
                            onClick={() => selecionarModalidade(modalidade)}
                            className="h-32 rounded-xl bg-gray-600 text-white text-3xl font-bold"
                        >
                            {modalidade.ds_modalidade}
                        </button>
                    ))}
                </div>
            </div>
        </Base>
    )
}