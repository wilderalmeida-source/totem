import { auditOutbox } from './lib/persistent-audit'
import { registerAdminAudit } from './lib/admin-audit'
import { startAuditRetention } from './lib/audit-retention'
import { LicenseManager } from './lib/license-manager'
import { licensingRoutes } from './routes/license'
import { recordAudit } from './lib/persistent-audit'
import Fastify from "fastify";
import { auditContext, auditIdentifier, flowAudit } from './lib/flow-audit'
import cors from "@fastify/cors"
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { salaRoute } from "./routes/salas";
import { medicosRoute } from "./routes/medicos";
import { agendaRoute } from "./routes/agenda";
import { pacientesRoute } from "./routes/pacientes";
import { senhaRoute } from "./routes/senhas";
import { modalidadesRoute } from "./routes/modalidades";
import pgNotify from "./routes/pgNotify";
import ws from './routes/websocket'
import painelClinux from './routes/painel'
import { procedimentosRoute } from "./routes/procedimentos";
import { voiceRoute } from "./routes/voice";
import { createToken } from "./routes/createToken";
import { authenticate } from "../middleware/autenticate";
import { atencaoRoute } from "./routes/atencao";
import { guichesRoute } from "./routes/guiche";
import { configuracaoPaineisRoutes } from "./routes/paineis-config";
import { recepcoesModalidadesRoute } from "./routes/recepcoesModalidades";
import { adminRoutes } from "./routes/admin";
import { totemAccessRoutes } from './routes/totem-access';
import { configuracoesTotemRoutes } from "./routes/configuracoes-totem";

import { atendimentosTotemRoute } from './routes/atendimentos-totem';

async function bootstrap() {
  auditOutbox.start()
  const fastify = Fastify({ logger: true, })
  const licenseManager = new LicenseManager({
    directory: process.env.LICENSE_STATE_DIRECTORY || path.join(process.cwd(), 'data/license'),
    event: (action, metadata) => recordAudit({ category: 'ADMIN', actor: 'sistema', action, step: 'licenciamento', metadata }),
  })
  await licenseManager.initialize()
  licenseManager.start()
  const stopRetention = startAuditRetention()
  fastify.addHook('onClose', async () => { stopRetention(); await licenseManager.stop(); await auditOutbox.stop() })
  fastify.addHook('onRequest', (request, _reply, done) => {
    auditContext.run({ flowId: auditIdentifier(request.headers['x-flow-id']) ?? '',
      device: auditIdentifier(request.headers['x-device-id']) ?? 'nao_informado' }, done)
  })
  fastify.addHook('onResponse', async (request, reply) => {
    if (auditIdentifier(request.headers['x-flow-id']) && !(request.method === 'GET' && request.url.split('?')[0].replace(/\/$/, '') === '/clinux/senhas') && !request.url.startsWith('/clinux/audit') && /^\/clinux\/(pacientes|totem|senhas|voice)/.test(request.url)) {
      flowAudit('resposta_backend', request.url.split('?')[0], { status: reply.statusCode, durationMs: reply.elapsedTime })
    }
  })
  const frontendOrigins = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  await fastify.register(async (instance) => {
    await instance.register(createToken)
  })
  await fastify.register(cors, {
    origin(origin, callback) {
      // Requisições internas entre containers normalmente não enviam Origin.
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origem não permitida pelo CORS'), false)
    },
  })
  fastify.addHook('preHandler', authenticate)
  await licensingRoutes(fastify, licenseManager)
  registerAdminAudit(fastify)

  await fastify.register(painelClinux);
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public/audios'), // Onde os arquivos estão fisicamente
    prefix: '/audios/', // Como eles aparecerão na URL
    decorateReply: false // Evita conflitos se você tiver outros statics
  });
  await fastify.register(voiceRoute)
  await fastify.register(salaRoute)
  await fastify.register(medicosRoute)
  await fastify.register(agendaRoute)
  await fastify.register(atendimentosTotemRoute)
  await fastify.register(pacientesRoute)
  await fastify.register(guichesRoute);
  await fastify.register(senhaRoute)
  await fastify.register(modalidadesRoute)
  await fastify.register(procedimentosRoute)
  await fastify.register(atencaoRoute)
  await fastify.register(configuracaoPaineisRoutes)
  await fastify.register(recepcoesModalidadesRoute)
  await fastify.register(adminRoutes)
  await fastify.register(totemAccessRoutes)
  await fastify.register(configuracoesTotemRoutes)
  await fastify.register(ws)
  await fastify.register(pgNotify, { channel: "db_atendimentos_senhas", logRawPayload: false, })

  fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  })
}
bootstrap()
