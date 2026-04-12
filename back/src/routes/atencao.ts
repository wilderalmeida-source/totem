import { FastifyInstance } from "fastify"
import { z } from "zod"
import { PrismaLog } from "../../config/prismalog";
import fs from 'node:fs';
import path from 'node:path';
import { resolveEffectiveVoice } from "../../config/googleVoices";
export async function atencaoRoute(fastify: FastifyInstance) {
  fastify.get('/clinux/atencao', async (request, reply) => {
    const createbody = z.object({
      TorP: z.string(),
    })
    const { TorP } = createbody.parse(request.query)
    const urlRelativa = `/audios/atencao.mp3`;
    if(TorP=="teste"){
      return reply.status(200).send({ audioContent: urlRelativa })
    }
    else{
    try{
     fastify.broadcast({ type: "tcp", ts: Date.now()});
              fastify.broadcast({
                type: "tts:audio",
                ts: Date.now(),
                payload: { eventID:"atencao", audioContent:urlRelativa  },
              });
        } catch (err) {
          fastify.log.error({ err }, "Erro ao tratar mensagem TCP (inject)");
          fastify.broadcast({ type: "tcp", ts: Date.now() });
        }
    return reply.status(200).send({ audioContent: urlRelativa })
  }})

 fastify.post('/clinux/atencao', async (request, reply) => {
    const createbody = z.object({
      text: z.string(),
    })
    const { text } = createbody.parse(request.body)
    const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY
    const pastaPublica = path.resolve(__dirname, '../../public/audios');
    if (!fs.existsSync(pastaPublica)) {
    fs.mkdirSync(pastaPublica, { recursive: true });
    }
     // Mapeamos o Audio.
    const nomeArquivo = `atencao.mp3`;
    const caminhoCompleto = path.join(pastaPublica, nomeArquivo);
    const urlRelativa = `/audios/${nomeArquivo}`;
    
    if (!GOOGLE_TTS_KEY) {
      return reply.status(500).send("GOOGLE_TTS_KEY não configurada")
    }
    try {
      if (!text || typeof text !== "string") {
        return reply.status(400).send("Parâmetro 'text' é obrigatório")
      }
      // ========= VOZ DA SEMANA =========
      const voiceName = "pt-BR-Standard-B";
      const rate = 1

      // ========= DATA LOCAL (apenas dia, sem hora) =========
      const now = new Date();
      const dateOnly = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const volume = (await resolveEffectiveVoice(now)).volumeSound

      const body = {
        input: { text },
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

      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();
      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      await fs.promises.writeFile(caminhoCompleto, audioBuffer);
      if (!res.ok || !data.audioContent) {
        console.error("Erro TTS Google:", data);
        return reply.status(500).send("Falha ao gerar áudio " + data);
      }
      // ========= CONTAGEM DE CARACTERES DIÁRIOS =========
      const chars = text.length;
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
      return reply.status(200).send({ audioContent: urlRelativa })
    }
    catch (e) {
      console.error("Erro na rota /api/tts:", e);
      return reply.status(200).send("Erro interno ao gerar áudio")
    }
  })
}