'use client'

import Link from 'next/link'
import { tocaAtencao } from '@/services/api/atencao'

type Servico = {
  servico: string
  ID: string
}

interface ServicosProps {
  servicos: Servico[]
}

export default function Servicos({ servicos }: ServicosProps) {
  return (
    <>
      <div className="self-center mt-10 gap-5 flex w-full flex-col content-center">
        {servicos.map((s) => (
          <Link key={s.ID} className="flex justify-center" href={`/preferencial?servico=${s.ID}`}>
            <button className="border-2 rounded-lg w-1/2 h-16 bg-gray-500 font-semibold text-white text-2xl">
              {s.servico}
            </button>
          </Link>
        ))}
      </div>

      <div
        onClick={() => tocaAtencao('play')}
        className="cursor-pointer font-extrabold text-white self-start ml-10 bg-red-400 rounded-lg px-5 py-7 hover:bg-slate-400 hover:text-black"
      >
        Silêncio
      </div>
    </>
  )
}