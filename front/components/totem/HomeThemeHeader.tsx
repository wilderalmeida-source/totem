'use client'
import { useEffect, useState } from 'react'
import { CalendarDays, Volume2, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { tocaAtencao } from '@/services/api/atencao'
import AdminAccessTrigger from '@/components/AdminAccessTrigger'

export default function HomeThemeHeader({ company, description }: { company: string; description?: string }) {
  const [now, setNow] = useState<Date | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  return <header className="home-modern-header">
    <div className="home-brand"><span className="home-brand-icon"><CalendarDays size={26} /></span><svg className="theme2-brand-mark" width="36" height="34" viewBox="0 0 40 36" aria-hidden="true"><path d="M4 31V21C10 10 22 6 36 6C20 12 14 20 12 31Z" fill="#b68b28" /><path d="M24 31C24 21 28 13 37 7C31 18 30 24 30 31Z" fill="#e2bf62" /></svg><div><strong><AdminAccessTrigger companyName={company} /></strong>{description && <small className="theme2-brand-description">{description}</small>}</div></div>
    <div className="home-header-actions"><div className="home-clock"><time>{now?.toLocaleTimeString('pt-BR') ?? '--:--:--'}</time><span>{now?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }) ?? ''}</span></div>
      <button aria-label="Reproduzir aviso de silêncio" title="Silêncio" onClick={() => tocaAtencao('play')}><Volume2 size={24} /></button>
      <button className="home-mode-toggle" aria-label="Alternar aparência" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>{resolvedTheme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}</button>
    </div>
  </header>
}
