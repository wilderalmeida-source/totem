'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PATIENT_IDLE_MS } from '@/lib/patient-session-config'
import { endPatientSession, patientSessionRequest } from '@/lib/patient-session-client'

type Deadline = { expiresAt: number; absoluteExpiresAt: number }
const totemPaths = ['/totem', '/date', '/modalidades', '/preferencial']

export default function PatientSessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const active = totemPaths.includes(pathname)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const initialized = useRef(false)
  const ending = useRef(false)
  const deadline = useRef<Deadline | null>(null)
  const lastActivity = useRef(Date.now())
  const lastTouch = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      if (pathname === '/' || pathname === '/preferencial' || (!active && deadline.current)) {
        setReady(false)
        try { await endPatientSession(); deadline.current = null }
        catch { if (!cancelled) setError(true); return }
      } else if (!initialized.current && active) {
        try { deadline.current = await patientSessionRequest<Deadline>('GET') }
        catch {
          sessionStorage.removeItem('pacienteModalidade')
          if (pathname === '/modalidades') { window.location.replace('/'); return }
        }
      }
      if (!cancelled) {
        initialized.current = true
        lastActivity.current = Date.now()
        setReady(true)
      }
    }
    void initialize()
    return () => { cancelled = true }
  }, [pathname, active])

  useEffect(() => {
    if (!active) return
    async function finish(reason = 'inatividade_ou_expiracao') {
      if (ending.current) return
      ending.current = true
      setReady(false)
      sessionStorage.removeItem('pacienteModalidade')
      try { await endPatientSession(reason); window.location.replace('/') }
      catch { setError(true) }
    }
    function expired() {
      const now = Date.now()
      return now - lastActivity.current >= PATIENT_IDLE_MS || Boolean(deadline.current && now >= Math.min(deadline.current.expiresAt, deadline.current.absoluteExpiresAt))
    }
    function activity(event: Event) {
      if (!event.isTrusted) return
      if (expired()) { void finish(); return }
      lastActivity.current = Date.now()
      if (deadline.current && Date.now() - lastTouch.current > 20000) {
        lastTouch.current = Date.now()
        void patientSessionRequest<Deadline>('PATCH').catch(() => { void finish() })
      }
    }
    function identified(event: Event) {
      deadline.current = (event as CustomEvent<Deadline>).detail
      lastActivity.current = Date.now()
      lastTouch.current = Date.now()
    }
    const cleared = () => { deadline.current = null }
    const sessionExpired = () => { void finish('sessao_rejeitada') }
    const pageShown = (event: PageTransitionEvent) => { if (event.persisted || expired()) void finish() }
    const visibility = () => { if (document.visibilityState === 'visible' && expired()) void finish() }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('patient-session-active', identified)
    window.addEventListener('patient-session-cleared', cleared)
    window.addEventListener('patient-session-expired', sessionExpired)
    window.addEventListener('pageshow', pageShown)
    document.addEventListener('visibilitychange', visibility)
    const timer = setInterval(() => { if (expired()) void finish() }, 1000)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('patient-session-active', identified)
      window.removeEventListener('patient-session-cleared', cleared)
      window.removeEventListener('patient-session-expired', sessionExpired)
      window.removeEventListener('pageshow', pageShown)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [active])

  if (error) return <div className="flex h-screen flex-col items-center justify-center gap-6"><p>Não foi possível encerrar o atendimento.</p><button className="rounded bg-blue-600 p-4 text-white" onClick={() => window.location.replace('/')}>Tentar novamente</button></div>
  if (!ready) return <div className="flex h-screen items-center justify-center">Aguarde...</div>
  return <>{children}</>
}
