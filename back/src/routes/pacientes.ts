import { FastifyInstance } from "fastify";
import { z } from "zod"
import { prisma } from '../../config/prismaDB'
export async function pacientesRoute(fastify: FastifyInstance) {
  let tentativas: number = 3
  function gerarECompletarDezDatas(datasReaisBanco: (Date | string | null)[]): { dt_nascimento: string }[] {
    const listaDatasFormata: string[] = [];

    // 1. FORÇA a conversão de todas as datas reais para string ISO e adiciona na lista
    datasReaisBanco.forEach(data => {
      if (data) {
        try {
          let dataISO: string;

          // Se já for um objeto Date nativo
          if (data instanceof Date) {
            dataISO = data.toISOString();
          }
          // Se for uma string (comum ao trafegar dados ou de certos bancos)
          else if (typeof data === 'string') {
            dataISO = new Date(data).toISOString();
          } else {
            dataISO = new Date(data as any).toISOString();
          }

          // Só adiciona se for uma string ISO válida e não estiver duplicada
          if (dataISO && !listaDatasFormata.includes(dataISO)) {
            listaDatasFormata.push(dataISO);
          }
        } catch (e) {
          console.error("Erro crítico ao processar data real do banco:", data, e);
        }
      }
    });

    // 2. Intervalo de anos para preencher as datas falsas
    const anoInicio = 1975;
    const anoFim = 2005;

    // 3. Preenche até ter exatamente 10 strings de datas distintas
    while (listaDatasFormata.length < 10) {
      const ano = Math.floor(Math.random() * (anoFim - anoInicio + 1)) + anoInicio;
      const mes = Math.floor(Math.random() * 12);
      const dia = Math.floor(Math.random() * 28) + 1;

      const dataFalsaUTC = new Date(Date.UTC(ano, mes, dia, 0, 0, 0, 0));
      const dataFalsaISO = dataFalsaUTC.toISOString();

      if (!listaDatasFormata.includes(dataFalsaISO)) {
        listaDatasFormata.push(dataFalsaISO);
      }
    }

    // 4. Embaralha tudo (reais e falsas juntas) usando Fisher-Yates
    for (let i = listaDatasFormata.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [listaDatasFormata[i], listaDatasFormata[j]] = [listaDatasFormata[j], listaDatasFormata[i]];
    }

    // 5. Retorna no formato exato que o seu front-end precisa
    return listaDatasFormata.map(dataStr => ({
      dt_nascimento: dataStr
    }));
  }
  fastify.get("/clinux/pacientes", async (request, reply) => {
    const bodySchema = z.object({
      cd_paciente: z.string().trim().optional(),
      ds_paciente: z.string().trim().optional(),
      dt_nascimento: z.string().trim().min(1).optional(),
      ds_cpf: z.string().trim().min(1).optional(),
      tipo: z.string().trim().min(1).optional(),
    });

    try {
      const { cd_paciente, ds_paciente, dt_nascimento, ds_cpf, tipo } = bodySchema.parse(request.query ?? {});
      // Se nada foi enviado, retorne lista vazia
      if (cd_paciente === undefined && ds_paciente === undefined && dt_nascimento === undefined && ds_cpf === undefined && tipo === undefined) {
        return reply.send([]);
      }

      // Monta o where somente com os campos presentes
      const where: any = {};
      const select: any = {};
      if (tipo == "ID" && dt_nascimento && ds_cpf) {
        where.ds_cpf = ds_cpf;
        where.dt_nascimento = new Date(dt_nascimento);
        select.ds_paciente = true;
        select.cd_paciente = true;
        select.dt_nascimento = true;
      }
      if (typeof cd_paciente === "string") {
        where.cd_paciente = parseInt(cd_paciente);
        select.ds_paciente = true;
        select.cd_paciente = true;
        select.dt_nascimento = true;
      }
      if (ds_paciente) {
        where.ds_paciente = { startsWith: ds_paciente, mode: "insensitive" };
        select.ds_paciente = true;
      }
      if (dt_nascimento) {
        where.dt_nascimento = dt_nascimento
        select.dt_nascimento = true;
      }
      if (ds_cpf) {
        where.ds_cpf = ds_cpf
        select.dt_nascimento = true;
      }
      if (tipo == "DATA") {
        where.dt_nascimento = dt_nascimento
        select.ds_paciente = true;
      }
      if (tipo == "NOME") {
        where.ds_paciente = { startsWith: ds_paciente, mode: "insensitive" };
        select.dt_nascimento = true;
      }
      if (tipo == "NOMEDATA" && dt_nascimento && ds_paciente) {
        where.ds_paciente = ds_paciente;
        where.dt_nascimento = new Date(dt_nascimento);
        select.ds_paciente = true;
        select.cd_paciente = true;
        select.dt_nascimento = true;
      }
      const pacientes = await prisma.pacientes.findMany({
        where,
        select,
        orderBy: { ds_paciente: "asc" },
      });
      if (tipo == "ID" && pacientes.length <= 0) {
        tentativas -= 1
        return reply.send([{ tentativas }])
      }
      if (tipo == "NOMEDATA" && pacientes.length <= 0) {
        console.log(tentativas)
        tentativas -= 1
        return reply.send([{ tentativas }])
      }
      if (tipo == "RESET") {
        tentativas = 3
        return reply.send([{ tentativas }])
      }
      if (tipo == "MASK" && pacientes.length > 0 && pacientes.length < 10) {
        const arrayDAtas: Array<string | Date | null> = []
        for (let i = 0; i < pacientes.length; i++) {
          arrayDAtas.push(pacientes[i].dt_nascimento.toString())
        }
        const blocoDeDezDatas = gerarECompletarDezDatas(arrayDAtas);
        return reply.send(blocoDeDezDatas)

      } if (tipo == "NOME" && pacientes.length > 0 && pacientes.length < 10) {
        const arrayDAtas: Array<string | Date | null> = []
        for (let i = 0; i < pacientes.length; i++) {
          arrayDAtas.push(pacientes[i].dt_nascimento.toString())
        }
        const blocoDeDezDatas = gerarECompletarDezDatas(arrayDAtas);
        return reply.send(blocoDeDezDatas)
      }

      return reply.send(pacientes);
    } catch (err: any) {
      // Erros de validação do Zod ou outros
      return reply.status(400).send({
        error: "Requisição inválida",
        details: err?.errors ?? String(err),
      });
    }
  });
  fastify.post("/clinux/pacientes", async (request, reply) => {
  const bodySchema = z.object({
    ds_paciente: z.string(),
    dt_nascimento: z.string().trim().min(1).optional()
  });
  try {
    const { ds_paciente, dt_nascimento } = bodySchema.parse(request.body ?? {});

    let pacientes = null
    let tentativas = 0

    while (tentativas < 3) {
      try {
        pacientes = await prisma.pacientes.create({
          data: {
            ds_paciente: ds_paciente.toUpperCase(),
            dt_nascimento,
            cd_funcionario: 50
          },
          select: { ds_paciente: true, dt_nascimento: true, cd_paciente: true },
        })

        break

      } catch (e: any) {
        if (e.code === 'P2002') {
          tentativas++
        } else {
          throw e
        }
      }
    }

    if (!pacientes) {
      return reply.status(500).send({ error: 'Não foi possível gerar um ID único' })
    }

    return reply.send(pacientes);

  } catch (err: any) {
    return reply.status(400).send({
      error: "Requisição inválida",
      details: err?.errors ?? String(err),
    });
  }
});







}