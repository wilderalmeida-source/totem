'use client'

import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'
  const label = dark ? 'Usar tema claro' : 'Usar tema escuro'
  return <button type="button" disabled={!mounted} aria-label={label} title={label}
    onClick={() => setTheme(dark ? 'light' : 'dark')}
    className="theme-toggle fixed bottom-4 right-4 z-50 flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 print:hidden">
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    <span>{dark ? 'Tema claro' : 'Tema escuro'}</span>
  </button>
}

function SavedAppearance() {
  const { setTheme } = useTheme()
  useEffect(() => {
    let active = true
    try { document.documentElement.dataset.visualTheme = localStorage.getItem('totem-visual-theme') || 'theme2' } catch { /* Browser storage may be unavailable. */ }
    const controller = new AbortController()
    fetch('/api/theme-settings', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) return
      const value = await response.json()
      if (!active || !['theme1', 'theme2'].includes(value.theme) || !['light', 'dark'].includes(value.mode)) return
      document.documentElement.dataset.visualTheme = value.theme
      setTheme(value.mode)
      try { localStorage.setItem('totem-visual-theme', value.theme) } catch { /* Theme still applies without local storage. */ }
    }).catch(() => {})
    return () => { active = false; controller.abort() }
  }, [setTheme])
  return null
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return <NextThemeProvider attribute="class" storageKey="totem-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    {children}
    <SavedAppearance />
    <ThemeToggle />
  </NextThemeProvider>
}
