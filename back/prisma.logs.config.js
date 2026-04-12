"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: "prisma-logs/schema.prisma",
    migrations: {
        path: "prisma-logs/migrations",
    },
    datasource: {
        url: (0, config_1.env)("LOGS_DATABASE_URL"), // URL do SEGUNDO banco
    },
});
