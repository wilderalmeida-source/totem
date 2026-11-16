'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import type { BrandMode, PublicBrand } from '@/lib/brand'

const LOGO_SLOTS: { mode: BrandMode; label: string; hint: string; preview: string }[] = [
  { mode: 'light', label: 'Logo para o modo claro', hint: 'Use uma versão escura ou colorida da logo.', preview: 'bg-white border-slate-200' },
  { mode: 'dark', label: 'Logo para o modo escuro', hint: 'Use uma versão clara (branca) da logo.', preview: 'bg-slate-900 border-slate-700' },
]

// Logo do estabelecimento: envio separado para claro e escuro (se só uma existir, vale para os dois)
// e a posição: canto superior OU no lugar do nome na saudação.
function BrandSettings() {
  const [brand, setBrand] = useState<PublicBrand | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { fetch('/api/brand', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(Error('Não foi possível carregar a logo.'))).then(setBrand).catch(e => setMessage(e.message)) }, [])
  async function call(input: RequestInfo, init: RequestInit, done: string) {
    setBusy(true); setMessage('')
    try {
      const response = await fetch(input, init)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw Error(data?.error ?? 'Não foi possível salvar.')
      setBrand(data); setMessage(done)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao salvar.') }
    finally { setBusy(false) }
  }
  const upload = (mode: BrandMode, file: File | undefined) => {
    if (!file) return
    const form = new FormData(); form.append('mode', mode); form.append('file', file)
    return call('/api/brand', { method: 'POST', body: form }, 'Logo enviada. Os terminais mostrarão a nova logo ao recarregar a página.')
  }
  const remove = (mode: BrandMode) => call(`/api/brand?mode=${mode}`, { method: 'DELETE' }, 'Logo removida.')
  const place = (placement: 'header' | 'welcome') => call('/api/brand', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placement }) }, 'Posição da logo salva.')
  const hasLogo = Boolean(brand?.lightUrl)
  return <section className="mt-12 border-t border-slate-200 pt-10">
    <h2 className="text-2xl font-bold">Logo do estabelecimento</h2>
    <p className="mt-2 text-slate-600">PNG, JPEG ou WebP de até 5 MB. A imagem é ajustada automaticamente (bordas vazias cortadas e tamanho reduzido), sem prejudicar o layout. Se enviar só uma, ela vale para os dois modos.</p>
    <div className="my-6 grid gap-5 sm:grid-cols-2">{LOGO_SLOTS.map(slot => {
      const url = slot.mode === 'light' ? brand?.lightUrl : brand?.darkUrl
      const own = brand?.uploaded[slot.mode]
      return <div key={slot.mode} className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <h3 className="font-bold">{slot.label}</h3><p className="mt-1 text-sm text-slate-600">{slot.hint}</p>
        <div className={`my-4 flex h-28 items-center justify-center rounded-xl border p-4 ${slot.preview}`}>
          {url ? <img src={url} alt={slot.label} className="max-h-20 max-w-full object-contain" /> : <span className="text-sm text-slate-400">Sem logo</span>}
        </div>
        {url && !own && <p className="mb-3 text-xs text-slate-500">Usando a logo do outro modo.</p>}
        <div className="flex flex-wrap gap-3">
          <label className={`cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white ${busy || !brand ? 'pointer-events-none opacity-50' : ''}`}>
            {own ? 'Trocar imagem' : 'Enviar imagem'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy || !brand} onChange={event => { void upload(slot.mode, event.target.files?.[0]); event.target.value = '' }} />
          </label>
          {own && <button type="button" disabled={busy} onClick={() => remove(slot.mode)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Remover</button>}
        </div>
      </div>
    })}</div>
    <fieldset disabled={busy || !hasLogo} className="disabled:opacity-60">
      <legend className="mb-3 font-bold">Onde mostrar a logo</legend>
      {[['header', 'No canto superior', 'A saudação continua com o nome da clínica em texto.'], ['welcome', 'No lugar do nome da clínica', 'Fica "Olá, seja bem-vindo ao [logo]" e o canto superior volta ao padrão.']].map(([value, label, hint]) =>
        <label key={value} className="mb-3 flex items-start gap-3"><input className="mt-1" type="radio" name="placement" value={value} checked={brand?.placement === value} onChange={() => place(value as 'header' | 'welcome')} /><span><strong>{label}</strong><span className="block text-sm text-slate-600">{hint}</span></span></label>)}
      {!hasLogo && <p className="text-sm text-slate-500">Envie uma logo para escolher a posição.</p>}
    </fieldset>
    {message && <p role="status" className="mt-4">{message}</p>}
  </section>
}

export default function ThemesPage() {
  const [theme, setVisual] = useState('theme2')
  const [mode, setMode] = useState('light')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const { setTheme } = useTheme()
  useEffect(() => { fetch('/api/theme-settings', { cache: 'no-store' }).then(async r => {
    if (!r.ok) throw Error('Não foi possível carregar os temas. Confira a atualização do banco.')
    const data = await r.json(); setVisual(data.theme); setMode(data.mode); setReady(true)
  }).catch(e => setMessage(e.message)) }, [])
  async function save() {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/theme-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme, mode }) })
      if (!response.ok) throw Error('Não foi possível salvar o tema.')
      document.documentElement.dataset.visualTheme = theme
      setTheme(mode)
      try { localStorage.setItem('totem-visual-theme', theme) } catch { /* Saved in PostgreSQL even when browser storage is unavailable. */ }
      setMessage('Tema salvo. Os outros terminais aplicarão a seleção ao recarregar a página.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro ao salvar.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-4xl">
    <h1 className="text-3xl font-bold">Temas do sistema</h1><p className="mt-2 text-slate-600">Escolha o visual e a aparência dos terminais.</p>
    <div className="my-8 grid gap-5 sm:grid-cols-2">{[['theme1', 'Tema 1', 'Cartões de serviços e tons de azul'], ['theme2', 'Tema 2', 'Cartões de serviços e tons de dourado']].map(([value, title, description]) => <button key={value} disabled={!ready || busy} aria-pressed={theme === value} onClick={() => setVisual(value)} className={`rounded-2xl border-2 bg-white p-6 text-left ${theme === value ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
      <div aria-hidden="true" className={`mb-4 flex h-32 gap-2 rounded-xl p-4 ${value === 'theme1' ? 'bg-indigo-950' : 'bg-stone-900'}`}>{[0, 1, 2].map(i => <span key={i} className={`flex-1 rounded-lg ${value === 'theme1' ? 'bg-blue-700' : 'bg-amber-500'}`} />)}</div>
      <h2 className="text-xl font-bold">{title}</h2><p className="mt-2 text-slate-600">{description}</p>
    </button>)}</div>
    <fieldset disabled={!ready || busy} className="mb-6 flex gap-5"><legend className="mb-3 font-bold">Aparência</legend>{[['light', 'Claro'], ['dark', 'Escuro']].map(([value, label]) => <label key={value} className="flex items-center gap-2"><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} />{label}</label>)}</fieldset>
    <button disabled={!ready || busy} onClick={save} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar tema'}</button>
    {message && <p role="status" className="mt-4">{message}</p>}
    <BrandSettings />
  </div></main>
}
