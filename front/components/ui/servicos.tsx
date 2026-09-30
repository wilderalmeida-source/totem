'use client'

import Link from 'next/link'
import { tocaAtencao } from '@/services/api/atencao'
import { auditTotem } from '@/lib/audit-client'
import DigitalClock from '@/components/DigitalClock'

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
          <Link prefetch={false} key={s.ID} onClick={() => {
            window.dispatchEvent(new Event('totem-service-selected'))
            auditTotem('servico_selecionado', 'servico', { servico: s.ID })
          }} className="self-center flex items-center justify-center border-2 rounded-lg w-1/2 h-16 bg-gray-500 font-semibold text-white text-2xl" href={`/preferencial?servico=${s.ID}`}>
              {s.servico}
          </Link>
        ))}
      </div>

      <div className="ml-10 self-start text-center">
        <DigitalClock />
      <div
        onClick={() => tocaAtencao('play')}
        className="cursor-pointer rounded-lg bg-red-400 px-5 py-7 font-extrabold text-white hover:bg-slate-400 hover:text-black"
      >
        Silêncio
      </div>
      </div>
    </>
  )
}
