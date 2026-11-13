"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../prisma/app/generated/prisma/client");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL
});
// Diagnóstico temporário: PRISMA_LOG_QUERIES=true imprime o SQL e o tempo das consultas em "pacientes".
// Os parâmetros (nomes, CPF, datas) não são impressos.
const logQueries = process.env.PRISMA_LOG_QUERIES === 'true';
exports.prisma = new client_1.PrismaClient({ adapter, ...(logQueries ? { log: [{ emit: 'event', level: 'query' }] } : {}) });
if (logQueries) {
    exports.prisma
        .$on('query', e => { if (/"pacientes"/.test(e.query))
        console.log(`[prisma-query] ${e.duration}ms ${e.query}`); });
}
