'use client'
import { ReactNode, useEffect, useState } from 'react'

export default function LicenseAvailability({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => {
    let mounted = true, controller: AbortController | undefined, running = false
    const check = async () => {
      if (running) return
      running = true; controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 6000)
      try {
        const response = await fetch('/api/license/availability', { cache: 'no-store', signal: controller.signal })
        const value = await response.json()
        if (mounted) setAllowed(response.ok && value.allowed === true)
      } catch { if (mounted) setAllowed(false) }
      finally { clearTimeout(timeout); running = false }
    }
    void check(); const timer = setInterval(() => { void check() }, 30000)
    return () => { mounted = false; clearInterval(timer); controller?.abort() }
  }, [])
  if (allowed) return children
  return <div role="status" className="mx-auto my-10 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="text-2xl font-bold text-slate-800">{allowed === null ? 'Verificando disponibilidade…' : 'Totem temporariamente indisponível'}</h2>{allowed === false && <p className="mt-3 text-xl text-slate-600">Por favor, procure a recepção para continuar seu atendimento.</p>}</div>
}
