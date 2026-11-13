'use client'

import Link from 'next/link'
import { tocaAtencao } from '@/services/api/atencao'
import { startTotemFlow } from '@/lib/audit-client'
import DigitalClock from '@/components/DigitalClock'
import { CalendarPlus, UserRoundCheck, FileCheck2, ArrowRight } from 'lucide-react'

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
      <div className="home-services self-center mt-10 gap-5 flex w-full flex-col content-center">
        {servicos.map((s) => (
          <Link prefetch={false} key={s.ID} onClick={() => {
            window.dispatchEvent(new Event('totem-service-selected'))
            startTotemFlow(s.ID)
          }} className="self-center flex items-center justify-center border-2 rounded-lg w-1/2 h-16 bg-gray-500 font-semibold text-white text-2xl" href={`/preferencial?servico=${s.ID}`}>
              <span className="home-service-icon">{s.ID === 'D' ? <CalendarPlus /> : s.ID === 'B' ? <UserRoundCheck /> : <FileCheck2 />}</span>
              <span className="home-service-title">{s.servico}</span>
              <span className="home-service-description">{s.ID === 'D' ? 'Marque um novo exame' : s.ID === 'B' ? 'Retire sua senha' : 'Retire seus resultados'}</span>
              <ArrowRight className="home-service-arrow" />
          </Link>
        ))}
      </div>

      <div className="home-legacy-tools ml-10 self-start text-center">
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
