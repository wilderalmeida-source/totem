"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
require("dotenv/config");
const pg_1 = require("pg");
const plugin = async (fastify, opts) => {
    const channel = (opts.channel ?? "db_atendimentos_senhas").trim();
    if (!/^[a-z_][a-z0-9_]*$/i.test(channel)) {
        throw new Error(`Invalid LISTEN channel name: ${channel}`);
    }
    const connStr = opts.connectionString ?? process.env.DATABASE;
    if (!connStr) {
        fastify.log.warn("PG LISTEN desativado: DATABASE_URL não definida.");
        return;
    }
    let client = null;
    let stop = false;
    let isConnected = false;
    // ✅ Set centralizado de todos os clientes SSE conectados
    const clients = new Set();
    // ✅ Broadcast centralizado — funciona independente de clientes SSE
    const broadcast = (data) => {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const write of clients) {
            try {
                write(payload);
            }
            catch { }
        }
    };
    // ✅ Expõe o broadcast para outros plugins se necessário
    fastify.decorate("broadcast", broadcast);
    // ✅ Fallback a cada 30s — agora usa o broadcast local
    const fallbackInterval = setInterval(() => {
        if (!isConnected && !stop && clients.size > 0) {
            fastify.log.debug("Sem conexão com PG. Enviando broadcast de fallback (30s)...");
            broadcast({
                type: "db",
                ts: Date.now(),
                channel: "db_update",
                fallback: true,
            });
        }
    }, 30000);
    async function connectWithRetry(attempt = 0) {
        if (stop)
            return;
        try {
            client = new pg_1.Client({ connectionString: connStr });
            await client.connect();
            await client.query(`LISTEN ${channel}`);
            isConnected = true;
            fastify.log.info({ channel }, "PG LISTEN conectado");
            client.on("notification", (msg) => {
                try {
                    const payload = msg.payload ? JSON.parse(msg.payload) : null;
                    if (opts.logRawPayload)
                        fastify.log.debug({ payload }, "pg notify payload");
                    broadcast({ type: "db", ts: Date.now(), channel: "db_update" });
                }
                catch (e) {
                    fastify.log.debug({ err: e }, "Erro ao processar notification (ignorado)");
                }
            });
            client.on("error", (err) => {
                isConnected = false;
                fastify.log.debug({ err }, "PG client error silencioso");
            });
            client.on("end", () => {
                isConnected = false;
                if (!stop)
                    void reconnect();
            });
        }
        catch (err) {
            isConnected = false;
            fastify.log.warn({ attempt }, "Falha ao conectar PG LISTEN (tentando novamente em background...)");
            const delay = Math.min(30000, 1000 * 2 ** attempt);
            await new Promise((r) => setTimeout(r, delay));
            if (!stop)
                return connectWithRetry(attempt + 1);
        }
    }
    async function reconnect() {
        try {
            if (client) {
                try {
                    await client.end();
                }
                catch { }
                client = null;
            }
        }
        catch { }
        await connectWithRetry(0);
    }
    void connectWithRetry(0);
    fastify.addHook("onClose", async () => {
        stop = true;
        clearInterval(fallbackInterval);
        try {
            if (client) {
                try {
                    await client.query(`UNLISTEN ${channel}`);
                }
                catch { }
                await client.end();
                client = null;
            }
        }
        catch { }
    });
    // ✅ Rota SSE — apenas gerencia entrada/saída do Set de clientes
    fastify.get("/events", async (req, reply) => {
        reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const write = (payload) => reply.raw.write(payload);
        clients.add(write); // ✅ registra este cliente
        fastify.log.debug({ total: clients.size }, "Cliente SSE conectado");
        const ping = setInterval(() => reply.raw.write(`event: ping\ndata: ${Date.now()}\n\n`), 15000);
        req.raw.on("close", () => {
            clients.delete(write); // ✅ remove ao desconectar
            clearInterval(ping);
            fastify.log.debug({ total: clients.size }, "Cliente SSE desconectado");
            try {
                reply.raw.end();
            }
            catch { }
        });
    });
};
exports.default = (0, fastify_plugin_1.default)(plugin, {
    name: "pg-notify-listener",
});
