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
import { requestSerializer } from './lib/log-redact'
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
import { dashboardRoutes } from "./routes/dashboard";
import { desempenhoRoutes } from "./routes/desempenho";
import { errosRoutes } from "./routes/erros";
import { atrasosPacientesRoutes } from "./routes/atrasos-pacientes";
import { configAnalisesRoutes } from "./routes/config-analises";
import { laudosRoutes } from "./routes/laudos";
import { diretoriaRoutes } from "./routes/diretoria";
import { financeiroRoutes } from "./routes/financeiro";
import { dreRoutes } from "./routes/dre";
import { fluxoCaixaRoutes } from "./routes/fluxo-caixa";
import { faturamentoRoutes } from "./routes/faturamento";
import { faturamentoAnalisesRoutes } from "./routes/faturamento-analises";
import { faturamentoControleRoutes } from "./routes/faturamento-controle";
import { limparLogsAntigos } from "./lib/privacidade";

import { atendimentosTotemRoute } from './routes/atendimentos-totem';

async function bootstrap() {
  auditOutbox.start()
  // Log de requisições sem os valores da query string (nome, CPF e nascimento nas buscas de paciente).
  const fastify = Fastify({ logger: { serializers: { req: requestSerializer } } })
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
  await fastify.register(dashboardRoutes)
  await fastify.register(desempenhoRoutes)
  await fastify.register(errosRoutes)
  await fastify.register(atrasosPacientesRoutes)
  await fastify.register(configAnalisesRoutes)
  await fastify.register(laudosRoutes)
  await fastify.register(diretoriaRoutes)
  await fastify.register(financeiroRoutes)
  await fastify.register(dreRoutes)
  await fastify.register(fluxoCaixaRoutes)
  await fastify.register(faturamentoRoutes)
  await fastify.register(faturamentoAnalisesRoutes)
  await fastify.register(faturamentoControleRoutes)
  await fastify.register(ws)
  await fastify.register(pgNotify, { channel: "db_atendimentos_senhas", logRawPayload: false, })

  // Prazo de guarda dos logs (tela Temas > Privacidade): limpa 1 minuto após subir e depois a cada 6 horas.
  const limpar = () => limparLogsAntigos()
    .then(total => { if (total) fastify.log.info({ total }, 'Logs antigos apagados pelo prazo de guarda') })
    .catch(err => fastify.log.warn({ err }, 'Não foi possível apagar os logs antigos'))
  setTimeout(limpar, 60_000).unref()
  setInterval(limpar, 6 * 3_600_000).unref()

  fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  })
}
bootstrap()
