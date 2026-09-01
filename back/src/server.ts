import Fastify from "fastify";
import cors from "@fastify/cors"
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { salaRoute } from "./routes/salas";
import { medicosRoute } from "./routes/medicos";
import { agendaRoute } from "./routes/agenda";
import { documentosRoute } from "./routes/documentos";
import { arquivoRoute } from "./routes/arquivo";
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
import { configuracoesTotemRoutes } from "./routes/configuracoes-totem";

async function bootstrap() {
  const fastify = Fastify({ logger: true, })
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
  await fastify.register(documentosRoute)
  await fastify.register(arquivoRoute)
  await fastify.register(pacientesRoute)
  await fastify.register(guichesRoute);
  await fastify.register(senhaRoute)
  await fastify.register(modalidadesRoute)
  await fastify.register(procedimentosRoute)
  await fastify.register(atencaoRoute)
  await fastify.register(configuracaoPaineisRoutes)
  await fastify.register(recepcoesModalidadesRoute)
  await fastify.register(adminRoutes)
  await fastify.register(configuracoesTotemRoutes)
  await fastify.register(ws)
  await fastify.register(pgNotify, { channel: "db_atendimentos_senhas", logRawPayload: false, })

  fastify.listen({ port: 5000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err)
      console.log(err, address)
      process.exit(1)
    }
  })
}
bootstrap()
