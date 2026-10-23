'use client'
import { useMemo, useState } from 'react'
import { AuditLogEntry, eventResult, timelineGroups } from '@/lib/audit-timeline'
import { flowSummary, stageDetails, stageKind, stageTitle, visibleStages, type StageKind } from '@/lib/audit-presentation'

const styles: Record<StageKind, { color: string; icon: string; label: string }> = {
  session: { color: '#8172e9', icon: '↪', label: 'Sessão' },
  patient: { color: '#109c78', icon: '◎', label: 'Paciente' },
  emission: { color: '#df592b', icon: '▣', label: 'Emissão' },
  communication: { color: '#3288da', icon: '⇄', label: 'Comunicação' },
  audio: { color: '#b97712', icon: '♪', label: 'Áudio' },
  failure: { color: '#dc454e', icon: '!', label: 'Falha / atenção' },
}

function StageDetails({ log }: { log: AuditLogEntry }) {
  const { rows, results, count, truncated } = stageDetails(log)
  return <div className="space-y-4">
    <dl className="grid gap-3 sm:grid-cols-2">
      <div><dt className="text-xs font-semibold uppercase text-slate-500">Data e hora</dt><dd>{new Date(log.createdAt).toLocaleString('pt-BR')}</dd></div>
      <div><dt className="text-xs font-semibold uppercase text-slate-500">Resultado desta etapa</dt><dd>{eventResult(log)}</dd></div>
      {rows.map((row, i) => <div key={i}><dt className="text-xs font-semibold uppercase text-slate-500">{row.label}</dt><dd className="break-words">{row.value}</dd></div>)}
    </dl>
    {(count !== undefined || results.length > 0) && <div>
      <h4 className="mb-2 font-semibold">Resultados retornados {count !== undefined ? '(' + count + ')' : ''}</h4>
      {results.length > 0 ? <ul className="max-h-80 space-y-2 overflow-y-auto">{results.map((patient, i) =>
        <li key={i} className="rounded-xl border bg-white p-3"><dl className="flex flex-wrap gap-x-6 gap-y-1">{patient.map((row, j) => <div key={j}><dt className="text-xs text-slate-500">{row.label}</dt><dd className="font-medium">{row.value}</dd></div>)}</dl></li>
      )}</ul> : <p className="text-sm text-slate-600">{count === 0 ? 'Nenhum resultado retornado.' : 'A lista de resultados não foi armazenada neste registro.'}</p>}
      {truncated && <p className="mt-2 text-sm text-amber-800">O registro contém apenas uma amostra dos resultados.</p>}
    </div>}
  </div>
}

function FlowCard({ events, onSelectFlow }: { events: AuditLogEntry[]; onSelectFlow: (flow: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const summary = flowSummary(events)
  const visible = visibleStages(events)
  const active = visible.find(log => log.id === selected)
  const first = events[0]
  const initials = summary.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">{initials}</span>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-bold text-slate-900">{summary.name}</h2>
          <p className="text-sm text-slate-500">{summary.ticket ? 'Senha ' + summary.ticket + ' · ' : ''}{new Date(first.createdAt).toLocaleDateString('pt-BR')} · {events.length} registros nesta página</p>
          {first.sessionId && <button type="button" onClick={() => onSelectFlow(first.sessionId!)} title={first.sessionId} className="mt-1 text-sm font-medium text-blue-700 underline underline-offset-4">Filtrar este atendimento</button>}
        </div>
      </div>
      <div className="space-y-1 text-right">
        <p className={'rounded-full px-3 py-1 text-xs font-semibold ' + (summary.tone === 'success' ? 'bg-green-100 text-green-800' : summary.tone === 'failure' ? 'bg-red-100 text-red-800' : 'bg-amber-50 text-amber-800')}>{summary.status}</p>
        {summary.audioFailure && <p className="text-xs font-semibold text-red-700">Falha de áudio registrada</p>}
        {summary.otherFailure && <p className="text-xs font-semibold text-red-700">Há falhas no percurso; confira as etapas</p>}
      </div>
    </header>
    <div className="min-w-0 md:overflow-x-auto">
      <ol className="flex flex-col md:w-max md:min-w-full md:flex-row md:pb-3">
        {visible.map(log => {
          const style = styles[stageKind(log)]
          const expanded = active?.id === log.id
          return <li key={log.id} className="relative border-l-4 pb-5 pl-5 md:w-44 md:shrink-0 md:border-b-4 md:border-l-0 md:px-2 md:pb-3" style={{ borderColor: style.color }}>
            <button type="button" aria-expanded={expanded} aria-controls={'audit-detail-' + first.id}
              onClick={() => setSelected(expanded ? null : log.id)}
              className={'flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 md:flex-col md:text-center ' + (expanded ? 'bg-slate-100 ring-1 ring-slate-200' : '')}>
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-white text-2xl font-semibold md:order-2" style={{ color: style.color, borderColor: style.color }}>{style.icon}</span>
              <span className="min-w-0 md:order-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: style.color }}>{style.label}</span>
                <span className="block break-words text-sm font-semibold text-slate-800 md:min-h-16">{stageTitle(log)}</span>
                <time dateTime={log.createdAt} className="mt-1 block text-xs tabular-nums text-slate-500">{new Date(log.createdAt).toLocaleString('pt-BR')}</time>
              </span>
              <span className="sr-only">Abrir detalhes desta etapa</span>
            </button>
          </li>
        })}
      </ol>
    </div>
    {!visible.length && <p className="text-sm text-slate-500">Somente registros técnicos de comunicação nesta página.</p>}
    {active && <section id={'audit-detail-' + first.id} aria-label={'Detalhes: ' + stageTitle(active)} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-start justify-between gap-4"><h3 className="font-bold">{stageTitle(active)}</h3><button type="button" onClick={() => setSelected(null)} className="text-sm font-medium text-blue-700">Fechar detalhes</button></div>
      <StageDetails log={active} />
    </section>}
    <p className="mt-4 text-xs text-slate-400">Recorte paginado: etapas anteriores ou posteriores podem estar em outra página. Clique em uma etapa para ver os detalhes disponíveis.</p>
  </article>
}

export default function AuditTimeline({ items, onSelectFlow }: { items: AuditLogEntry[]; onSelectFlow: (flow: string) => void }) {
  const groups = useMemo(() => timelineGroups(items), [items])
  return <section aria-label="Linha do tempo dos atendimentos" className="min-w-0 space-y-5">
    {groups.map(({ key, events }) => <FlowCard key={key} events={events} onSelectFlow={onSelectFlow} />)}
  </section>
}
