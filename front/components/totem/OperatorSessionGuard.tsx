'use client'
import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const paths = ['/', '/totem', '/date', '/preferencial', '/modalidades']
export default function OperatorSessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const protectedPage = paths.includes(pathname)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!protectedPage) return
    let disposed = false
    let inFlight = false
    async function check() {
      if (inFlight) return
      inFlight = true
      try {
        const response = await fetch('/api/totem-access/session', { cache: 'no-store' })
        if (disposed) return
        if (!response.ok) throw new Error()
        const state = await response.json()
        if (disposed) return
        if (!state.allowed) { window.location.replace('/login-totem'); return }
        setEnabled(state.enabled); setError('')
      } catch { if (!disposed) setError('Não foi possível verificar a liberação do totem. Aguarde a conexão retornar.') }
      finally { inFlight = false }
    }
    void check()
    const timer = setInterval(() => void check(), 30000)
    const focus = () => void check()
    window.addEventListener('focus', focus)
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [pathname, protectedPage])
  if (!protectedPage) return children
  if (error) return <main className="grid min-h-screen place-content-center gap-4 p-6 text-center"><p role="alert">{error}</p><Link href="/login" className="text-blue-700">Admin</Link></main>
  return <>{enabled && pathname === '/' && <button className="fixed right-4 top-2 z-40 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={async () => {
    try {
      const response = await fetch('/api/totem-access/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!response.ok) throw new Error()
      window.location.replace('/login-totem')
    } catch { setError('Não foi possível bloquear o totem. Tente novamente.') }
  }}>Bloquear totem</button>}{children}</>
}
