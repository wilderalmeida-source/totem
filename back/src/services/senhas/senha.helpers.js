"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgoraBrasil = getAgoraBrasil;
exports.getHojeBrasil = getHojeBrasil;
exports.montarDsSenha = montarDsSenha;
exports.resolveModalidade = resolveModalidade;
exports.novoAtendimentoTotem = novoAtendimentoTotem;
exports.resolverIpPainelPorModalidade = resolverIpPainelPorModalidade;
const prismaDB_1 = require("../../../config/prismaDB");
const prismalog_1 = require("../../../config/prismalog");
const FUNCIONARIO = process.env.IDFUNCIONARIO
    ? Number(process.env.IDFUNCIONARIO)
    : 1;
function getAgoraBrasil() {
    return new Date(Date.now() - 3 * 60 * 60 * 1000);
}
function getHojeBrasil() {
    const hoje = getAgoraBrasil();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
}
function montarDsSenha(preferencial, fila, nr_senha) {
    return `${preferencial !== 0 ? 'P' : 'N'}${fila}-${nr_senha}`;
}
async function resolveModalidade(cd_modalidade) {
    const modalidade = await prismaDB_1.prisma.modalidades.findFirst({
        where: { cd_modalidade },
        select: { ds_modalidade: true },
    });
    return modalidade?.ds_modalidade ?? '';
}
async function novoAtendimentoTotem(cd_paciente) {
    console.log('Criando novo atendimento para paciente:', cd_paciente);
    const cdSalaTotem = Number(process.env.IDSALA);
    const cdMedicoTotem = Number(process.env.IDMEDICO);
    if (!cdSalaTotem) {
        throw new Error('IDSALA não configurado no .env');
    }
    if (!cdMedicoTotem) {
        throw new Error('IDMEDICO não configurado no .env');
    }
    return prismaDB_1.prisma.$transaction(async (tx) => {
        const atendimento = await tx.atendimentos.create({
            data: {
                cd_paciente,
                cd_sala: cdSalaTotem,
                cd_medico: cdMedicoTotem,
                dt_data: getHojeBrasil(),
                ds_status: 2,
                cd_funcionario: FUNCIONARIO
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
                cd_funcionario: FUNCIONARIO
            },
        });
        return {
            ...atendimento,
            nr_controle: atendimento.cd_atendimento,
        };
    });
}
function servicoParaConfig(servico) {
    if (servico === 'C')
        return 'resultado';
    if (servico === 'D')
        return 'marcacao';
    return 'atendimento';
}
async function resolverIpPainelPorModalidade(servico, nr_modalidade) {
    const IP_PADRAO = process.env.IPPAINEL ?? '';
    const config = await prismalog_1.PrismaLog.configuracao_painel.findUnique({
        where: { id: 1 },
    });
    if (!config?.ativo) {
        return IP_PADRAO;
    }
    const paineis = config.paineis ?? [];
    const servicoConfig = servicoParaConfig(servico);
    const painelUniversal = paineis.find((painel) => painel.ativo &&
        painel.universal?.[servicoConfig] === true);
    if (painelUniversal?.ip) {
        return painelUniversal.ip;
    }
    const painelPorModalidade = paineis.find((painel) => painel.ativo &&
        Array.isArray(painel[servicoConfig]) &&
        painel[servicoConfig].includes(nr_modalidade));
    return painelPorModalidade?.ip ?? IP_PADRAO;
}
