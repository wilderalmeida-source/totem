import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient as dbPrisma } from "../prisma/app/generated/prisma/client"
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

// Diagnóstico temporário: PRISMA_LOG_QUERIES=true imprime o SQL e o tempo das consultas em "pacientes".
// Os parâmetros (nomes, CPF, datas) não são impressos.
const logQueries = process.env.PRISMA_LOG_QUERIES === 'true'
export const prisma = new dbPrisma({ adapter, ...(logQueries ? { log: [{ emit: 'event' as const, level: 'query' as const }] } : {}) })
if (logQueries) {
    (prisma as unknown as { $on: (event: 'query', cb: (e: { query: string; duration: number }) => void) => void })
        .$on('query', e => { if (/"pacientes"/.test(e.query)) console.log(`[prisma-query] ${e.duration}ms ${e.query}`) })
}
