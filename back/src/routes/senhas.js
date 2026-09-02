"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.senhaRoute = senhaRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
const gerar_senha_service_1 = require("../services/senhas/gerar-senha.service");
// Função para mascarar o nome mantendo apenas o Primeiro e Último visíveis
function aplicarMascaraNome(nomeCompleto) {
    if (!nomeCompleto)
        return "Paciente Oculto";
    const partes = nomeCompleto.trim().split(/\s+/);
    if (partes.length === 1) {
        return partes[0];
    }
    const primeiroNome = partes[0];
    const ultimoNome = partes[partes.length - 1];
    // Se tiver apenas 2 nomes (Ex: João Silva) exibe ambos.
    if (partes.length === 2) {
        return `${primeiroNome} ${ultimoNome}`;
    }
    // Se tiver 3 ou mais, oculta o meio com asteriscos fixos.
    return `${primeiroNome} *** ${ultimoNome}`;
}
async function senhaRoute(fastify) {
    fastify.get('/clinux/senhas', async (request, reply) => {
        const createbody = zod_1.z.object({
            filtroControle: zod_1.z.string().optional(),
        });
        try {
            const { filtroControle } = createbody.parse(request.query);
            const dateInitial = new Date();
            dateInitial.setUTCHours(dateInitial.getUTCHours() - 3);
            dateInitial.setHours(0, 1, 0, 0);
            const dateFinal = new Date();
            dateFinal.setUTCHours(dateFinal.getUTCHours() - 3);
            dateFinal.setHours(23, 59, 59, 999);
            const senhasRawORM = await prismaDB_1.prisma.atendimentos_senhas.findMany({
                where: {
                    dt_entrada: {
                        gte: dateInitial,
                        lte: dateFinal,
                    },
                    ds_opcao: {
                        not: 'C',
                    },
                },
                orderBy: {
                    dt_entrada: 'desc',
                },
                include: {
                    atendimentos: {
                        select: {
                            cd_atendimento: true,
                            ds_senha: true,
                            dt_hora_senha: true,
                            cd_paciente: true,
                            nr_controle: true,
                            pacientes_atendimentos_cd_pacienteTopacientes: {
                                select: {
                                    ds_paciente: true,
                                    cd_paciente: true,
                                },
                            },
                        },
                    },
                },
            });
            let senhasEntregaRaw = [];
            const tail = (filtroControle ?? '').replace(/\D/g, '');
            if (tail.length > 0) {
                const modBase = 10 ** tail.length;
                const target = Number(tail);
                senhasEntregaRaw = await prismaDB_1.prisma.$queryRaw `
          SELECT
            s.cd_senha,
            s.nr_controle,
            s.dt_entrada,
            s.ds_opcao,
            s.ds_fila,
            s.ds_local,
            s.dt_saida,
            a.cd_atendimento,
            a.nr_controle AS a_nr_controle,
            a.ds_senha,
            a.dt_hora_senha,
            a.cd_paciente,
            p.ds_paciente
          FROM atendimentos_senhas s
          LEFT JOIN atendimentos a ON a.cd_atendimento = s.nr_controle
          LEFT JOIN pacientes p ON p.cd_paciente = a.cd_paciente
          WHERE s.dt_entrada >= ${dateInitial}
            AND s.dt_entrada <= ${dateFinal}
            AND s.nr_controle IS NOT NULL
            AND s.ds_opcao = 'C'
            AND a.cd_atendimento IS NOT NULL
            AND (a.cd_atendimento % ${modBase}) = ${target}
          ORDER BY s.dt_entrada DESC
        `;
            }
            else {
                senhasEntregaRaw = await prismaDB_1.prisma.$queryRaw `
          SELECT
            s.cd_senha,
            s.nr_controle,
            s.dt_entrada,
            s.ds_opcao,
            s.ds_fila,
            s.ds_local,
            s.dt_saida,
            a.cd_atendimento,
            a.nr_controle AS a_nr_controle,
            a.ds_senha,
            a.dt_hora_senha,
            a.cd_paciente,
            p.ds_paciente
          FROM atendimentos_senhas s
          LEFT JOIN atendimentos a ON a.cd_atendimento = s.nr_controle
          LEFT JOIN pacientes p ON p.cd_paciente = a.cd_paciente
          WHERE s.dt_entrada >= ${dateInitial}
            AND s.dt_entrada <= ${dateFinal}
            AND s.nr_controle IS NOT NULL
            AND s.ds_opcao = 'C'
          ORDER BY s.dt_entrada DESC
        `;
            }
            const mascararObjeto = (item) => {
                const objetoTratado = JSON.parse(JSON.stringify(item));
                const varrerEMascarar = (obj) => {
                    for (const key in obj) {
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                            varrerEMascarar(obj[key]);
                        }
                        else if (key === 'ds_paciente' && typeof obj[key] === 'string') {
                            obj[key] = aplicarMascaraNome(obj[key]);
                        }
                    }
                };
                varrerEMascarar(objetoTratado);
                return objetoTratado;
            };
            const senhas = senhasRawORM.map(mascararObjeto);
            const senhasnr = senhasEntregaRaw.map((senha) => ({
                ...senha,
                ds_paciente: senha.ds_paciente
                    ? aplicarMascaraNome(senha.ds_paciente)
                    : null,
            }));
            return reply.send({
                senhas,
                senhasnr,
            });
        }
        catch (err) {
            return reply.status(400).send({
                error: 'Requisição inválida',
                details: err?.errors ?? String(err),
            });
        }
    });
    ////////////////////////////////////////////////CADASTRA SENHAS/////////////////////////////
    fastify.post('/clinux/senhas', async (request, reply) => {
        const createbody = zod_1.z.object({
            cd_paciente: zod_1.z.number(),
            servico: zod_1.z.string(),
            preferencial: zod_1.z.number().nullable().optional(),
            cd_modalidade: zod_1.z.number().optional(),
        });
        try {
            const body = createbody.parse(request.body);
            const senha = await (0, gerar_senha_service_1.gerarSenhaService)(body);
            return reply.send(senha);
        }
        catch (err) {
            return reply.status(400).send({
                error: 'Erro ao gerar senha',
                details: err?.errors ?? String(err),
            });
        }
    });
}
