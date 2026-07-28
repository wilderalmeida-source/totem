'use server'

import { buscaAtendimentos, Atendimento } from "@/services/api"

export async function entregaDeExames(cd_paciente: number): Promise<Atendimento[]> {
  const hoje = new Date()

  const tresMesesAtras = new Date(hoje)
  tresMesesAtras.setMonth(hoje.getMonth() - 3)

  return buscaAtendimentos({
    cd_paciente,
    date: { from: tresMesesAtras, to: hoje },
    buscaStatus: "5",
    tipo: "entrega",
  })
}
