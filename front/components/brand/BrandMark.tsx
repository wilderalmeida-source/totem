'use client'
import GoldMark from '@/components/GoldMark'
import { hasBrandLogo } from '@/lib/brand'
import BrandLogo from './BrandLogo'
import { useBrand } from './useBrand'

// Marca pequena do canto superior das telas internas (prioridade, busca, modalidades).
// Com logo cadastrada na posição "canto superior", mostra a logo; senão, o símbolo dourado de sempre.
// Mantém a mesma classe do símbolo, então o tema continua decidindo onde ela aparece.
export default function BrandMark({ className }: { className: string }) {
  const brand = useBrand()
  if (brand && hasBrandLogo(brand) && brand.placement === 'header') return <BrandLogo brand={brand} className={`${className} brand-logo-mark`} />
  return <GoldMark className={className} />
}
