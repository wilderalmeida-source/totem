import { FastifyInstance } from "fastify"
import {generateToken,hashToken} from "../../config/token"
import {PrismaLog} from "../../config/prismalog"
function addDays(date:Date, days:number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
export async function createToken(fastify: FastifyInstance) {
fastify.get("/tokens", async (request, reply) => {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
   await PrismaLog.token.create({ data: { tokenHash, name:"API", expiresAt: addDays(new Date(), 365), scope:"API-TOTEM"} })

  return reply.send({
    token, // ⚠️ só mostre agora; não guarde o token puro
  });
});}