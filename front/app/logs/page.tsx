'use client'
import { useEffect, useState } from 'react'
import AuditTimeline from '@/components/admin/AuditTimeline'

type Log = { id: string; sessionId?: string; actor?: string; category: string; action: string; step?: string; metadata?: Record<string, unknown>; createdAt: string }

export default function LogsPage() {
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
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams({ limit: '50', page: String(page), ...filters, ...(filters.flow ? { flow: filters.flow } : {}), ...(filters.device ? { device: filters.device } : {}) })
    fetch('/api/backend/clinux/audit?' + params, { cache: 'no-store' }).then(async response => {
      if (!response.ok) {
        const failure = await response.json().catch(() => null)
        throw Error(response.status === 422 && typeof failure?.error === 'string' ? failure.error : 'Nao foi possivel consultar os logs. Atualize ou entre novamente.')
      }
      const data = await response.json(); if (!cancelled) { setItems(data.items ?? []); setTotal(data.total ?? 0) }
    }).catch(error => { if (!cancelled) { setTotal(0); setError(error instanceof Error ? error.message : 'Nao foi possivel consultar os logs.') } }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refresh, filters, page])

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8"><p className="font-bold uppercase tracking-widest text-blue-600">Auditoria</p><h1 className="text-3xl font-bold">Logs do sistema</h1></div>
    <form className="mb-5 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); if (patientName.trim() && patientName.trim().length < 3) { setError('Digite pelo menos 3 caracteres do nome.'); return } if (from && to && new Date(from) > new Date(to)) { setError('O inicio deve ser anterior ao fim.'); return } setPage(1); setFilters({ ...(patientName.trim() ? { patientName: patientName.trim() } : {}), ...(flow ? { flow } : {}), ...(device ? { device } : {}), ...(from ? { from: new Date(from).toISOString() } : {}), ...(to ? { to: new Date(to).toISOString() } : {}), ...(outcome ? { outcome } : {}), ...(ticket ? { ticket } : {}) }); setRefresh(value => value + 1) }}>
      <input className="rounded border p-2" aria-label="Nome do paciente" placeholder="Nome do paciente (mínimo 3 letras)" maxLength={150} value={patientName} onChange={event => setPatientName(event.target.value)} />
      <input className="rounded border p-2" aria-label="ID do fluxo" placeholder="ID do fluxo ou chamada" value={flow} onChange={event => setFlow(event.target.value)} />
      <input className="rounded border p-2" aria-label="ID do equipamento" placeholder="ID do equipamento" value={device} onChange={event => setDevice(event.target.value)} />
      <label>Inicio (hora local)<input className="block rounded border p-2" type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label>Fim (hora local)<input className="block rounded border p-2" type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label>
      <select aria-label="Resultado do evento" className="rounded border p-2" value={outcome} onChange={event => setOutcome(event.target.value)}>
        <option value="">Todos os resultados</option>
        <option value="CONCLUIDO">Concluido</option><option value="CANCELADO">Cancelado</option><option value="EXPIRADO">Expirado</option><option value="FALHOU">Falhou</option><option value="DESCONHECIDO">Sem confirmacao</option>
      </select>
      <input aria-label="Codigo da senha cd_senha" placeholder="Codigo da senha (cd_senha)" className="rounded border p-2" type="number" min="1" step="1" value={ticket} onChange={event => setTicket(event.target.value)} />
      <button className="rounded bg-blue-600 p-2 text-white">Buscar / Atualizar</button>
    </form>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    {loading ? <p className="p-6" role="status">Carregando linha do tempo...</p> : <AuditTimeline items={items} onSelectFlow={selected => { setPatientName(''); setFlow(selected); setDevice(''); setFrom(''); setTo(''); setOutcome(''); setTicket(''); setFilters({ flow: selected }); setPage(1) }} />}
    {!loading && items.length === 0 && <p className="p-6 text-slate-500">Nenhum registro encontrado.</p>}
    <div className="mt-5 flex items-center gap-4">
      <button className="rounded border p-2 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <span>Pagina {page} de {Math.max(1, Math.ceil(total / 50))} ? {total} registros</span>
      <button className="rounded border p-2 disabled:opacity-40" disabled={loading || page * 50 >= total} onClick={() => setPage(value => value + 1)}>Proxima</button>
    </div>
  </div></main>
}
