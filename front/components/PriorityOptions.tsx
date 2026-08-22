'use client'
import Link from 'next/link'
import Image, { StaticImageData } from 'next/image'
import { auditTotem } from '@/lib/audit-client'

export type PriorityOption = { label: string; icone: StaticImageData; preferencial: number; href?: string; cor?: string }

export default function PriorityOptions({ options, servico }: { options: PriorityOption[]; servico: string }) {
  return <div className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4 lg:grid-cols-4">
    {options.map(({ label, icone, preferencial, href, cor }) => <Link key={label} onClick={() => auditTotem(href ? 'voltar' : 'prioridade_selecionada', 'prioridade', { servico, preferencial, opcao: label })} href={href ?? `/totem?servico=${servico}&preferencial=${preferencial}`}>
      <button className={`pt-2 border-2 rounded-lg w-full h-full font-semibold text-white text-center text-2xl ${cor ?? 'bg-gray-500'}`}>
        <Image className="mx-auto invert mb-5" src={icone} width={100} height={100} alt={label} priority />{label}
      </button>
    </Link>)}
  </div>
}
