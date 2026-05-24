"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizarNome = capitalizarNome;
exports.voiceRoute = voiceRoute;
const zod_1 = require("zod");
const prismalog_1 = require("../../config/prismalog");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const googleVoices_1 = require("../../config/googleVoices");
const voicesList_1 = require("../../config/voicesList");
function capitalizarNome(nome) {
    return nome
        .trim()
        .toLowerCase()
        .split(/\s+/) // divide por um ou mais espaços
        .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
}
async function voiceRoute(fastify) {
    fastify.post('/clinux/voice', async (request, reply) => {
        const createbody = zod_1.z.object({
            text: zod_1.z.string(),
            eventId: zod_1.z.string().optional(),
        });
        const { text, eventId } = createbody.parse(request.body);
        const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;
        const pastaPublica = node_path_1.default.resolve(__dirname, '../../public/audios');
        if (!node_fs_1.default.existsSync(pastaPublica)) {
            node_fs_1.default.mkdirSync(pastaPublica, { recursive: true });
        }
        // verificamos se tem audio no cache.
        const nomeArquivo = `chamada-${eventId?.replace(/[^a-z0-9]/gi, '_') || 'temp'}.mp3`;
        const caminhoCompleto = node_path_1.default.join(pastaPublica, nomeArquivo);
        const urlRelativa = `/audios/${nomeArquivo}`;
        if (node_fs_1.default.existsSync(caminhoCompleto)) {
            return reply.status(200).send({ audioContent: urlRelativa });
        }
        try {
            if (!text || typeof text !== "string") {
                return reply.status(400).send("Parâmetro 'text' é obrigatório");
            }
            // ========= VOZ DA SEMANA =========
            const voiceName = (await (0, googleVoices_1.resolveEffectiveVoice)()).voiceName;
            const rate = (await (0, googleVoices_1.resolveEffectiveVoice)()).rate;
            // ========= DATA LOCAL (apenas dia, sem hora) =========
            const now = new Date();
            const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dateIso = dateOnly.toISOString();
            const year = now.getFullYear();
            const week = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).week;
            const volume = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).volumeSound;
            // ========= SALVAR VOZ DA SEMANA NO BANCO =========
            await prismalog_1.PrismaLog.ttsWeekVoice.upsert({
                where: { year_week: { year, week } },
                update: { voiceName },
                create: { year, week, voiceName },
            });
            const textoComDict = await (0, googleVoices_1.applyDictionary)(text);
            const formatado = capitalizarNome(textoComDict);
            const body = {
                input: { text: formatado },
                voice: {
                    languageCode: "pt-BR",
                    name: voiceName,
                },
                audioConfig: {
                    audioEncoding: "MP3",
                    volumeGainDb: volume,
                    speaking_rate: rate,
                },
            };
            if (!GOOGLE_TTS_KEY) {
                return reply.status(200).send({ errorTTS: formatado });
            }
            const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                return reply.status(200).send({ errorTTS: formatado });
            }
            const data = await res.json();
            if (!data.audioContent) {
                return reply.status(200).send({ errorTTS: formatado });
            }
            const audioBuffer = Buffer.from(data.audioContent, 'base64');
            await node_fs_1.default.promises.writeFile(caminhoCompleto, audioBuffer);
            // ========= CONTAGEM DE CARACTERES DIÁRIOS =========
            const chars = formatado.length;
            fastify.broadcast({
                type: "tts:delta",
                payload: { date: dateIso, chars, requestsInc: 1 },
            });
            reply.status(200).send({ audioContent: urlRelativa });
            await prismalog_1.PrismaLog.ttsDailyUsage.upsert({
                where: { date: dateOnly },
                update: {
                    chars: { increment: chars },
                    requests: { increment: 1 },
                },
                create: {
                    date: dateOnly,
                    chars,
                    requests: 1,
                },
            });
            return;
        }
        catch (e) {
            return reply.status(500).send("Erro interno ao gerar áudio");
        }
    });
    fastify.get("/clinux/voice/stats", async (request, reply) => {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const week = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).week;
            const currentVoice = (await (0, googleVoices_1.resolveEffectiveVoice)()).voiceName;
            const autoVoice = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).autoVoice;
            const overrideVoice = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).overrideVoice;
            const envForced = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).envForced;
            const hasOverride = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).hasOverride;
            const rate = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).rate;
            const volumeSound = (await (0, googleVoices_1.resolveEffectiveVoice)(now)).volumeSound;
            // últimos 30 dias
            const since = new Date();
            since.setDate(since.getDate() - 30);
            const daily = await prismalog_1.PrismaLog.ttsDailyUsage.findMany({
                where: { date: { gte: since } },
                orderBy: { date: "asc" },
            });
            const weeks = await prismalog_1.PrismaLog.ttsWeekVoice.findMany({
                orderBy: [{ year: "desc" }, { week: "desc" }],
                take: 12, // últimas 12 semanas
            });
            return reply.send({
                currentWeek: {
                    year,
                    week,
                    voiceName: currentVoice,
                    autoVoice,
                    overrideVoice: overrideVoice,
                    envForced,
                    hasOverride,
                },
                rate,
                volumeSound,
                dailyUsage: daily.map((d) => ({
                    date: d.date,
                    chars: d.chars,
                    requests: d.requests,
                })),
                weekVoices: weeks,
            });
        }
        catch (e) {
            console.error("Erro em /clinux/voice/stats:", e);
            return reply.status(500).send("Erro ao buscar estatísticas");
        }
    });
    fastify.get("/clinux/voice/voices", async (_req, reply) => {
        const setPremiumF = new Set(voicesList_1.PREMIUM_FEMALE);
        const setPremiumM = new Set(voicesList_1.PREMIUM_MALE);
        const setCheapF = new Set(voicesList_1.CHEAP_FEMALE);
        const setCheapM = new Set(voicesList_1.CHEAP_MALE);
        const voices = voicesList_1.GOOGLE_VOICES.map((name) => {
            const premiumFemale = setPremiumF.has(name);
            const premiumMale = setPremiumM.has(name);
            const cheapFemale = setCheapF.has(name);
            const cheapMale = setCheapM.has(name);
            return {
                name,
                tier: premiumFemale || premiumMale ? "premium" : "cheap",
                gender: premiumFemale || cheapFemale ? "female" : "male",
            };
        });
        return reply.send({ voices });
    });
    fastify.post("/clinux/voice/override", async (req, reply) => {
        const body = zod_1.z.object({
            year: zod_1.z.number(),
            week: zod_1.z.number(),
            voiceName: zod_1.z.string(),
        }).parse(req.body);
        await prismalog_1.PrismaLog.ttsVoiceOverride.upsert({
            where: { year_week: { year: body.year, week: body.week } },
            update: { voiceName: body.voiceName },
            create: { year: body.year, week: body.week, voiceName: body.voiceName },
        });
        return reply.send({ ok: true });
    });
    fastify.delete("/clinux/voice/override/:year/:week", async (req, reply) => {
        const params = zod_1.z.object({
            year: zod_1.z.coerce.number(),
            week: zod_1.z.coerce.number(),
        }).parse(req.params);
        await prismalog_1.PrismaLog.ttsVoiceOverride.delete({
            where: { year_week: { year: params.year, week: params.week } },
        });
        return reply.send({ ok: true });
    });
    fastify.post("/clinux/voice/rate", async (req, reply) => {
        const body = zod_1.z.object({ rate: zod_1.z.number().min(0.6).max(1.4) }).parse(req.body);
        const current = await prismalog_1.PrismaLog.ttsSettings.findFirst();
        if (current) {
            await prismalog_1.PrismaLog.ttsSettings.update({ where: { id: current.id }, data: { rate: body.rate } });
        }
        else {
            await prismalog_1.PrismaLog.ttsSettings.create({ data: { rate: body.rate } });
        }
        return reply.send({ ok: true });
    });
    fastify.post("/clinux/voice/volume", async (req, reply) => {
        const body = zod_1.z.object({ volume: zod_1.z.number().min(-96.0).max(16.0) }).parse(req.body);
        const current = await prismalog_1.PrismaLog.ttsSettings.findFirst();
        if (current) {
            await prismalog_1.PrismaLog.ttsSettings.update({ where: { id: current.id }, data: { volumeSound: body.volume } });
        }
        else {
            await prismalog_1.PrismaLog.ttsSettings.create({ data: { volumeSound: body.volume } });
        }
        return reply.send({ ok: true });
    });
    //======================================
    //DICIONÁRIO
    //======================================
    // GET /clinux/voice/dictionary?search=...
    fastify.get("/clinux/voice/dictionary", async (req, reply) => {
        const query = zod_1.z
            .object({ search: zod_1.z.string().optional() })
            .parse(req.query);
        const search = query.search?.trim();
        const where = search
            ? {
                OR: [
                    { key: { contains: (0, googleVoices_1.normalizeKey)(search) } },
                    { value: { contains: search } },
                ],
            }
            : {};
        const rows = await prismalog_1.PrismaLog.nameDictionary.findMany({
            where,
            orderBy: { key: "asc" },
            take: 500,
        });
        return reply.send({ items: rows });
    });
    // POST /clinux/voice/dictionary  (create/upsert)
    fastify.post("/clinux/voice/dictionary", async (req, reply) => {
        const body = zod_1.z
            .object({
            key: zod_1.z.string().min(1),
            value: zod_1.z.string().min(1),
        })
            .parse(req.body);
        const key = (0, googleVoices_1.normalizeKey)(body.key);
        const value = capitalizarNome(body.value.trim());
        const exist = await prismalog_1.PrismaLog.nameDictionary.findUnique({
            where: { key }
        });
        const row = await prismalog_1.PrismaLog.nameDictionary.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
        return reply.send({ ok: true, item: row });
    });
    // PUT /clinux/voice/dictionary/:key  (update)
    fastify.put("/clinux/voice/dictionary/:key", async (req, reply) => {
        const params = zod_1.z.object({ key: zod_1.z.string().min(1) }).parse(req.params);
        const body = zod_1.z.object({ value: zod_1.z.string().min(1) }).parse(req.body);
        const key = (0, googleVoices_1.normalizeKey)(params.key);
        const value = body.value.trim();
        const row = await prismalog_1.PrismaLog.nameDictionary.update({
            where: { key },
            data: { value },
        });
        return reply.send({ ok: true, item: row });
    });
    // DELETE /clinux/voice/dictionary/:key
    fastify.delete("/clinux/voice/dictionary/:key", async (req, reply) => {
        const params = zod_1.z.object({ key: zod_1.z.string().min(1) }).parse(req.params);
        const key = (0, googleVoices_1.normalizeKey)(params.key);
        await prismalog_1.PrismaLog.nameDictionary.delete({ where: { key } });
        return reply.send({ ok: true });
    });
    //=========================================
    //Teste de Voz
    //=========================================
    fastify.post("/clinux/voice/play", async (request, reply) => {
        const { voiceName } = zod_1.z.object({ voiceName: zod_1.z.string().min(1) }).parse(request.body);
        const { rate } = zod_1.z.object({ rate: zod_1.z.number().min(0.6).max(1.4) }).parse(request.body);
        const { volume } = zod_1.z.object({ volume: zod_1.z.number().min(-96).max(16) }).parse(request.body);
        const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;
        if (!GOOGLE_TTS_KEY)
            return reply.status(500).send("GOOGLE_TTS_KEY não configurada");
        const now = new Date();
        const text = "jose de almeida campos, Guichê 8";
        // 3) aplica dicionário + capitaliza
        const textoComDict = await (0, googleVoices_1.applyDictionary)(text);
        const formatado = capitalizarNome(textoComDict);
        // 4) SSML final
        const ssml = `<speak><prosody rate="${rate}">${formatado}</prosody></speak>`;
        // 5) cacheKey baseada no TEXTO FINAL (formatado), voz e rate
        const cacheKey = (0, googleVoices_1.makeCacheKey)({
            voiceName,
            rate,
            volume,
            text: formatado, // texto final (não precisa ser SSML)
        });
        const pastaPublica = node_path_1.default.resolve(__dirname, '../../public/audios');
        if (!node_fs_1.default.existsSync(pastaPublica)) {
            node_fs_1.default.mkdirSync(pastaPublica, { recursive: true });
        }
        const nomeArquivo = `Teste-${cacheKey?.replace(/[^a-z0-9]/gi, '_') || 'temp'}.mp3`;
        const caminhoCompleto = node_path_1.default.join(pastaPublica, nomeArquivo);
        const urlRelativa = `/audios/${nomeArquivo}`;
        if (node_fs_1.default.existsSync(caminhoCompleto)) {
            return reply.status(200).send({ audioContent: urlRelativa });
        }
        // 6)chama Google
        const chars = text.length;
        const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateIso = dateOnly.toISOString();
        await prismalog_1.PrismaLog.ttsDailyUsage.upsert({
            where: { date: dateOnly },
            update: {
                chars: { increment: chars },
                requests: { increment: 1 },
            },
            create: {
                date: dateOnly,
                chars,
                requests: 1,
            }
        });
        fastify.broadcast({
            type: "tts:delta",
            payload: { date: dateIso, chars, requestsInc: 1 },
        });
        const body = {
            input: { ssml },
            voice: { languageCode: "pt-BR", name: voiceName },
            audioConfig: { audioEncoding: "MP3", volumeGainDb: volume },
        };
        const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        const audioBuffer = Buffer.from(data.audioContent, 'base64');
        await node_fs_1.default.promises.writeFile(caminhoCompleto, audioBuffer);
        if (!res.ok || !data.audioContent) {
            console.error("Erro TTS Google:", data);
            return reply.status(500).send("Falha ao gerar áudio");
        }
        return reply.send({ audioContent: urlRelativa, cached: false, voiceName, rate });
    });
}
