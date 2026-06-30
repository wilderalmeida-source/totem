"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarSenhaService = gerarSenhaService;
const gerar_senha_entrega_service_1 = require("./gerar-senha-entrega.service");
const gerar_senha_atendimento_service_1 = require("./gerar-senha-atendimento.service");
async function gerarSenhaService(body) {
    const { cd_paciente, servico } = body;
    if (!cd_paciente) {
        throw new Error('Paciente inválido');
    }
    if (servico === 'C') {
        return (0, gerar_senha_entrega_service_1.gerarSenhaEntrega)(body);
    }
    return (0, gerar_senha_atendimento_service_1.gerarSenhaAtendimento)(body);
}
