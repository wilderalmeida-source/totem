import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
import { birthDate, positiveId, patientName } from '../lib/search-validation'
export async function agendaRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/agenda', async (request, reply) => {
    const parsed = z.object({
      medico: positiveId.optional(), sala: positiveId.optional(), busca: patientName.optional(),
      status: positiveId.optional(), cd_paciente: positiveId.optional(),
      dt_nascimento: birthDate.optional(), data_inicial: birthDate, data_final: birthDate,
      lote: positiveId.optional(), tipo: z.enum(['entrega']).optional(),
    }).strict().refine(q => q.data_final >= q.data_inicial && q.data_final.getTime() - q.data_inicial.getTime() <= 31 * 86400000).safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe filtros válidos e um período de até 31 dias.' })
    const q = parsed.data
    const where = {
      cd_medico: q.medico, cd_sala: q.sala, ds_status: q.status, cd_lancamento: q.lote,
      cd_paciente: q.cd_paciente,
      ...(q.busca ? { ds_paciente: { startsWith: q.busca } } : {}),
      ...(q.dt_nascimento ? { pacientes_atendimentos_cd_pacienteTopacientes: { dt_nascimento: q.dt_nascimento } } : {}),
      dt_data: { gte: q.data_inicial, lte: q.data_final },
    }
    const orderBy = [{ dt_data: 'asc' as const }, { dt_hora: 'asc' as const }]
    const agenda = await prisma.atendimentos.findMany({
      where,
      select: {
        cd_atendimento: true, dt_data: true, dt_hora: true, cd_lancamento: true,
        pacientes_atendimentos_cd_pacienteTopacientes: { select: { ds_paciente: true, cd_paciente: true, dt_nascimento: true, ds_sexo: true, ds_telefone: true, ds_celular: true, ds_celular_web: true } },
        medicos_atendimentos_cd_medicoTomedicos: { select: { cd_medico: true, ds_medico: true } },
        cd_senha: true,
        nr_controle: true,
        ds_observacao: true,
        salas: { select: { ds_sala: true, cd_sala: true, cd_modalidade: true, dt_hora_chegada: true } },
        exames: { select: { procedimentos_exames_cd_procedimentoToprocedimentos: { select: { ds_procedimento: true } }, cd_exame: true, dt_assinado: true, dt_laudo: true, procedimentos_exames_cd_procedimento_laudoToprocedimentos: true } }, ds_status: true, ds_senha: true, dt_hora_senha: true,
      },
      orderBy, take: 1001
    })
    if (agenda.length > 1000) return reply.code(422).send({ error: 'Muitos atendimentos. Reduza o período ou refine os filtros.' })
    /*status
    5:Finalizado
    1:Cancelado
    2:Reservado
    3:Confirmado
    11:Recepcao
    6:Entrege*/
    if (agenda.length < 1) {
      return reply.send(null)
    }
    return reply.send(agenda)
  })

  fastify.post('/clinux/agenda', async (request, reply) => {
  const createbody = z.object({
    cd_paciente: z.number(),
  })
  const input = createbody.parse(request.body);
  const dateNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const MEDICO = process.env.IDMEDICO ? parseInt(process.env.IDMEDICO) : 1
  const SALA = process.env.IDSALA ? parseInt(process.env.IDSALA) : 1
  const FUNCIONARIO = process.env.IDFUNCIONARIO ? parseInt(process.env.IDFUNCIONARIO) : 1

  let agenda = null
  let tentativas = 0

  while (tentativas < 3) {
    try {
      agenda = await prisma.atendimentos.create({
        data: {
          cd_medico: MEDICO,
          cd_sala: SALA,
          cd_paciente: input.cd_paciente,
          dt_data: dateNow,
          cd_funcionario: FUNCIONARIO
        },
        select: {
          cd_atendimento: true, dt_data: true, dt_hora: true,
          pacientes_atendimentos_cd_pacienteTopacientes: { select: { ds_paciente: true, cd_paciente: true, dt_nascimento: true, ds_sexo: true, ds_telefone: true, ds_celular: true, ds_celular_web: true } },
          medicos_atendimentos_cd_medicoTomedicos: { select: { cd_medico: true, ds_medico: true } },
          salas: { select: { ds_sala: true, cd_modalidade: true, dt_hora_chegada: true } },
        },
      })

      break // saiu sem erro, encerra o while

    } catch (e: any) {
      if (e.code === 'P2002') { // chave duplicada
        tentativas++
      } else {
        throw e // outro erro, lança normalmente
      }
    }
  }

  if (!agenda) {
    return reply.code(500).send({ error: 'Não foi possível gerar um ID único' })
  }

  await prisma.atendimentos.update({
    data: { nr_controle: agenda.cd_atendimento, cd_funcionario: FUNCIONARIO },
    where: { cd_atendimento: agenda.cd_atendimento }
  })

  return reply.code(201).send([agenda]);
})


  fastify.patch("/clinux/agenda", async (request, reply) => {
    const schema = z.object({
      cd_atendimento: z.array(z.number()).nonempty(),   // ids a atualizar
      cd_senha: z.number().optional(),                  // se vier, usamos este
      ds_senha: z.string().optional(),
    });
    const body = schema.parse(request.body);
    const { cd_atendimento, cd_senha, ds_senha } = body;
    const result = await prisma.$transaction(async (tx) => {
      const FUNCIONARIO = process.env.IDFUNCIONARIO ? parseInt(process.env.IDFUNCIONARIO) : 1
      const data: Parameters<typeof prisma.atendimentos.updateMany>[0]["data"] = {};
      if (typeof cd_senha !== "undefined") data.cd_senha = cd_senha, data.cd_funcionario = FUNCIONARIO;
      if (typeof ds_senha !== "undefined") data.ds_senha = ds_senha, data.cd_funcionario = FUNCIONARIO;
      await tx.atendimentos.updateMany({
        data,
        where: { cd_atendimento: { in: cd_atendimento } },
      });
      const atualizados = await tx.atendimentos.findMany({
        where: { cd_atendimento: { in: cd_atendimento } },
        select: {
          cd_atendimento: true,
          cd_senha: true,
          ds_senha: true,
        },
      });
      return {
        itens: atualizados.map((a) => ({
          cd_atendimento: a.cd_atendimento,
          cd_senha: a.cd_senha ?? null,
          ds_senha: a.ds_senha ?? null,
        })),
      };
    });

    return reply.code(200).send(result.itens);
  });
}
