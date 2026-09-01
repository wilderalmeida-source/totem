import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaLog } from "../../config/prismalog";

const atraso = z.object({ toleranceMinutes: z.number().int().min(0).max(1440), timeBasis: z.enum(["EXAM", "ARRIVAL"]) });
const playlist = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), name: z.string().trim().min(1).max(80), items: z.array(z.string().min(1).max(255)).max(500) });
const midia = z.object({ activePlaylistId: z.string().max(60).nullable(), imageDurationSeconds: z.number().min(2).max(300), playlists: z.array(playlist).max(50) });

export async function configuracoesTotemRoutes(fastify: FastifyInstance) {
  fastify.get("/clinux/atrasos-config", async () => {
    const value = await PrismaLog.configuracao_atraso.findUnique({ where: { id: 1 } });
    return { toleranceMinutes: value?.toleranciaMinutos ?? 0, timeBasis: value?.baseHorario === "EXAME" ? "EXAM" : "ARRIVAL" };
  });
  fastify.put("/clinux/atrasos-config", async (request, reply) => {
    const body = atraso.parse(request.body);
    await PrismaLog.configuracao_atraso.upsert({ where: { id: 1 }, update: { toleranciaMinutos: body.toleranceMinutes, baseHorario: body.timeBasis === "EXAM" ? "EXAME" : "CHEGADA" }, create: { id: 1, toleranciaMinutos: body.toleranceMinutes, baseHorario: body.timeBasis === "EXAM" ? "EXAME" : "CHEGADA" } });
    return reply.send(body);
  });
  fastify.get("/clinux/midias-config", async () => {
    const value = await PrismaLog.configuracao_midia.findUnique({ where: { id: 1 } });
    return { activePlaylistId: value?.playlistAtivaId ?? null, imageDurationSeconds: value?.duracaoImagemSegundos ?? 10, playlists: (value?.playlists as unknown[]) ?? [] };
  });
  fastify.put("/clinux/midias-config", async (request, reply) => {
    const body = midia.parse(request.body);
    const uniqueIds = new Set(body.playlists.map((item) => item.id));
    if (uniqueIds.size !== body.playlists.length || (body.activePlaylistId && !uniqueIds.has(body.activePlaylistId))) return reply.code(400).send({ error: "Configuração de playlists inválida." });
    await PrismaLog.configuracao_midia.upsert({ where: { id: 1 }, update: { playlistAtivaId: body.activePlaylistId, duracaoImagemSegundos: Math.round(body.imageDurationSeconds), playlists: body.playlists }, create: { id: 1, playlistAtivaId: body.activePlaylistId, duracaoImagemSegundos: Math.round(body.imageDurationSeconds), playlists: body.playlists } });
    return reply.send(body);
  });
}
