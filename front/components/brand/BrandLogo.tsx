import type { PublicBrand } from '@/lib/brand'

// Duas imagens (claro/escuro) e o CSS mostra a do modo atual: troca de modo sem recarregar e sem piscar.
export default function BrandLogo({ brand, className = '', alt = 'Logo do estabelecimento' }: { brand: PublicBrand; className?: string; alt?: string }) {
  if (!brand.lightUrl || !brand.darkUrl) return null
  if (brand.lightUrl === brand.darkUrl) {
    return <span className={`brand-logo ${className}`}><img className="brand-logo-img" src={brand.lightUrl} alt={alt} draggable={false} /></span>
  }
  return <span className={`brand-logo ${className}`}>
    <img className="brand-logo-img brand-logo-for-light" src={brand.lightUrl} alt={alt} draggable={false} />
    <img className="brand-logo-img brand-logo-for-dark" src={brand.darkUrl} alt={alt} draggable={false} />
  </span>
}
