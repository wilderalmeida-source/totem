'use client'
import { useEffect, useState } from 'react'
import type { PublicBrand } from '@/lib/brand'

// Uma consulta por carregamento de página, compartilhada por todos os componentes da tela.
let cached: Promise<PublicBrand | null> | null = null
export function loadBrand() {
  cached ??= fetch('/api/brand', { cache: 'no-store' }).then(r => r.ok ? r.json() as Promise<PublicBrand> : null).catch(() => null)
  return cached
}

export function useBrand(initial: PublicBrand | null = null) {
  const [brand, setBrand] = useState<PublicBrand | null>(initial)
  useEffect(() => {
    let active = true
    loadBrand().then(value => { if (active && value) setBrand(value) })
    return () => { active = false }
  }, [])
  return brand
}
