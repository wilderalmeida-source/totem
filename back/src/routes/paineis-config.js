"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuracaoPaineisRoutes = configuracaoPaineisRoutes;
const prismalog_1 = require("../../config/prismalog");
function ipValido(ip) {
    const partes = ip.split('.');
    if (partes.length !== 4)
        return false;
    return partes.every((parte) => {
        if (parte === '')
            return false;
        const numero = Number(parte);
        return numero >= 0 && numero <= 255;
    });
}
async function configuracaoPaineisRoutes(fastify) {
    fastify.get('/clinux/paineis-config', async () => {
        const config = await prismalog_1.PrismaLog.configuracao_painel.findUnique({
            where: { id: 1 },
        });
        if (!config) {
            return {
                ativo: false,
                paineis: [],
                paineisAtivos: [],
            };
        }
        const paineis = config.paineis;
        return {
            ativo: config.ativo,
            paineis,
            paineisAtivos: paineis.filter((painel) => painel.ativo),
        };
    });
    fastify.post('/clinux/paineis-config', async (request, reply) => {
        const { ativo, paineis } = request.body;
        if (typeof ativo !== 'boolean') {
            return reply.code(400).send({
                error: 'Campo ativo inválido.',
            });
        }
        if (!Array.isArray(paineis)) {
            return reply.code(400).send({
                error: 'Campo paineis precisa ser uma lista.',
            });
        }
        const paineisAtivos = paineis.filter((painel) => painel.ativo);
        if (ativo && paineisAtivos.length < 1) {
            return reply.code(400).send({
                error: 'É necessário ativar pelo menos 2 painéis.',
            });
        }
        for (const painel of paineisAtivos) {
            if (!painel.ip || !ipValido(painel.ip)) {
                return reply.code(400).send({
                    error: `Informe um IP válido para o Painel ${painel.painel}.`,
                });
            }
        }
        const servicos = ['atendimento', 'marcacao', 'resultado'];
        for (const servico of servicos) {
            const universais = paineisAtivos.filter((painel) => painel.universal?.[servico]);
            if (universais.length > 1) {
                return reply.code(400).send({
                    error: `O serviço ${servico} possui mais de um painel universal.`,
                });
            }
            if (universais.length === 1) {
                const outrosComModalidade = paineisAtivos.some((painel) => painel.painel !== universais[0].painel &&
                    Array.isArray(painel[servico]) &&
                    painel[servico].length > 0);
                if (outrosComModalidade) {
                    return reply.code(400).send({
                        error: `O serviço ${servico} está universal, mas outro painel possui modalidades.`,
                    });
                }
            }
            const usadas = new Set();
            for (const painel of paineisAtivos) {
                const lista = painel[servico] ?? [];
                for (const modalidadeId of lista) {
                    if (usadas.has(modalidadeId)) {
                        return reply.code(400).send({
                            error: `A modalidade ${modalidadeId} está repetida no serviço ${servico}.`,
                        });
                    }
                    usadas.add(modalidadeId);
                }
            }
        }
        const config = await prismalog_1.PrismaLog.configuracao_painel.upsert({
            where: { id: 1 },
            update: {
                ativo,
                paineis,
            },
            create: {
                id: 1,
                ativo,
                paineis,
            },
        });
        return reply.send({
            message: 'Configuração salva com sucesso.',
            config,
        });
    });
}
