'use client'
import { useEffect, useState } from 'react'

type User = { id: number; username: string; displayName: string; active: boolean; mustChangePin: boolean; pinExpiresAt: string }
type Policy = { enabled: boolean; pinValidityDays: number; sessionHours: number }
const blank = { username: '', displayName: '', pin: '', pinExpiresAt: '' }
export default function TotemAccessAdmin() {
  const [policy, setPolicy] = useState<Policy>({ enabled: false, pinValidityDays: 90, sessionHours: 12 })
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  async function api(path: string, method = 'GET', data?: object) {
    const res = await fetch(`/api/admin/totem-access/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Não foi possível concluir.')
    return result
  }
  async function load() { const [p, u] = await Promise.all([api('settings'), api('users')]); setPolicy(p); setUsers(u); setReady(true) }
  useEffect(() => { void load().catch(e => setMessage(e.message)) }, [])
  async function action(work: () => Promise<void>) { if (busy) return; setBusy(true); setMessage(''); try { await work() } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) } }
  function download(id: number) { const a = document.createElement('a'); a.href = `/api/admin/totem-access/users/${id}/card`; a.download = ''; a.click() }
  return <main className="mx-auto max-w-5xl space-y-6 p-5 md:p-10">
    <h1 className="text-3xl font-bold">Acesso de colaboradores ao totem</h1>
    <p>O cartão identifica o colaborador. O PIN libera o terminal para vários pacientes.</p>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-4">{message}</p>}
    <fieldset disabled={busy || !ready} className="space-y-4 rounded-2xl border bg-white p-6 disabled:opacity-60">
      <legend className="font-bold">Controle de acesso</legend>
      <label className="flex gap-3"><input type="checkbox" checked={policy.enabled} onChange={e => setPolicy({ ...policy, enabled: e.target.checked })} />Exigir cartão e PIN para liberar o totem</label>
      <label className="block">Validade do PIN após troca (dias)<input type="number" min={1} max={365} value={policy.pinValidityDays} onChange={e => setPolicy({ ...policy, pinValidityDays: Number(e.target.value) })} className="ml-3 w-24 rounded-lg border p-2" /></label>
      <label className="block">Duração da liberação (horas)<input type="number" min={1} max={24} value={policy.sessionHours} onChange={e => setPolicy({ ...policy, sessionHours: Number(e.target.value) })} className="ml-3 w-24 rounded-lg border p-2" /></label>
      <p className="text-sm text-slate-500">Salvar esta política encerra as liberações atuais. A validade em dias se aplica às próximas trocas de PIN.</p>
      <button onClick={() => void action(async () => { await api('settings', 'PUT', { enabled: policy.enabled, pinValidityDays: policy.pinValidityDays, sessionHours: policy.sessionHours }); setMessage('Configuração salva.'); await load() })} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">Salvar configuração</button>
    </fieldset>
    <form onSubmit={e => { e.preventDefault(); void action(async () => {
      const body = { displayName: form.displayName, ...(editing ? {} : { username: form.username }), ...(form.pin ? { pin: form.pin } : {}), pinExpiresAt: new Date(form.pinExpiresAt).toISOString() }
      const user = await api(editing ? `users/${editing}` : 'users', editing ? 'PATCH' : 'POST', body)
      const created = !editing
      setForm(blank); setEditing(null); await load(); setMessage(created ? 'Colaborador cadastrado. O cartão será baixado; você também pode baixá-lo pela lista.' : 'Colaborador atualizado; a liberação anterior foi encerrada.')
      if (created) download(user.id)
    }) }}>
      <fieldset disabled={busy || !ready} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <legend className="font-bold">{editing ? 'Editar colaborador / redefinir PIN' : 'Cadastrar colaborador'}</legend>
        <label>Usuário<input required disabled={Boolean(editing)} pattern="[a-zA-Z0-9._\-]+" minLength={3} maxLength={100} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label>Nome<input required minLength={2} maxLength={150} value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label>{editing ? 'Novo PIN temporário (opcional)' : 'PIN temporário'}<input required={!editing} type="password" inputMode="numeric" pattern="[0-9]{4,12}" autoComplete="new-password" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 12) })} className="mt-1 w-full rounded-xl border p-3" /></label>
        <label>Expiração do PIN<input required type="datetime-local" value={form.pinExpiresAt} onChange={e => setForm({ ...form, pinExpiresAt: e.target.value })} className="mt-1 w-full rounded-xl border p-3" /></label>
        <p className="text-sm text-slate-500 md:col-span-2">PIN numérico de 4 a 12 dígitos. A troca é obrigatória no primeiro login e após redefinição. O PIN não aparece no cartão.</p>
        <button className="rounded-xl bg-blue-600 p-3 font-bold text-white">{editing ? 'Salvar colaborador' : 'Cadastrar e gerar cartão'}</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm(blank) }}>Cancelar edição</button>}
      </fieldset>
    </form>
    <section className="space-y-3">{users.map(user => <article key={user.id} className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">{user.displayName}</h2><p>{user.username} · {user.active ? 'Ativo' : 'Inativo'}</p>
      <p>PIN válido até {new Date(user.pinExpiresAt).toLocaleString('pt-BR')}{user.mustChangePin ? ' · Troca obrigatória pendente' : ''}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => { setEditing(user.id); const date = new Date(user.pinExpiresAt); setForm({ username: user.username, displayName: user.displayName, pin: '', pinExpiresAt: new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }) }} className="rounded-lg border px-4 py-2">Editar / redefinir PIN</button>
        <button disabled={busy} onClick={() => download(user.id)} className="rounded-lg border px-4 py-2">Baixar cartão</button>
        <button disabled={busy} onClick={() => { if (confirm('O cartão anterior deixará de funcionar. Renovar?')) void action(async () => { await api(`users/${user.id}`, 'PATCH', { renewCard: true }); await load(); download(user.id) }) }} className="rounded-lg border px-4 py-2">Renovar cartão</button>
        <button disabled={busy} onClick={() => void action(async () => { await api(`users/${user.id}`, 'PATCH', { active: !user.active }); await load() })} className="rounded-lg border px-4 py-2">{user.active ? 'Desativar' : 'Ativar'}</button>
      </div>
    </article>)}</section>
  </main>
}
