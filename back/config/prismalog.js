"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaLog = void 0;
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const clientLog_1 = require("../prisma-logs/app/generated/prisma/clientLog");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.LOGS_DATABASE_URL
});
exports.PrismaLog = new clientLog_1.PrismaClient({ adapter });
