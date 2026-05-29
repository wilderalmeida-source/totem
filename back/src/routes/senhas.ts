import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'

// Função para mascarar o nome mantendo apenas o Primeiro e Último visíveis
function aplicarMascaraNome(nomeCompleto: string | null | undefined): string {
  if (!nomeCompleto) return "Paciente Oculto";

  const partes = nomeCompleto.trim().split(/\s+/);

  if (partes.length === 1) {
    return partes[0];
  }

  const primeiroNome = partes[0];
  const ultimoNome = partes[partes.length - 1];

  // Se tiver apenas 2 nomes (Ex: João Silva) exibe ambos.
  // Se tiver 3 ou mais, oculta o meio com asteriscos fixos.
  if (partes.length === 2) {
    return `${primeiroNome} ${ultimoNome}`;
  }

  return `${primeiroNome} *** ${ultimoNome}`;
}

export async function senhaRoute(fastify: FastifyInstance) {
  // Senhas para Histórico na tela inicial do totem
  fastify.get('/clinux/senhas', async (request, reply) => {
    const createbody = z.object({
      filtroControle: z.string().optional(),
    })

    // Ajuste de fuso horário local para o início do dia
    const dateInitial = new Date()
    dateInitial.setHours(-3, 0, 0, 0)
    console.log(dateInitial)
    const { filtroControle } = createbody.parse(request.query)

    // 1. QUERY BASE VIA PRISMA ORM
    const senhasRawORM = await prisma.atendimentos_senhas.findMany({
      where: { dt_entrada: { gte: dateInitial } },
      orderBy: { dt_entrada: 'desc' },
      include: {
        atendimentos: {
          select: {
            cd_atendimento: true,
            ds_senha: true,
            dt_hora_senha: true,
            cd_paciente: true,
            nr_controle: true,
            pacientes_atendimentos_cd_pacienteTopacientes: {
              select: { ds_paciente: true, cd_paciente: true },
            },
          },
        },
      },
    })

    // Normaliza o filtro (somente dígitos)
    const tail = (filtroControle ?? "").replace(/\D/g, "")

    type SenhaResult = {
      cd_senha: number
      nr_controle: number | null
      dt_entrada: Date
      ds_opcao: string | null
      ds_fila: string | null
      ds_local: string | null
      dt_saida: Date | null
      cd_atendimento: number | null
      a_nr_controle: number | null
      ds_senha: string | null
      dt_hora_senha: Date | null
      cd_paciente: number | null
      ds_paciente: string | null
    }

    let senhasRawQuery: SenhaResult[] = []

    // 2. QUERY CUSTOMIZADA VIA RAW SQL
    if (tail.length > 0) {
      const modBase = 10 ** tail.length
      const target = Number(tail)

      senhasRawQuery = await prisma.$queryRaw<SenhaResult[]>`
        SELECT
          s.cd_senha, s.nr_controle, s.dt_entrada, s.ds_opcao, s.ds_fila, s.ds_local, s.dt_saida,
          a.cd_atendimento, a.nr_controle AS a_nr_controle, a.ds_senha, a.dt_hora_senha, a.cd_paciente,
          p.ds_paciente
        FROM atendimentos_senhas s
        LEFT JOIN atendimentos a ON a.nr_controle = s.nr_controle
        LEFT JOIN pacientes   p ON p.cd_paciente = a.cd_paciente
        WHERE s.dt_entrada >= ${dateInitial}
          AND a.cd_atendimento IS NOT NULL
          AND (a.cd_atendimento % ${modBase}) = ${target}
        ORDER BY s.dt_entrada DESC
      `
    } else {
      senhasRawQuery = await prisma.$queryRaw<SenhaResult[]>`
        SELECT
          s.cd_senha, s.nr_controle, s.dt_entrada, s.ds_opcao, s.ds_fila, s.ds_local, s.dt_saida,
          a.cd_atendimento, a.nr_controle AS a_nr_controle, a.ds_senha, a.dt_hora_senha, a.cd_paciente,
          p.ds_paciente
        FROM atendimentos_senhas s
        LEFT JOIN atendimentos a ON a.nr_controle = s.nr_controle
        LEFT JOIN pacientes   p ON p.cd_paciente = a.cd_paciente
        WHERE s.dt_entrada >= ${dateInitial}
          AND s.nr_controle IS NOT NULL
          AND a.cd_atendimento = s.nr_controle
        ORDER BY s.dt_entrada DESC
      `
    }

    // 🔥 TRATAMENTO 1: Mascarando os nomes da Query Raw (senhasnr)
    const senhasnr = senhasRawQuery.map(senha => ({
      ...senha,
      ds_paciente: aplicarMascaraNome(senha.ds_paciente)
    }))
    // 🔥 TRATAMENTO 2: Mascarando os nomes da Query ORM (senhas)
    const senhas = senhasRawORM.map(item => {
      // Clona o item para podermos modificar os valores livremente
      const objetoTratado = JSON.parse(JSON.stringify(item));

      // 1. Tenta mascarar se a relação for um Objeto Direto ou se estiver em caminhos comuns do Prisma
      const atendimento = objetoTratado.atendimentos;

      if (atendimento) {
        // Se o Prisma trouxe como objeto direto
        if (atendimento.pacientes_atendimentos_cd_pacienteTopacientes) {
          const relacao = atendimento.pacientes_atendimentos_cd_pacienteTopacientes;

          if (Array.isArray(relacao)) {
            relacao.forEach((p: any) => {
              if (p && p.ds_paciente) p.ds_paciente = aplicarMascaraNome(p.ds_paciente);
            });
          } else if (relacao.ds_paciente) {
            relacao.ds_paciente = aplicarMascaraNome(relacao.ds_paciente);
          }
        }

        // 2. GARANTIA EXTRA: Varre o objeto dinamicamente procurando a chave 'ds_paciente'
        // Caso ela esteja dentro de um array de atendimentos ou sub-nós inesperados
        const varrerEMascarar = (obj: any) => {
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              varrerEMascarar(obj[key]); // Navega mais fundo no objeto
            } else if (key === 'ds_paciente' && typeof obj[key] === 'string') {
              obj[key] = aplicarMascaraNome(obj[key]); // Aplica a máscara onde encontrar
            }
          }
        };

        varrerEMascarar(atendimento);
      }

      return objetoTratado;
    });

    // Retorno limpo e em conformidade total com a LGPD
    return reply.send({ senhasnr, senhas, senhasRawQuery })
  })
  fastify.post('/clinux/senhas', async (request, reply) => {
  const createbody = z.object({
    nr_senha: z.number().optional(),
    sn_preferencial: z.boolean(),
    ds_opcao: z.string(),
    nr_modalidade: z.number(),
    ds_local: z.string(),
    ds_fila: z.string(),
    method: z.string(),
    sn_especial: z.boolean(),
    nr_controle: z.number().optional()
  })

  const {
    ds_opcao, nr_modalidade, nr_senha,
    sn_preferencial, ds_fila, ds_local,
    nr_controle, sn_especial, method,
  } = createbody.parse(request.body)

  const dateNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const IP_PAINEL = process.env.IPPAINEL
  const EMPRESA = process.env.IDEMPRESA ? parseInt(process.env.IDEMPRESA) : 0
  const FUNCIONARIO = process.env.IDFUNCIONARIO ? parseInt(process.env.IDFUNCIONARIO) : 1

  // função reutilizável para buscar próximo ID


  let senhas = null
  let tentativas = 0

  while (tentativas < 3) {
    try {

      if (method === "C") {
        const nr_senhaNew = nr_controle ? nr_controle % 10000 : null
        senhas = await prisma.atendimentos_senhas.create({
          data: {
            dt_entrada: dateNow,
            ds_opcao,
            nr_empresa: EMPRESA,
            nr_modalidade,
            nr_senha: nr_senhaNew,
            nr_controle,
            sn_preferencial,
            sn_especial,
            sn_preparo: false,
            ds_painel: IP_PAINEL,
            ds_local,
            ds_fila,
            cd_funcionario: FUNCIONARIO
          },
        })
      } else {
        senhas = await prisma.atendimentos_senhas.create({
          data: {
            dt_entrada: dateNow,
            ds_opcao,
            nr_empresa: EMPRESA,
            nr_modalidade,
            nr_senha,
            sn_preferencial,
            sn_especial,
            sn_preparo: false,
            ds_painel: IP_PAINEL,
            ds_local,
            ds_fila,
            cd_funcionario: FUNCIONARIO
          },
        })
      }

      break // sucesso, sai do while

    } catch (e:any) {
      if (e.code === 'P2002') { // chave duplicada
        tentativas++
      } else {
        throw e
      }
    }
  }

  if (!senhas) {
    return reply.code(500).send({ error: 'Não foi possível gerar um ID único' })
  }

  return reply.send(senhas)
})}