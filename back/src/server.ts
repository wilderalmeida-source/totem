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

async function bootstrap(){
const fastify=Fastify({logger:true,})
await fastify.register(painelClinux);
await fastify.register(cors,{origin:true})
await fastify.addHook('preHandler',authenticate)
await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public/audios'), // Onde os arquivos estão fisicamente
    prefix: '/audios/', // Como eles aparecerão na URL
    decorateReply: false // Evita conflitos se você tiver outros statics
  });
await fastify.register(createToken)
await fastify.register(voiceRoute)
await fastify.register(salaRoute)
await fastify.register(medicosRoute)
await fastify.register(agendaRoute)
await fastify.register(documentosRoute)
await fastify.register(arquivoRoute)
await fastify.register(pacientesRoute)
await fastify.register(senhaRoute)
await fastify.register(modalidadesRoute)
await fastify.register(procedimentosRoute)
await fastify.register(atencaoRoute)
await fastify.register(ws)
await fastify.register(pgNotify, {channel: "db_atendimentos_senhas",logRawPayload: false,})

fastify.listen({port:5000, host: '0.0.0.0'},(err, address) => {
  if (err) {
    fastify.log.error(err)
    console.log(err,address)
    process.exit(1)
  }
})}
bootstrap()