import { FastifyInstance } from "fastify"
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function agendaRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/agenda', async (request, reply) => {
    const createbody = z.object({
      medico: z.string().optional().transform(value => value || undefined),
      sala: z.string().optional().transform(value => value || undefined),
      busca: z.string().optional().transform(value => value || undefined),
      status: z.string().optional().transform(value => value || undefined),
      cd_paciente: z.string().optional().transform(value => value || undefined),
      dt_nascimento: z.string().optional().transform(value => value || undefined),
      data_inicial: z.string(),
      data_final: z.string(),
      lote: z.string().optional().transform(value => value || undefined),
    })

    const { data_inicial, data_final, medico, sala, status, busca, lote, cd_paciente, dt_nascimento } = createbody.parse(request.query)
    const where: any = {};
    if (typeof medico === "string") {
      where.cd_medico = parseInt(medico);
    }
    if (typeof sala === "string") {
      where.cd_sala = parseInt(sala);
    }
    if (typeof status === "string") {
      where.ds_status = parseInt(status);
    }
    if (typeof lote === "string") {
      where.cd_lancamento = parseInt(lote);
    }
    if (typeof cd_paciente === "string") {
      where.cd_paciente = parseInt(cd_paciente);
    }
    if (typeof busca === "string") {
      where.ds_paciente = { startsWith: busca };
    }
    if (typeof dt_nascimento === "string") {
      where.pacientes_atendimentos_cd_pacienteTopacientes = { dt_nascimento: new Date(dt_nascimento) };
    }
    if (typeof data_inicial === "string") {
      where.dt_data = {
        lte: new Date(data_final),
        gte: new Date(data_inicial),
      }
    }
    const agenda = await prisma.atendimentos.findMany({
      where,
      select: {
        cd_atendimento: true, dt_data: true, dt_hora: true, cd_lancamento: true,
        pacientes_atendimentos_cd_pacienteTopacientes: { select: { ds_paciente: true, cd_paciente: true, dt_nascimento: true, ds_sexo: true, ds_telefone: true, ds_celular: true, ds_celular_web: true } },
        medicos_atendimentos_cd_medicoTomedicos: { select: { cd_medico: true, ds_medico: true } },
        cd_senha: true,
        nr_controle: true,
        ds_observacao: true,
        salas: { select: { ds_sala: true, cd_sala: true, cd_modalidade: true } },
        exames: { select: { procedimentos_exames_cd_procedimentoToprocedimentos: { select: { ds_procedimento: true } }, cd_exame: true, dt_assinado: true, dt_laudo: true, procedimentos_exames_cd_procedimento_laudoToprocedimentos: true } }, ds_status: true, ds_senha: true, dt_hora_senha: true,
      },
      orderBy: [{ dt_data: 'asc' }, { dt_hora: 'asc' }]
    })
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

    const agenda = await prisma.atendimentos.create({
      data: {
        cd_medico: 12560,
        cd_sala: 10,
        cd_paciente: input.cd_paciente,
        dt_data: dateNow,
        //dt_hora: dateNow,
        cd_funcionario: 50

        // cria o exame filho ligado a este atendimento
      },
      select: {
        cd_atendimento: true, dt_data: true, dt_hora: true, cd_lancamento: true,
        pacientes_atendimentos_cd_pacienteTopacientes: { select: { ds_paciente: true, cd_paciente: true, dt_nascimento: true, ds_sexo: true, ds_telefone: true, ds_celular: true, ds_celular_web: true } },
        medicos_atendimentos_cd_medicoTomedicos: { select: { cd_medico: true, ds_medico: true } },
        salas: { select: { ds_sala: true, cd_modalidade: true } },
        exames: { select: { procedimentos_exames_cd_procedimentoToprocedimentos: { select: { ds_procedimento: true } }, cd_exame: true, } }, ds_status: true, ds_senha: true, dt_hora_senha: true
      },
    })
    const nr = await prisma.atendimentos.update({
      data: { nr_controle: agenda.cd_atendimento, cd_funcionario: 50 },
      where: { cd_atendimento: agenda.cd_atendimento }
    })
    nr
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
    console.log(cd_atendimento,cd_senha,ds_senha)
    const result = await prisma.$transaction(async (tx) => {
      const data: Parameters<typeof prisma.atendimentos.updateMany>[0]["data"] = {};
      if (typeof cd_senha !== "undefined") data.cd_senha = cd_senha, data.cd_funcionario = 50;
      if (typeof ds_senha !== "undefined") data.ds_senha = ds_senha, data.cd_funcionario = 50;
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
