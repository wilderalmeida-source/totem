'use client'
import { useEffect, useState } from 'react'

/** Relógio padrão das telas do totem (o painel de chamadas tem o seu). Hora com segundos e data por extenso. */
export default function TotemClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  return <div className="totem-clock home-clock">
    <time>{now?.toLocaleTimeString('pt-BR') ?? '--:--:--'}</time>
    <span>{now?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }) ?? ''}</span>
  </div>
}
