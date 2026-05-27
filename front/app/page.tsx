import React from 'react'
import Base from '../components/base'
import Servicos from '../components/servicos'
import Historic from '../components/historic'

export const dynamic = 'force-dynamic'; 

export default async function Home() {
  const services = [{ servico: "Agendamento", ID: 'D' }, { servico: "Atendimento", ID: 'B' }, { servico: "Entrega de Exames", ID: 'C' }]
  
  // Como a Home é servidora, ela lê do Docker e injeta direto no texto do HTML
  const empresa = process.env.EMPRESA_NOME || "Nossa Empresa"

  return (
    <Base type={'home'} props={
      <div className="flex w-full h-full flex-col">
        <div>
          <h2 className="text-6xl text-center">Olá, seja bem vindo ao {empresa}!</h2>
          <h6 className="text-4xl text-center mt-4">Escolha uma opção abaixo.</h6>
        </div>
        {services && <Servicos servicos={services} />}
        <div className="flex flex-col h-full justify-end mb-5 xl:h-[700px]">
          <Historic />
        </div>
      </div>
    } />
  )
}