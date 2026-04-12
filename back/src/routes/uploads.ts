import { FastifyInstance } from "fastify"
import fs from "fs";
import path from "path";
import z from "zod"
export async function uploadsRoute(fastify:FastifyInstance) {
fastify.get("/audios/:file", async (req, reply) => {
const query = z.object({ file: z.string() }).parse(req.query);
const file = query.file.trim();

  // 🔐 exemplo simples de verificação
  const auth = req.headers.authorization;

  if (!auth || auth !== "Bearer meu-token-secreto") {
    return reply.code(401).send({ error: "Não autorizado" });
  }

  const filePath = path.join(process.cwd(), "uploads/audio", file);

  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ error: "Arquivo não encontrado" });
  }

  reply.header("Content-Type", "audio/mpeg");
  return reply.send(fs.createReadStream(filePath));
});

}