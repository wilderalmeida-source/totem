'use client'
import { useEffect, useState } from 'react'
import { Building2, Volume2 } from 'lucide-react'
import { tocaAtencao } from '@/services/api/atencao'
import AdminAccessTrigger from '@/components/AdminAccessTrigger'
import GoldMark from '@/components/GoldMark'

export default function HomeThemeHeader({ company, description }: { company: string; description?: string }) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  return <header className="home-modern-header">
    <div className="home-brand"><span className="home-brand-icon"><Building2 size={26} /></span><GoldMark className="theme2-brand-mark" /><div><strong><AdminAccessTrigger companyName={company} /></strong>{description && <small className="theme2-brand-description">{description}</small>}</div></div>
    <div className="home-header-actions"><div className="home-clock"><time>{now?.toLocaleTimeString('pt-BR') ?? '--:--:--'}</time><span>{now?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }) ?? ''}</span></div>
      <button aria-label="Reproduzir aviso de silêncio" title="Silêncio" onClick={() => tocaAtencao('play')}><Volume2 size={24} /></button>
    </div>
  </header>
}
