'use client'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type User = { id: number; username: string; displayName: string; active: boolean; createdAt?: string }
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]); const [error, setError] = useState('')
  const load = useCallback(async () => { const response = await fetch('/api/backend/clinux/admin/users', { cache: 'no-store' }); const data = await response.json(); setUsers(Array.isArray(data) ? data : []) }, [])
  useEffect(() => { void load() }, [load])
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(''); const form = new FormData(event.currentTarget); const response = await fetch('/api/backend/clinux/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), displayName: form.get('displayName'), password: form.get('password') }) }); if (!response.ok) { setError('Não foi possível cadastrar. Verifique os dados ou se o usuário já existe.'); return } event.currentTarget.reset(); await load() }
  async function toggle(user: User) { await fetch(`/api/backend/clinux/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) }); await load() }
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-5xl"><div className="mb-8 flex justify-between"><div><p className="font-bold uppercase tracking-widest text-blue-600">Segurança</p><h1 className="text-3xl font-bold">Usuários administrativos</h1></div><Link href="/configuracoes" className="h-fit rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Voltar</Link></div>
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4"><input name="displayName" required minLength={2} placeholder="Nome completo" className="rounded-xl border p-3"/><input name="username" required minLength={3} pattern="[a-zA-Z0-9._-]+" placeholder="Usuário" className="rounded-xl border p-3"/><input name="password" type="password" required minLength={10} placeholder="Senha (mín. 10 caracteres)" className="rounded-xl border p-3"/><button className="rounded-xl bg-blue-600 p-3 font-bold text-white">Cadastrar</button>{error && <p className="text-red-600 md:col-span-4">{error}</p>}</form>
    <div className="space-y-3">{users.map((user) => <div key={user.id} className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm"><div><p className="font-bold">{user.displayName}</p><p className="text-sm text-slate-500">{user.username}</p></div><button onClick={() => toggle(user)} className={`rounded-xl px-4 py-2 font-bold text-white ${user.active ? 'bg-green-600' : 'bg-slate-400'}`}>{user.active ? 'Ativo' : 'Inativo'}</button></div>)}</div>
  </div></main>
}
