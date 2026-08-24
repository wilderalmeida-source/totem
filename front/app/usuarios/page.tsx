'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

const PERMISSIONS = [
  ['ATENCAO', 'Atenção'], ['VOZ', 'Voz e som'], ['DICIONARIO', 'Dicionário'],
  ['GUICHES', 'Guichês'], ['RECEPCOES', 'Recepções'], ['PAINEIS', 'Painéis'],
  ['STATUS', 'Status'], ['LOGS', 'Logs'], ['USUARIOS', 'Usuários'],
] as const

type User = { id: number; username: string; displayName: string; active: boolean; mustChangePassword: boolean; permissions: string[] }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [savingUserId, setSavingUserId] = useState<number | null>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const load = useCallback(async () => {
    const response = await fetch('/api/backend/clinux/admin/users', { cache: 'no-store' })
    const data = await response.json()
    setUsers(Array.isArray(data) ? data : [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const permissions = form.getAll('permissions').map(String)
    if (!permissions.length) { setError('Selecione pelo menos uma área permitida.'); return }
    const response = await fetch('/api/backend/clinux/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.get('username'), displayName: form.get('displayName'), password: form.get('password'), permissions }),
    })
    if (!response.ok) { setError('Não foi possível cadastrar. Verifique os dados ou se o usuário já existe.'); return }
    formElement.reset(); await load()
  }

  async function patchUser(user: User, body: object) {
    return fetch(`/api/backend/clinux/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }
  async function toggleActive(user: User) { await patchUser(user, { active: !user.active }); await load() }
  function startEditing(user: User) {
    setError(''); setEditingUserId(user.id); setEditDisplayName(user.displayName); setEditPassword('')
  }
  async function saveUser(user: User) {
    setError('')
    if (editDisplayName.trim().length < 2) { setError('Informe um nome com pelo menos 2 caracteres.'); return }
    setSavingUserId(user.id)
    const response = await patchUser(user, { displayName: editDisplayName.trim(), ...(editPassword ? { password: editPassword } : {}) })
    setSavingUserId(null)
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      setError(data.error || 'Não foi possível atualizar o usuário. Confira os requisitos da senha.')
      return
    }
    setEditingUserId(null); setEditPassword(''); await load()
  }
  async function deleteUser(user: User) {
    if (!window.confirm(`Excluir definitivamente o usuário ${user.username}?`)) return
    setError(''); setSavingUserId(user.id)
    const response = await fetch(`/api/backend/clinux/admin/users/${user.id}`, { method: 'DELETE' })
    setSavingUserId(null)
    if (!response.ok) { setError('Não foi possível excluir o usuário.'); return }
    if (editingUserId === user.id) setEditingUserId(null)
    await load()
  }
  async function togglePermission(user: User, permission: string) {
    setError('')
    const permissions = user.permissions.includes(permission) ? user.permissions.filter((item) => item !== permission) : [...user.permissions, permission]
    if (!permissions.length) { setError('Cada usuário deve ter acesso a pelo menos uma área.'); return }
    setSavingUserId(user.id)
    const response = await patchUser(user, { permissions })
    setSavingUserId(null)
    if (!response.ok) { setError('Não foi possível atualizar os acessos do usuário.'); return }
    await load()
  }

  const permissionGrid = (user?: User) => (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {PERMISSIONS.map(([value, label]) => (
        <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 hover:bg-slate-50">
          <input type="checkbox" name={user ? undefined : 'permissions'} value={value}
            checked={user ? user.permissions.includes(value) : undefined}
            disabled={user ? savingUserId === user.id : false}
            onChange={user ? () => togglePermission(user, value) : undefined} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )

  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-5xl">
    <div className="mb-8"><p className="font-bold uppercase tracking-widest text-blue-600">Segurança</p><h1 className="text-3xl font-bold">Usuários administrativos</h1></div>
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4">
      <input name="displayName" required minLength={2} placeholder="Nome completo" className="rounded-xl border p-3"/><input name="username" required minLength={3} pattern={"[a-zA-Z0-9._\\-]+"} title="Use apenas letras, números, ponto, sublinhado ou hífen." placeholder="Usuário" className="rounded-xl border p-3"/><input name="password" type="password" required minLength={12} placeholder="Senha temporária forte" className="rounded-xl border p-3"/><button className="rounded-xl bg-blue-600 p-3 font-bold text-white">Cadastrar</button>
      <p className="text-sm text-slate-500 md:col-span-4">Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo. O usuário deverá trocá-la no primeiro login.</p>
      <fieldset className="md:col-span-4"><legend className="mb-3 font-bold text-slate-700">Áreas permitidas</legend>{permissionGrid()}</fieldset>
      {error && <p className="text-red-600 md:col-span-4">{error}</p>}
    </form>
    <div className="space-y-4">{users.map((user) => <div key={user.id} className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold">{user.displayName}</p><p className="text-sm text-slate-500">{user.username}</p>{user.mustChangePassword && <p className="mt-1 text-xs font-bold text-amber-600">Troca de senha pendente</p>}</div><div className="flex flex-wrap gap-2"><button onClick={() => startEditing(user)} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Editar</button><button onClick={() => toggleActive(user)} className={`rounded-xl px-4 py-2 font-bold text-white ${user.active ? 'bg-green-600' : 'bg-slate-400'}`}>{user.active ? 'Ativo' : 'Inativo'}</button><button onClick={() => deleteUser(user)} disabled={savingUserId === user.id} className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">Excluir</button></div></div>
      {editingUserId === user.id && <div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Nome de exibição<input value={editDisplayName} onChange={(event) => setEditDisplayName(event.target.value)} minLength={2} className="mt-1 w-full rounded-xl border bg-white p-3" /></label><label className="text-sm font-semibold text-slate-700">Nova senha temporária (opcional)<input value={editPassword} onChange={(event) => setEditPassword(event.target.value)} type="password" minLength={12} placeholder="Deixe vazio para não alterar" className="mt-1 w-full rounded-xl border bg-white p-3" /></label><p className="text-xs text-slate-500 md:col-span-2">Ao definir uma nova senha, o usuário será obrigado a trocá-la no próximo login.</p><div className="flex gap-2 md:col-span-2"><button onClick={() => saveUser(user)} disabled={savingUserId === user.id} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">Salvar alterações</button><button onClick={() => setEditingUserId(null)} className="rounded-xl border bg-white px-4 py-2 font-bold text-slate-700">Cancelar</button></div></div>}
      <p className="mb-2 text-sm font-bold text-slate-700">Acessos permitidos</p>{permissionGrid(user)}
      {savingUserId === user.id && <p className="mt-2 text-sm text-blue-600">Salvando acessos...</p>}
    </div>)}</div>
  </div></main>
}
