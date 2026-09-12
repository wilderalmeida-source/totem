'use client'
import Link from 'next/link'
import { FormEvent, useEffect, useRef, useState } from 'react'

export default function TotemLogin() {
  const [cardId, setCardId] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [step, setStep] = useState<'card' | 'pin' | 'change'>('card')
  const [field, setField] = useState<'pin' | 'confirmation'>('pin')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const scanner = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  useEffect(() => {
    fetch('/api/totem-access/session', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (data.allowed) window.location.replace('/')
      else if (data.mustChangePin) { setStep('change'); setName(data.displayName ?? '') }
      else if (data.error) setError(data.error)
    }).catch(() => setError('Não foi possível verificar o acesso.'))
  }, [])
  useEffect(() => { if (step === 'card') scanner.current?.focus() }, [step])
  async function request(action: string, body: object) {
    const res = await fetch(`/api/totem-access/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Não foi possível concluir.')
    return data
  }
  async function lookup(value: string) {
    if (lock.current) return
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) { setError('Leia um cartão válido.'); return }
    lock.current = true; setBusy(true); setError('')
    try { const data = await request('lookup', { cardId: value }); setCardId(value); setName(data.displayName); setStep('pin'); setPin('') }
    catch (e) { setError((e as Error).message); setCardId(''); scanner.current?.focus() }
    finally { lock.current = false; setBusy(false) }
  }
  function scanned(value: string) {
    const normalized = value.trim()
    setCardId(normalized)
    if (normalized.length === 36) void lookup(normalized)
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (step === 'card') { await lookup(cardId); return }
    if (lock.current) return
    if (!/^\d{4,12}$/.test(pin)) { setError('Informe de 4 a 12 dígitos.'); return }
    if (step === 'change' && pin !== confirmation) { setError('Os PINs não conferem.'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const data = await request(step === 'change' ? 'change-pin' : 'login', step === 'change' ? { newPin: pin } : { cardId, pin })
      setPin(''); setConfirmation('')
      if (data.mustChangePin) { setStep('change'); setField('pin') }
      else window.location.replace('/')
    } catch (e) { setError((e as Error).message); setPin(''); setConfirmation('') }
    finally { lock.current = false; setBusy(false) }
  }
  const setValue = field === 'confirmation' ? setConfirmation : setPin
  return <main className="min-h-screen bg-slate-100 p-4 text-slate-950">
    <header className="flex justify-end"><Link href="/login" className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">Admin</Link></header>
    <section className="mx-auto my-4 max-w-lg rounded-3xl bg-white p-6 shadow-lg">
      <h1 className="text-center text-3xl font-bold">Liberar totem</h1>
      <p className="my-3 text-center text-slate-600">{step === 'card' ? 'Leia o QR Code do seu cartão no leitor.' : `${name} — ${step === 'change' ? 'defina um novo PIN para continuar.' : 'informe seu PIN.'}`}</p>
      {step === 'change' && <p className="mb-3 rounded-xl bg-amber-50 p-3">Troca obrigatória no primeiro acesso ou após o vencimento. Use de 4 a 12 dígitos.</p>}
      <form onSubmit={submit}>
        {step === 'card' ? <input ref={scanner} aria-label="Leitura do cartão" value={cardId} onChange={e => scanned(e.target.value)} inputMode="none" autoComplete="off" maxLength={100} className="h-14 w-full rounded-xl border px-3" placeholder="Aguardando cartão…" /> : <>
          <label className="block font-semibold">{step === 'change' ? 'Novo PIN' : 'PIN'}<input aria-label="PIN" type="password" inputMode="none" autoComplete="off" value={pin} maxLength={12} onFocus={() => setField('pin')} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} className="my-2 h-14 w-full rounded-xl border px-4 text-center text-3xl tracking-widest" /></label>
          {step === 'change' && <label className="block font-semibold">Confirmar PIN<input aria-label="Confirmar PIN" type="password" inputMode="none" autoComplete="off" value={confirmation} maxLength={12} onFocus={() => setField('confirmation')} onChange={e => setConfirmation(e.target.value.replace(/\D/g, '').slice(0, 12))} className="my-2 h-14 w-full rounded-xl border px-4 text-center text-3xl tracking-widest" /></label>}
          <p className="text-center text-sm text-slate-500">{field === 'confirmation' ? 'Digitando confirmação' : 'Digitando PIN'}</p>
          <div className="my-4 grid grid-cols-3 gap-3">{['1','2','3','4','5','6','7','8','9','Limpar','0','⌫'].map(key => <button key={key} disabled={busy} type="button" onMouseDown={e => e.preventDefault()} onClick={() => setValue(value => key === 'Limpar' ? '' : key === '⌫' ? value.slice(0, -1) : (value + key).slice(0, 12))} className="h-16 rounded-xl bg-slate-100 text-2xl font-bold active:bg-blue-200">{key}</button>)}</div>
        </>}
        {error && <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
        <button disabled={busy} className="mt-3 h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white disabled:opacity-50">{busy ? 'Aguarde…' : step === 'card' ? 'Ler cartão' : step === 'change' ? 'Salvar PIN e liberar' : 'Liberar'}</button>
      </form>
      {step !== 'card' && <button disabled={busy} onClick={async () => { try { await request('logout', {}); setStep('card'); setPin(''); setConfirmation(''); setCardId(''); setError('') } catch { setError('Não foi possível encerrar a sessão.') } }} className="mt-4 w-full p-2">Usar outro cartão</button>}
    </section>
  </main>
}
