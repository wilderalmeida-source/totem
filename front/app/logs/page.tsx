'use client'
import { useEffect, useState } from 'react'
import AuditTimeline from '@/components/admin/AuditTimeline'
import AuditSummary from '@/components/admin/AuditSummary'

type Log = { id: string; sessionId?: string; actor?: string; category: string; action: string; step?: string; metadata?: Record<string, unknown>; createdAt: string }
type Mode = 'resumo' | 'tecnico'
const PAGE_SIZE: Record<Mode, number> = { resumo: 20, tecnico: 50 }

export default function LogsPage() {
  const [mode, setMode] = useState<Mode>('resumo')
  const [items, setItems] = useState<Log[]>([])
  const [flow, setFlow] = useState('')
  const [patientName, setPatientName] = useState('')
  const [device, setDevice] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [outcome, setOutcome] = useState('')
  const [ticket, setTicket] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams({ limit: String(PAGE_SIZE[mode]), page: String(page), ...filters, ...(mode === 'resumo' ? { view: 'flows' } : {}) })
    fetch('/api/backend/clinux/audit?' + params, { cache: 'no-store' }).then(async response => {
      if (!response.ok) {
        const failure = await response.json().catch(() => null)
        throw Error(response.status === 422 && typeof failure?.error === 'string' ? failure.error : 'Não foi possível consultar os logs. Atualize ou entre novamente.')
      }
      const data = await response.json()
      if (!cancelled) { setItems(data.items ?? []); setTotal(data.total ?? 0); setHasMore(Boolean(data.hasMore)) }
    }).catch(error => { if (!cancelled) { setTotal(0); setHasMore(false); setError(error instanceof Error ? error.message : 'Não foi possível consultar os logs.') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refresh, filters, page, mode])

  function showFlow(selected: string, nextMode: Mode) {
    setPatientName(''); setFlow(selected); setDevice(''); setFrom(''); setTo(''); setOutcome(''); setTicket('')
    setFilters({ flow: selected }); setPage(1); setMode(nextMode)
  }
  function changeMode(next: Mode) { if (next !== mode) { setPage(1); setMode(next) } }
  const pageInfo = mode === 'resumo'
    ? `Página ${page}${hasMore ? '' : ' (última)'}`
    : `Página ${page} de ${Math.max(1, Math.ceil(total / PAGE_SIZE.tecnico))} · ${total} registros`
  const canNext = mode === 'resumo' ? hasMore : page * PAGE_SIZE.tecnico < total

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-6"><p className="font-bold uppercase tracking-widest text-blue-600">Auditoria</p><h1 className="text-3xl font-bold">Logs do sistema</h1>
      <p className="mt-2 text-slate-600">{mode === 'resumo' ? 'Cada cartão é um atendimento do totem, do serviço escolhido até a senha.' : 'Todos os eventos registrados, inclusive os técnicos de comunicação e áudio.'}</p></div>
    <div role="tablist" aria-label="Forma de exibição" className="mb-5 inline-flex rounded-xl border bg-white p-1">
      <button role="tab" aria-selected={mode === 'resumo'} onClick={() => changeMode('resumo')} className={`rounded-lg px-4 py-2 font-semibold ${mode === 'resumo' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Resumo dos atendimentos</button>
      <button role="tab" aria-selected={mode === 'tecnico'} onClick={() => changeMode('tecnico')} className={`rounded-lg px-4 py-2 font-semibold ${mode === 'tecnico' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Linha do tempo técnica</button>
    </div>
    <form className="mb-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (patientName.trim() && patientName.trim().length < 3) { setError('Digite pelo menos 3 caracteres do nome.'); return } if (from && to && new Date(from) > new Date(to)) { setError('O início deve ser anterior ao fim.'); return } setPage(1); setFilters({ ...(patientName.trim() ? { patientName: patientName.trim() } : {}), ...(flow ? { flow } : {}), ...(device ? { device } : {}), ...(from ? { from: new Date(from).toISOString() } : {}), ...(to ? { to: new Date(to).toISOString() } : {}), ...(outcome ? { outcome } : {}), ...(ticket ? { ticket } : {}) }); setRefresh(value => value + 1) }}>
      <label className="text-sm">Nome do paciente<input className="block rounded border p-2" placeholder="Mínimo 3 letras" maxLength={150} value={patientName} onChange={event => setPatientName(event.target.value)} /></label>
      <label className="text-sm">De<input className="block rounded border p-2" type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="text-sm">Até<input className="block rounded border p-2" type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label>
      <label className="text-sm">Mostrar<select className="block rounded border p-2" value={outcome} onChange={event => setOutcome(event.target.value)}>
        <option value="">Todos</option>
        <option value="FALHOU">Somente com erro</option>
        <option value="CONCLUIDO">Com etapa concluída</option><option value="CANCELADO">Cancelados</option><option value="EXPIRADO">Expirados</option><option value="DESCONHECIDO">Sem confirmação</option>
      </select></label>
      <details className="text-sm"><summary className="cursor-pointer py-2 text-blue-700">Mais filtros</summary>
        <div className="mt-2 flex flex-wrap gap-3">
          <input className="rounded border p-2" aria-label="ID do fluxo" placeholder="ID do fluxo ou chamada" value={flow} onChange={event => setFlow(event.target.value)} />
          <input className="rounded border p-2" aria-label="ID do equipamento" placeholder="ID do equipamento" value={device} onChange={event => setDevice(event.target.value)} />
          <input aria-label="Código da senha cd_senha" placeholder="Código da senha (cd_senha)" className="rounded border p-2" type="number" min="1" step="1" value={ticket} onChange={event => setTicket(event.target.value)} />
        </div>
      </details>
      <button className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Buscar</button>
    </form>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    {loading ? <p className="p-6" role="status">Carregando...</p>
      : mode === 'resumo' ? <AuditSummary items={items} onDetails={selected => showFlow(selected, 'tecnico')} />
      : <AuditTimeline items={items} onSelectFlow={selected => showFlow(selected, 'tecnico')} />}
    {!loading && items.length === 0 && <p className="p-6 text-slate-500">Nenhum registro encontrado.</p>}
    <div className="mt-5 flex items-center gap-4">
      <button className="rounded border bg-white p-2 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <span>{pageInfo}</span>
      <button className="rounded border bg-white p-2 disabled:opacity-40" disabled={loading || !canNext} onClick={() => setPage(value => value + 1)}>Próxima</button>
    </div>
  </div></main>
}
