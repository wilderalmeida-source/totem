'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PanelCall } from '@/lib/panel-call'
import { choosePartnerLogo, type PartnerLogo, type PartnershipsConfig } from '@/lib/partnerships'

export type PartnerCallView = { call: PanelCall; logo: PartnerLogo }

export function usePartnerCall(panelId: number) {
  const [view, setView] = useState<PartnerCallView | null>(null)
  const config = useRef<PartnershipsConfig | null>(null)
  const lastLogo = useRef<string>()
  const current = useRef<{ id: string; minimumUntil: number } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    config.current = null
    current.current = null
    lastLogo.current = undefined
    setView(null)
    let stopped = false
    let refresh: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/partnerships', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
        if (!response.ok) return
        const data: PartnershipsConfig = await response.json()
        if (!stopped) {
          config.current = data
          if (!data.enabled) { current.current = null; setView(null) }
        }
      } catch { /* A failed logo configuration request must not interrupt a call. */ }
      finally { if (!stopped) refresh = setTimeout(() => void load(), 30000) }
    }
    void load()
    return () => {
      stopped = true
      mounted.current = false
      controller.abort()
      clearTimeout(refresh)
      clearTimeout(hideTimer.current)
      current.current = null
    }
  }, [panelId])

  const finish = useCallback((id: string) => {
    if (!mounted.current || current.current?.id !== id) return
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (mounted.current && current.current?.id === id) { current.current = null; setView(null) }
    }, Math.max(0, current.current.minimumUntil - Date.now()))
  }, [])

  const show = useCallback((call: PanelCall, hasAudio: boolean) => {
    if (!mounted.current || current.current?.id === call.id) return
    clearTimeout(hideTimer.current)
    const settings = config.current
    const logo = settings ? choosePartnerLogo(settings, panelId, lastLogo.current) : null
    if (!settings || !logo) { current.current = null; setView(null); return }
    lastLogo.current = logo.id
    current.current = { id: call.id, minimumUntil: Date.now() + settings.displaySeconds * 1000 }
    setView({ call, logo })
    if (!hasAudio) finish(call.id)
  }, [finish, panelId])

  return { view, show, finish }
}
