'use client'
import { useEffect, useState } from 'react'

type Log = { id: string; sessionId?: string; actor?: string; category: string; action: string; step?: string; metadata?: Record<string, unknown>; createdAt: string }

export default function LogsPage() {
  const [items, setItems] = useState<Log[]>([])
  const [category, setCategory] = useState('')
  const [group, setGroup] = useState('')
  const [flow, setFlow] = useState('')
  const [device, setDevice] = useState('')
  const [label, setLabel] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [outcome, setOutcome] = useState('')
  const [ticket, setTicket] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<unknown>(null)
  const [healthError, setHealthError] = useState(false)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetch('/api/admin/log-health', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('health')
      const data: unknown = await response.json()
      if (active) { setHealth(data); setHealthError(false) }
    }).catch(() => { if (active) { setHealth(null); setHealthError(true) } })
    return () => { active = false; controller.abort() }
  }, [refresh])
  useEffect(() => { setLabel(localStorage.getItem('totemDeviceLabel') ?? '') }, [])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams({ limit: '50', page: String(page), ...filters, ...(group ? { group } : {}), ...(category ? { category } : {}), ...(filters.flow ? { flow: filters.flow } : {}), ...(filters.device ? { device: filters.device } : {}) })
    fetch('/api/backend/clinux/audit?' + params, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error('Nao foi possivel consultar os logs.')
      const data = await response.json(); if (!cancelled) { setItems(data.items ?? []); setTotal(data.total ?? 0) }
    }).catch(() => { if (!cancelled) setError('Nao foi possivel consultar os logs. Atualize ou entre novamente.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category, group, refresh, filters, page])

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8"><p className="font-bold uppercase tracking-widest text-blue-600">Auditoria</p><h1 className="text-3xl font-bold">Logs do sistema</h1></div>
    <form className="mb-5 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); if (from && to && new Date(from) > new Date(to)) { setError('O inicio deve ser anterior ao fim.'); return } setPage(1); setFilters({ ...(flow ? { flow } : {}), ...(device ? { device } : {}), ...(from ? { from: new Date(from).toISOString() } : {}), ...(to ? { to: new Date(to).toISOString() } : {}), ...(outcome ? { outcome } : {}), ...(ticket ? { ticket } : {}) }); setRefresh(value => value + 1) }}>
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
    <details className="mb-5"><summary>Saúde dos logs (frontend e backend)</summary>
      <p>Atualizado ao abrir ou clicar em Buscar / Atualizar. Contadores de entrega reiniciam com o processo.</p>
      {healthError ? <p role="alert">Não foi possível consultar a saúde dos logs.</p> : <pre className="overflow-auto rounded bg-white p-3">{health ? JSON.stringify(health, null, 2) : 'Carregando...'}</pre>}
    </details>
    <details className="mb-5"><summary>Identificar este navegador</summary>
      <p>Nome local deste equipamento. Configure em cada maquina usada como totem.</p>
      <input className="rounded border p-2" aria-label="Nome deste equipamento" maxLength={100} value={label} onChange={event => setLabel(event.target.value)} />
      <button className="p-2" onClick={() => localStorage.setItem('totemDeviceLabel', label.trim())}>Salvar nome</button>
    </details>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar logs por grupo">
      {[['', 'Todos os grupos'], ['EMISSAO', 'Emissão'], ['SESSAO', 'Sessão'], ['COMUNICACAO', 'Comunicação'], ['AUDIO', 'TCP / Áudio'], ['PACIENTES', 'Validação de pacientes']].map(([value, label]) => (
        <button type="button" key={value} aria-pressed={group === value} onClick={() => { setPage(1); setGroup(value) }} className={`rounded-xl px-4 py-2 font-semibold ${group === value ? 'bg-blue-600 text-white' : 'bg-white'}`}>{label}</button>
      ))}
    </div>
    <div className="mb-5 flex gap-2">{[['','Todos'],['TOTEM','Totem'],['ADMIN','Administrativo']].map(([value,label]) => <button key={value} onClick={() => { setPage(1); setCategory(value) }} className={`rounded-xl px-4 py-2 font-semibold ${category === value ? 'bg-blue-600 text-white' : 'bg-white'}`}>{label}</button>)}</div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-4">Data e hora</th><th className="p-4">Origem</th><th className="p-4">Etapa</th><th className="p-4">Ação</th><th className="p-4">Usuário/Sessão</th><th className="p-4">Resultado</th><th className="p-4">Contexto</th></tr></thead><tbody>{items.map((log) => <tr key={log.id} className="border-t"><td className="whitespace-nowrap p-4">{new Date(log.createdAt).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.category}</td><td className="p-4">{log.step ?? '—'}</td><td className="p-4">{log.action}</td><td className="max-w-xs break-all p-4">{log.actor ?? log.sessionId ?? '—'}</td><td className="p-4">{typeof log.metadata?.outcome === 'string' ? log.metadata.outcome : '?'}</td><td className="max-w-xl p-4">{log.metadata ? <details><summary className="cursor-pointer font-semibold text-blue-700">Ver detalhes</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-3 text-xs">{JSON.stringify(log.metadata, null, 2)}</pre></details> : '—'}</td></tr>)}</tbody></table></div>{loading && <p className="p-6">Carregando...</p>}{!loading && items.length === 0 && <p className="p-6 text-slate-500">Nenhum registro encontrado.</p>}</div>
    <div className="mt-5 flex items-center gap-4">
      <button className="rounded border p-2 disabled:opacity-40" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <span>Pagina {page} de {Math.max(1, Math.ceil(total / 50))} ? {total} registros</span>
      <button className="rounded border p-2 disabled:opacity-40" disabled={loading || page * 50 >= total} onClick={() => setPage(value => value + 1)}>Proxima</button>
    </div>
  </div></main>
}
