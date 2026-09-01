"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuracoesTotemRoutes = configuracoesTotemRoutes;
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
const atraso = zod_1.z.object({ toleranceMinutes: zod_1.z.number().int().min(0).max(1440), timeBasis: zod_1.z.enum(["EXAM", "ARRIVAL"]) });
const playlist = zod_1.z.object({ id: zod_1.z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), name: zod_1.z.string().trim().min(1).max(80), items: zod_1.z.array(zod_1.z.string().min(1).max(255)).max(500) });
const midia = zod_1.z.object({ activePlaylistId: zod_1.z.string().max(60).nullable(), imageDurationSeconds: zod_1.z.number().min(2).max(300), playlists: zod_1.z.array(playlist).max(50) });
async function configuracoesTotemRoutes(fastify) {
    fastify.get("/clinux/atrasos-config", async () => {
        const value = await prismalog_1.PrismaLog.configuracao_atraso.findUnique({ where: { id: 1 } });
        return { toleranceMinutes: value?.toleranciaMinutos ?? 0, timeBasis: value?.baseHorario === "EXAME" ? "EXAM" : "ARRIVAL" };
    });
    fastify.put("/clinux/atrasos-config", async (request, reply) => {
        const body = atraso.parse(request.body);
        await prismalog_1.PrismaLog.configuracao_atraso.upsert({ where: { id: 1 }, update: { toleranciaMinutos: body.toleranceMinutes, baseHorario: body.timeBasis === "EXAM" ? "EXAME" : "CHEGADA" }, create: { id: 1, toleranciaMinutos: body.toleranceMinutes, baseHorario: body.timeBasis === "EXAM" ? "EXAME" : "CHEGADA" } });
        return reply.send(body);
    });
    fastify.get("/clinux/midias-config", async () => {
        const value = await prismalog_1.PrismaLog.configuracao_midia.findUnique({ where: { id: 1 } });
        return { activePlaylistId: value?.playlistAtivaId ?? null, imageDurationSeconds: value?.duracaoImagemSegundos ?? 10, playlists: value?.playlists ?? [] };
    });
    fastify.put("/clinux/midias-config", async (request, reply) => {
        const body = midia.parse(request.body);
        const uniqueIds = new Set(body.playlists.map((item) => item.id));
        if (uniqueIds.size !== body.playlists.length || (body.activePlaylistId && !uniqueIds.has(body.activePlaylistId)))
            return reply.code(400).send({ error: "Configuração de playlists inválida." });
        await prismalog_1.PrismaLog.configuracao_midia.upsert({ where: { id: 1 }, update: { playlistAtivaId: body.activePlaylistId, duracaoImagemSegundos: Math.round(body.imageDurationSeconds), playlists: body.playlists }, create: { id: 1, playlistAtivaId: body.activePlaylistId, duracaoImagemSegundos: Math.round(body.imageDurationSeconds), playlists: body.playlists } });
        return reply.send(body);
    });
}
