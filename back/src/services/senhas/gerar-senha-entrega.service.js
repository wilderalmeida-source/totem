"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarSenhaEntrega = gerarSenhaEntrega;
const prismaDB_1 = require("../../../config/prismaDB");
const senha_helpers_1 = require("./senha.helpers");
async function gerarSenhaEntrega({ cd_paciente, preferencial, cd_modalidade, }) {
    const dateNow = (0, senha_helpers_1.getAgoraBrasil)();
    const EMPRESA = process.env.IDEMPRESA ? Number(process.env.IDEMPRESA) : 0;
    const FUNCIONARIO = process.env.IDFUNCIONARIO
        ? Number(process.env.IDFUNCIONARIO)
        : 1;
    const atendimentos = await prismaDB_1.prisma.atendimentos.findMany({
        where: { cd_paciente },
        include: {
            salas: true,
            exames: true,
        },
        orderBy: { cd_atendimento: 'desc' },
    });
    let atendimento = atendimentos.find((item) => item.nr_controle);
    if (!atendimento) {
        atendimento = await (0, senha_helpers_1.novoAtendimentoTotem)(cd_paciente);
    }
    const nrControle = atendimento.nr_controle ?? atendimento.cd_atendimento;
    const modalidadeSenha = cd_modalidade ?? atendimento.salas?.cd_modalidade ?? 0;
    const IP_PAINEL = await (0, senha_helpers_1.resolverIpPainelPorModalidade)('C', modalidadeSenha);
    const dsModalidade = await (0, senha_helpers_1.resolveModalidade)(modalidadeSenha);
    return prismaDB_1.prisma.atendimentos_senhas.create({
        data: {
            dt_entrada: dateNow,
            ds_opcao: 'C',
            nr_empresa: EMPRESA,
            nr_modalidade: modalidadeSenha,
            nr_senha: nrControle % 10000,
            nr_controle: nrControle,
            sn_preferencial: preferencial !== 0,
            sn_especial: preferencial === 2,
            sn_preparo: false,
            ds_painel: IP_PAINEL,
            ds_local: dsModalidade,
            ds_fila: 'R',
            cd_funcionario: FUNCIONARIO,
        },
    });
}
