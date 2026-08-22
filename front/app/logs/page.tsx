'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Log = { id: string; sessionId?: string; actor?: string; category: string; action: string; step?: string; metadata?: Record<string, unknown>; createdAt: string }

export default function LogsPage() {
  const [items, setItems] = useState<Log[]>([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { setLoading(true); fetch(`/api/backend/clinux/audit?limit=200${category ? `&category=${category}` : ''}`, { cache: 'no-store' }).then((r) => r.json()).then((data) => setItems(data.items ?? [])).finally(() => setLoading(false)) }, [category])
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex items-center justify-between"><div><p className="font-bold uppercase tracking-widest text-blue-600">Auditoria</p><h1 className="text-3xl font-bold">Logs do sistema</h1></div><Link className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white" href="/configuracoes">Voltar</Link></div>
    <div className="mb-5 flex gap-2">{[['','Todos'],['TOTEM','Totem'],['ADMIN','Administrativo']].map(([value,label]) => <button key={value} onClick={() => setCategory(value)} className={`rounded-xl px-4 py-2 font-semibold ${category === value ? 'bg-blue-600 text-white' : 'bg-white'}`}>{label}</button>)}</div>
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-4">Data e hora</th><th className="p-4">Origem</th><th className="p-4">Etapa</th><th className="p-4">Ação</th><th className="p-4">Usuário/Sessão</th><th className="p-4">Contexto</th></tr></thead><tbody>{items.map((log) => <tr key={log.id} className="border-t"><td className="whitespace-nowrap p-4">{new Date(log.createdAt).toLocaleString('pt-BR')}</td><td className="p-4 font-bold">{log.category}</td><td className="p-4">{log.step ?? '—'}</td><td className="p-4">{log.action}</td><td className="p-4">{log.actor ?? log.sessionId?.slice(0, 8) ?? '—'}</td><td className="max-w-sm truncate p-4">{log.metadata ? JSON.stringify(log.metadata) : '—'}</td></tr>)}</tbody></table></div>{loading && <p className="p-6">Carregando...</p>}{!loading && items.length === 0 && <p className="p-6 text-slate-500">Nenhum registro encontrado.</p>}</div>
  </div></main>
}
