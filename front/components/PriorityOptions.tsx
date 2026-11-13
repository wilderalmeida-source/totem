'use client'
import Link from 'next/link'
import Image, { StaticImageData } from 'next/image'
import { auditTotem } from '@/lib/audit-client'
import { ArrowLeft, ArrowRight, Home, UsersRound, Baby, Accessibility, PersonStanding, Puzzle, HeartHandshake } from 'lucide-react'
import DigitalClock from '@/components/DigitalClock'
import GoldMark from '@/components/GoldMark'

export type PriorityOption = { label: string; icone: StaticImageData; preferencial: number; href?: string; cor?: string }

export default function PriorityOptions({ options, servico }: { options: PriorityOption[]; servico: string }) {
  const record = (option: PriorityOption) => auditTotem(option.href ? 'voltar' : 'prioridade_selecionada', 'prioridade', { servico, preferencial: option.preferencial, opcao: option.label })
  const normal = options.find(option => !option.href && option.preferencial === 0)
  const back = options.find(option => option.href)
  const priority = options.filter(option => !option.href && option.preferencial !== 0)
  const descriptions = ['Acompanhante com bebê', 'Qualquer período', '60 anos ou mais', 'Mobilidade reduzida', 'Pessoa com TEA', 'Outras necessidades']
  const icons = [Baby, PersonStanding, PersonStanding, Accessibility, Puzzle, HeartHandshake]
  const service = ({ B: 'Atendimento', C: 'Entrega de exames', D: 'Agendamento' } as Record<string, string>)[servico] ?? 'Atendimento'
  return <>
    <div className="priority-modern">
      <header className="priority-header">
        <GoldMark className="priority-brand-mark" />
        <Link prefetch={false} href="/" aria-label="Início" className="priority-home" onClick={() => auditTotem('inicio_clicado', 'prioridade', { servico })}><Home size={19} /></Link>
        {back && <Link prefetch={false} href={back.href!} onClick={() => record(back)} className="priority-back"><ArrowLeft size={20} />Voltar</Link>}
        <div className="priority-service"><span className="priority-service-label">{service} · </span><DigitalClock showSeconds={false} /></div>
      </header>
      <h1>Como podemos <span>atender você?</span></h1>
      <p className="priority-subtitle">Selecione o tipo de atendimento para retirar sua senha.</p>
      {normal && <Link prefetch={false} href={`/totem?servico=${servico}&preferencial=${normal.preferencial}`} onClick={() => record(normal)} className="priority-normal">
        <span className="priority-icon"><UsersRound size={28} /></span><span><strong>Atendimento normal</strong><small>Para todos os pacientes</small></span><ArrowRight className="priority-arrow" size={22} />
      </Link>}
      <div className="priority-divider"><span>Atendimento prioritário</span></div>
      <div className="priority-cards">{priority.map((option, index) => {
        const Icon = icons[index] ?? HeartHandshake
        return <Link key={option.label} prefetch={false} href={`/totem?servico=${servico}&preferencial=${option.preferencial}`} onClick={() => record(option)} className={`priority-card ${option.preferencial === 2 ? 'priority-special' : ''}`}>
          <span className="priority-icon"><Icon size={27} /></span><span className="priority-badge">{option.preferencial === 2 ? 'Especial' : 'Prioridade'}</span>
          <strong>{option.label.charAt(0).toLocaleUpperCase('pt-BR') + option.label.slice(1).toLocaleLowerCase('pt-BR')}</strong><small>{descriptions[index] ?? 'Atendimento prioritário'}</small>
        </Link>
      })}</div>
    </div>
    <div className="priority-legacy-options mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4 lg:grid-cols-4">
    {options.map(({ label, icone, preferencial, href, cor }) => <Link prefetch={false} key={label} onClick={() => auditTotem(href ? 'voltar' : 'prioridade_selecionada', 'prioridade', { servico, preferencial, opcao: label })} href={href ?? `/totem?servico=${servico}&preferencial=${preferencial}`}>
      <button className={`pt-2 border-2 rounded-lg w-full h-full font-semibold text-white text-center text-2xl ${cor ?? 'bg-gray-500'}`}>
        <Image className="mx-auto invert mb-5" src={icone} width={100} height={100} alt={label} priority />{label}
      </button>
    </Link>)}
  </div></>
}
