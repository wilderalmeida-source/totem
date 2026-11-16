import { FastifyInstance } from "fastify"
import { z } from "zod"
import { PrismaLog } from "../../config/prismalog";
import fs from 'node:fs';
import path from 'node:path';
import { applyDictionary, invalidateEffectiveVoice, makeCacheKey, normalizeKey, resolveEffectiveVoice, resolveEffectiveVoiceCached } from "../../config/googleVoices";
import { synthesizeSpeech } from "../lib/google-tts";
import { getHojeBrasil } from "../services/senhas/senha.helpers";
import { AUDIO_CLEANUP_INTERVAL_MS, limparAudiosAntigos } from "../lib/audio-cleanup";
import { GOOGLE_VOICES, PREMIUM_FEMALE, PREMIUM_MALE, CHEAP_FEMALE, CHEAP_MALE } from "../../config/voicesList";
export function capitalizarNome(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .split(/\s+/) // divide por um ou mais espaços
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

export function normalizarGuicheParaFala(texto: string): string {
  return texto.replace(/guich[eê]\s+0([1-9])(?!\d)/giu, "Guichê $1")
}

export async function voiceRoute(fastify: FastifyInstance) {
  // Limpa os MP3 de chamada com mais de 24 h ao subir e de hora em hora.
  const pastaAudios = path.resolve(__dirname, '../../public/audios');
  const limpar = () => limparAudiosAntigos(pastaAudios)
    .then(removidos => { if (removidos) fastify.log.info({ removidos }, "MP3 antigos removidos") })
    .catch(() => fastify.log.warn("Falha ao limpar MP3 antigos"));
  void limpar();
  const limpeza = setInterval(limpar, AUDIO_CLEANUP_INTERVAL_MS);
  limpeza.unref();
  fastify.addHook("onClose", (_instance, done) => { clearInterval(limpeza); done(); });

  fastify.post('/clinux/voice', async (request, reply) => {
    const createbody = z.object({
      text: z.string(),
      eventId: z.string().optional(),
      guiche: z
        .object({
          numero: z.string().optional(),
          nome: z.string().optional(),
        })
        .optional(),
    })
    const { text } = createbody.parse(request.body)
    const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY
    const pastaPublica = path.resolve(__dirname, '../../public/audios');
    if (!fs.existsSync(pastaPublica)) {
      fs.mkdirSync(pastaPublica, { recursive: true });
    }
    try {
      if (!text || typeof text !== "string") {
        return reply.status(400).send("Parâmetro 'text' é obrigatório")
      }
      // ========= VOZ DA SEMANA =========
      const now = new Date();
      // Configuração de voz (em cache) e dicionário em paralelo: antes eram 3 consultas em sequência
      // antes mesmo de verificar se o MP3 da chamada já existia.
      const [effectiveVoice, textoComDict] = await Promise.all([
        resolveEffectiveVoiceCached(now),
        applyDictionary(normalizarGuicheParaFala(text)),
      ]);
      const voiceName = effectiveVoice.voiceName;
      const rate = effectiveVoice.rate;
      const volume = effectiveVoice.volumeSound;

      // O cache precisa considerar o texto depois do dicionário. Caso contrário,
      // um áudio antigo continua sendo usado após uma correção de pronúncia.
      const formatado = capitalizarNome(textoComDict)
      const cacheKey = makeCacheKey({ voiceName, rate, volume, text: formatado });
      // Só o hash no nome do arquivo: o eventId é o texto da chamada (nome do paciente) e acabava
      // no disco, na URL /audios/... e nos logs.
      const nomeArquivo = `chamada-${cacheKey.slice(0, 32)}.mp3`;
      const caminhoCompleto = path.join(pastaPublica, nomeArquivo);
      const urlRelativa = `/audios/${nomeArquivo}`;
      if (fs.existsSync(caminhoCompleto)) {
        return reply.status(200).send({ audioContent: urlRelativa });
      }

      // ========= DATA LOCAL (apenas dia, sem hora) =========
      const dateOnly = getHojeBrasil();
      const dateIso = dateOnly.toISOString();
      const { year, week } = effectiveVoice;

      // ========= SALVAR VOZ DA SEMANA NO BANCO =========
      await PrismaLog.ttsWeekVoice.upsert({
        where: { year_week: { year, week } },
        update: { voiceName },
        create: { year, week, voiceName },
      });

      // eventId e texto contêm o nome do paciente; no log fica só o tamanho.
      fastify.log.info({ chars: formatado.length }, "Gerando áudio TTS")
      const body = {
        input: { text: formatado },
        voice: {
          languageCode: "pt-BR",
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: "MP3",
          volumeGainDb: volume,
          speakingRate: rate,
        },
      };
      if (!GOOGLE_TTS_KEY) {
        return reply.status(200).send({ errorTTS: formatado })
      }
      const audioBuffer = await synthesizeSpeech(body, GOOGLE_TTS_KEY);
      if (!audioBuffer) {
        return reply.status(200).send({ errorTTS: formatado });
      }
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
      // últimos 30 dias
      const since = new Date();
      since.setDate(since.getDate() - 30);

      // Antes: resolveEffectiveVoice chamado 8 vezes em sequência (16 consultas). Agora 1 vez,
      // em paralelo com as outras duas consultas.
      const [effective, daily, weeks] = await Promise.all([
        resolveEffectiveVoice(now),
        PrismaLog.ttsDailyUsage.findMany({
          where: { date: { gte: since } },
          orderBy: { date: "asc" },
        }),
        PrismaLog.ttsWeekVoice.findMany({
          orderBy: [{ year: "desc" }, { week: "desc" }],
          take: 12, // últimas 12 semanas
        }),
      ]);
      const { year, week, voiceName: currentVoice, autoVoice, overrideVoice, envForced, hasOverride, rate, volumeSound } = effective;

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

    invalidateEffectiveVoice();
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

    invalidateEffectiveVoice();
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

    invalidateEffectiveVoice();
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

    invalidateEffectiveVoice();
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
    const dateOnly = getHojeBrasil();
    const dateIso = dateOnly.toISOString();
    const body = {
      input: { ssml },
      voice: { languageCode: "pt-BR", name: voiceName },
      audioConfig: { audioEncoding: "MP3", volumeGainDb: volume },
    };

    // Grava e contabiliza só quando o Google devolveu áudio; antes gravava um MP3 vazio em caso de erro.
    const audioBuffer = await synthesizeSpeech(body, GOOGLE_TTS_KEY);
    if (!audioBuffer) {
      fastify.log.error("Falha ao gerar áudio de teste no Google TTS");
      return reply.status(500).send("Falha ao gerar áudio");
    }
    await fs.promises.writeFile(caminhoCompleto, audioBuffer);

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

    return reply.send({ audioContent: urlRelativa, cached: false, voiceName, rate });
  });
}


