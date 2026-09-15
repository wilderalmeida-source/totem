"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarSenhaAtendimento = gerarSenhaAtendimento;
const flow_audit_1 = require("../../lib/flow-audit");
const reservar_numero_senha_service_1 = require("./reservar-numero-senha.service");
const prismaDB_1 = require("../../../config/prismaDB");
const senha_helpers_1 = require("./senha.helpers");
async function gerarSenhaAtendimento({ cd_paciente, servico, preferencial, cd_modalidade, }) {
    const dateNow = (0, senha_helpers_1.getAgoraBrasil)();
    const hoje = (0, senha_helpers_1.getHojeBrasil)();
    const EMPRESA = process.env.IDEMPRESA ? Number(process.env.IDEMPRESA) : 0;
    const FUNCIONARIO = process.env.IDFUNCIONARIO
        ? Number(process.env.IDFUNCIONARIO)
        : 1;
    const modalidadeTotem = process.env.IDMODALIDADE
        ? Number(process.env.IDMODALIDADE)
        : 0;
    const atendimentos = await prismaDB_1.prisma.atendimentos.findMany({
        where: {
            cd_paciente,
            dt_data: hoje,
        },
        include: {
            exames: true,
            salas: true,
        },
        orderBy: { cd_atendimento: 'desc' },
    });
    const statusValidos = [2, 3, 7];
    let exameAtendimento = atendimentos.filter((item) => item.exames.length > 0 &&
        item.ds_status != null &&
        statusValidos.includes(item.ds_status));
    let novoAtendimento = false;
    if (exameAtendimento.length === 0 || !exameAtendimento) {
        const novo = await (0, senha_helpers_1.novoAtendimentoTotem)(cd_paciente);
        exameAtendimento = [novo];
        novoAtendimento = true;
    }
    const atendimento = exameAtendimento[0];
    const modalidadeSenha = cd_modalidade ??
        atendimento.salas?.cd_modalidade ??
        modalidadeTotem;
    if (!modalidadeSenha) {
        throw new Error('IDMODALIDADE não configurado no .env');
    }
    let dsModalidade = await (0, senha_helpers_1.resolveModalidade)(modalidadeSenha);
    if (!dsModalidade) {
        throw new Error(`Modalidade ${modalidadeSenha} não encontrada`);
    }
    const IP_PAINEL = await (0, senha_helpers_1.resolverIpPainelPorModalidade)(servico, modalidadeSenha);
    if (novoAtendimento && servico === 'A') {
        dsModalidade = 'ATENDIMENTO PRÉ';
    }
    const fila = novoAtendimento ? 'N' : dsModalidade[0];
    const nrSenha = await (0, reservar_numero_senha_service_1.reservarNumeroSenha)(hoje);
    const result = await (0, flow_audit_1.auditOperation)('clinico.gravar_senha_e_vinculo', () => prismaDB_1.prisma.$transaction(async (tx) => {
        const senha = await tx.atendimentos_senhas.create({
            data: {
                dt_entrada: dateNow,
                ds_opcao: servico,
                nr_empresa: EMPRESA,
                nr_modalidade: modalidadeSenha,
                nr_senha: nrSenha,
                sn_preferencial: preferencial !== 0,
                sn_especial: preferencial === 2,
                sn_preparo: false,
                ds_painel: IP_PAINEL,
                ds_local: dsModalidade,
                ds_fila: fila,
                cd_funcionario: FUNCIONARIO,
            },
        });
        const dsSenha = (0, senha_helpers_1.montarDsSenha)(preferencial, fila, senha.nr_senha);
        await tx.atendimentos.updateMany({
            where: {
                cd_atendimento: {
                    in: exameAtendimento.map((item) => item.cd_atendimento),
                },
            },
            data: {
                ds_senha: dsSenha,
                cd_senha: senha.cd_senha,
                dt_hora_senha: dateNow,
                cd_funcionario: FUNCIONARIO
            },
        });
        return senha;
    }, { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 10000 }));
    (0, flow_audit_1.flowAudit)('senha_e_vinculo_confirmados', 'emissao', { cd_senha: result.cd_senha, nr_senha: result.nr_senha, atendimentos: exameAtendimento.map(item => item.cd_atendimento), outcome: 'CONCLUIDO', code: 'TICKET_COMMITTED' });
    return result;
}
