'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { KeyRound, RefreshCw, Upload, ShieldCheck, AlertCircle } from 'lucide-react'

type Status = { state: string; allowed: boolean; installationId: string | null; licenseId: string | null;
  licenseExpiresAt: string | null; authorizationExpiresAt: string | null; lastValidatedAt: string | null;
  version: number | null; errorCode: string | null }
const labels: Record<string, string> = { active: 'Licença ativa', offline: 'Ativa com autorização armazenada', blocked: 'Licença bloqueada', expired: 'Licença expirada', unavailable: 'Autorização vencida', unconfigured: 'Aguardando ativação', starting: 'Verificando licença', storage_error: 'Falha no armazenamento', clock_error: 'Confira o relógio do servidor', configuration_error: 'Configure o ambiente de licenciamento do backend' }
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString('pt-BR') : '—'

export default function LicensePage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const load = useCallback(async () => {
    const response = await fetch('/api/license', { cache: 'no-store', signal: AbortSignal.timeout(22000) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Não foi possível consultar a licença.')
    setStatus(result)
  }, [])
  useEffect(() => { void load().catch(e => setError(e.message)) }, [load])
  async function refresh() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/license/refresh', { method: 'POST', signal: AbortSignal.timeout(22000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setStatus(result)
      setMessage(result.errorCode ? 'Não foi possível obter uma nova autorização. Confira o status e os prazos abaixo.' : 'Status atualizado com o serviço de licenças.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao verificar a licença.') }
    finally { setBusy(false) }
  }
  async function activate() {
    if (!file || !confirmed) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (!file.size || file.size > 8192) throw new Error('Selecione um arquivo JSON de até 8 KB.')
      const content = await file.text()
      try { JSON.parse(content) } catch { throw new Error('O arquivo selecionado não contém um JSON válido.') }
      const response = await fetch('/api/license', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: content, signal: AbortSignal.timeout(22000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'A licença não pôde ser ativada.')
      setStatus(result)
      setMessage(result.allowed ? 'Licença validada e salva no backend. Os totens estão liberados.' : 'A licença foi verificada, mas está bloqueada ou expirada.')
      setFile(null); setConfirmed(false); if (input.current) input.current.value = ''
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao ativar. Atualize o status antes de repetir.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-slate-100 p-6 md:p-10"><div className="mx-auto max-w-4xl space-y-6">
    <header><KeyRound className="mb-4 text-blue-600" size={32} /><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Administração</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Licença do sistema</h1><p className="mt-3 text-slate-600">Ative esta instalação enviando o arquivo de acesso baixado no painel de licenças.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">{message}</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="flex items-center gap-2 text-xl font-bold">{status?.allowed ? <ShieldCheck className="text-emerald-600" /> : <AlertCircle className="text-amber-600" />}{status ? labels[status.state] || status.state : 'Consultando status…'}</h2><button onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} />Verificar agora</button></div>
      <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">{[
        ['Instalação', status?.installationId || 'Nenhuma licença enviada'], ['Versão da licença', status?.version ?? '—'],
        ['Validade da licença', date(status?.licenseExpiresAt)], ['Autorização offline válida até', date(status?.authorizationExpiresAt)],
        ['Última validação', date(status?.lastValidatedAt)], ['Novas operações', status?.allowed ? 'Liberadas' : 'Aguardando licença válida'],
      ].map(([title, value]) => <div key={title}><dt className="text-slate-500">{title}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>)}</dl>
      {status?.errorCode && <p className="mt-5 break-words rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Não foi possível renovar a autorização. Código de diagnóstico: {status.errorCode}</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Enviar licença</h2><p className="mt-2 text-sm leading-6 text-slate-600">No painel de licenças, cadastre esta instalação ou gere uma nova credencial e baixe o arquivo JSON. Selecione esse arquivo abaixo. O servidor precisa de internet para validar a ativação.</p>
      <label className="mt-5 block rounded-xl border-2 border-dashed border-slate-300 p-6"><span className="mb-3 flex items-center gap-2 font-semibold"><Upload size={19} />Arquivo de acesso da instalação</span><input ref={input} type="file" accept=".json,application/json" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirmed(false); setError(''); setMessage('') }} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700" /><span className="mt-3 block text-xs text-slate-500">JSON de até 8 KB. Não envie o arquivo de senha do administrador.</span></label>
      <label className="mt-5 flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />Confirmo que o arquivo corresponde a esta instalação e autorizo substituir a credencial atual, se houver.</label>
      <button disabled={busy || !file || !confirmed} onClick={activate} className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Verificando…' : 'Validar e ativar licença'}</button>
    </section>
    <p className="text-sm leading-6 text-slate-500">A licença vale para o backend desta instalação e seus totens conectados. A verificação ocorre em segundo plano a cada cinco minutos. Reiniciar os containers preserva a ativação quando o volume de licenças está configurado.</p>
  </div></main>
}
