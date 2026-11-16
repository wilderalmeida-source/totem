import Base from '@/components/ui/base'
import Servicos from '@/components/ui/servicos'
import Historic from '@/components/ui/historic'
import AdminAccessTrigger from '@/components/AdminAccessTrigger'
import LicenseAvailability from '@/components/totem/LicenseAvailability'
import HomeThemeHeader from '@/components/totem/HomeThemeHeader'
import BrandLogo from '@/components/brand/BrandLogo'
import { EMPTY_BRAND, hasBrandLogo, publicBrand } from '@/lib/brand'
import { readBrand } from '@/lib/brand-storage'

export const dynamic = 'force-dynamic'

const services = [
  { servico: 'Agendar Exames', ID: 'D' },
  { servico: 'Atendimento', ID: 'B' },
  { servico: 'Entrega de Exames', ID: 'C' },
]

export default async function Home() {
  const empresa = process.env.EMPRESA_NOME || 'Nossa Empresa'
  // Logo no canto superior OU na saudação, nunca nos dois; sem logo, tudo fica como antes.
  const brand = publicBrand(await readBrand().catch(() => EMPTY_BRAND))
  const logoNoTopo = hasBrandLogo(brand) && brand.placement === 'header'
  const logoNaSaudacao = hasBrandLogo(brand) && brand.placement === 'welcome'

  return (
    <Base type="home">
      <div className="home-screen flex w-full h-full flex-col">
        <HomeThemeHeader company={empresa} description={process.env.EMPRESA_DESCRICAO || 'Atendimento e resultados'} logo={logoNoTopo ? brand : null} />
        <div className="home-welcome">
          <h2 className="text-6xl text-center">
            Olá, seja bem-vindo ao {logoNaSaudacao
              ? <AdminAccessTrigger companyName={empresa}><BrandLogo brand={brand} className="brand-logo-welcome" alt={empresa} /></AdminAccessTrigger>
              : <AdminAccessTrigger companyName={empresa} />}
          </h2>
          <h6 className="text-4xl text-center mt-4">Toque em uma das opções abaixo para começar.</h6>
        </div>
        <LicenseAvailability><Servicos servicos={services} /></LicenseAvailability>
        <div className="home-history flex flex-col h-full justify-end mb-5 xl:h-[700px]">
          <Historic />
        </div>
      </div>
    </Base>
  )
}
