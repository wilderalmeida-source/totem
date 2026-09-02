import Base from '@/components/ui/base'
import Servicos from '@/components/ui/servicos'
import Historic from '@/components/ui/historic'
import AdminAccessTrigger from '@/components/AdminAccessTrigger'

export const dynamic = 'force-dynamic'

const services = [
  { servico: 'Agendar Exames', ID: 'D' },
  { servico: 'Atendimento', ID: 'B' },
  { servico: 'Entrega de Exames', ID: 'C' },
]

export default function Home() {
  const empresa = process.env.EMPRESA_NOME || 'Nossa Empresa'

  return (
    <Base type="home">
      <div className="flex w-full h-full flex-col">
        <div>
          <h2 className="text-6xl text-center">
            Olá, seja bem vindo ao <AdminAccessTrigger companyName={empresa} />!
          </h2>
          <h6 className="text-4xl text-center mt-4">Escolha uma opção abaixo.</h6>
        </div>
        <Servicos servicos={services} />
        <div className="flex flex-col h-full justify-end mb-5 xl:h-[700px]">
          <Historic />
        </div>
      </div>
    </Base>
  )
}
