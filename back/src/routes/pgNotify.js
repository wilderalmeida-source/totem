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
    // segurança básica: canal precisa ser um identificador simples
    if (!/^[a-z_][a-z0-9_]*$/i.test(channel)) {
        throw new Error(`Invalid LISTEN channel name: ${channel}`);
    }
    const connStr = opts.connectionString ?? process.env.DATABASE_URL;
    if (!connStr) {
        throw new Error("DATABASE_URL (connectionString) não definido");
    }
    let client = null;
    let stop = false;
    async function connectWithRetry(attempt = 0) {
        if (stop)
            return;
        try {
            client = new pg_1.Client({ connectionString: connStr });
            await client.connect();
            await client.query(`LISTEN ${channel}`);
            fastify.log.info({ channel }, "PG LISTEN conectado");
            client.on("notification", (msg) => {
                try {
                    const payload = msg.payload ? JSON.parse(msg.payload) : null;
                    if (opts.logRawPayload)
                        fastify.log.debug({ payload }, "pg notify payload");
                    // Estrutura sugerida para front
                    const out = {
                        type: "db",
                        ts: Date.now(),
                        channel: msg.channel,
                        op: payload?.op,
                        schema: payload?.schema,
                        table: payload?.table,
                        new: payload?.new ?? null,
                        old: payload?.old ?? null,
                    };
                    // Reenvia para quem estiver conectado (WS/SSE)
                    fastify.broadcast?.(out);
                }
                catch (e) {
                    fastify.log.error({ err: e }, "Erro ao processar notification");
                }
            });
            client.on("error", (err) => {
                fastify.log.error({ err }, "PG client error");
            });
            client.on("end", () => {
                fastify.log.warn("PG client end (desconectado)");
                // tenta reconectar
                if (!stop)
                    void reconnect();
            });
        }
        catch (err) {
            fastify.log.error({ err, attempt }, "Falha ao conectar PG LISTEN");
            const delay = Math.min(30000, 1000 * 2 ** attempt); // backoff exponencial até 30s
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
    await connectWithRetry(0);
    // encerra junto com o servidor
    fastify.addHook("onClose", async (_inst) => {
        stop = true;
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
        catch {
            /* log se quiser */
        }
    });
    // (Opcional) exponha uma rota SSE simples em /events
    fastify.get("/events", async (req, reply) => {
        reply
            .raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const write = (data) => {
            reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        // se você já tem fastify.broadcast, podemos “inscrever” este cliente:
        const listener = (data) => write(data);
        // Garanta que fastify.broadcast exista:
        if (!fastify.broadcast) {
            // cria um micro-broadcaster local só para SSE desta rota
            fastify.broadcast = (d) => write(d);
        }
        else {
            // Caso você tenha um sistema de pub/sub, substitua pelo subscribe real
            // Aqui vamos "monkey patch": encadear broadcast para também mandar para este reply
            const old = fastify.broadcast.bind(fastify);
            reply._restoreBroadcast = () => (fastify.broadcast = old);
            fastify.broadcast = (d) => {
                try {
                    old(d);
                }
                catch { }
                try {
                    write(d);
                }
                catch { }
            };
        }
        // ping a cada 15s
        const ping = setInterval(() => reply.raw.write(`event: ping\ndata: ${Date.now()}\n\n`), 15000);
        req.raw.on("close", () => {
            clearInterval(ping);
            // restaura broadcast original se foi alterado
            if (reply._restoreBroadcast)
                reply._restoreBroadcast();
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
