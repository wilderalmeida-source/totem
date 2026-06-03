"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arquivoRoute = arquivoRoute;
const fs_1 = __importDefault(require("fs"));
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
async function arquivoRoute(fastify) {
    fastify.get('/clinux/arquivo', async (request, reply) => {
        const createbody = zod_1.z.object({ cd_documento: zod_1.z.string().optional().transform(value => value || undefined) });
        const { cd_documento } = createbody.parse(request.query);
        if (cd_documento) {
            const arquivo = await prismaDB_1.prisma.atendimentos_documentos.findUnique({
                where: { cd_documento: parseInt(cd_documento) }
            });
            if (!arquivo) {
                return reply.send([]);
            }
            else {
                if (arquivo.dt_documento) {
                    const ano = arquivo.dt_documento.getFullYear();
                    const mes = ("0" + (arquivo.dt_documento.getMonth() + 1)).slice(-2);
                    const dia = ("0" + arquivo.dt_documento.getDate()).slice(-2);
                    const file = fs_1.default.readFileSync(`/mnt/CLINUX/atendimentos_documentos/${ano}/${mes}/${dia}/${cd_documento}`);
                    const myStream = file.buffer;
                    reply.type('application/pdf');
                    return reply.send(file);
                }
            }
        }
    });
}
