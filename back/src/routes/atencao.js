"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.atencaoRoute = atencaoRoute;
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const googleVoices_1 = require("../../config/googleVoices");
async function atencaoRoute(fastify) {
    fastify.get("/clinux/atencao", async (request, reply) => {
        const createbody = zod_1.z.object({ TorP: zod_1.z.string() });
        const { TorP } = createbody.parse(request.query);
        // ✅ Mesmo caminho do POST
        const pastaPublica = node_path_1.default.resolve(__dirname, '../../public/audios');
        const nomeArquivo = 'atencao.mp3';
        const caminhoAbsoluto = node_path_1.default.join(pastaPublica, nomeArquivo);
        const urlRelativa = `/audios/${nomeArquivo}`;
        const existe = node_fs_1.default.existsSync(caminhoAbsoluto);
        // ===== MODO TESTE =====
        if (TorP === "teste") {
            if (existe) {
                return reply.status(200).send({ ttsBody: { audioContent: urlRelativa } });
            }
            const text = await prismalog_1.PrismaLog.ttsEvent.findFirst({
                where: { eventId: "atencao" },
                select: { audioContent: true },
            });
            return reply.status(200).send({
                ttsBody: { errorTTS: text?.audioContent ?? "Atenção por favor" },
            });
        }
        // ===== MODO BROADCAST =====
        if (existe) {
            try {
                fastify.broadcast({ type: "tcp", ts: Date.now() });
                fastify.broadcast({
                    type: "tts:audio",
                    ts: Date.now(),
                    payload: { eventID: "atencao", ttsBody: { audioContent: urlRelativa } },
                });
            }
            catch (err) {
                fastify.log.error({ err }, "Erro ao tratar broadcast de atenção (MP3)");
                fastify.broadcast({ type: "tcp", ts: Date.now() });
            }
            return reply.status(200).send({ ttsBody: { audioContent: urlRelativa } });
        }
        // MP3 não existe — fallback speech
        const text = await prismalog_1.PrismaLog.ttsEvent.findFirst({
            where: { eventId: "atencao" },
            select: { audioContent: true },
        });
        const errorText = text?.audioContent ?? "Atenção por favor";
        try {
            fastify.broadcast({ type: "tcp", ts: Date.now() });
            fastify.broadcast({
                type: "tts:audio",
                ts: Date.now(),
                payload: { eventID: "atencao", ttsBody: { errorTTS: errorText } },
            });
        }
        catch (err) {
            fastify.log.error({ err }, "Erro ao tratar broadcast de atenção (speech)");
            fastify.broadcast({ type: "tcp", ts: Date.now() });
        }
        return reply.status(200).send({ ttsBody: { errorTTS: errorText } });
    });
    fastify.post('/clinux/atencao', async (request, reply) => {
        const createbody = zod_1.z.object({ text: zod_1.z.string() });
        const { text } = createbody.parse(request.body);
        await prismalog_1.PrismaLog.ttsEvent.upsert({
            where: { eventId: "atencao" },
            update: { audioContent: text },
            create: { eventId: "atencao", audioContent: text },
        });
        const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;
        const pastaPublica = node_path_1.default.resolve(__dirname, '../../public/audios');
        if (!node_fs_1.default.existsSync(pastaPublica)) {
            node_fs_1.default.mkdirSync(pastaPublica, { recursive: true });
        }
        const nomeArquivo = `atencao.mp3`;
        const caminhoCompleto = node_path_1.default.join(pastaPublica, nomeArquivo);
        const existe = node_fs_1.default.existsSync(caminhoCompleto);
        const urlRelativa = `/audios/${nomeArquivo}`;
        // Sem chave Google — remove MP3 se existir e retorna fallback
        if (!GOOGLE_TTS_KEY) {
            if (existe)
                node_fs_1.default.unlinkSync(caminhoCompleto);
            return reply.status(200).send({ errorTTS: text }); // ✅ JSON
        }
        try {
            const voiceName = "pt-BR-Standard-B";
            const rate = 1;
            const now = new Date();
            const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const volume = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).volumeSound;
            const body = {
                input: { text },
                voice: { languageCode: "pt-BR", name: voiceName },
                audioConfig: {
                    audioEncoding: "MP3",
                    volumeGainDb: volume,
                    speaking_rate: rate,
                },
            };
            const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok || !data.audioContent) {
                // Google retornou erro — remove MP3 antigo e usa fallback
                if (existe)
                    node_fs_1.default.unlinkSync(caminhoCompleto);
                return reply.status(200).send({ errorTTS: text }); // ✅ JSON
            }
            // Salva o MP3
            const audioBuffer = Buffer.from(data.audioContent, 'base64');
            await node_fs_1.default.promises.writeFile(caminhoCompleto, audioBuffer); // ✅ removido bloco duplicado após isso
            // Contagem de caracteres
            const chars = text.length;
            await prismalog_1.PrismaLog.ttsDailyUsage.upsert({
                where: { date: dateOnly },
                update: { chars: { increment: chars }, requests: { increment: 1 } },
                create: { date: dateOnly, chars, requests: 1 },
            });
            return reply.status(200).send({ audioContent: urlRelativa }); // ✅ sucesso
        }
        catch (e) {
            console.error("Erro na rota /api/tts:", e);
            return reply.status(500).send({ error: "Erro interno ao gerar áudio" }); // ✅ JSON
        }
    });
    fastify.get('/clinux/atencao/text', async (request, reply) => {
        const textDB = await prismalog_1.PrismaLog.ttsEvent.findFirst({ where: { eventId: "atencao" } });
        return reply.status(200).send(textDB);
    });
}
