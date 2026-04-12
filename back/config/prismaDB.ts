import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient as dbPrisma } from "../prisma/app/generated/prisma/client"
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});
export const prisma = new dbPrisma({ adapter })