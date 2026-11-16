import { prisma } from '../../../config/prismaDB'
import { PrismaLog } from '../../../config/prismalog'
import { configPainelCache, ttlCache } from '../../lib/painel-caches'
const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1
// Convenção do sistema: o Clinux grava hora de parede de Brasília em colunas sem fuso, que o Prisma lê
// como UTC. Então "agora no Brasil" = UTC - 3 h, e todos os ajustes são feitos com os métodos UTC.
// (Antes usava setHours, que depende do TZ do servidor: com TZ=America/Sao_Paulo, entre 00:00 e 03:00
// o "hoje" virava o dia anterior e a numeração das senhas misturava os dias.)
export function getAgoraBrasil() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

export function getHojeBrasil() {
  const hoje = getAgoraBrasil()
  hoje.setUTCHours(0, 0, 0, 0)
  return hoje
}

export function montarDsSenha(
  preferencial: number | null | undefined,
  fila: string,
  nr_senha: number | null | undefined
) {
  return `${preferencial !== 0 ? 'P' : 'N'}${fila}-${nr_senha}`
}

// Nome da modalidade muda raramente: 5 min em memória evitam uma ida ao banco clínico a cada senha.
const modalidadeCache = ttlCache<string>(5 * 60_000)
export async function resolveModalidade(cd_modalidade: number) {
  return modalidadeCache(String(cd_modalidade), async () => {
    const modalidade = await prisma.modalidades.findFirst({
      where: { cd_modalidade },
      select: { ds_modalidade: true },
    })
    return modalidade?.ds_modalidade ?? ''
  })
}

export async function novoAtendimentoTotem(cd_paciente: number) {
  try {
    const cdSalaTotem = Number(process.env.IDSALA);
    const cdMedicoTotem = Number(process.env.IDMEDICO);

    if (!cdSalaTotem) {
      throw new Error("IDSALA não configurado no .env");
    }

    if (!cdMedicoTotem) {
      throw new Error("IDMEDICO não configurado no .env");
    }

    return await prisma.$transaction(async (tx) => {
      const atendimento = await tx.atendimentos.create({
        data: {
          cd_paciente,
          cd_sala: cdSalaTotem,
          cd_medico: cdMedicoTotem,
          dt_data: getHojeBrasil(),
          ds_status: 2,
          cd_funcionario: FUNCIONARIO,
        },
        include: {
          salas: true,
          exames: true,
        },
      });

      await tx.atendimentos.update({
        where: {
          cd_atendimento: atendimento.cd_atendimento,
        },
        data: {
          nr_controle: atendimento.cd_atendimento,
          cd_funcionario: FUNCIONARIO,
        },
      });

      return {
        ...atendimento,
        nr_controle: atendimento.cd_atendimento,
      };
    });
  } catch (error: any) {
    console.error("Erro em novoAtendimentoTotem:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    throw error;
  }
}

type ServicoPainel = 'atendimento' | 'marcacao' | 'resultado'

function servicoParaConfig(servico: string): ServicoPainel {
  if (servico === 'C') return 'resultado'
  if (servico === 'D') return 'marcacao'
  return 'atendimento'
}

export async function resolverIpPainelPorModalidade(
  servico: string,
  nr_modalidade: number
) {
  // IP_PAINEL corresponde ao env.backend; aceita o nome legado durante a transicao.
  const IP_PADRAO = process.env.IP_PAINEL?.trim() || process.env.IPPAINEL?.trim() || ''

  const config = await configPainelCache('configuracao_painel', () => PrismaLog.configuracao_painel.findUnique({
    where: { id: 1 },
  })) as Awaited<ReturnType<typeof PrismaLog.configuracao_painel.findUnique>>

  if (!config?.ativo) {
    return IP_PADRAO
  }

  const paineis = (config.paineis as any[]) ?? []
  const servicoConfig = servicoParaConfig(servico)

  const painelUniversal = paineis.find(
    (painel) =>
      painel.ativo &&
      painel.universal?.[servicoConfig] === true
  )

  if (painelUniversal?.ip) {
    return painelUniversal.ip
  }

  const painelPorModalidade = paineis.find(
    (painel) =>
      painel.ativo &&
      Array.isArray(painel[servicoConfig]) &&
      painel[servicoConfig].includes(nr_modalidade)
  )

  return painelPorModalidade?.ip ?? IP_PADRAO
}
