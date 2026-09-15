"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const persistent_audit_1 = require("./lib/persistent-audit");
const admin_audit_1 = require("./lib/admin-audit");
const audit_retention_1 = require("./lib/audit-retention");
const fastify_1 = __importDefault(require("fastify"));
const node_crypto_1 = require("node:crypto");
const flow_audit_1 = require("./lib/flow-audit");
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const node_path_1 = __importDefault(require("node:path"));
const salas_1 = require("./routes/salas");
const medicos_1 = require("./routes/medicos");
const agenda_1 = require("./routes/agenda");
const pacientes_1 = require("./routes/pacientes");
const senhas_1 = require("./routes/senhas");
const modalidades_1 = require("./routes/modalidades");
const pgNotify_1 = __importDefault(require("./routes/pgNotify"));
const websocket_1 = __importDefault(require("./routes/websocket"));
const painel_1 = __importDefault(require("./routes/painel"));
const procedimentos_1 = require("./routes/procedimentos");
const voice_1 = require("./routes/voice");
const createToken_1 = require("./routes/createToken");
const autenticate_1 = require("../middleware/autenticate");
const atencao_1 = require("./routes/atencao");
const guiche_1 = require("./routes/guiche");
const paineis_config_1 = require("./routes/paineis-config");
const recepcoesModalidades_1 = require("./routes/recepcoesModalidades");
const admin_1 = require("./routes/admin");
const totem_access_1 = require("./routes/totem-access");
const configuracoes_totem_1 = require("./routes/configuracoes-totem");
const atendimentos_totem_1 = require("./routes/atendimentos-totem");
async function bootstrap() {
    persistent_audit_1.auditOutbox.start();
    const fastify = (0, fastify_1.default)({ logger: true, });
    const stopRetention = (0, audit_retention_1.startAuditRetention)();
    fastify.addHook('onClose', async () => { stopRetention(); });
    fastify.addHook('onRequest', (request, _reply, done) => {
        flow_audit_1.auditContext.run({ flowId: (0, flow_audit_1.auditIdentifier)(request.headers['x-flow-id']) ?? (0, node_crypto_1.randomUUID)(),
            device: (0, flow_audit_1.auditIdentifier)(request.headers['x-device-id']) ?? 'nao_informado' }, done);
    });
    fastify.addHook('onResponse', async (request, reply) => {
        if (!request.url.startsWith('/clinux/audit') && /^\/clinux\/(pacientes|totem|senhas|voice)/.test(request.url)) {
            (0, flow_audit_1.flowAudit)('resposta_backend', request.url.split('?')[0], { status: reply.statusCode, durationMs: reply.elapsedTime });
        }
    });
    const frontendOrigins = (process.env.FRONTEND_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    await fastify.register(async (instance) => {
        await instance.register(createToken_1.createToken);
    });
    await fastify.register(cors_1.default, {
        origin(origin, callback) {
            // Requisições internas entre containers normalmente não enviam Origin.
            if (!origin || frontendOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('Origem não permitida pelo CORS'), false);
        },
    });
    fastify.addHook('preHandler', autenticate_1.authenticate);
    (0, admin_audit_1.registerAdminAudit)(fastify);
    await fastify.register(painel_1.default);
    await fastify.register(static_1.default, {
        root: node_path_1.default.join(__dirname, '../public/audios'), // Onde os arquivos estão fisicamente
        prefix: '/audios/', // Como eles aparecerão na URL
        decorateReply: false // Evita conflitos se você tiver outros statics
    });
    await fastify.register(voice_1.voiceRoute);
    await fastify.register(salas_1.salaRoute);
    await fastify.register(medicos_1.medicosRoute);
    await fastify.register(agenda_1.agendaRoute);
    await fastify.register(atendimentos_totem_1.atendimentosTotemRoute);
    await fastify.register(pacientes_1.pacientesRoute);
    await fastify.register(guiche_1.guichesRoute);
    await fastify.register(senhas_1.senhaRoute);
    await fastify.register(modalidades_1.modalidadesRoute);
    await fastify.register(procedimentos_1.procedimentosRoute);
    await fastify.register(atencao_1.atencaoRoute);
    await fastify.register(paineis_config_1.configuracaoPaineisRoutes);
    await fastify.register(recepcoesModalidades_1.recepcoesModalidadesRoute);
    await fastify.register(admin_1.adminRoutes);
    await fastify.register(totem_access_1.totemAccessRoutes);
    await fastify.register(configuracoes_totem_1.configuracoesTotemRoutes);
    await fastify.register(websocket_1.default);
    await fastify.register(pgNotify_1.default, { channel: "db_atendimentos_senhas", logRawPayload: false, });
    fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}
bootstrap();
