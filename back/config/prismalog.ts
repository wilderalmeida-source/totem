import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient as dbPrisma } from "../prisma-logs/app/generated/prisma/clientLog"
const adapter = new PrismaPg({
    connectionString: process.env.LOGS_DATABASE_URL
});
export const PrismaLog = new dbPrisma({ adapter })