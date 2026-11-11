'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { PartnerCallView } from '@/hooks/usePartnerCall'

export default function PartnerCallOverlay({ call, logo }: PartnerCallView) {
  const [failed, setFailed] = useState(false)
  const [vertical, horizontal = 'center'] = logo.position === 'center' ? ['center', 'center'] : logo.position.split('-')
  const middle = vertical === 'center'
  const portrait = logo.orientation === 'portrait'
  const image = !failed && <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-3"
    style={{ maxWidth: portrait ? 256 : 512, width: '100%', minWidth: 0 }}>
    <Image src={`/api/partnerships/logo/${encodeURIComponent(logo.id)}`} alt={logo.name} unoptimized
      width={portrait ? 256 : 512} height={portrait ? 512 : 256}
      onError={() => setFailed(true)}
      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: portrait ? 'min(512px, 44vh)' : 'min(256px, 28vh)', objectFit: 'contain' }} />
  </div>
  const alignment = horizontal === 'left' ? 'justify-start' : horizontal === 'right' ? 'justify-end' : 'justify-center'
  return <section role="status" aria-live="polite" aria-label="Chamada do paciente"
    className="pointer-events-none fixed inset-0 z-40 flex flex-col gap-4 overflow-hidden bg-slate-200 p-[3vh] text-slate-950">
    {!middle && vertical === 'top' && <div className={`flex ${alignment}`}>{image}</div>}
    <div className={`flex min-h-0 flex-1 items-center justify-center gap-[3vw] ${middle && horizontal === 'center' ? 'flex-col' : ''}`}>
      {middle && horizontal !== 'right' && image}
      <div className={`min-w-0 text-center ${middle && horizontal === 'center' ? '' : 'flex-1'}`}>
        <p className="text-[clamp(18px,2.5vw,44px)] font-semibold text-slate-950">{call.recepcao}</p>
        <p className="mt-3 break-words text-[clamp(28px,5.5vw,96px)] font-black uppercase leading-tight">{call.name}</p>
        <p className="mt-5 text-[clamp(22px,4vw,72px)] font-bold text-red-600">
          {call.guicheNumero ? `Guichê ${call.guicheNumero}` : call.guicheNome}
        </p>
        {call.guicheNumero && call.guicheNome && !/^guich[eê]\s*:?\s*\d+$/i.test(call.guicheNome) &&
          <p className="mt-2 text-[clamp(18px,2.5vw,40px)] text-red-600">{call.guicheNome}</p>}
      </div>
      {middle && horizontal === 'right' && image}
    </div>
    {!middle && vertical === 'bottom' && <div className={`flex ${alignment}`}>{image}</div>}
    <p className="text-center text-sm text-slate-600">Chamado às {call.calledAt}</p>
  </section>
}
