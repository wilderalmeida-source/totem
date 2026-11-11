'use client'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

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
  </div></main>
}
