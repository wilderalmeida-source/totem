'use client'
import { useMemo } from 'react'
import { Check, X, AlertTriangle, Minus, ArrowRight } from 'lucide-react'
import { AuditLogEntry, timelineGroups } from '@/lib/audit-timeline'
import { flowSteps, type StepState } from '@/lib/audit-summary'

const STEP: Record<StepState, { ring: string; bg: string; text: string; icon: typeof Check }> = {
  ok: { ring: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', icon: Check },
  warn: { ring: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
  fail: { ring: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', icon: X },
  skip: { ring: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-500', icon: Minus },
  none: { ring: 'border-slate-300', bg: 'bg-white', text: 'text-slate-400', icon: Minus },
}
const RESULT = {
  ok: 'bg-green-100 text-green-800 border-green-300',
  fail: 'bg-red-100 text-red-800 border-red-300',
  incomplete: 'bg-amber-50 text-amber-800 border-amber-300',
}

function SummaryCard({ events, onDetails }: { events: AuditLogEntry[]; onDetails: (flow: string) => void }) {
  const { steps, result, name, service, startedAt } = flowSteps(events)
  const flow = events[0]?.sessionId
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="break-words text-lg font-bold text-slate-900">{name}</h2>
        <p className="text-sm text-slate-500">{service} · {startedAt ? new Date(startedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
      </div>
      <span className={`rounded-full border px-4 py-1 text-sm font-bold ${RESULT[result.state]}`}>{result.label}</span>
    </header>
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0">
      {steps.map((step, i) => {
        const s = STEP[step.state]
        const Icon = s.icon
        return <li key={step.key} className={`relative flex gap-3 rounded-xl p-3 lg:flex-col lg:rounded-none lg:px-3 ${s.bg} ${i === 0 ? 'lg:rounded-l-xl' : ''} ${i === steps.length - 1 ? 'lg:rounded-r-xl' : ''}`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-white ${s.ring} ${s.text}`} aria-hidden="true"><Icon size={18} strokeWidth={2.5} /></span>
          {i < steps.length - 1 && <ArrowRight aria-hidden="true" className="absolute right-[-10px] top-5 z-10 hidden text-slate-300 lg:block" size={18} />}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{i + 1}. {step.question}</p>
            <p className={`mt-1 break-words font-semibold ${step.state === 'none' ? 'text-slate-500' : 'text-slate-900'}`}>{step.answer}</p>
            {step.detail && <p className="mt-0.5 break-words text-xs text-slate-600">{step.detail}</p>}
          </div>
        </li>
      })}
    </ol>
    {flow && <button type="button" onClick={() => onDetails(flow)} className="mt-3 text-sm font-medium text-blue-700 underline underline-offset-4">Ver detalhes técnicos deste atendimento</button>}
  </article>
}

export default function AuditSummary({ items, onDetails }: { items: AuditLogEntry[]; onDetails: (flow: string) => void }) {
  const groups = useMemo(() => timelineGroups(items).filter(group => group.events[0]?.sessionId && group.events[0].category !== 'ADMIN'), [items])
  return <section aria-label="Resumo dos atendimentos" className="space-y-4">
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-white p-3 text-sm text-slate-600">
      <span className="flex items-center gap-1.5"><Check size={16} className="text-green-600" />Deu certo</span>
      <span className="flex items-center gap-1.5"><AlertTriangle size={16} className="text-amber-600" />Atenção (ex.: avançou sem cadastro)</span>
      <span className="flex items-center gap-1.5"><X size={16} className="text-red-600" />Erro</span>
      <span className="flex items-center gap-1.5"><Minus size={16} className="text-slate-400" />Não aconteceu</span>
    </div>
    {groups.map(({ key, events }) => <SummaryCard key={key} events={events} onDetails={onDetails} />)}
  </section>
}
