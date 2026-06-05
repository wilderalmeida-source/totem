'use server'

import {
  cadastraAtendimento,
  atualizaAtendimentos,
  cadastraSenha,
  buscaModalidades,
  buscaAtendimentos,
  buscaSenhas,
  Atendimento,
  Senha,
} from "@/services/api"
import { entregaDeExames } from "@/services/entregadeexames"
import { arrayID } from "@/lib/arrayID"

type Props = {
  cd_paciente: number
  preferencial: number | null | undefined
  servico: string | null
}

// Busca o nome da modalidade pelo código
async function resolveModalidade(cd_modalidade: number): Promise<string> {
  const modalidades = await buscaModalidades(cd_modalidade)
  return modalidades[0]?.ds_modalidade ?? ""
}

// Monta a string da senha ex: "FN-42" ou "PR-7"
function montarDsSenha(
  preferencial: number | null | undefined,
  fila: string,
  nr_senha: number | undefined
): string {
  return `${preferencial !== 0 ? "P" : "F"}${fila}-${nr_senha}`
}

// Cria um novo atendimento e retorna os dados resolvidos
async function novoAtendimentoComModalidade(cd_paciente: number) {
  const newAtendimentos = await cadastraAtendimento({ cd_paciente })
  const atendimento = newAtendimentos[0]
  const ds_modalidade = await resolveModalidade(atendimento.salas.cd_modalidade)
  return { atendimento, cd_modalidade: atendimento.salas.cd_modalidade, ds_modalidade }
}

// ─── Fluxo: Entrega de Exames (servico === "C") ───────────────────────────────
async function gerarSenhaEntrega(cd_paciente: number, preferencial: number | null | undefined) {
  const atendimentos = await entregaDeExames(cd_paciente)
  const modalidade_totem = await buscaModalidades()

  let exameAtendimento: Atendimento[] = []
  let nrControle: number | undefined
  let cd_modalidade = 0
  let ds_modalidade = ""

  if (atendimentos.length > 0) {
    const atendimentosValidos = atendimentos.filter(
      (i) => i.nr_controle && i.salas.cd_modalidade !== modalidade_totem[0].cd_modalidade
    )

    if (atendimentosValidos.length === 0) {
      const { atendimento, cd_modalidade: cdMod, ds_modalidade: dsMod } =
        await novoAtendimentoComModalidade(cd_paciente)
      exameAtendimento = [atendimento]
      nrControle = atendimento.cd_atendimento
      cd_modalidade = cdMod
      ds_modalidade = dsMod
    } else {
      exameAtendimento = [atendimentos[0]]
      nrControle = atendimentosValidos[0].nr_controle
      cd_modalidade = atendimentosValidos[0].salas.cd_modalidade
      ds_modalidade = await resolveModalidade(cd_modalidade)
    }
  } else {
    const { atendimento, cd_modalidade: cdMod, ds_modalidade: dsMod } =
      await novoAtendimentoComModalidade(cd_paciente)
    exameAtendimento = [atendimento]
    nrControle = atendimento.cd_atendimento
    cd_modalidade = cdMod
    ds_modalidade = dsMod
  }

  const fila = "R"
  const criarSenha = await cadastraSenha({
    nr_modalidade: cd_modalidade,
    nr_senha: nrControle ? nrControle % 10000 : undefined,
    sn_preferencial: preferencial !== 0,
    ds_opcao: "C",
    ds_local: ds_modalidade,
    ds_fila: fila,
    method: "C",
    sn_especial: preferencial === 2,
    nr_controle: nrControle,
  })

  const ds_senha = montarDsSenha(preferencial, fila, criarSenha.nr_senha)
  await atualizaAtendimentos(arrayID(exameAtendimento), ds_senha, criarSenha.cd_senha)
}

// ─── Fluxo: Atendimento / Agendamento ────────────────────────────────────────
async function gerarSenhaAtendimento(
  cd_paciente: number,
  preferencial: number | null | undefined,
  servico: string | null
) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const atendimentos = await buscaAtendimentos({
    cd_paciente,
    date: { from: hoje, to: hoje },
  })

  const statusValidos = [2, 3, 7]
  let exameAtendimento: Atendimento[] = []
  let novoAtendimento = false

  if (atendimentos?.length > 0) {
    exameAtendimento = atendimentos.filter(
      (item) =>
        item.exames &&
        item.exames.length > 0 &&
        item.ds_status != null &&
        statusValidos.includes(item.ds_status)
    )
  }

  if (exameAtendimento.length === 0) {
    const newAtendimentos = await cadastraAtendimento({ cd_paciente })
    exameAtendimento = [newAtendimentos[0]]
    novoAtendimento = true
  }

  const cd_modalidade = exameAtendimento[0].salas.cd_modalidade
  let ds_modalidade = await resolveModalidade(cd_modalidade)

  if (novoAtendimento && servico === "A") {
    ds_modalidade = "ATENDIMENTO PRÉ"
  }

  const fila = novoAtendimento ? "N" : ds_modalidade[0]

  const senhas = await buscaSenhas()
  const lengthSenha = (senhas.senhas?.length ?? 0) + 1

  const criarSenha: Senha = await cadastraSenha({
    nr_senha: lengthSenha,
    nr_modalidade: cd_modalidade,
    sn_preferencial: preferencial !== 0,
    ds_opcao: servico,
    ds_local: ds_modalidade,
    ds_fila: fila,
    sn_especial: preferencial === 2,
    method: "A",
  })

  const ds_senha = montarDsSenha(preferencial, fila, criarSenha.nr_senha)
  await atualizaAtendimentos(arrayID(exameAtendimento), ds_senha, criarSenha.cd_senha)
}

// ─── Entry point ─────────────────────────────────────────────────────────────
export async function gerarSenha({ cd_paciente, preferencial, servico }: Props) {
  if (!cd_paciente) {
    console.error("Paciente inválido")
    return
  }

  if (servico === "C") {
    await gerarSenhaEntrega(cd_paciente, preferencial)
  } else {
    await gerarSenhaAtendimento(cd_paciente, preferencial, servico)
  }
}