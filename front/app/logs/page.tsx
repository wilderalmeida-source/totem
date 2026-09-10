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
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => { setLabel(localStorage.getItem('totemDeviceLabel') ?? '') }, [])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setItems([])
    const params = new URLSearchParams({ limit: '200', ...(group ? { group } : {}), ...(category ? { category } : {}), ...(flow ? { flow } : {}), ...(device ? { device } : {}) })
    fetch('/api/backend/clinux/audit?' + params, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw Error('Nao foi possivel consultar os logs.')
      const data = await response.json(); if (!cancelled) setItems(data.items ?? [])
    }).catch(() => { if (!cancelled) setError('Nao foi possivel consultar os logs. Atualize ou entre novamente.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category, group, refresh])

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8"><p className="font-bold uppercase tracking-widest text-blue-600">Auditoria</p><h1 className="text-3xl font-bold">Logs do sistema</h1></div>
    <form className="mb-5 flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); setRefresh(value => value + 1) }}>
      <input className="rounded border p-2" aria-label="ID do fluxo" placeholder="ID do fluxo ou chamada" value={flow} onChange={event => setFlow(event.target.value)} />
      <input className="rounded border p-2" aria-label="ID do equipamento" placeholder="ID do equipamento" value={device} onChange={event => setDevice(event.target.value)} />
      <button className="rounded bg-blue-600 p-2 text-white">Buscar / Atualizar</button>
    </form>
    <details className="mb-5"><summary>Identificar este navegador</summary>
      <p>Nome local deste equipamento. Configure em cada maquina usada como totem.</p>
      <input className="rounded border p-2" aria-label="Nome deste equipamento" maxLength={100} value={label} onChange={event => setLabel(event.target.value)} />
      <button className="p-2" onClick={() => localStorage.setItem('totemDeviceLabel', label.trim())}>Salvar nome</button>
    </details>
    {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
    <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar logs por grupo">
      {[['', 'Todos os grupos'], ['EMISSAO', 'Emissão'], ['SESSAO', 'Sessão'], ['COMUNICACAO', 'Comunicação'], ['AUDIO', 'TCP / Áudio'], ['PACIENTES', 'Validação de pacientes']].map(([value, label]) => (
        <button type="button" key={value} aria-pressed={group === value} onClick={() => setGroup(value)} className={`rounded-xl px-4 py-2 font-semibold ${group === value ? 'bg-blue-600 text-white' : 'bg-white'}`}>{label}</button>
      ))}
    </div>
    <div className="mb-5 flex gap-2">{[['','Todos'],['TOTEM','Totem'],['ADMIN','Administrativo']].map(([value,label]) => <button key={value} onClick={() => setCategory(value)} className={`rounded-xl px-4 py-2 font-semibold ${category === value ? 'bg-blue-600 text-white' : 'bg-white'}`}>{label}</button>)}</div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-4">Data e hora</th><th className="p-4">Origem</th><th className="p-4">Etapa</th><th className="p-4">Ação</th><th className="p-4">Usuário/Sessão</th><th className="p-4">Contexto</th></tr></thead><tbody>{items.map((log) => <tr key={log.id} className="border-t"><td className="whitespace-nowrap p-4">{new Date(log.createdAt).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.category}</td><td className="p-4">{log.step ?? '—'}</td><td className="p-4">{log.action}</td><td className="max-w-xs break-all p-4">{log.actor ?? log.sessionId ?? '—'}</td><td className="max-w-xl p-4">{log.metadata ? <details><summary className="cursor-pointer font-semibold text-blue-700">Ver detalhes</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-3 text-xs">{JSON.stringify(log.metadata, null, 2)}</pre></details> : '—'}</td></tr>)}</tbody></table></div>{loading && <p className="p-6">Carregando...</p>}{!loading && items.length === 0 && <p className="p-6 text-slate-500">Nenhum registro encontrado.</p>}</div>
  </div></main>
}
