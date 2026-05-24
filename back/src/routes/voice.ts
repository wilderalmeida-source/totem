import { FastifyInstance } from "fastify"
import { z } from "zod"
import { PrismaLog } from "../../config/prismalog";
import fs from 'node:fs';
import path from 'node:path';
import { applyDictionary, makeCacheKey, normalizeKey, resolveEffectiveVoice } from "../../config/googleVoices";
import { GOOGLE_VOICES, PREMIUM_FEMALE, PREMIUM_MALE, CHEAP_FEMALE, CHEAP_MALE } from "../../config/voicesList";
export function capitalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .split(/\s+/) // divide por um ou mais espaços
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}
export async function voiceRoute(fastify: FastifyInstance) {
  fastify.post('/clinux/voice', async (request, reply) => {
    const createbody = z.object({
      text: z.string(),
      eventId: z.string().optional(),
    })
    const { text, eventId } = createbody.parse(request.body)
    const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY
    const pastaPublica = path.resolve(__dirname, '../../public/audios');
    if (!fs.existsSync(pastaPublica)) {
      fs.mkdirSync(pastaPublica, { recursive: true });
    }
    // verificamos se tem audio no cache.
    const nomeArquivo = `chamada-${eventId?.replace(/[^a-z0-9]/gi, '_') || 'temp'}.mp3`;
    const caminhoCompleto = path.join(pastaPublica, nomeArquivo);
    const urlRelativa = `/audios/${nomeArquivo}`;
    if (fs.existsSync(caminhoCompleto)) {
      return reply.status(200).send({ audioContent: urlRelativa });
    }
    try {
      if (!text || typeof text !== "string") {
        return reply.status(400).send("Parâmetro 'text' é obrigatório")
      }
      // ========= VOZ DA SEMANA =========
      const voiceName = (await resolveEffectiveVoice()).voiceName;
      const rate = (await resolveEffectiveVoice()).rate

      // ========= DATA LOCAL (apenas dia, sem hora) =========
      const now = new Date();
      const dateOnly = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const dateIso = dateOnly.toISOString();
      const year = now.getFullYear();
      const week = (await resolveEffectiveVoice(now)).week;
      const volume = (await resolveEffectiveVoice(now)).volumeSound

      // ========= SALVAR VOZ DA SEMANA NO BANCO =========
      await PrismaLog.ttsWeekVoice.upsert({
        where: { year_week: { year, week } },
        update: { voiceName },
        create: { year, week, voiceName },
      });

      const textoComDict = await applyDictionary(text);
      const formatado = capitalizarNome(textoComDict)
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
        return reply.status(200).send({ errorTTS: formatado })
      }
      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        return reply.status(200).send({ errorTTS: formatado });
      }
      const data = await res.json();
      if (!data.audioContent) {
        return reply.status(200).send({ errorTTS: formatado });
      }
      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      await fs.promises.writeFile(caminhoCompleto, audioBuffer);

      // ========= CONTAGEM DE CARACTERES DIÁRIOS =========
      const chars = formatado.length;
      fastify.broadcast({
        type: "tts:delta",
        payload: { date: dateIso, chars, requestsInc: 1 },
      });
      reply.status(200).send({ audioContent: urlRelativa })
      await PrismaLog.ttsDailyUsage.upsert({
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
      return
    }
    catch (e) {
      return reply.status(500).send("Erro interno ao gerar áudio")
    }
  })



  fastify.get("/clinux/voice/stats", async (request, reply) => { // status
    try {
      const now = new Date();
      const year = now.getFullYear();
      const week = (await resolveEffectiveVoice(now)).week;
      const currentVoice = (await resolveEffectiveVoice()).voiceName;
      const autoVoice = (await resolveEffectiveVoice(now)).autoVoice
      const overrideVoice = (await resolveEffectiveVoice(now)).overrideVoice
      const envForced = (await resolveEffectiveVoice(now)).envForced
      const hasOverride = (await resolveEffectiveVoice(now)).hasOverride
      const rate = (await resolveEffectiveVoice(now)).rate
      const volumeSound = (await resolveEffectiveVoice(now)).volumeSound
      // últimos 30 dias
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const daily = await PrismaLog.ttsDailyUsage.findMany({
        where: { date: { gte: since } },
        orderBy: { date: "asc" },
      });

      const weeks = await PrismaLog.ttsWeekVoice.findMany({
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
        dailyUsage: daily.map((d: any) => ({
          date: d.date,
          chars: d.chars,
          requests: d.requests,
        })),
        weekVoices: weeks,
      });
    } catch (e) {
      console.error("Erro em /clinux/voice/stats:", e);
      return reply.status(500).send("Erro ao buscar estatísticas");
    }
  });
  fastify.get("/clinux/voice/voices", async (_req, reply) => { //listar vozes
    const setPremiumF = new Set(PREMIUM_FEMALE);
    const setPremiumM = new Set(PREMIUM_MALE);
    const setCheapF = new Set(CHEAP_FEMALE);
    const setCheapM = new Set(CHEAP_MALE);

    const voices = GOOGLE_VOICES.map((name) => {
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
    const body = z.object({
      year: z.number(),
      week: z.number(),
      voiceName: z.string(),
    }).parse(req.body);

    await PrismaLog.ttsVoiceOverride.upsert({
      where: { year_week: { year: body.year, week: body.week } },
      update: { voiceName: body.voiceName },
      create: { year: body.year, week: body.week, voiceName: body.voiceName },
    });

    return reply.send({ ok: true });
  });

  fastify.delete("/clinux/voice/override/:year/:week", async (req, reply) => { //volta para voz automatica
    const params = z.object({
      year: z.coerce.number(),
      week: z.coerce.number(),
    }).parse(req.params);

    await PrismaLog.ttsVoiceOverride.delete({
      where: { year_week: { year: params.year, week: params.week } },
    });

    return reply.send({ ok: true });
  });



  fastify.post("/clinux/voice/rate", async (req, reply) => { //muda a velocidade da voz
    const body = z.object({ rate: z.number().min(0.6).max(1.4) }).parse(req.body);

    const current = await PrismaLog.ttsSettings.findFirst();
    if (current) {
      await PrismaLog.ttsSettings.update({ where: { id: current.id }, data: { rate: body.rate } });
    } else {
      await PrismaLog.ttsSettings.create({ data: { rate: body.rate } });
    }

    return reply.send({ ok: true });
  });

  fastify.post("/clinux/voice/volume", async (req, reply) => { //muda o Volume da voz
    const body = z.object({ volume: z.number().min(-96.0).max(16.0) }).parse(req.body);

    const current = await PrismaLog.ttsSettings.findFirst();
    if (current) {
      await PrismaLog.ttsSettings.update({ where: { id: current.id }, data: { volumeSound: body.volume } });
    } else {
      await PrismaLog.ttsSettings.create({ data: { volumeSound: body.volume } });
    }

    return reply.send({ ok: true });
  });
  //======================================
  //DICIONÁRIO
  //======================================
  // GET /clinux/voice/dictionary?search=...
  fastify.get("/clinux/voice/dictionary", async (req, reply) => {
    const query = z
      .object({ search: z.string().optional() })
      .parse(req.query);

    const search = query.search?.trim();
    const where = search
      ? {
        OR: [
          { key: { contains: normalizeKey(search) } },
          { value: { contains: search } },
        ],
      }
      : {};

    const rows = await PrismaLog.nameDictionary.findMany({
      where,
      orderBy: { key: "asc" },
      take: 500,
    });

    return reply.send({ items: rows });
  });

  // POST /clinux/voice/dictionary  (create/upsert)
  fastify.post("/clinux/voice/dictionary", async (req, reply) => {
    const body = z
      .object({
        key: z.string().min(1),
        value: z.string().min(1),
      })
      .parse(req.body);

    const key = normalizeKey(body.key);
    const value = capitalizarNome(body.value.trim());
    const exist = await PrismaLog.nameDictionary.findUnique({
      where: { key }
    })

    const row = await PrismaLog.nameDictionary.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return reply.send({ ok: true, item: row });
  });

  // PUT /clinux/voice/dictionary/:key  (update)
  fastify.put("/clinux/voice/dictionary/:key", async (req, reply) => {
    const params = z.object({ key: z.string().min(1) }).parse(req.params);
    const body = z.object({ value: z.string().min(1) }).parse(req.body);

    const key = normalizeKey(params.key);
    const value = body.value.trim();

    const row = await PrismaLog.nameDictionary.update({
      where: { key },
      data: { value },
    });

    return reply.send({ ok: true, item: row });
  });

  // DELETE /clinux/voice/dictionary/:key
  fastify.delete("/clinux/voice/dictionary/:key", async (req, reply) => {
    const params = z.object({ key: z.string().min(1) }).parse(req.params);
    const key = normalizeKey(params.key);

    await PrismaLog.nameDictionary.delete({ where: { key } });
    return reply.send({ ok: true });
  });


  //=========================================
  //Teste de Voz
  //=========================================

  fastify.post("/clinux/voice/play", async (request, reply) => {
    const { voiceName } = z.object({ voiceName: z.string().min(1) }).parse(request.body);
    const { rate } = z.object({ rate: z.number().min(0.6).max(1.4) }).parse(request.body);
    const { volume } = z.object({ volume: z.number().min(-96).max(16) }).parse(request.body);

    const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;
    if (!GOOGLE_TTS_KEY) return reply.status(500).send("GOOGLE_TTS_KEY não configurada");
    const now = new Date();
    const text = "jose de almeida campos, Guichê 8";
    // 3) aplica dicionário + capitaliza
    const textoComDict = await applyDictionary(text);
    const formatado = capitalizarNome(textoComDict);

    // 4) SSML final
    const ssml = `<speak><prosody rate="${rate}">${formatado}</prosody></speak>`;

    // 5) cacheKey baseada no TEXTO FINAL (formatado), voz e rate
    const cacheKey = makeCacheKey({
      voiceName,
      rate,
      volume,
      text: formatado, // texto final (não precisa ser SSML)
    });
    const pastaPublica = path.resolve(__dirname, '../../public/audios');
    if (!fs.existsSync(pastaPublica)) {
      fs.mkdirSync(pastaPublica, { recursive: true });
    }
    const nomeArquivo = `Teste-${cacheKey?.replace(/[^a-z0-9]/gi, '_') || 'temp'}.mp3`;
    const caminhoCompleto = path.join(pastaPublica, nomeArquivo);
    const urlRelativa = `/audios/${nomeArquivo}`;
    if (fs.existsSync(caminhoCompleto)) {
      return reply.status(200).send({ audioContent: urlRelativa });
    }
    // 6)chama Google
    const chars = text.length;
    const dateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const dateIso = dateOnly.toISOString();
    await PrismaLog.ttsDailyUsage.upsert({
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
    })
    fastify.broadcast({
      type: "tts:delta",
      payload: { date: dateIso, chars, requestsInc: 1 },
    });

    const body = {
      input: { ssml },
      voice: { languageCode: "pt-BR", name: voiceName },
      audioConfig: { audioEncoding: "MP3", volumeGainDb: volume },
    };

    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    const data = await res.json();
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    await fs.promises.writeFile(caminhoCompleto, audioBuffer);

    if (!res.ok || !data.audioContent) {
      console.error("Erro TTS Google:", data);
      return reply.status(500).send("Falha ao gerar áudio");
    }

    return reply.send({ audioContent: urlRelativa, cached: false, voiceName, rate });
  });
}


