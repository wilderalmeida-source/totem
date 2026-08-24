'use client'

import { FormEvent, useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') ?? '')
    const newPassword = String(form.get('newPassword') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    if (newPassword !== confirmation) { setError('A confirmação não corresponde à nova senha.'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) { setError(result.error ?? 'Não foi possível trocar a senha.'); return }
      router.replace('/configuracoes'); router.refresh()
    } finally { setLoading(false) }
  }

  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-100 p-5"><div className="w-full max-w-lg rounded-3xl border bg-white p-8 shadow-xl">
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><KeyRound size={27}/></div>
    <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Segurança da conta</p><h1 className="mt-2 text-3xl font-bold">Alterar senha</h1><p className="mt-2 text-slate-500">No primeiro acesso, a troca é obrigatória antes de usar as configurações.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Senha atual" className="h-12 w-full rounded-xl border px-4"/>
      <input name="newPassword" type="password" autoComplete="new-password" required minLength={12} placeholder="Nova senha" className="h-12 w-full rounded-xl border px-4"/>
      <input name="confirmation" type="password" autoComplete="new-password" required minLength={12} placeholder="Confirme a nova senha" className="h-12 w-full rounded-xl border px-4"/>
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p className="mb-2 font-bold">A senha deve possuir:</p><ul className="grid gap-1 sm:grid-cols-2"><li>• 12 ou mais caracteres</li><li>• Letra maiúscula</li><li>• Letra minúscula</li><li>• Número</li><li>• Símbolo</li><li>• Não conter o usuário</li></ul></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white disabled:opacity-60"><ShieldCheck size={19}/>{loading ? 'Alterando...' : 'Salvar nova senha'}</button>
    </form>
  </div></main>
}
