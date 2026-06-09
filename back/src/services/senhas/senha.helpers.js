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
    const cdSalaTotem = process.env.IDSALA
        ? Number(process.env.IDSALA)
        : null;
    if (!cdSalaTotem) {
        throw new Error('IDSALA não configurado no .env');
    }
    return prismaDB_1.prisma.atendimentos.create({
        data: {
            cd_paciente,
            cd_sala: cdSalaTotem,
            dt_data: getHojeBrasil(),
            ds_status: 2,
        },
        include: {
            salas: true,
            exames: true,
        },
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
