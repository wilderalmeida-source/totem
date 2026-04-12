"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const node_path_1 = __importDefault(require("node:path"));
const salas_1 = require("./routes/salas");
const medicos_1 = require("./routes/medicos");
const agenda_1 = require("./routes/agenda");
const documentos_1 = require("./routes/documentos");
const arquivo_1 = require("./routes/arquivo");
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
async function bootstrap() {
    const fastify = (0, fastify_1.default)({ logger: true, });
    await fastify.register(painel_1.default);
    await fastify.register(cors_1.default, { origin: true });
    await fastify.addHook('preHandler', autenticate_1.authenticate);
    await fastify.register(static_1.default, {
        root: node_path_1.default.join(__dirname, '../public/audios'), // Onde os arquivos estão fisicamente
        prefix: '/audios/', // Como eles aparecerão na URL
        decorateReply: false // Evita conflitos se você tiver outros statics
    });
    await fastify.register(createToken_1.createToken);
    await fastify.register(voice_1.voiceRoute);
    await fastify.register(salas_1.salaRoute);
    await fastify.register(medicos_1.medicosRoute);
    await fastify.register(agenda_1.agendaRoute);
    await fastify.register(documentos_1.documentosRoute);
    await fastify.register(arquivo_1.arquivoRoute);
    await fastify.register(pacientes_1.pacientesRoute);
    await fastify.register(senhas_1.senhaRoute);
    await fastify.register(modalidades_1.modalidadesRoute);
    await fastify.register(procedimentos_1.procedimentosRoute);
    await fastify.register(atencao_1.atencaoRoute);
    await fastify.register(websocket_1.default);
    await fastify.register(pgNotify_1.default, { channel: "db_atendimentos_senhas", logRawPayload: false, });
    fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            fastify.log.error(err);
            console.log(err, address);
            process.exit(1);
        }
    });
}
bootstrap();
