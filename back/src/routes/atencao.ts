import { FastifyInstance } from "fastify"
import { z } from "zod"
import { PrismaLog } from "../../config/prismalog";
import fs from 'node:fs';
import path from 'node:path';
import { resolveEffectiveVoice } from "../../config/googleVoices";
export async function atencaoRoute(fastify: FastifyInstance) {
  fastify.get("/clinux/atencao", async (request, reply) => {
    const createbody = z.object({ TorP: z.string() });
    const { TorP } = createbody.parse(request.query);

    // ✅ Mesmo caminho do POST
    const pastaPublica = path.resolve(__dirname, '../../public/audios');
    const nomeArquivo = 'atencao.mp3';
    const caminhoAbsoluto = path.join(pastaPublica, nomeArquivo);
    const urlRelativa = `/audios/${nomeArquivo}`;
    const existe = fs.existsSync(caminhoAbsoluto);

    // ===== MODO TESTE =====
    if (TorP === "teste") {
      if (existe) {
        return reply.status(200).send({ ttsBody: { audioContent: urlRelativa } });
      }
      const text = await PrismaLog.ttsEvent.findFirst({
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
      } catch (err) {
        fastify.log.error({ err }, "Erro ao tratar broadcast de atenção (MP3)");
        fastify.broadcast({ type: "tcp", ts: Date.now() });
      }
      return reply.status(200).send({ ttsBody: { audioContent: urlRelativa } });
    }

    // MP3 não existe — fallback speech
    const text = await PrismaLog.ttsEvent.findFirst({
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
    } catch (err) {
      fastify.log.error({ err }, "Erro ao tratar broadcast de atenção (speech)");
      fastify.broadcast({ type: "tcp", ts: Date.now() });
    }

    return reply.status(200).send({ ttsBody: { errorTTS: errorText } });
  });

  fastify.post('/clinux/atencao', async (request, reply) => {
    const createbody = z.object({ text: z.string() });
    const { text } = createbody.parse(request.body);

    await PrismaLog.ttsEvent.upsert({
      where: { eventId: "atencao" },
      update: { audioContent: text },
      create: { eventId: "atencao", audioContent: text },
    });

    const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;
    const pastaPublica = path.resolve(__dirname, '../../public/audios');

    if (!fs.existsSync(pastaPublica)) {
      fs.mkdirSync(pastaPublica, { recursive: true });
    }

    const nomeArquivo = `atencao.mp3`;
    const caminhoCompleto = path.join(pastaPublica, nomeArquivo);
    const existe = fs.existsSync(caminhoCompleto);
    const urlRelativa = `/audios/${nomeArquivo}`;

    // Sem chave Google — remove MP3 se existir e retorna fallback
    if (!GOOGLE_TTS_KEY) {
      if (existe) fs.unlinkSync(caminhoCompleto);
      return reply.status(200).send({ errorTTS: text }); // ✅ JSON
    }

    try {
      const voiceName = "pt-BR-Standard-B";
      const rate = 1;

      const now = new Date();
      const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const volume = (await resolveEffectiveVoice(now)).volumeSound;

      const body = {
        input: { text },
        voice: { languageCode: "pt-BR", name: voiceName },
        audioConfig: {
          audioEncoding: "MP3",
          volumeGainDb: volume,
          speaking_rate: rate,
        },
      };

      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.audioContent) {
        // Google retornou erro — remove MP3 antigo e usa fallback
        if (existe) fs.unlinkSync(caminhoCompleto);
        return reply.status(200).send({ errorTTS: text }); // ✅ JSON
      }

      // Salva o MP3
      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      await fs.promises.writeFile(caminhoCompleto, audioBuffer); // ✅ removido bloco duplicado após isso

      // Contagem de caracteres
      const chars = text.length;
      await PrismaLog.ttsDailyUsage.upsert({
        where: { date: dateOnly },
        update: { chars: { increment: chars }, requests: { increment: 1 } },
        create: { date: dateOnly, chars, requests: 1 },
      });

      return reply.status(200).send({ audioContent: urlRelativa }); // ✅ sucesso

    } catch (e) {
      console.error("Erro na rota /api/tts:", e);
      return reply.status(500).send({ error: "Erro interno ao gerar áudio" }); // ✅ JSON
    }
  });

  fastify.get('/clinux/atencao/text', async (request, reply) => {
    const textDB = await PrismaLog.ttsEvent.findFirst({ where: { eventId: "atencao" } })
    return reply.status(200).send(textDB)
  })
}