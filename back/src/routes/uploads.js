"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRoute = uploadsRoute;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zod_1 = __importDefault(require("zod"));
async function uploadsRoute(fastify) {
    fastify.get("/audios/:file", async (req, reply) => {
        const query = zod_1.default.object({ file: zod_1.default.string() }).parse(req.query);
        const file = query.file.trim();
        // 🔐 exemplo simples de verificação
        const auth = req.headers.authorization;
        if (!auth || auth !== "Bearer meu-token-secreto") {
            return reply.code(401).send({ error: "Não autorizado" });
        }
        const filePath = path_1.default.join(process.cwd(), "uploads/audio", file);
        if (!fs_1.default.existsSync(filePath)) {
            return reply.code(404).send({ error: "Arquivo não encontrado" });
        }
        reply.header("Content-Type", "audio/mpeg");
        return reply.send(fs_1.default.createReadStream(filePath));
    });
}
